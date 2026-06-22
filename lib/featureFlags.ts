/**
 * Feature flags — phase gates that ship with the code.
 *
 * Flip + deploy when the corresponding launch phase opens. Kept as constants
 * (not env vars) so the gate is deterministic, can't be misconfigured per
 * environment, and is enforced server-side where it matters.
 */

/**
 * PATIENT PORTAL — physicians-only phase (GTM: physicians now → patients later).
 *
 * While false:
 *   - /patients is hard-gated server-side (getServerSideProps → /patients-coming-soon)
 *   - the /chat patient affordance is hidden and ?role=patient is ignored
 *
 * Flip to `true` + deploy when the patient phase opens. That single change
 * re-opens /patients and restores the /chat patient sign-in.
 */
export const PATIENT_PORTAL_OPEN = false;

/**
 * PHYSICIAN INQUIRIES — patient-queue surface on the physician dashboard.
 *
 * While false: the InquiryList card (accept/decline patient inquiries) is not
 * rendered on /physicians/dashboard. Hidden for the physicians-only soft launch
 * because there is no live patient pipeline yet (patients can't sign up while
 * PATIENT_PORTAL_OPEN is false), so the queue is empty/meaningless — and the
 * backend route currently 401s (see "Fix B").
 *
 * Flip to `true` + deploy when the patient phase opens and the inquiry backend
 * auth is fixed. Tends to move together with PATIENT_PORTAL_OPEN.
 *
 * 🔜 Phase 23 (Cue calendar control): once Cue can read/block/clear the doctor's
 * calendar, the appointments/inquiries surface becomes the thing Cue's calendar
 * feature acts ON — at that point reconsider turning this back on to support it
 * (Hector, 2026-06-22). Don't re-enable purely for the dash; re-enable to back
 * the Cue calendar feature.
 */
export const PHYSICIAN_INQUIRIES_OPEN = false;

/**
 * AI DIAGNOSIS TOOL — GPT-4o differential tool, currently mounted on the
 * physician dashboard (components/physician/AIDiagnosisTool.tsx → backend
 * /ai/diagnosis).
 *
 * While false: the tool is not rendered on /physicians/dashboard.
 *
 * ⚠️ ARCHITECTURAL NOTE (Hector, 2026-06-22): this tool does NOT belong on the
 * physician dashboard long-term. It is being repositioned as a **feature of Cue**
 * and will be rebuilt/surfaced inside the upcoming Cue phases — not re-enabled
 * here. Do NOT simply flip this back to `true`; the dashboard mount is a
 * temporary home that the Cue work retires. Kept flag-gated (not deleted) so the
 * existing, working component stays available as the reference implementation
 * the Cue phase ports from.
 */
export const AI_DIAGNOSIS_IN_DASH = false;
