/**
 * lib/cue/cueStream.ts — the /api/cue/chat wire contract (D-03 + Phase-23 TTFT +
 * Phase-23 thinking trace).
 *
 * The upstream is a `text/plain` StreamingResponse carrying three kinds of bytes,
 * interleaved in this order:
 *
 *   1. Reasoning/answer text deltas — raw UTF-8, no framing (the speakable reply).
 *      Never contains the \x1e or \x1f control bytes.
 *   2. Tool-event frames (the "thinking trace") — \x1f (US) + compact JSON + \n,
 *      emitted by the engine as each agentic tool call STARTS and FINISHES, e.g.
 *          \x1f{"phase":"start","tool":"inbox_read_recent"}\n
 *          \x1f{"phase":"end","tool":"inbox_read_recent","ok":true,"items":3}\n
 *      Interleaved; zero or more; rendered as cascading terminal lines.
 *   3. ONE structured confirm sentinel line (terminal) — \x1e (RS) + compact JSON
 *      {"pending_confirm":{…}} + \n (D-03 / Plan 23-04).
 *
 *   <delta>…<\x1f frame>…<delta>…<\x1e confirm tail>
 *
 * BACKWARD COMPATIBILITY: a stream with NO \x1f frames parses byte-identically to
 * the Phase-22/23 contract (text + optional \x1e tail). The confirm framing and
 * timing are unchanged.
 *
 * Phase 23 streams the text token-by-token (TTFT) so Cue can start speaking
 * sentence 1 while the rest generates. These pure helpers are kept out of the
 * React component so they are unit-testable and reusable; CueSurface re-exports
 * them for the existing test + custom-sogo.js parity surface.
 */

/**
 * The {kind:'confirm', ...} payload surfaced by run_cue_turn and emitted on the
 * /api/cue/chat stream as the U+001E sentinel line (D-03 / Plan 23-04 canonical
 * contract). The confirm card is keyed off THIS — never off model prose.
 */
export interface CuePendingConfirm {
  kind: 'confirm';
  action: 'block' | 'clear';
  title: string;
  summary: string;
  start_iso: string;
  end_iso: string;
}

/**
 * A "thinking trace" event: the engine emits one when a tool call starts and one
 * when it finishes. `ok`/`items` appear only on the `end` frame (`items` only when
 * the tool returned a countable list). The surface renders these as cascading
 * terminal steps BEFORE the answer — NEVER spoken (they never reach the TTS feed).
 */
export interface CueToolEvent {
  phase: 'start' | 'end';
  tool: string;
  ok?: boolean;
  items?: number;
}

/**
 * One clinical CONSIDERATION inside a clinical-decision-support card.
 *
 * NAMING / LEGAL (Hector, 2026-06-29): this is a doctor decision-SUPPORT surface —
 * a ranked list of considerations to weigh, NEVER named or framed as an "(official)
 * diagnosis". The only place the word "diagnosis" appears is the disclaimer's denial.
 */
export interface CueConsideration {
  condition: string;
  rationale: string;
  /** 'HIGH' | 'MODERATE' | 'LOW' — kept as a string for forward-compat. */
  confidence: string;
  distinguishing_factors: string;
}

/**
 * The {kind:'clinical_support', ...} structured card emitted by the engine and
 * carried on the /api/cue/chat stream as a \x1d (GS) NON-TERMINAL frame. ADDITIVE:
 * the card renders in the dock AND Cue keeps narrating/conversing (unlike the
 * terminal confirm card). The card is keyed off THIS payload, never off model prose.
 */
export interface CueClinicalSupportCard {
  kind: 'clinical_support';
  considerations: CueConsideration[];
  red_flags: string[];
  disclaimer: string;
}

/** A structured Cue card. Open union — room for future non-confirm card kinds. */
export type CueCard = CueClinicalSupportCard;

/** U+001E (RECORD SEPARATOR) — the canonical pending_confirm sentinel byte (terminal). */
export const PENDING_CONFIRM_SENTINEL = '\x1e';

/** U+001F (UNIT SEPARATOR) — the tool-event frame prefix (terminated by \n). */
export const TOOL_EVENT_SENTINEL = '\x1f';

/**
 * U+001D (GROUP SEPARATOR) — the structured-card frame prefix (terminated by \n).
 * NON-TERMINAL (a sibling of \x1f tool frames): text and even a later \x1e confirm
 * tail may follow it, so it must NOT be treated like the terminal \x1e confirm byte.
 */
export const CARD_SENTINEL = '\x1d';

interface ParsedCueBuffer {
  text: string;
  pendingConfirm: CuePendingConfirm | null;
  toolEvents: CueToolEvent[];
  cards: CueCard[];
}

/** Parse a tool-event frame's JSON; returns null if malformed or missing `tool`. */
function parseToolFrame(json: string): CueToolEvent | null {
  try {
    const ev = JSON.parse(json) as CueToolEvent;
    if (ev && typeof ev.tool === 'string' && (ev.phase === 'start' || ev.phase === 'end')) {
      return ev;
    }
  } catch {
    /* malformed frame — ignore */
  }
  return null;
}

/** Parse a \x1d card frame's JSON ({"card":{…}}); null if malformed or not a known kind. */
function parseCardFrame(json: string): CueCard | null {
  try {
    const parsed = JSON.parse(json) as { card?: CueCard };
    const card = parsed?.card ?? null;
    if (card && card.kind === 'clinical_support' && Array.isArray(card.considerations)) {
      return card;
    }
  } catch {
    /* malformed frame — ignore */
  }
  return null;
}

/** Parse the confirm tail (everything after the first \x1e). */
function parseConfirmTail(rest: string): CuePendingConfirm | null {
  try {
    const parsed = JSON.parse(rest.trim()) as { pending_confirm?: CuePendingConfirm };
    const pc = parsed?.pending_confirm ?? null;
    return pc && pc.kind === 'confirm' ? pc : null;
  } catch {
    return null;
  }
}

/**
 * Single source of truth for the FINAL parse of a fully-buffered body: peels the
 * confirm tail at the first \x1e, then strips every complete \x1f…\n frame out of
 * the head — text is everything that remains, toolEvents are the parsed frames.
 */
function parseCueBuffer(full: string): ParsedCueBuffer {
  const confirmIdx = full.indexOf(PENDING_CONFIRM_SENTINEL);
  const head = confirmIdx === -1 ? full : full.slice(0, confirmIdx);
  const pendingConfirm =
    confirmIdx === -1 ? null : parseConfirmTail(full.slice(confirmIdx + 1));

  const toolEvents: CueToolEvent[] = [];
  const cards: CueCard[] = [];
  let text = '';
  let i = 0;
  while (i < head.length) {
    const us = head.indexOf(TOOL_EVENT_SENTINEL, i);
    const gs = head.indexOf(CARD_SENTINEL, i);
    // Earliest of the two NON-TERMINAL frame bytes (US tool / GS card) comes next.
    let ctrl = -1;
    let isCard = false;
    if (us !== -1 && (gs === -1 || us < gs)) {
      ctrl = us;
    } else if (gs !== -1) {
      ctrl = gs;
      isCard = true;
    }
    if (ctrl === -1) {
      text += head.slice(i);
      break;
    }
    text += head.slice(i, ctrl);
    const nl = head.indexOf('\n', ctrl + 1);
    if (nl === -1) {
      // Incomplete trailing frame (server closed mid-frame) — drop it; never text.
      break;
    }
    const json = head.slice(ctrl + 1, nl);
    if (isCard) {
      const c = parseCardFrame(json);
      if (c) cards.push(c);
    } else {
      const ev = parseToolFrame(json);
      if (ev) toolEvents.push(ev);
    }
    i = nl + 1;
  }

  return { text, pendingConfirm, toolEvents, cards };
}

/**
 * Split a fully-buffered /api/cue/chat response body. Strips \x1f tool-event
 * frames (collected into `toolEvents`) and peels the \x1e pending_confirm tail;
 * everything else is reasoning text. Returns null pendingConfirm / empty
 * toolEvents for the Phase-22 plain-text path (byte-identical).
 */
export function splitCueStream(body: string): ParsedCueBuffer {
  return parseCueBuffer(body);
}

/**
 * Stream-read a /api/cue/chat Response, forwarding reasoning text to `onTextChunk`
 * and tool-event frames to `onToolEvent` as they arrive (the Phase-23 TTFT +
 * thinking-trace path), and returning the authoritative
 * { text, pendingConfirm, toolEvents } once the stream ends.
 *
 * Only speakable text is forwarded to onTextChunk — the \x1f frames and the \x1e
 * JSON tail NEVER reach it (so they are never spoken). Control bytes may straddle
 * a chunk boundary, so an incomplete frame is held back until its terminating \n
 * arrives; the final parseCueBuffer() over the whole body is authoritative.
 *
 * Falls back to buffering (`res.text()`) when the body is not a readable stream
 * (older runtimes / test mocks), so callers get identical results either way.
 */
export async function readCueStream(
  res: Response,
  onTextChunk?: (chunk: string) => void,
  onToolEvent?: (event: CueToolEvent) => void,
  onCard?: (card: CueCard) => void,
): Promise<ParsedCueBuffer> {
  if (!res.body || typeof res.body.getReader !== 'function') {
    return parseCueBuffer(await res.text());
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let cursor = 0;        // chars in `full` already processed (text emitted / frame consumed)
  let confirmSeen = false; // once \x1e is reached, the rest is the confirm tail (buffer only)

  // Process every COMPLETE unit (text run, tool frame) from `cursor` forward.
  const pump = () => {
    while (cursor < full.length && !confirmSeen) {
      const usIdx = full.indexOf(TOOL_EVENT_SENTINEL, cursor);
      const gsIdx = full.indexOf(CARD_SENTINEL, cursor);
      const rsIdx = full.indexOf(PENDING_CONFIRM_SENTINEL, cursor);

      // Earliest control byte at/after cursor decides what comes next.
      let ctrlIdx = -1;
      let ctrlKind: 'tool' | 'card' | 'confirm' = 'tool';
      for (const cand of [
        { idx: usIdx, kind: 'tool' as const },
        { idx: gsIdx, kind: 'card' as const },
        { idx: rsIdx, kind: 'confirm' as const },
      ]) {
        if (cand.idx !== -1 && (ctrlIdx === -1 || cand.idx < ctrlIdx)) {
          ctrlIdx = cand.idx;
          ctrlKind = cand.kind;
        }
      }

      if (ctrlIdx === -1) {
        // No control byte ahead — everything left is speakable text.
        if (onTextChunk && full.length > cursor) onTextChunk(full.slice(cursor));
        cursor = full.length;
        return;
      }

      // Emit any text up to the control byte.
      if (onTextChunk && ctrlIdx > cursor) onTextChunk(full.slice(cursor, ctrlIdx));

      if (ctrlKind === 'confirm') {
        // Confirm tail begins (terminal) — stop emitting; buffer the rest for final parse.
        cursor = ctrlIdx;
        confirmSeen = true;
        return;
      }

      // Tool / card frame (NON-terminal) — needs its terminating \n before we parse it.
      const nl = full.indexOf('\n', ctrlIdx + 1);
      if (nl === -1) {
        cursor = ctrlIdx; // hold the partial frame; re-scan when more data arrives
        return;
      }
      const json = full.slice(ctrlIdx + 1, nl);
      if (ctrlKind === 'card') {
        const c = parseCardFrame(json);
        if (c) onCard?.(c);
      } else {
        const ev = parseToolFrame(json);
        if (ev) onToolEvent?.(ev);
      }
      cursor = nl + 1;
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    pump();
  }
  full += decoder.decode(); // flush any trailing multibyte
  pump();

  return parseCueBuffer(full);
}
