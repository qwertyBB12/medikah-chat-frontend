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
