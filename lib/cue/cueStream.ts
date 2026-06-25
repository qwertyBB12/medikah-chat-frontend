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

/** U+001E (RECORD SEPARATOR) — the canonical pending_confirm sentinel byte. */
export const PENDING_CONFIRM_SENTINEL = '\x1e';

/** U+001F (UNIT SEPARATOR) — the tool-event frame prefix (terminated by \n). */
export const TOOL_EVENT_SENTINEL = '\x1f';

interface ParsedCueBuffer {
  text: string;
  pendingConfirm: CuePendingConfirm | null;
  toolEvents: CueToolEvent[];
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
  let text = '';
  let i = 0;
  while (i < head.length) {
    const us = head.indexOf(TOOL_EVENT_SENTINEL, i);
    if (us === -1) {
      text += head.slice(i);
      break;
    }
    text += head.slice(i, us);
    const nl = head.indexOf('\n', us + 1);
    if (nl === -1) {
      // Incomplete trailing frame (server closed mid-frame) — drop it; never text.
      break;
    }
    const ev = parseToolFrame(head.slice(us + 1, nl));
    if (ev) toolEvents.push(ev);
    i = nl + 1;
  }

  return { text, pendingConfirm, toolEvents };
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
      const rsIdx = full.indexOf(PENDING_CONFIRM_SENTINEL, cursor);

      // Earliest control byte at/after cursor decides what comes next.
      let ctrlIdx = -1;
      let ctrlIsConfirm = false;
      if (usIdx !== -1 && (rsIdx === -1 || usIdx < rsIdx)) {
        ctrlIdx = usIdx;
      } else if (rsIdx !== -1) {
        ctrlIdx = rsIdx;
        ctrlIsConfirm = true;
      }

      if (ctrlIdx === -1) {
        // No control byte ahead — everything left is speakable text.
        if (onTextChunk && full.length > cursor) onTextChunk(full.slice(cursor));
        cursor = full.length;
        return;
      }

      // Emit any text up to the control byte.
      if (onTextChunk && ctrlIdx > cursor) onTextChunk(full.slice(cursor, ctrlIdx));

      if (ctrlIsConfirm) {
        // Confirm tail begins — stop emitting; buffer the remainder for final parse.
        cursor = ctrlIdx;
        confirmSeen = true;
        return;
      }

      // Tool frame — needs its terminating \n before we can parse it.
      const nl = full.indexOf('\n', ctrlIdx + 1);
      if (nl === -1) {
        cursor = ctrlIdx; // hold the partial frame; re-scan when more data arrives
        return;
      }
      const ev = parseToolFrame(full.slice(ctrlIdx + 1, nl));
      if (ev) onToolEvent?.(ev);
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
