# Runbook — Identity Recovery, FLOW-01 Entry Path, and Lost-2FA Reset

**Created:** 2026-06-17 (Phase 18 Plan 18-06)
**Requirements:** AUTH-03, AUTH-04, AUTH-07, FLOW-01, FLOW-05, SC1, SC4, SC5
**Decisions:** D-01 through D-11 from 18-CONTEXT.md
**Status:** Live (migration 027 must be applied before the alias funneling guard is active — see Section 6)

---

## Overview

This runbook documents three end-to-end journeys for physician identity in Práctikah:

1. **FLOW-01** — A new, unverified physician enters the platform at medikah.health
2. **Recovery (AUTH-07 / FLOW-05)** — A graduated physician resets their Mailcow password
3. **Lost-2FA (SC5 / D-06)** — A physician's authenticator device is gone; admin one-tap resets TOTP

It also documents the **demotion wall** (D-01), the **hijack-prevention rules** (D-05), the **identity-spine dedup behavior** (D-09/D-10), and the **founder dedup migration** (D-11).

---

## 1. FLOW-01 — New Physician Entry Path (AUTH-03 / SC1)

### Who uses this path

Any physician who is not yet verified (verification_status != 'verified') and does not have an activated workspace (activation_complete = false).

Bootstrap identity is accepted at this stage — Google or email-password authentication opens the door. A physician in this state is NOT subject to the demotion wall (D-01) because they have not yet been graduated.

### Step-by-step

1. Physician visits `https://medikah.health` and clicks "Join as Physician."
2. Redirected to `/chat`. Selects "I'm a Physician."
3. Authenticates via Google or email-password (credentials provider).
   - LinkedIn has been removed as an auth provider (decision 40, 2026-06-16).
4. NextAuth jwt() callback resolves the role:
   - `detectUserRole(email)` queries the `physicians` table.
   - If no physician row exists → role = 'guest'; redirected to `/physicians/onboard`.
   - If physician row exists with verification_status = 'pending' → role = 'physician'; redirected to onboarding.
5. Onboarding agent (`/physicians/onboard`) runs the batched card flow.
6. On completion, `POST /api/physicians/create` is called.

### Dedup behavior at create time (D-09 / D-10)

Before the physicians INSERT, `create.ts` checks two things:

**Alias funneling (D-09):** If the email exists in `physician_email_aliases`, the route returns the canonical physician_id with `resolvedViaAlias: true`. No new row is inserted. This handles the case where a physician previously registered with a different email that was later aliased to their canonical record (e.g., the founder registering with `hector@nxtglobal.org` after the alias was seeded by migration 027).

**License collision (D-10):** If the incoming `licenses[]` payload contains a `license_number` already in `physician_licenses` under any physician, the route returns HTTP 409 with `collision: true`. No ghost row is created, no auto-merge. The physician is directed to contact support@medikah.health. The collision is logged via console.warn for the admin audit trail.

The existing 23505 duplicate-email guard (upsert on existing email) runs AFTER the alias check and handles ordinary re-submission of a known email.

### Audit literals written during FLOW-01

- None specific to FLOW-01 — onboarding does not call logEvent directly (it predates Phase 11 audit logging).
- The physician_onboarding_audit table captures `action = 'completed'` at the end of the batched card flow.

---

## 2. Recovery Flow — Forgot Mailcow Password (AUTH-07 / FLOW-05 / SC4)

### Who uses this path

A graduated physician (verification_status = 'verified', activation_complete = true) who forgot their Medikah Mailcow password.

### Key invariants (D-04 / D-05)

- **D-04: Recovery never bypasses 2FA.** After resetting their password, the physician must still enter a valid TOTP code from their authenticator to sign in. The password reset alone does not defeat the second factor.
- **D-05: Recovery is locked to the email already on file.** The magic link is sent ONLY to the `physicians.email` on record for that physician — never to an address the user types in the UI. Google re-auth recovery only succeeds when the Google account's email exactly matches `physicians.email`. This closes the account-takeover vector.

### Step-by-step (magic-link channel)

1. Physician visits `/auth/recovery` and selects "Send magic link to my recovery email."
2. Enters their email address (only used to look up the record — link goes to `physicians.email`).
3. `POST /api/auth/recovery/request-link` is called:
   - Looks up the physician by email.
   - Verifies `activation_complete = true` (only graduated physicians use recovery).
   - Generates a 30-minute HS256 single-use recovery token (lib/auth/recoveryTokens.ts).
   - Stores SHA-256 hash in `physician_recovery_tokens`.
   - Sends email via Resend (Práctikah brand, `welcome@medikah.health`) with the recovery link.
   - Always returns `{ sent: true }` — non-enumeration (D-05).
   - Audits `workspace.recovery_link_sent`.
4. Physician clicks the magic link (`/auth/recovery?token=<jwt>`).
5. Recovery page validates the token and presents the password-set form.
6. `POST /api/auth/recovery/set-password` is called:
   - Verifies the token signature, expiry, and that `consumed_at IS NULL`.
   - Marks `consumed_at = NOW()` (single-use enforcement).
   - Calls `checkPassword()` — same ≥12-char / ≥3-of-4-classes policy as activation.
   - Updates Mailcow via `/api/v1/edit/mailbox` with the new password.
   - Audits `workspace.recovery_password_changed` (= `workspace.password_changed` with `detail.flow = 'recovery'`).
7. Physician is redirected to `/chat` to sign in with their new Mailcow password + TOTP (D-04).

### Step-by-step (Google re-auth channel)

1. Physician visits `/auth/recovery` and selects "Verify with Google."
2. Standard Google OAuth flow (NextAuth).
3. `POST /api/auth/recovery/google-verify` is called:
   - Gets the server session; verifies `session.user.provider === 'google'`.
   - Looks up physician by `session.user.email` in `physicians` table.
   - Verifies `physicians.email === session.user.email` (exact match, D-05).
   - Verifies `activation_complete = true`.
   - Issues a short-lived recovery token for the password-set step.
   - Audits `workspace.recovery_google_verified`.
4. Physician is presented with the password-set form (same as magic-link channel step 5–7 above).

### Audit literals written during recovery

| Step | Action | Security-relevant |
|------|--------|-------------------|
| Magic link sent | `workspace.recovery_link_sent` | Yes (IP + UA captured) |
| Google re-auth verified | `workspace.recovery_google_verified` | Yes |
| Password changed | `workspace.recovery_password_changed` | Yes |

### workspace_audit_log verification query

```sql
SELECT
  action,
  occurred_at,
  detail,
  ip_address
FROM workspace_audit_log
WHERE physician_id = '<physician_uuid>'
  AND action IN (
    'workspace.recovery_link_sent',
    'workspace.recovery_google_verified',
    'workspace.recovery_password_changed'
  )
ORDER BY occurred_at DESC
LIMIT 20;
```

---

## 3. Lost-2FA Flow — Admin-Driven TOTP Reset (SC5 / D-06)

### Who uses this path

A graduated physician whose TOTP authenticator device is permanently lost (not just a wrong-code situation — that resolves with ±1 window tolerance).

### Why human approval is mandatory (D-06)

"I lost my 2FA device" is exactly what a password thief who obtained the Mailcow password would claim. Automatic reset would convert a single-factor compromise into a full account takeover. The admin approval step (one tap by Hector or José) is the deliberate human-in-the-loop safeguard. At CDMX (40+ doctors physically present), this is trivial — verify the doctor is standing in front of you before approving.

### Prerequisite: first factor must be cleared

The physician must clear the first factor (Mailcow password) BEFORE filing the lost-2FA request. This ensures the attacker-claim scenario requires BOTH: (a) knowing the Mailcow password, and (b) convincing an admin that they are the legitimate account holder. Filing the request requires a valid authenticated session.

### Step-by-step

1. Physician has a valid Mailcow session (mailcow-imap provider) or just completed password recovery.
2. Physician navigates to the lost-2FA affordance (linked from the TOTP sign-in step on `/chat` — "I lost my authenticator" link).
3. `POST /api/auth/recovery/lost-2fa-request` is called:
   - Requires `session.user.email` — anonymous callers receive `{filed: true}` with no row written (T-18-06-02).
   - Looks up physician by session email.
   - Verifies `activation_complete = true` (only activated physicians have enrolled TOTP).
   - Rate-limited: 1 request per 5 minutes per physician.
   - Idempotent: if a pending row already exists, skip insert.
   - Inserts a `physician_totp_resets` row with `status = 'pending'`.
   - Sends admin notification email to `DOCTOR_NOTIFICATION_EMAIL` (hector@medikah.health).
   - Audits `workspace.totp_reset_requested` with `detail.flow = 'lost_2fa'`.
   - Always returns `{filed: true}` — non-enumeration (D-05).
4. Admin (Hector or José) receives the notification email with a link to `/admin/totp-resets`.
5. Admin verifies the physician's identity via a secondary channel (phone, in-person at CDMX, etc.).
6. Admin calls `POST /api/admin/totp-reset-approve` with `{physician_id, action: 'approve'}`:
   - Requires admin session (getAdminUser → 401 otherwise).
   - Sets `physician_workspace_accounts.totp_enrolled = false` and `totp_secret = null`.
   - `activation_complete` is NOT changed (only the 2FA factor resets, not the whole workspace).
   - Sets the `physician_totp_resets` row `status = 'approved'`, `actioned_by = admin.email`, `actioned_at = now()`.
   - Audits `workspace.totp_reset_approved` with `detail.approved_by` and `detail.request_id`.
7. On next login, `mailcowImapProvider.ts` detects `totp_enrolled = false` and routes the physician through the activation TOTP setup step again — the standard TOTP enrollment flow from Plan 17-04.
8. At CDMX: the doctor is physically present; the admin can approve on-site, hand the doctor a new device, and the doctor re-enrolls immediately.

### Deny path

If the request is suspected fraud or the physician cannot be verified:
`POST /api/admin/totp-reset-approve` with `{physician_id, action: 'deny'}` sets `status = 'denied'` and audits `workspace.totp_reset_denied`.

### Audit literals written during lost-2FA

| Step | Action | Security-relevant |
|------|--------|-------------------|
| Request filed | `workspace.totp_reset_requested` | Yes (IP + UA captured) |
| Admin approved | `workspace.totp_reset_approved` | Yes |
| Admin denied | `workspace.totp_reset_denied` | No (informational — no credential change) |

### workspace_audit_log verification query

```sql
SELECT
  action,
  occurred_at,
  actor_role,
  detail,
  ip_address
FROM workspace_audit_log
WHERE physician_id = '<physician_uuid>'
  AND action IN (
    'workspace.totp_reset_requested',
    'workspace.totp_reset_approved',
    'workspace.totp_reset_denied'
  )
ORDER BY occurred_at DESC
LIMIT 20;
```

### physician_totp_resets queue query

```sql
SELECT
  ptr.id,
  ptr.physician_id,
  p.email,
  p.full_name,
  ptr.status,
  ptr.requested_at,
  ptr.actioned_by,
  ptr.actioned_at
FROM physician_totp_resets ptr
JOIN physicians p ON p.id = ptr.physician_id
WHERE ptr.status = 'pending'
ORDER BY ptr.requested_at ASC;
```

---

## 4. Demotion Wall (D-01 / AUTH-03)

### What the wall does

When a graduated physician (activation_complete = true) authenticates via Google (bootstrap), the NextAuth jwt() callback sets `token.bootstrap_demoted = true`. The `/chat` page detects this flag and shows a branded threshold screen instead of routing to the dashboard:

- Heading: "Your Workspace Is Ready"
- Body: "Use your Medikah email and password to continue. Your @medikah.health mailbox, calendar, and dashboard are waiting."
- CTA: "Sign in with Medikah credentials" (deep link to the Mailcow credential flow)
- Recovery link: "Forgot your Medikah password?" (links to `/auth/recovery`)

The wall is enforced server-side in the JWT callback — never on the client alone (D-01). The Google button still physically renders on `/chat` because the page cannot know the account's graduation status until after Google's OAuth callback completes.

The audit literal `workspace.bootstrap_demotion_hit` is written when the wall is shown.

### Cookie hint (D-02)

After a successful Mailcow password sign-in on a given device, a cookie `mk_physician_graduated=1` is set (1-year expiry). On subsequent visits from the same device, `/chat` de-emphasizes the Google button (displays "recover access" link instead of a primary button). This is UX polish — the wall is the security guarantee, not the cookie.

---

## 5. Identity Spine and Dedup Behavior (D-07 through D-11)

### One human = one canonical record (D-07)

A cross-border physician (Mexican cédula + US NPI + Colombian cédula) is ONE record with multiple credentials. The existing dual-credential storage (DUAL-01/02, Phases 5/6/7) models this; Phase 18 adds an identity spine above it via `physician_email_aliases`.

### Email alias funneling (D-09)

The `physician_email_aliases` table maps every bootstrap email a physician has ever used to their ONE canonical physician record. This prevents re-registration with a different email from creating a ghost row.

Who writes aliases:
- Migration 027 seeds the founder's aliases (hector@benextglobal.com and hector@nxtglobal.org → 7f8a308f).
- Future aliases can be added by an admin via the service role (never by the client — RLS enforces this).

How the guard fires:
- `POST /api/physicians/create` checks `physician_email_aliases` BEFORE the insert.
- If a match is found, returns `{resolvedViaAlias: true, physicianId: <canonical>}`.

### License collision (D-10)

If a new registration's `licenses[].number` matches a `license_number` already in `physician_licenses` under any physician, the route returns HTTP 409 with `collision: true`. No ghost row is created, no auto-merge. The physician is directed to contact support@medikah.health. Hector or José investigates whether this is a legitimate multi-record situation (fraud, test account cleanup, etc.).

Collisions are logged via `console.warn` (visible in Netlify function logs) and in the HTTP 409 response body for the operator.

### Ghost rows preserved (D-11)

The founder's three physician records are NOT deleted by migration 027 or any Phase 18 code. They carry verified status and audit history. The alias table is the forward guard; a full merge console is explicitly deferred until real duplicate volume justifies engineering it (D-11). The canonical record for the founder is:

- **Canonical:** `7f8a308f-e753-4d54-bfe9-19f430ac3a89` (hhlopez@gmail.com) — owns hector@medikah.health mailbox + re-keyed TOTP enrollment
- **Ghost 1:** `7f0b88a2-649f-43f2-9425-9abe59654086` (hector@benextglobal.com, verified, no mailbox)
- **Ghost 2:** `884ce7f9-ea05-4403-b9c6-992703e99f1c` (hector@nxtglobal.org, pending, no mailbox)

Migration 027 seeds alias rows for hector@benextglobal.com and hector@nxtglobal.org → 7f8a308f, so any future registration attempt with those emails resolves to the canonical record.

---

## 6. Production Migration Checklist (D-11 / CHECKPOINT for Hector)

**Status: NOT YET APPLIED.** This section documents the exact commands Hector must run. The code is committed; the tables do not yet exist in production until this section is executed.

### What migration 027 creates

1. `physician_email_aliases` — bootstrap email → canonical physician_id mapping table (D-09 funneling)
2. `physician_recovery_tokens` — single-use 30-min magic-link token table (D-03)
3. `physician_totp_resets` — self-service lost-2FA request queue (D-06)
4. Two seed rows: `hector@benextglobal.com` and `hector@nxtglobal.org` → `7f8a308f` (D-11)

### Pre-apply verification (before running db push)

```sql
-- Check current state of the three tables (should return 0 rows / table not found)
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('physician_email_aliases', 'physician_recovery_tokens', 'physician_totp_resets')
);

-- Confirm the three founder records exist and are intact
SELECT id, email, verification_status
FROM physicians
WHERE id IN (
  '7f8a308f-e753-4d54-bfe9-19f430ac3a89',
  '7f0b88a2-649f-43f2-9425-9abe59654086',
  '884ce7f9-ea05-4403-b9c6-992703e99f1c'
);

-- Confirm the canonical 7f8a308f workspace binding
SELECT physician_id, mailbox_local_part, activation_complete, totp_enrolled,
  (totp_secret IS NOT NULL) AS has_totp_secret
FROM physician_workspace_accounts
WHERE physician_id = '7f8a308f-e753-4d54-bfe9-19f430ac3a89';
```

Expected: 3 founder rows, canonical workspace: activation_complete=true, totp_enrolled=true, has_totp_secret=true.

### Apply the migration

```bash
cd medikah-chat-frontend
supabase db push
```

(History was repaired 2026-06-12; migrations 024 + 025 were applied this way. If db push fails, use the mgmt-API SQL path documented in MEMORY reference_supabase_mgmt_api_sql.)

### Post-apply verification (run after db push succeeds)

```sql
-- 1. Confirm the three tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('physician_email_aliases', 'physician_recovery_tokens', 'physician_totp_resets')
ORDER BY tablename;
-- Expected: 3 rows

-- 2. Confirm the two founder alias rows
SELECT physician_id, email, created_by, created_at
FROM physician_email_aliases
WHERE email IN ('hector@benextglobal.com', 'hector@nxtglobal.org');
-- Expected: 2 rows, both physician_id = '7f8a308f-e753-4d54-bfe9-19f430ac3a89'

-- 3. Confirm the three founder physician rows are all still present (NONE deleted)
SELECT id, email, verification_status
FROM physicians
WHERE id IN (
  '7f8a308f-e753-4d54-bfe9-19f430ac3a89',
  '7f0b88a2-649f-43f2-9425-9abe59654086',
  '884ce7f9-ea05-4403-b9c6-992703e99f1c'
);
-- Expected: 3 rows present

-- 4. Confirm the canonical 7f8a308f workspace binding is intact
SELECT physician_id, mailbox_local_part, activation_complete, totp_enrolled,
  (totp_secret IS NOT NULL) AS has_totp_secret
FROM physician_workspace_accounts
WHERE physician_id = '7f8a308f-e753-4d54-bfe9-19f430ac3a89';
-- Expected: activation_complete=true, totp_enrolled=true, has_totp_secret=true
-- totp_secret must be NON-NULL (re-keyed TOTP from Phase 17 must not have been cleared)
```

If step 4 shows `has_totp_secret = false` or `totp_enrolled = false`, STOP — the canonical binding was damaged. Check if any totp-reset-approve call was inadvertently run. Do NOT proceed.

### Signal to continue

After running the post-apply verification and confirming all four checks pass, type "applied" in the resume prompt with the verification SQL output. The plan's code tasks are fully committed; this is the only production step remaining.

---

## 7. All Audit Literals at a Glance

| Action | Trigger | Security-relevant | IP+UA captured |
|--------|---------|-------------------|----------------|
| `workspace.recovery_link_sent` | Recovery magic-link dispatched | Yes | Yes |
| `workspace.recovery_google_verified` | Google re-auth matched email on file | Yes | Yes |
| `workspace.recovery_password_changed` | New Mailcow password set via recovery | Yes | Yes |
| `workspace.totp_reset_requested` | Physician filed lost-2FA request | Yes | Yes |
| `workspace.totp_reset_approved` | Admin cleared totp_enrolled + totp_secret | Yes | Yes |
| `workspace.totp_reset_denied` | Admin denied lost-2FA reset request | No | No |
| `workspace.bootstrap_demotion_hit` | Graduated physician hit bootstrap wall | Yes | Yes |

### Full recovery + reset audit query (any physician)

```sql
SELECT
  action,
  actor_role,
  occurred_at,
  detail,
  ip_address,
  user_agent
FROM workspace_audit_log
WHERE physician_id = '<physician_uuid>'
  AND action IN (
    'workspace.recovery_link_sent',
    'workspace.recovery_google_verified',
    'workspace.recovery_password_changed',
    'workspace.totp_reset_requested',
    'workspace.totp_reset_approved',
    'workspace.totp_reset_denied',
    'workspace.bootstrap_demotion_hit'
  )
ORDER BY occurred_at DESC
LIMIT 50;
```

---

*Phase 18-06 runbook — created 2026-06-17*
*Requirements: AUTH-03, AUTH-04, AUTH-07, FLOW-01, FLOW-05*
*Contact: hector@medikah.health for admin approval requests*
