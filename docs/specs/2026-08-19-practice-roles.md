# Spec: Practice Roles (admin / executive assistant with delegated access)

Status: DRAFT · 2026-08-19 · owner: Hector

## Why

Today a practice is exactly one login. `physician_workspace_accounts` is
`UNIQUE(physician_id)`, the Mailcow IMAP provider resolves a mailbox to a single
physician, and every downstream table keys on `physician_id` alone. There is no
actor/subject distinction anywhere in the stack.

Real practices do not run that way. The doctor is the scarcest person in the
building and the least available to answer a scheduling question. The first role
we owe them is an administrator or executive assistant who can hold the calendar,
triage inquiries, and schedule on the doctor's behalf, without ever touching the
doctor's clinical surfaces or the doctor's personal Cue memory.

This spec covers that one role. It is deliberately not a general RBAC system.

## Principles (non-negotiable)

- **Fail closed.** Because `physician_id` is the subject claim everywhere, an
  assistant session that simply carries the doctor's `physician_id` would inherit
  full ownership by default. Every new surface must be denied unless explicitly
  granted, and the deny must live at the backend, not only in the UI.
- **Clinical and memory surfaces are the doctor's alone.** Clinical decision
  support and `cue_memory_notes` are never delegated, at any tier, by any grant.
  There is no configuration that opens them.
- **The doctor grants and the doctor revokes.** No admin-side path creates an
  assistant. Platform staff can see that a delegation exists; they cannot mint one.
- **Actor is always recorded.** Every delegated write names the human who did it,
  separately from the physician it was done for.

## What exists today (the four constraints this design routes around)

1. **Identity is `physician_id`, singular.** `lib/physicianAuthz.ts`
   `sessionOwnsPhysician()`, `medikah-chat-api/utils/auth.py`
   `_decode_and_lookup()`, `cue_usage_daily` PK, `cue_memory_notes.physician_id`,
   `physician_appointments.physician_id`. None of them can express "actor acting
   for subject".
2. **Login is a mailbox probe.** `lib/auth/mailcowImapProvider.ts`
   `resolvePhysicianByMailbox()` queries `physician_workspace_accounts` on
   `(mailbox_local_part, mailbox_domain)`. That table is 1:1 with a physician, so
   an assistant mailbox cannot live in it.
3. **The Cue boundary trusts exactly one claim.** `lib/cue/backendToken.ts`
   `mintCueBackendToken()` emits `physician_id`; FastAPI resolves the physician
   row from it and, for `/cue/*`, performs no further check. Whatever we build
   collapses to "which `physician_id` does the BFF put in the 5 minute JWS", and
   the backend today cannot tell a delegated token from an owner token.
4. **Audit has the shape but no vocabulary.** `lib/workspaceAuditService.ts`
   `logEvent()` already takes `physicianId` (subject) and `actorId` (actor), so
   the table supports actor != subject. But `ActorRole` is the closed union
   `'physician' | 'admin' | 'system'`, and no non-admin path ever writes the
   combination.

One trap worth naming so nobody reaches for it: **an assistant must never be
added to `physician_email_aliases`.** That table is a many-emails-to-one-physician
map. An alias row would make the assistant *become* the doctor for
`detectUserRole()`, `checkBootstrapDemotion()`, and `onboarding-status.ts`,
silently granting full ownership with no audit trail.

## Role model

Two roles on a practice, and the practice is identified by the doctor's
`physician_id`.

| Role | Who | Identity source |
|---|---|---|
| `owner` | the physician | `physician_workspace_accounts` (unchanged) |
| `assistant` | practice admin / executive assistant | `practice_members` (new) |

`owner` is not stored. It stays implicit in `physician_workspace_accounts`, which
means no migration of existing accounts and no risk of a doctor losing access to
their own practice because a membership row went missing. The JWT already
hard-codes `workspace_role: 'owner'` in `mailcowImapProvider.ts`; this spec turns
that literal into a value that is sometimes `'assistant'`.

An assistant belongs to exactly one practice in the MVP. The table is modelled to
allow more than one later, but the login resolution assumes one and should reject
ambiguity loudly rather than pick.

## Table changes

### New: `practice_members`

```sql
create table practice_members (
  id uuid primary key default gen_random_uuid(),
  physician_id uuid not null references physicians(id) on delete cascade,
  role text not null default 'assistant' check (role in ('assistant')),
  full_name text not null,
  invited_email text not null,
  mailbox_local_part text,
  mailbox_domain text default 'medikah.health',
  mailbox_address text,
  mailbox_password_set boolean not null default false,
  totp_enrolled boolean not null default false,
  totp_secret text,
  activation_complete boolean not null default false,
  session_epoch bigint not null default 0,
  status text not null default 'invited'
    check (status in ('invited','active','suspended','revoked')),
  invited_by uuid references physicians(id),
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mailbox_local_part, mailbox_domain)
);
```

The activation and 2FA columns intentionally mirror
`physician_workspace_accounts` (`mailbox_password_set`, `totp_enrolled`,
`totp_secret`, `activation_complete`, `session_epoch`) so the existing activation
and re-enrollment code can be pointed at either table rather than reimplemented.
An assistant gets a real `@medikah.health` mailbox and the same three flag
activation gate as a doctor. No shared logins.

RLS: service role only, matching `cue_memory_notes` and `isabel_*`. Every read
path is server side through `supabaseAdmin`.

### New: `practice_member_invitations`

Copy the shape of `physician_activation_tokens` (migration 025) exactly:
`id, member_id, token_hash, expires_at, consumed_at, created_at`. SHA-256 of the
raw JWT, raw never stored, 30 minute TTL, `consumed_at` marked before the side
effect, append-only RLS with no DELETE policy. `lib/auth/activationTokens.ts` is
the model to copy.

### Changed: `lib/workspaceAuditService.ts`

`ActorRole` gains `'assistant'`. New `WorkspaceAction` members:
`practice.member_invited`, `practice.member_activated`, `practice.member_revoked`,
`practice.acted_as`. Existing calls are unaffected.

### Changed: `physician_appointments`

No schema change. The existing `source` column
(`'cue' | 'manual'`) already carries the blast radius guard, and its comment
already anticipates this: *"manual = dashboard/receptionist; no such path yet"*.
Assistant writes land as `source='manual'`, which means Cue's `clear_range` will
never delete an assistant's appointment, because it only touches events tagged
`X-CUE-MANAGED`. That is the correct default and it comes for free.

## Invitation flow

The doctor invites, the assistant activates. Modelled on the existing
request/approve split in `physician_totp_resets`, and on the activation email
path in `lib/activationEmail.ts`.

1. **Doctor invites.** `POST /api/practice/members` from the workspace settings
   tab. Body: `{ full_name, invited_email, mailbox_local_part }`. Gated by
   `getServerSession` plus `session.user.workspace_role === 'owner'` plus
   `session.user.physician_id` as the practice. Inserts `practice_members` with
   `status='invited'`.
2. **Mailbox provisioning.** Reuse `lib/mailcowProvisioner.ts`. The local part
   pattern for assistants is the person's name rather than the `dr-` / `dra-`
   honorific form, for example `asistente-torres`. Same 5 GB quota, same
   throwaway password that is generated, never logged, never persisted, and
   discarded. Same `RESERVED_LOCAL_PARTS` block list.
3. **Invitation email.** Reuse the Resend transport in `lib/activationEmail.ts`
   with new copy. Link is `/auth/activate/{token}` against the new token table,
   or a parallel `/auth/practice-activate/{token}` if reusing the physician page
   proves messier than forking it. Spanish first, matching the doctor's
   `onboarding_language`.
4. **Assistant activates.** Set mailbox password, then enroll TOTP. Identical to
   the physician activation page, including the duplicate-authenticator-entry
   warning copy. `activation_complete` flips atomically with `totp_enrolled`,
   the same D-01 gate.
5. **Doctor revokes.** `DELETE /api/practice/members/{id}` sets
   `status='revoked'`, bumps `session_epoch`, and deletes the Mailcow mailbox.
   Revocation must be one click and must take effect on the next request.

## Permission matrix

`R` = read, `W` = write, `-` = denied (403).

| Surface | Owner | Assistant |
|---|---|---|
| Calendar read (`calendar_read_day`) | R | R |
| Calendar block / clear (`POST /cue/calendar/confirm-write`) | W | W |
| Appointments (`physician_appointments`) | RW | RW as `source='manual'` |
| Inquiries list / accept / decline | RW | RW |
| Availability read / update | RW | RW |
| Dashboard aggregate | R | R |
| Doctor's inbox (`inbox_read_recent`) | R | - |
| Clinical decision support | RW | - |
| Cue memory (read, write, aviso, delete) | RW | - |
| Profile, credentials, education, specialties (`/api/physicians/[id]/*`) | RW | - |
| Verification and cédula surfaces | R | - |
| Billing, tier, upgrade | RW | - |
| Workspace security (password, TOTP, recovery) | RW | own only |
| Invite / revoke members | W | - |

Three lines in that table are the whole point of the spec, so they get restated
plainly. An assistant can see when the doctor is busy and can move that around.
An assistant cannot read the doctor's mail, cannot use clinical decision support,
and cannot see or write a single row of `cue_memory_notes`. The memory surface is
where the doctor's own voice accumulates, and it is not a practice asset.

## How Cue sessions carry the acting role

This is the load-bearing change, because it is the only place where a delegated
request becomes indistinguishable from an owner request today.

**Hop 1, NextAuth JWT.** `mailcowImapAuthorize()` gains a second resolution step.
`resolvePhysicianByMailbox()` queries `physician_workspace_accounts` first; on a
miss it queries `practice_members` on `(mailbox_local_part, mailbox_domain)` with
`status='active'`. A hit returns the member's own id as `actor_id`, the practice's
`physician_id` as the subject, and `workspace_role: 'assistant'`. A miss on both
stays the existing D-11 hard block. The TOTP gate reads the same three flags off
whichever row matched.

The `workspace_role` type union in `types/next-auth.d.ts` widens from the single
literal `'owner'` to `'owner' | 'assistant'`. Because it is currently hard-coded
in three places in `mailcowImapProvider.ts`, the compiler will point at every site
that needs to stop assuming.

New JWT claims: `workspace_role` (now meaningful), `actor_id`, and
`actor_kind: 'physician' | 'member'`. `physician_id` keeps its exact current
meaning, the subject, which is why nothing downstream breaks.

**Hop 2, the BFF mints the backend token.** `lib/cue/backendToken.ts`
`mintCueBackendToken()` gains `actingRole` and `actorId`, emitted as claims
`acting_role` and `actor_id` alongside the existing `physician_id`. Every BFF
route that calls it passes them through from `getToken()`:
`pages/api/cue/chat.ts`, `pages/api/cue/calendar/confirm-write.ts`,
`pages/api/cue/credential.ts`, `lib/cue/forwardToCue.ts`, `transcribe.ts`,
`tts.ts`, `clinical-support/email.ts`.

Two BFF routes must reject an assistant outright, before minting anything:
`clinical-support/email.ts` and the memory routes behind `forwardToCue.ts`.

**Hop 3, FastAPI enforces.** `medikah-chat-api/utils/auth.py` `_decode_and_lookup()`
reads `acting_role`, defaulting to `'owner'` when the claim is absent. That default
is safe: these tokens are minted only by our own BFF and expire in five minutes,
so the absent case is purely a deploy-window compatibility path, not an attacker
path. The resolved `AuthContext` gains `acting_role` and `actor_id`.

`services/cue/tools/registry.py` filters the tool list by `acting_role` before the
model ever sees it. An assistant's Cue never receives `clinical_decision_support`
or `inbox_read_recent` in its tool set, so there is no tool call to refuse and no
prompt to talk the model out of. Belt and braces: the executors in
`services/cue/tools/executors.py` re-check the role, so a stale or hand-crafted
token cannot reach a denied tool through a path the registry missed.

The memory layer is gated at the top of `services/cue/memory/store.py`. When
`acting_role != 'owner'`, recall returns empty and append is a no-op. An
assistant's Cue conversation is stateless across sessions in the MVP, which is
acceptable and is the safe direction to be wrong in.

**Credential broker.** `services/cue/credential_broker.py` mints a Mailcow app
password scoped to `["imap_access", "dav_access"]`. For an assistant this must be
narrowed to `["dav_access"]` only. That single change is what makes "the assistant
cannot read the doctor's mail" true at the protocol level rather than at the
application level, and it is the highest value line of code in this spec.

## MVP cut (one week)

Ship the delegation, not the administration of it.

**In:**

1. Migration: `practice_members` and `practice_member_invitations`, service role
   RLS. Widen `ActorRole` and add the four `WorkspaceAction` members.
2. `mailcowImapProvider.ts` second resolution step, plus the widened
   `workspace_role` union and the resulting compiler-driven fixes.
3. `mintCueBackendToken()` carries `acting_role` and `actor_id`; all seven BFF
   call sites pass them; the two clinical and memory BFF routes 403 an assistant.
4. FastAPI: `AuthContext.acting_role`, registry tool filtering, executor re-check,
   memory store gate, `dav_access` only in the credential broker.
5. Invite and revoke: two API routes and a small settings panel on the doctor's
   workspace tab. Invitation email reuses the Resend path with new copy, Spanish
   first.
6. Assistant activation: password then TOTP, reusing the physician activation
   page with the member token table behind it.
7. Tests. The three that matter and must fail before they pass: an assistant token
   cannot reach `clinical_decision_support`, cannot read or append
   `cue_memory_notes`, and cannot get an app password carrying `imap_access`.

**Out, deliberately:**

- More than one assistant per practice, and any role beyond `assistant`.
- An assistant working for more than one doctor. Resolution rejects ambiguity.
- Per-permission configuration. The matrix above is hard-coded.
- Admin-side management of members. Platform staff can read, not create.
- Assistant Cue memory, notification routing, and any assistant-facing analytics.
- Migrating existing appointments or backfilling anything.

**Open questions for Hector:**

- Local part convention for assistants. `asistente-{surname}` reads clearly in
  Spanish but bakes the role into an address that outlives the person in it. The
  alternative is the plain given name, for example `laura-torres`.
- Whether an assistant should see patient names in the inquiries list in full, or
  the truncated first-name-plus-last-initial form that `physician_appointments`
  already enforces. This is an LFPDPPP question before it is a product question,
  and the conservative answer is to match the appointments table.
- Whether revocation should also purge the assistant's mailbox contents or leave
  the mail in place for the practice's records.
