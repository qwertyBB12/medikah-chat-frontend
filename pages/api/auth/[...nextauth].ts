import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import { detectUserRole, ensureSupabaseUser } from '../../../lib/portalAuth';
import { mailcowImapAuthorize } from '../../../lib/auth/mailcowImapProvider';
import { logEvent } from '../../../lib/workspaceAuditService';
import { nowEpochSeconds } from '../../../lib/auth/sessionRevocation';

/**
 * Phase 18 Plan 04 — D-01: Bootstrap-demotion gate helper.
 *
 * Queries physician_workspace_accounts.activation_complete for the physician
 * identified by the given email. Also checks physician_email_aliases so that
 * a bootstrap alias (gmail, nxtglobal, etc.) correctly resolves to the canonical
 * physician record.
 *
 * Returns the physician_id if the physician is graduated (activation_complete=true),
 * or null otherwise (including on any DB error — fail-open, never block sign-in).
 *
 * Called from jwt() for both the Google and the original-email-password (credentials)
 * provider branches when the detected role is 'physician'.
 */
async function checkBootstrapDemotion(email: string): Promise<string | null> {
  if (!supabaseAdmin) return null;
  try {
    const canonicalEmail = email.toLowerCase();

    // Step 1: Try direct lookup on physicians.email
    const { data: physician } = await supabaseAdmin
      .from('physicians')
      .select('id')
      .eq('email', canonicalEmail)
      .maybeSingle();

    let physicianId: string | null = physician?.id ?? null;

    // Step 2: If not found by direct email, try the alias table (D-09 funneling).
    // A bootstrap email (e.g. hector@benextglobal.com) may map to the canonical
    // record (hhlopez@gmail.com row). Without this check the demotion gate would
    // miss aliases and let a graduated physician through on an alias email.
    if (!physicianId) {
      const { data: alias } = await supabaseAdmin
        .from('physician_email_aliases')
        .select('physician_id')
        .eq('email', canonicalEmail)
        .maybeSingle();
      physicianId = alias?.physician_id ?? null;
    }

    if (!physicianId) return null;

    // Step 3: Check activation_complete on physician_workspace_accounts
    const { data: workspace } = await supabaseAdmin
      .from('physician_workspace_accounts')
      .select('activation_complete')
      .eq('physician_id', physicianId)
      .maybeSingle();

    if (workspace?.activation_complete === true) {
      return physicianId;
    }
    return null;
  } catch {
    // Fail open: any DB error must not block sign-in (T-18-04-03).
    return null;
  }
}

/**
 * NextAuth configuration
 *
 * Authenticates via Supabase Auth (credentials) or Google.
 * Social login users are synced to Supabase Auth via ensureSupabaseUser.
 * Role detection queries the physicians table to determine if user is a physician.
 * LinkedIn was removed as an auth provider (Phase 18 Plan 02, decision 40).
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        if (!supabase) {
          return null;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) {
          return null;
        }

        const role = await detectUserRole(data.user.email || '');

        return {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email,
          email: data.user.email,
          role,
        };
      }
    }),
    CredentialsProvider({
      id: 'mailcow-imap', // D-01: distinct provider id for the physician Mailcow IMAP path
      name: 'Medikah email',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        // The full IMAP probe + rate-limit + audit pipeline lives in
        // lib/auth/mailcowImapProvider.ts (Phase 16 Plan 03).
        return mailcowImapAuthorize(
          credentials as Record<string, string> | undefined,
          req as unknown as Parameters<typeof mailcowImapAuthorize>[1],
        );
      },
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For social providers, sync to Supabase Auth
      if (account?.provider === 'google') {
        const email = user.email;
        if (!email) return false;

        try {
          await ensureSupabaseUser(email, {
            name: user.name,
            provider: account.provider,
            image: user.image,
          });
        } catch (err) {
          console.error('Failed to sync social user to Supabase:', err);
          // Allow sign-in to proceed even if Supabase sync fails
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Phase 21 — pin the session issue time at sign-in (epoch seconds). The
        // SSO gate (sso-verify) compares this against the physician's
        // session_epoch watermark to revoke copied tokens. Set on EVERY sign-in
        // branch (incl. the needs_totp / totp_verified early returns below) and
        // never refreshed on subsequent requests — `user` is truthy only at
        // genuine sign-in, so a re-encode on a normal request preserves it.
        token.session_iat = nowEpochSeconds();

        // Credentials flow: user object already has id and role
        if (account?.provider === 'credentials') {
          token.userId = user.id;
          token.role = user.role || 'patient';
          token.provider = 'credentials';
        }

        // Phase 16 D-01/D-09/D-10 — mailcow-imap provider: lift the D-10 claim
        // set off the user object that mailcowImapAuthorize returned onto the JWT.
        // role is hard-coded 'physician' (Mailcow mailboxes exist only for
        // physicians; portalAuth.detectUserRole intentionally skipped per
        // 16-CONTEXT.md <code_context>).
        if (account?.provider === 'mailcow-imap') {
          const imapUser = user as {
            needs_totp?: boolean;
            totp_verified?: boolean;
            physician_id?: string;
            mailbox_email?: string;
            verification_status?: 'pending' | 'in_review' | 'verified' | 'rejected';
            workspace_role?: 'owner';
          };

          // Phase 17 Plan 04 — TOTP second-factor gate (T-17-04-01).
          // mailcowImapAuthorize() returns a sentinel { id: 'totp-pending:<id>',
          // needs_totp: true, physician_id } when the physician is enrolled.
          // The JWT must carry needs_totp=true and physician_id so the client
          // can call /api/auth/activate/totp-verify, but MUST NOT carry the full
          // D-10 physician claim set (role/mailbox_email/verification_status)
          // until TOTP is verified — that would be a 2FA bypass (T-17-04-01).
          if (imapUser.needs_totp === true) {
            token.userId = user.id;
            token.role = 'physician'; // hard-coded; only physicians have Mailcow accounts
            token.provider = 'mailcow-imap';
            token.needs_totp = true;
            token.physician_id = imapUser.physician_id;
            // Do NOT set mailbox_email, verification_status, workspace_role, totp_verified.
            // The session callback checks needs_totp before exposing physician claims.
            return token;
          }

          // Phase 17 Plan 04 — TOTP upgrade path.
          // When the totp-verify endpoint re-invokes signIn with totp_verified=true
          // (via a specially shaped user object returned from authorize()), clear
          // needs_totp and populate the full D-10 claim set.
          if (imapUser.totp_verified === true) {
            token.userId = user.id;
            token.role = 'physician';
            token.provider = 'mailcow-imap';
            token.needs_totp = false;
            token.totp_verified = true;
            token.physician_id = imapUser.physician_id;
            token.mailbox_email = imapUser.mailbox_email;
            token.verification_status = imapUser.verification_status;
            token.workspace_role = imapUser.workspace_role;
            return token;
          }

          // Standard mailcow-imap path (legacy physicians with no workspace row):
          // full D-10 claim set, no TOTP gate.
          token.userId = user.id;
          token.role = 'physician';
          token.provider = 'mailcow-imap';
          token.mailbox_email = imapUser.mailbox_email;
          token.physician_id = imapUser.physician_id;
          token.verification_status = imapUser.verification_status;
          token.workspace_role = imapUser.workspace_role;
        }
      }

      // Social provider flow
      if (account && account.provider === 'google') {
        const email = token.email || user?.email || '';
        token.provider = account.provider;

        // Detect role
        if (email) {
          token.role = await detectUserRole(email);
        } else {
          token.role = 'patient';
        }

        // Sync userId from Supabase
        try {
          const supabaseId = await ensureSupabaseUser(email, {
            name: token.name,
            provider: account.provider,
            image: token.picture ?? null,
          });
          token.userId = supabaseId;
        } catch {
          token.userId = token.sub || '';
        }

        // Phase 18 Plan 04 — D-01: Bootstrap-demotion gate (Google path).
        // A graduated physician (verification_status=verified + activation_complete=true)
        // signing in via Google is flagged here; /chat renders the demotion wall.
        // Gate fires ONLY for physicians — patients are unaffected.
        // Fails open: any DB error does not block sign-in (T-18-04-03).
        if (token.role === 'physician' && email) {
          const demotedPhysicianId = await checkBootstrapDemotion(email);
          if (demotedPhysicianId) {
            token.bootstrap_demoted = true;
            // Audit at jwt() time (IP/UA unavailable here; wall-mount POSTs full context)
            void logEvent({
              physicianId: demotedPhysicianId,
              actorRole: 'system',
              action: 'workspace.bootstrap_demotion_hit',
              detail: { provider: 'google', trigger: 'jwt_callback' },
            });
          }
        }
      }

      // Phase 18 Plan 04 — D-01: Bootstrap-demotion gate (credentials / original
      // email-password path). A graduated physician who still knows their original
      // Supabase-auth password is equally demoted — the wall applies regardless of
      // which bootstrap identity they used. This branch fires when account.provider
      // is 'credentials' and the user object already has a 'physician' role (set
      // by the authorize() callback that called detectUserRole()).
      if (account?.provider === 'credentials' && token.role === 'physician') {
        const credEmail = token.email || user?.email || '';
        if (credEmail) {
          const demotedPhysicianId = await checkBootstrapDemotion(credEmail);
          if (demotedPhysicianId) {
            token.bootstrap_demoted = true;
            void logEvent({
              physicianId: demotedPhysicianId,
              actorRole: 'system',
              action: 'workspace.bootstrap_demotion_hit',
              detail: { provider: 'credentials', trigger: 'jwt_callback' },
            });
          }
        }
      }

      // ── Self-healing role (P0 stuck-physician rescue) ──────────────────
      // Stale JWTs minted before the physician record existed carry
      // role='patient' and never re-resolve (role is written only under
      // if(user)/if(account), both false on a refresh). Re-resolve from the
      // provider-verified, tamper-proof token.email and UPGRADE
      // patient->physician ONLY. NEVER downgrade.
      //  - TOTP-pending tokens early-return in the mailcow-imap branch above
      //    and never reach here.
      //  - session_iat is NOT touched: the Phase 21 SSO revocation watermark
      //    must stay pinned at sign-in; re-stamping would un-revoke copied tokens.
      //  - TTL stamp bounds DB load on the hot /api/auth/session path; stamped
      //    BEFORE the query so a failed/slow lookup still throttles.
      {
        const SELF_HEAL_TTL = 60; // seconds — bounds query amplification
        const lastChecked = token.role_checked_at ?? 0;
        const now = nowEpochSeconds();
        if (
          (!token.role || token.role === 'patient') &&
          token.needs_totp !== true &&
          now - lastChecked >= SELF_HEAL_TTL
        ) {
          token.role_checked_at = now; // stamp BEFORE the query (idempotent throttle)
          const email = token.email || '';
          if (email) {
            // fail-open: detectUserRole returns 'patient' on any error => no upgrade
            const resolved = await detectUserRole(email);
            if (resolved === 'physician') {
              // ONLY ever upgrade to physician
              token.role = 'physician';
              // Re-evaluate the bootstrap-demotion wall on upgrade: the
              // sign-in-only gates above do NOT run on a refresh, so without
              // this a graduated physician healed from a stale 'patient' token
              // would bypass the demotion wall.
              const demotedPhysicianId = await checkBootstrapDemotion(email);
              if (demotedPhysicianId) {
                token.bootstrap_demoted = true;
                void logEvent({
                  physicianId: demotedPhysicianId,
                  actorRole: 'system',
                  action: 'workspace.bootstrap_demotion_hit',
                  detail: { provider: 'self_heal', trigger: 'jwt_refresh' },
                });
              }
            }
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.provider = token.provider as
          | 'credentials'
          | 'google'
          | 'mailcow-imap'
          | undefined;

        // Phase 18 Plan 04 — D-01: Lift bootstrap_demoted flag onto session.user.
        // The flag is set in jwt() for graduated physicians on Google/credentials paths.
        // /chat reads this to render the demotion wall instead of routing to dashboard.
        if (token.bootstrap_demoted === true) {
          session.user.bootstrap_demoted = true;
        }

        // Phase 16 D-10 — additive lift of mailcow-imap claims onto session.user.
        // Phase 17 Plan 04 — gate: do NOT expose physician claims if TOTP is pending.
        // needs_totp=true means IMAP password was correct but TOTP not yet verified.
        // Exposing role='physician' + mailbox_email on a needs_totp session would
        // allow a partial 2FA bypass (T-17-04-01).
        if (token.provider === 'mailcow-imap') {
          if (token.needs_totp === true) {
            // Pending TOTP session — expose only the minimum needed for the TOTP
            // verification UI: physician_id (to call /api/auth/activate/totp-verify)
            // and needs_totp flag. Do not expose mailbox_email, verification_status,
            // workspace_role. Role is set to physician (display purposes only — the
            // fast-API 'verified_physician' dependency still gates /practikah/* routes).
            session.user.needs_totp = true;
            session.user.physician_id = token.physician_id;
          } else {
            // Fully authenticated (TOTP verified or legacy no-workspace path).
            session.user.mailbox_email = token.mailbox_email;
            session.user.physician_id = token.physician_id;
            session.user.verification_status = token.verification_status;
            session.user.workspace_role = token.workspace_role;
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/chat',
  },
  // Phase 16 AUTH-08 — scope the session cookie to the parent domain so the
  // medikah.health JWT is presented on practikah.medikah.health (consumed by
  // the Plan 13.1-05 nginx auth_request handoff). The existing patient
  // Credentials sessions also become .medikah.health-scoped as a deliberate
  // side effect (16-04 must_haves) — NextAuth does not support per-provider
  // cookie config and no patient surface lives on practikah.medikah.health.
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        domain: '.medikah.health',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      },
    },
  },
  // ROADMAP Phase 16 Success Criterion 2 — ≤ 1h JWT TTL.
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,
  },
};

export default NextAuth(authOptions);
