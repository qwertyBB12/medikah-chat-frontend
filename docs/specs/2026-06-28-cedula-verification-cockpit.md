# Spec — Cédula Verification Cockpit (admin, AI-assisted manual)

Status: DRAFT · 2026-06-28 · owner: Hector · approver in product: Dr. Aguirre

## Why
MX cédula auto-verify is retired (SEP endpoint dead, new RNP reCAPTCHA-gated, no
open dataset — see memory `project_sep_cedula_verification_decision`). Cédulas are
verified by a human on the official RNP site. This tool removes the toil around
that human check: parse the official Constancia, match the name, record the result
with evidence. Human is the legal verifier; AI never auto-approves.

## Principles (non-negotiable)
- Human-in-the-loop, one cédula at a time. No reCAPTCHA bypass, no registry mirror.
- RNP stays authoritative; our record is a screening + audit artifact, never "official".
- Data minimization (LFPDPPP): store only our own doctors' outcomes + evidence.
- Admin-only. AI recommends; a human commits.

## Scope (MVP — Pattern B, artifact-assisted)
Admin panel on the existing admin physician detail surface. Flow:
1. Admin sees doctor's claimed name + cédula(s) + país + a deep link to the RNP site.
2. Admin runs the official lookup (passes reCAPTCHA as a human), downloads the
   "Constancia de Situación Profesional" PDF.
3. Admin uploads the PDF. System extracts {nombre, título, cédula, institución, año}
   (deterministic PDF-text parse first; LLM-vision OCR fallback for image scans).
4. System fuzzy-matches extracted name vs the doctor's profile → MATCH/PARTIAL/MISMATCH
   with a score, shown side-by-side.
5. Admin confirms/rejects → writes verification + files the Constancia in a PRIVATE
   Supabase Storage bucket; flips the doctor's badge.

Out of scope (MVP): browser automation (Pattern A), bulk ingest, US flow (NPI auto
already works).

## Decisions (locked 2026-06-28)
- Approvers: Dr. Aguirre + Hector (admin-gated).
- Store the Constancia PDF (private bucket) as evidence.
- Build the MVP now.

## Data / reuse
- Reuse `verification_records` (append-only audit) + `physician_licenses`
  (verification_status/verified_at/verification_source='rnp_manual').
- New: private Storage bucket `credential-evidence` (admin-read only); store
  `evidence_path`, `match_score`, `reviewer`, `reviewed_at`, `result`.
- Verify exact existing schema before writing migrations.

## Build slices (TDD where logic is pure)
1. `lib/verification/cedulaNameMatch.ts` — pure matcher (normalize accents/case,
   handle paterno/materno order, middle names) → {verdict, score}. TEST-FIRST.
2. `lib/verification/constanciaParse.ts` — PDF-text → fields; LLM-vision fallback.
3. API: `POST /api/admin/physicians/[id]/cedula-verify` (upload→parse→match→record),
   admin-gated; evidence to private bucket.
4. UI: cédula-verification panel on the admin physician detail page.
5. Migration: bucket + any columns; verify against prod before apply.

## Guardrails in code
- Admin role check on every endpoint; private bucket RLS.
- `verification_records` append-only; `source='rnp_manual'`; reviewer + timestamp.
- No auto-approve path — confirmation is a human action.
