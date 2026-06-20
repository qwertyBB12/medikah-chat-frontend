/**
 * OPS-01: Práctikah workspace compliance audit log writer.
 *
 * Append-only INSERT into workspace_audit_log. Never throws. Best-effort write
 * — audit failures are logged via console.error but never propagate to callers.
 * DB-side append-only RLS (migration 017, Plan 11-01) is the security guarantee;
 * this helper standardizes call sites.
 *
 * Per OPS-01: 6-year retention required. No UPDATE or DELETE policies on this table.
 *
 * Per D-13 (Table B) from Phase 11 CONTEXT.md: workspace_audit_log tracks 9 actions
 * covering the doctor-facing workspace lifecycle (login, mailbox access, domain changes,
 * site edits, theme changes, tier upgrades/downgrades, PHI warnings, consent signing).
 *
 * Per D's Discretion (11-CONTEXT.md): IP address + user agent are captured ONLY for
 * security-relevant actions (workspace.login, consent.signed, phi_warning.overridden).
 * Routine actions (mailbox.access, theme.changed, etc.) omit these fields to minimize
 * PII surface and keep payload size small.
 *
 * Usage (server-side API routes only — never imported by client-side React):
 *
 *   import { logEvent, extractRequestContext } from '@/lib/workspaceAuditService';
 *
 *   const { ipAddress, userAgent } = extractRequestContext(req);
 *   await logEvent({
 *     physicianId: auth.physicianId,
 *     actorId: session.user.id,
 *     actorRole: 'physician',
 *     action: 'workspace.login',
 *     detail: { provider: session.user.provider },
 *     ipAddress,
 *     userAgent,
 *   });
 */

import { supabaseAdmin } from './supabaseServer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * OPS-01 workspace lifecycle actions tracked in workspace_audit_log.
 *
 * Original 9 actions (Plan 11-07): login, mailbox access, domain/site/theme changes,
 * tier transitions, PHI safeguard events, and consent signing.
 *
 * Phase 12 Plan 12-01 additions:
 *   workspace.setup_completed — SECURITY_RELEVANT (initial provisioning — IP/UA captured)
 *   workspace.password_changed — SECURITY_RELEVANT (credential rotation)
 *   workspace.theme_changed    — informational (replaces legacy theme.changed for workspace surface)
 *   workspace.mobileconfig_requested — informational
 *   workspace.site_published   — informational
 *   workspace.site_disabled    — informational
 */
export type WorkspaceAction =
  | 'workspace.login'
  | 'workspace.setup_completed'
  | 'workspace.password_changed'
  | 'workspace.theme_changed'
  | 'workspace.mobileconfig_requested'
  | 'workspace.site_published'
  | 'workspace.site_disabled'
  | 'mailbox.access'
  | 'domain.changed'
  | 'site.edited'
  | 'theme.changed'
  | 'pro.upgraded'
  | 'pro.downgraded'
  | 'billing.checkout_started'
  // Phase 13-09 / D-29 — dunning + downgrade lifecycle
  | 'billing.payment_failed'
  | 'billing.dunning_retry_1'
  | 'billing.dunning_retry_2'
  | 'billing.dunning_retry_3'
  | 'billing.grace_started'
  | 'billing.downgraded_to_free'
  | 'billing.mailbox_frozen'
  | 'billing.mailbox_purged'
  | 'billing.domain_released'
  | 'billing.transfer_out_requested'
  // Phase 13-06 — pro saga audit actions
  | 'pro.upgrade_succeeded'
  | 'pro.upgrade_failed_pre_por'
  | 'pro.upgrade_finish_later'
  | 'phi_warning.overridden'
  | 'consent.signed'
  // Phase 17 — workspace activation flow
  | 'workspace.activation_link_resent'
  // Phase 17 Plan 04 — login-time TOTP second factor
  | 'workspace.login_2fa'
  // Phase 18 — Bootstrap Identity Rationalization & Recovery
  // Recovery magic-link sent to the bootstrap email on file (D-03, D-05)
  | 'workspace.recovery_link_sent'
  // Google re-auth recovery path verified successfully (D-03, D-05)
  | 'workspace.recovery_google_verified'
  // New Mailcow password set via recovery flow (D-03, D-04)
  | 'workspace.recovery_password_changed'
  // Physician filed a self-service lost-2FA reset request (D-06)
  | 'workspace.totp_reset_requested'
  // Admin approved a lost-2FA reset (clears totp_enrolled + totp_secret) (D-06)
  | 'workspace.totp_reset_approved'
  // Admin denied a lost-2FA reset request (D-06 — informational only)
  | 'workspace.totp_reset_denied'
  // A graduated physician (activation_complete=true) hit the bootstrap demotion wall (D-01)
  | 'workspace.bootstrap_demotion_hit'
  // Phase 21 — unified cross-surface sign-out (clears the NextAuth parent-domain
  // session + hands off to the SOGo logout). Security-relevant: IP/UA captured.
  | 'workspace.logout';

export type ActorRole = 'physician' | 'admin' | 'system';

export interface WorkspaceAuditEvent {
  /** UUID of the physician whose workspace was acted on. */
  physicianId: string;
  /** UUID of the actor performing the action. Null for system-initiated events. */
  actorId?: string;
  /** Role of the actor. */
  actorRole: ActorRole;
  /** The action that occurred (one of the 9 OPS-01 actions). */
  action: WorkspaceAction;
  /** Optional resource type (e.g. 'domain', 'mailbox', 'theme'). */
  resourceType?: string;
  /** Optional UUID of the specific resource acted on. */
  resourceId?: string;
  /** Arbitrary structured detail about the action. */
  detail?: Record<string, unknown>;
  /**
   * Client IP address. Captured only for security-relevant actions
   * (workspace.login, consent.signed, phi_warning.overridden) per D's Discretion.
   * Use extractRequestContext(req) to populate from Next.js req.
   */
  ipAddress?: string;
  /**
   * HTTP User-Agent header. Same security-relevance filter as ipAddress.
   * Use extractRequestContext(req) to populate from Next.js req.
   */
  userAgent?: string;
}

// ---------------------------------------------------------------------------
// Security-relevance filter
// ---------------------------------------------------------------------------

/**
 * Actions where IP address + user agent are captured for security audit.
 * Per D's Discretion in Phase 11 CONTEXT.md: only security-relevant actions
 * record these fields to minimize PII surface.
 *
 * Phase 12 Plan 12-01 additions:
 *   workspace.setup_completed — initial mailbox provisioning (one-time critical event)
 *   workspace.password_changed — credential rotation (security-relevant)
 *
 * Informational actions (workspace.theme_changed, mobileconfig_requested,
 * workspace.site_published, workspace.site_disabled) do NOT capture IP/UA.
 */
const SECURITY_RELEVANT_ACTIONS: ReadonlySet<WorkspaceAction> = new Set<WorkspaceAction>([
  'workspace.login',
  'workspace.login_2fa',
  'workspace.setup_completed',
  'workspace.password_changed',
  'consent.signed',
  'phi_warning.overridden',
  // Phase 18 — Bootstrap Identity Rationalization & Recovery
  // All recovery writes and demotion-wall hits are security-relevant (T-18-01-04).
  // workspace.totp_reset_denied is intentionally excluded — it is informational only
  // (a denied request does not change any credential state).
  'workspace.recovery_link_sent',
  'workspace.recovery_google_verified',
  'workspace.recovery_password_changed',
  'workspace.totp_reset_requested',
  'workspace.totp_reset_approved',
  'workspace.bootstrap_demotion_hit',
  // Phase 21 — sign-out is a security event (HIPAA 164.312(b) login/logout parity)
  'workspace.logout',
]);

// ---------------------------------------------------------------------------
// Main writer
// ---------------------------------------------------------------------------

/**
 * Best-effort INSERT into workspace_audit_log. Never throws.
 *
 * Per OPS-01: this table has 6-year retention and no UPDATE/DELETE policies.
 * A unique-violation on (physician_id, action, occurred_at) is theoretically
 * impossible (occurred_at has microsecond precision from Postgres NOW()) but
 * the try/catch handles any DB error gracefully.
 *
 * IP address and user agent are captured only for security-relevant actions
 * (workspace.login, consent.signed, phi_warning.overridden) per D's Discretion.
 * All other actions receive null for these fields.
 */
export async function logEvent(event: WorkspaceAuditEvent): Promise<void> {
  if (!supabaseAdmin) {
    console.error(
      '[workspaceAuditService] supabaseAdmin not configured — audit skipped',
      {
        physicianId: event.physicianId,
        action: event.action,
      },
    );
    return;
  }

  // Security-relevance filter for IP / UA per D's Discretion.
  const securityRelevant = SECURITY_RELEVANT_ACTIONS.has(event.action);
  const ipAddress = securityRelevant ? (event.ipAddress ?? null) : null;
  const userAgent = securityRelevant ? (event.userAgent ?? null) : null;

  try {
    const { error } = await supabaseAdmin.from('workspace_audit_log').insert({
      physician_id: event.physicianId,
      actor_id: event.actorId ?? null,
      actor_role: event.actorRole,
      action: event.action,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      detail: event.detail ?? {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error('[workspaceAuditService.logEvent] insert failed', {
        physicianId: event.physicianId,
        action: event.action,
        error: error.message,
      });
    }
  } catch (err) {
    console.error('[workspaceAuditService.logEvent] exception', err);
  }
}

// ---------------------------------------------------------------------------
// Request context helper
// ---------------------------------------------------------------------------

/**
 * Extract IP address and User-Agent from a Next.js API route request.
 *
 * Used by Plan 11-07's BFF routes to populate ipAddress + userAgent at the
 * request boundary before calling logEvent. Follows the x-forwarded-for →
 * socket.remoteAddress fallback chain used by Netlify and Render edge proxies.
 *
 * @example
 *   const { ipAddress, userAgent } = extractRequestContext(req);
 *   await logEvent({ ..., action: 'workspace.login', ipAddress, userAgent });
 */
export function extractRequestContext(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): { ipAddress?: string; userAgent?: string } {
  // x-forwarded-for may be a comma-separated list; take the first (client) IP
  const forwarded = req.headers['x-forwarded-for'];
  const ipFromHeader =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined;

  const ipAddress = ipFromHeader ?? req.socket?.remoteAddress ?? undefined;

  const ua = req.headers['user-agent'];
  const userAgent = typeof ua === 'string' ? ua : undefined;

  return { ipAddress, userAgent };
}
