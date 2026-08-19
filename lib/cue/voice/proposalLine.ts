/**
 * lib/cue/voice/proposalLine.ts — the spoken line for a calendar write proposal.
 *
 * D-03 voice parity (Phase 23 streaming): when a voice block/clear command
 * surfaces a pending_confirm, Cue must NOT speak the model's free-form prose as a
 * fait accompli. Instead it speaks a CONTROLLED, templated, INTERROGATIVE line
 * built from the structured payload — a clear question + a call-to-action to tap
 * Confirm. The actual write still happens ONLY on the explicit Confirm tap
 * (server-side /cue/calendar/confirm-write); this line never implies completion.
 *
 * Kept provider/UI-neutral and dependency-free so both the voice controller and
 * the surface can use it.
 */

/** Minimal structural shape of a pending_confirm payload (see CuePendingConfirm). */
export interface CueProposal {
  action:
    | 'block'
    | 'clear'
    | 'appointment_create'
    | 'appointment_move'
    | 'appointment_cancel';
  title?: string;
  summary?: string;
  start_iso?: string;
  end_iso?: string;
}

/**
 * Build the spoken proposal line. Spoken aloud, reading the raw ISO date/time and
 * the event title sounded robotic (founder feedback 2026-06-28: "the narration of
 * the block doesn't work, it sounds robotic"). The card on screen ALREADY shows
 * every detail (date, range, title) — so the spoken line is just a short, natural
 * pointer to that card. Never past-tense, never "done": it asks the doctor to
 * approve, so it can't imply the write already happened. The structured payload
 * (summary/start/end) stays on the visual card; it is intentionally not narrated.
 */
export function buildProposalLine(
  pc: CueProposal,
  locale: 'en' | 'es' = 'en',
): string {
  const noun = PROPOSAL_NOUN[locale][pc.action] ?? PROPOSAL_NOUN[locale].clear;
  return locale === 'es'
    ? `Revisa la tarjeta en tu pantalla para aprobar ${noun}.`
    : `Check the card on your screen to approve the ${noun}.`;
}

/**
 * The one word that changes per action. Appointment proposals say "appointment" /
 * "cancellation" rather than the calendar's "block", so a doctor who only HEARS
 * the line still knows which kind of card is waiting. Everything else about the
 * proposal stays on the visual card, deliberately un-narrated.
 */
const PROPOSAL_NOUN: Record<'en' | 'es', Record<CueProposal['action'], string>> = {
  en: {
    block: 'block',
    clear: 'change',
    appointment_create: 'appointment',
    appointment_move: 'change',
    appointment_cancel: 'cancellation',
  },
  es: {
    block: 'el bloque',
    clear: 'el cambio',
    appointment_create: 'la cita',
    appointment_move: 'el cambio',
    appointment_cancel: 'la cancelación',
  },
};
