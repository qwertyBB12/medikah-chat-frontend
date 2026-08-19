/**
 * lib/cue/confirmTarget.ts — which confirm-write route a confirm card writes to,
 * and the body that route expects (appointments vertical).
 *
 * A confirm card now carries an optional `endpoint` naming its BACKEND route
 * (e.g. "/cue/appointments/confirm-write"). Two things make this a mapping
 * problem rather than a passthrough:
 *
 *   1. The browser never calls FastAPI directly (Phase 11 D-04) — it calls the
 *      same-origin BFF proxy, so the backend path has to be translated to its
 *      /api/... sibling.
 *   2. The card rides the /api/cue/chat stream, which is downstream of the model
 *      loop. Using its `endpoint` string as a fetch URL would let a malformed or
 *      injected value aim a mutation somewhere it was never meant to go. So the
 *      value is matched against an ALLOWLIST and anything unrecognized resolves
 *      to null — the surface then refuses to write rather than guessing.
 *
 * A card with NO endpoint is a pre-vertical calendar card and keeps going to
 * /api/cue/calendar/confirm-write exactly as before.
 *
 * Kept React-free (like cueStream.ts) so it is unit-testable on its own.
 */

import type { CuePendingConfirm } from './cueStream';

/** BFF path for the original calendar writes (block/clear). */
export const CALENDAR_CONFIRM_ROUTE = '/api/cue/calendar/confirm-write';
/** BFF path for the appointments vertical (create/move/cancel). */
export const APPOINTMENTS_CONFIRM_ROUTE = '/api/cue/appointments/confirm-write';

/** Allowlist: backend endpoint (as it appears on the card) → same-origin BFF path. */
const ENDPOINT_TO_BFF_ROUTE: Readonly<Record<string, string>> = {
  '/cue/calendar/confirm-write': CALENDAR_CONFIRM_ROUTE,
  '/cue/appointments/confirm-write': APPOINTMENTS_CONFIRM_ROUTE,
};

/**
 * The appointment route validates action ∈ {create, move, cancel}, but the cards
 * carry the tool-scoped names (appointment_create, …). The surface translates;
 * sending the card's action verbatim 400s.
 */
const APPOINTMENT_ACTION_ON_WIRE: Readonly<Record<string, 'create' | 'move' | 'cancel'>> = {
  appointment_create: 'create',
  appointment_move: 'move',
  appointment_cancel: 'cancel',
};

/**
 * Resolve the BFF route a card should POST to.
 *
 * No endpoint → the calendar route (old cards behave identically).
 * Known endpoint → its BFF sibling.
 * Unknown endpoint → null. Fail closed: a mutation whose destination we cannot
 * name must not be sent to a different mutation's route.
 */
export function resolveConfirmRoute(endpoint?: string): string | null {
  if (!endpoint) return CALENDAR_CONFIRM_ROUTE;
  return ENDPOINT_TO_BFF_ROUTE[endpoint] ?? null;
}

/** True when this card writes through the appointments vertical. */
export function isAppointmentConfirm(pc: Pick<CuePendingConfirm, 'endpoint'>): boolean {
  return resolveConfirmRoute(pc.endpoint) === APPOINTMENTS_CONFIRM_ROUTE;
}

/**
 * Build the request body for a confirm card.
 *
 * Returns null when the card and its route disagree (an appointment route with a
 * block action, an appointment card missing the id its action needs) — the
 * surface treats that as "do not write", which is the same fail-closed posture as
 * an unrecognized endpoint.
 *
 * Only the fields each action actually uses are sent: create carries the patient
 * name and the window, move carries the id and the new window, cancel carries the
 * id alone (the backend reads the current window from the row it already has).
 */
export function buildConfirmBody(
  pc: CuePendingConfirm,
  idempotencyToken: string,
  locale: 'en' | 'es',
): Record<string, unknown> | null {
  if (!isAppointmentConfirm(pc)) {
    // Calendar card — unchanged wire shape (block/clear).
    if (pc.action !== 'block' && pc.action !== 'clear') return null;
    return {
      action: pc.action,
      start_iso: pc.start_iso,
      end_iso: pc.end_iso,
      title: pc.title || undefined,
      idempotency_token: idempotencyToken,
      locale,
    };
  }

  const action = APPOINTMENT_ACTION_ON_WIRE[pc.action];
  if (!action) return null;

  if (action === 'cancel') {
    if (!pc.appointment_id) return null;
    return {
      action,
      appointment_id: pc.appointment_id,
      idempotency_token: idempotencyToken,
      locale,
    };
  }

  // create and move both need a window.
  if (!pc.start_iso || !pc.end_iso) return null;

  if (action === 'move') {
    if (!pc.appointment_id) return null;
    return {
      action,
      appointment_id: pc.appointment_id,
      start_iso: pc.start_iso,
      end_iso: pc.end_iso,
      idempotency_token: idempotencyToken,
      locale,
    };
  }

  // create: patient_name is already minimized upstream (first name + last
  // initial). Older/partial cards put it in `title`, so fall back to that.
  const patientName = pc.patient_name || pc.title;
  if (!patientName) return null;
  return {
    action,
    patient_name: patientName,
    start_iso: pc.start_iso,
    end_iso: pc.end_iso,
    idempotency_token: idempotencyToken,
    locale,
  };
}
