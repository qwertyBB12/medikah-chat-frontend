# Runbook — Mailcow Admin 2FA Re-enable + Mailbox TFA Audit

**Created:** 2026-06-12 (Plan 17-06, AUTH-13)
**Context:** Mailcow admin 2FA was disabled across the board during the April 2026
recovery session. This runbook re-enables it for the `admin` user and documents
the audit query for every active mailbox. Standing rule: **DO NOT leave 2FA off
in production** (STATE.md carry-item, closed by this runbook's execution).

---

## Where the admin panel lives

- Admin UI: **https://practikah.medikah.health/admin**
- ⚠️ `mail.medikah.health` is **NXDOMAIN** — it no longer resolves. Do not use
  old bookmarks or docs that reference it.
- SOGo webmail (separate surface): https://practikah.medikah.health/SOGo —
  **use Safari**; Chrome cookie state on medikah.health is contaminated
  (see PICKUP-2026-04-26).

## What Mailcow TFA does and does not protect

Mailcow's TFA system (the `tfa` MySQL table) gates:

- the Mailcow **admin UI** login
- **SOGo browser** logins

It does **NOT gate IMAP**. The medikah.health physician login authenticates via
an IMAP probe (`mailcowImapProvider.ts`, Phase 16), which Mailcow TFA never
touches. The **binding 2FA enforcement for physician accounts is the app-layer
TOTP gate** shipped in Plan 17-04 (NextAuth `needs_totp` sentinel +
`/api/auth/activate/totp-verify`). Enrolling a physician in Mailcow TFA adds
protection for direct SOGo logins only; it is not the physician 2FA mechanism.

There is no Mailcow Admin API for per-mailbox TFA management (GitHub issue
#6587, open feature request). Admin TFA changes are **UI-only operator
actions**; SQL against the `tfa` table is documented solely as a recovery path.

## 1. Re-enable WebAuthn (Touch ID) for the `admin` user

Performed together with Hector (D-09) — WebAuthn via Touch ID is what he
already uses with Mailcow.

1. Sign in at https://practikah.medikah.health/admin as `admin`.
2. Top-right user menu → **Two-Factor Authentication**.
3. Select **WebAuthn (U2F/FIDO2)** → **Register device**.
4. Complete the Touch ID prompt on Hector's machine. Name the key something
   identifying (e.g. `hector-touchid-2026`).
5. Sign out and sign back in to confirm the WebAuthn challenge fires before
   the session opens.

### TOTP fallback (documented per D-09 — enroll when convenient)

WebAuthn is device-bound. If Hector's machine is unavailable, admin access
would otherwise require the SSH recovery path. To add a portable fallback:

1. Same Two-Factor Authentication menu → **TOTP**.
2. Scan the QR with Duo (recommended; Authy / Google Authenticator work).
3. Store the one-time recovery code in the SOPS vault
   (`runbooks/mailops-secrets.enc.yaml`), not in a plaintext note.

Mailcow allows multiple TFA methods on one account; WebAuthn and TOTP can
coexist.

## 2. Audit: which active mailboxes have no Mailcow TFA row

Run inside the Mailcow MySQL container on the VPS:

```bash
cd /opt/mailcow-dockerized
docker compose exec -T mysql-mailcow mysql -umailcow -p$(grep ^DBPASS mailcow.conf | cut -d= -f2) mailcow -e \
  "SELECT username FROM mailbox m LEFT JOIN tfa t ON t.username=m.username WHERE t.username IS NULL AND m.active=1;"
```

Interpretation:

- `admin` missing a row → re-enable per section 1. This is the AUTH-13 gap.
- Physician mailboxes missing a row → **expected and acceptable**, because
  Mailcow TFA would not gate their IMAP login anyway. Confirm instead that the
  app-layer gate covers them: `physician_workspace_accounts.totp_enrolled=true`
  and `activation_complete=true` for every live physician (Plan 17-04 enforces
  the prompt at login).
- Record the audit output in the executing plan's SUMMARY.

## 3. Recovery paths (read before touching anything)

- **Admin lockout (lost WebAuthn + TOTP):** SSH to the VPS and run
  `bash /opt/mailcow-dockerized/helper-scripts/mailcow-reset-admin.sh` — the
  official reset script. Do **not** hand-write `UPDATE`/`DELETE` against the
  `admin` table; the helper script avoids hash-escaping mistakes
  (PICKUP-2026-04-26). The documented TFA reset for a named user is
  `DELETE FROM tfa WHERE username='<user>';` followed by fresh enrollment —
  recovery only, never routine management.
- **fail2ban:** repeated failed logins (including your own, during testing)
  can ban the operator IP. The manual whitelist
  (`iptables -I INPUT -s <ip> -j ACCEPT`) is **not persistent** across
  container restarts (STATE.md carry-item). If locked out, clear the ban from
  the VPS console before assuming an outage.
- **SOGo verification logins:** Safari only (Chrome cookie contamination).

## Cross-references

- `MedikahHub/.planning/phases/10-vendor-infrastructure-bring-up/runbooks/PICKUP-2026-04-26.md` — admin reset script, fail2ban ban-at-session-start incident
- `MedikahHub/.planning/phases/10-vendor-infrastructure-bring-up/runbooks/mailops-secrets.md` + `mailops-secrets.enc.yaml` — SOPS vault for recovery codes
- `MedikahHub/.planning/phases/17-workspace-activation-flow/17-RESEARCH.md` Finding 1 — TOTP layer ownership (why app-layer, not Mailcow TFA)
- Plan 17-04 SUMMARY — the app-layer TOTP gate implementation
