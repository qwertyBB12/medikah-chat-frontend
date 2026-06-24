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
  action: 'block' | 'clear';
  title?: string;
  summary?: string;
  start_iso?: string;
  end_iso?: string;
}

/**
 * Build the spoken proposal line. Leads with a question derived from the
 * structured payload (the human-readable `summary` when present) and closes with
 * an explicit call to confirm. Never past-tense, never "done".
 */
export function buildProposalLine(
  pc: CueProposal,
  locale: 'en' | 'es' = 'en',
): string {
  const summary = (pc.summary ?? '').trim();

  if (locale === 'es') {
    const cta = 'Confírmalo abajo.';
    if (pc.action === 'block') {
      return summary
        ? `¿Bloqueo ${summary}? ${cta}`
        : `¿Bloqueo este horario? ${cta}`;
    }
    return summary
      ? `¿Libero ${summary}? ${cta}`
      : `¿Libero los bloques de Cue? ${cta}`;
  }

  const cta = 'Confirm below.';
  if (pc.action === 'block') {
    return summary ? `Block ${summary}? ${cta}` : `Block this time? ${cta}`;
  }
  return summary ? `Clear ${summary}? ${cta}` : `Clear Cue's blocks? ${cta}`;
}
