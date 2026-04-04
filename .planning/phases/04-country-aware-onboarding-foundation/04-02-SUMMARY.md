---
phase: 04-country-aware-onboarding-foundation
plan: 02
status: complete
started: 2026-04-04
completed: 2026-04-04
---

## Summary

Refactored PhysicianOnboardingAgent from a 12-exchange deep-collect flow to a lightweight 4-5 exchange onboarding flow with country selection and digital attestation.

## What Changed

### New Flow (4-5 exchanges)
1. **Greeting + Country Selection** — Multi-select toggle buttons: United States, Mexico, Colombia, Canada, Other country
2. **Identity** — Name, email (LinkedIn import path preserved)
3. **Specialty** — Primary specialty via BatchedSpecialtyForm
4. **Attestation** — Summary of entered data + attestation statement + "Confirm and Submit" button
5. **Completion** — Success message + redirect to dashboard

### Removed Phases
Licensing, education, intellectual, presence, and narrative phases removed from the lightweight flow. Full credential collection deferred to Phase 7 dashboard.

### Security
- Country codes validated against `VALID_COUNTRY_CODES` allowlist (US, MX, CO, CA, OTHER)
- `submitAttestation()` called on confirm — saves timestamped record with SHA-256 hash
- `countryOfPractice` array saved to physicians table

### Bilingual
All new copy added in both English and Spanish: country selection prompts, attestation statement, confirmation button, success message.

## Key Files

### Modified
- `components/PhysicianOnboardingAgent.tsx` — Core onboarding refactor (890 lines reduced)
- `lib/physicianOnboardingContent.ts` — New bilingual copy keys
- `components/physician/OnboardingPhaseIndicator.tsx` — Slimmed to 5 phases
- `lib/physicianOnboarding.ts` — Updated ONBOARDING_PHASE_ORDER

## Deviations

None.

## Self-Check: PASSED
- [x] OnboardingPhase type contains 'country_selection' and 'attestation'
- [x] OnboardingPhase type does NOT contain 'licensing', 'education', 'intellectual', 'presence', 'narrative'
- [x] Country toggle actions for US, MX, CO, CA, OTHER
- [x] submitAttestation called with physicianId, dataSnapshot, language
- [x] countryOfPractice stored and passed to createPhysicianProfile
- [x] VALID_COUNTRY_CODES allowlist validation
- [x] Bilingual copy for all new strings (EN/ES)
- [x] OnboardingPhaseIndicator updated to 5 phases
- [x] ONBOARDING_PHASE_ORDER has 5 entries
- [x] Build passes
