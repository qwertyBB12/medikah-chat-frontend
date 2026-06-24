/**
 * lib/cue/cueStream.ts — the /api/cue/chat wire contract (D-03 + Phase-23 TTFT).
 *
 * The upstream is a `text/plain` StreamingResponse: reasoning text deltas as they
 * are generated, optionally followed by ONE structured sentinel line carrying the
 * pending_confirm payload:
 *
 *     <text delta><text delta>…<U+001E><compact JSON {"pending_confirm":{…}}>\n
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

/** U+001E (RECORD SEPARATOR) — the canonical pending_confirm sentinel byte. */
export const PENDING_CONFIRM_SENTINEL = '\x1e';

/**
 * Split a fully-buffered /api/cue/chat response body on the pending_confirm
 * sentinel. Everything BEFORE the first sentinel is the reasoning text; the JSON
 * line AFTER it (if present) carries { pending_confirm }. Returns null
 * pendingConfirm when no sentinel is present (Phase-22 plain-text path,
 * byte-identical).
 */
export function splitCueStream(body: string): {
  text: string;
  pendingConfirm: CuePendingConfirm | null;
} {
  const idx = body.indexOf(PENDING_CONFIRM_SENTINEL);
  if (idx === -1) return { text: body, pendingConfirm: null };
  const text = body.slice(0, idx);
  const rest = body.slice(idx + 1).trim();
  try {
    const parsed = JSON.parse(rest) as { pending_confirm?: CuePendingConfirm };
    const pc = parsed?.pending_confirm ?? null;
    return { text, pendingConfirm: pc && pc.kind === 'confirm' ? pc : null };
  } catch {
    return { text, pendingConfirm: null };
  }
}

/**
 * Stream-read a /api/cue/chat Response, forwarding reasoning text to `onTextChunk`
 * as it arrives (the Phase-23 TTFT path), and returning the authoritative
 * { text, pendingConfirm } once the stream ends.
 *
 * Only the text BEFORE the sentinel is forwarded to onTextChunk — the JSON tail
 * (pending_confirm) is parsed at the end and NEVER spoken. The 1-byte sentinel
 * may straddle a chunk boundary, so detection runs on the accumulated buffer and
 * the final split() is authoritative.
 *
 * Falls back to buffering (`res.text()`) when the body is not a readable stream
 * (older runtimes / test mocks), so callers get identical results either way.
 */
export async function readCueStream(
  res: Response,
  onTextChunk?: (chunk: string) => void,
): Promise<{ text: string; pendingConfirm: CuePendingConfirm | null }> {
  if (!res.body || typeof res.body.getReader !== 'function') {
    return splitCueStream(await res.text());
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let emittedLen = 0; // chars of pre-sentinel text already handed to onTextChunk
  let sentinelIdx = -1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });

    if (sentinelIdx === -1) {
      const idx = full.indexOf(PENDING_CONFIRM_SENTINEL);
      if (idx === -1) {
        // Everything so far is speakable text — forward the newly-arrived tail.
        if (onTextChunk && full.length > emittedLen) {
          onTextChunk(full.slice(emittedLen));
          emittedLen = full.length;
        }
      } else {
        // Sentinel reached — forward only the text up to it, then stop emitting.
        sentinelIdx = idx;
        if (onTextChunk && idx > emittedLen) {
          onTextChunk(full.slice(emittedLen, idx));
          emittedLen = idx;
        }
      }
    }
    // After the sentinel, keep buffering the JSON remainder (no more onTextChunk).
  }
  full += decoder.decode(); // flush any trailing multibyte

  return splitCueStream(full);
}
