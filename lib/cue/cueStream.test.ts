import { describe, it, expect, vi } from 'vitest';
import {
  splitCueStream,
  readCueStream,
  PENDING_CONFIRM_SENTINEL,
  TOOL_EVENT_SENTINEL,
  CARD_SENTINEL,
  type CueToolEvent,
  type CueCard,
} from './cueStream';

const SENTINEL = PENDING_CONFIRM_SENTINEL;
const US = TOOL_EVENT_SENTINEL;
const GS = CARD_SENTINEL;

/** Build one \x1f tool-event frame (US + compact JSON + \n). */
function toolFrame(ev: CueToolEvent): string {
  return US + JSON.stringify(ev) + '\n';
}

/** Build a Response-like object whose body streams the given UTF-8 chunks. */
function streamResponse(chunks: string[]): Response {
  const enc = new TextEncoder();
  let i = 0;
  const body = {
    getReader() {
      return {
        read: async () =>
          i < chunks.length
            ? { done: false, value: enc.encode(chunks[i++]) }
            : { done: true, value: undefined },
        cancel: async () => {},
      };
    },
  };
  return { body, text: async () => chunks.join('') } as unknown as Response;
}

describe('splitCueStream', () => {
  it('returns plain text + null when there is no sentinel', () => {
    expect(splitCueStream('Just text.')).toEqual({ text: 'Just text.', pendingConfirm: null, toolEvents: [], cards: [] });
  });

  it('parses the pending_confirm payload after the sentinel', () => {
    const body =
      'Reasoning' + SENTINEL +
      JSON.stringify({ pending_confirm: { kind: 'confirm', action: 'block', title: 't', summary: 's', start_iso: 'a', end_iso: 'b' } }) +
      '\n';
    const { text, pendingConfirm } = splitCueStream(body);
    expect(text).toBe('Reasoning');
    expect(pendingConfirm?.action).toBe('block');
  });
});

describe('readCueStream', () => {
  it('forwards text chunks via onTextChunk as they arrive (TTFT)', async () => {
    const res = streamResponse(['Hello ', 'there ', 'doctor.']);
    const chunks: string[] = [];
    const { text, pendingConfirm } = await readCueStream(res, (c) => chunks.push(c));
    expect(chunks.join('')).toBe('Hello there doctor.');
    expect(text).toBe('Hello there doctor.');
    expect(pendingConfirm).toBeNull();
  });

  it('only forwards text BEFORE the sentinel; parses pending_confirm at the end', async () => {
    const json = JSON.stringify({ pending_confirm: { kind: 'confirm', action: 'clear', title: '', summary: 's', start_iso: 'a', end_iso: 'b' } });
    // sentinel + JSON split across the same/last chunk
    const res = streamResponse(['Voy a ', 'liberar', SENTINEL + json + '\n']);
    const chunks: string[] = [];
    const { text, pendingConfirm } = await readCueStream(res, (c) => chunks.push(c));
    expect(chunks.join('')).toBe('Voy a liberar'); // never the JSON tail
    expect(text).toBe('Voy a liberar');
    expect(pendingConfirm?.action).toBe('clear');
  });

  it('handles the sentinel straddling a chunk boundary (no JSON leaks to onTextChunk)', async () => {
    const json = JSON.stringify({ pending_confirm: { kind: 'confirm', action: 'block', title: '', summary: 's', start_iso: 'a', end_iso: 'b' } });
    const full = 'Preamble' + SENTINEL + json + '\n';
    // chunk boundary lands right before the sentinel byte
    const res = streamResponse(['Pre', 'amble', SENTINEL, json + '\n']);
    const chunks: string[] = [];
    const { text, pendingConfirm } = await readCueStream(res, (c) => chunks.push(c));
    expect(chunks.join('')).toBe('Preamble');
    expect(text).toBe('Preamble');
    expect(pendingConfirm?.action).toBe('block');
    expect(splitCueStream(full).text).toBe('Preamble'); // parity with buffered split
  });

  it('falls back to res.text() when the body is not a readable stream', async () => {
    const res = { text: async () => 'Buffered reply.' } as unknown as Response;
    const { text, pendingConfirm } = await readCueStream(res);
    expect(text).toBe('Buffered reply.');
    expect(pendingConfirm).toBeNull();
  });
});

// ─── thinking-trace tool-event frames (\x1f) ──────────────────────────────────

describe('cueStream tool-event frames', () => {
  const startFrame = toolFrame({ phase: 'start', tool: 'inbox_read_recent' });
  const endFrame = toolFrame({ phase: 'end', tool: 'inbox_read_recent', ok: true, items: 3 });

  it('splitCueStream strips \\x1f frames from text and collects toolEvents', () => {
    const body = startFrame + endFrame + 'Tienes 3 mensajes nuevos.';
    const { text, toolEvents, pendingConfirm } = splitCueStream(body);
    expect(text).toBe('Tienes 3 mensajes nuevos.'); // frames never leak into text
    expect(pendingConfirm).toBeNull();
    expect(toolEvents).toEqual([
      { phase: 'start', tool: 'inbox_read_recent' },
      { phase: 'end', tool: 'inbox_read_recent', ok: true, items: 3 },
    ]);
  });

  it('splitCueStream handles a frame BETWEEN text spans', () => {
    const body = 'Leading. ' + startFrame + 'Trailing.';
    const { text, toolEvents } = splitCueStream(body);
    expect(text).toBe('Leading. Trailing.');
    expect(toolEvents).toHaveLength(1);
    expect(toolEvents[0].tool).toBe('inbox_read_recent');
  });

  it('readCueStream forwards tool events via onToolEvent, never to onTextChunk', async () => {
    const res = streamResponse([startFrame, 'Tienes ', endFrame, '3 nuevos.']);
    const textChunks: string[] = [];
    const events: CueToolEvent[] = [];
    const { text, toolEvents } = await readCueStream(
      res,
      (c) => textChunks.push(c),
      (ev) => events.push(ev),
    );
    expect(textChunks.join('')).toBe('Tienes 3 nuevos.'); // no \x1f / JSON ever spoken
    expect(text).toBe('Tienes 3 nuevos.');
    expect(events).toEqual([
      { phase: 'start', tool: 'inbox_read_recent' },
      { phase: 'end', tool: 'inbox_read_recent', ok: true, items: 3 },
    ]);
    expect(toolEvents).toEqual(events);
  });

  it('readCueStream parses a tool frame straddling a chunk boundary', async () => {
    // Split the start frame mid-JSON across two reads.
    const mid = Math.floor(startFrame.length / 2);
    const res = streamResponse([startFrame.slice(0, mid), startFrame.slice(mid), 'Hola.']);
    const textChunks: string[] = [];
    const events: CueToolEvent[] = [];
    await readCueStream(res, (c) => textChunks.push(c), (ev) => events.push(ev));
    expect(textChunks.join('')).toBe('Hola.');
    expect(events).toEqual([{ phase: 'start', tool: 'inbox_read_recent' }]);
  });

  it('readCueStream handles tool frames THEN a confirm sentinel', async () => {
    const json = JSON.stringify({
      pending_confirm: { kind: 'confirm', action: 'block', title: 't', summary: 's', start_iso: 'a', end_iso: 'b' },
    });
    const res = streamResponse([
      startFrame,
      'Voy a revisar. ',
      endFrame,
      'Propongo bloquear.',
      SENTINEL + json + '\n',
    ]);
    const textChunks: string[] = [];
    const events: CueToolEvent[] = [];
    const { text, pendingConfirm, toolEvents } = await readCueStream(
      res,
      (c) => textChunks.push(c),
      (ev) => events.push(ev),
    );
    expect(textChunks.join('')).toBe('Voy a revisar. Propongo bloquear.'); // never the JSON tail
    expect(text).toBe('Voy a revisar. Propongo bloquear.');
    expect(pendingConfirm?.action).toBe('block');
    expect(toolEvents).toHaveLength(2);
    expect(events).toHaveLength(2);
  });

  it('readCueStream returns empty toolEvents for a plain-text stream (Phase-22 parity)', async () => {
    const res = streamResponse(['Just ', 'text.']);
    const { text, toolEvents } = await readCueStream(res);
    expect(text).toBe('Just text.');
    expect(toolEvents).toEqual([]);
  });
});

// ─── clinical-support card frames (\x1d, non-terminal) ────────────────────────

describe('cueStream clinical-support card frames', () => {
  const CARD: CueCard = {
    kind: 'clinical_support',
    considerations: [
      { condition: 'X', rationale: 'r', confidence: 'HIGH', distinguishing_factors: 'd' },
    ],
    red_flags: ['flag'],
    disclaimer: 'Clinical decision support only — not a diagnosis.',
  };
  const cardFrame = GS + JSON.stringify({ card: CARD }) + '\n';

  it('splitCueStream strips the \\x1d card frame from text and collects it in cards', () => {
    const body = 'Un momento. ' + cardFrame + 'Aquí están las consideraciones.';
    const { text, cards, pendingConfirm } = splitCueStream(body);
    expect(text).toBe('Un momento. Aquí están las consideraciones.'); // frame never leaks into text
    expect(pendingConfirm).toBeNull();
    expect(cards).toHaveLength(1);
    expect(cards[0].kind).toBe('clinical_support');
    expect(cards[0].considerations[0].condition).toBe('X');
    expect(cards[0].red_flags).toEqual(['flag']);
  });

  it('plain-text stream yields empty cards (backward compat)', () => {
    expect(splitCueStream('Just text.').cards).toEqual([]);
  });

  it('readCueStream forwards the card via onCard, never to onTextChunk', async () => {
    const res = streamResponse(['Un momento. ', cardFrame, 'Listo.']);
    const textChunks: string[] = [];
    const cards: CueCard[] = [];
    const { text, cards: finalCards } = await readCueStream(
      res,
      (c) => textChunks.push(c),
      undefined,
      (card) => cards.push(card),
    );
    expect(textChunks.join('')).toBe('Un momento. Listo.'); // no \x1d / JSON ever spoken
    expect(text).toBe('Un momento. Listo.');
    expect(cards).toHaveLength(1);
    expect(cards[0].considerations[0].condition).toBe('X');
    expect(finalCards).toEqual(cards);
  });

  it('readCueStream parses a card frame straddling a chunk boundary', async () => {
    const mid = Math.floor(cardFrame.length / 2);
    const res = streamResponse(['Hola. ', cardFrame.slice(0, mid), cardFrame.slice(mid), 'Fin.']);
    const cards: CueCard[] = [];
    const { text } = await readCueStream(res, undefined, undefined, (c) => cards.push(c));
    expect(text).toBe('Hola. Fin.');
    expect(cards).toHaveLength(1);
    expect(cards[0].kind).toBe('clinical_support');
  });

  it('readCueStream handles a card frame THEN a confirm tail (card is non-terminal)', async () => {
    const json = JSON.stringify({
      pending_confirm: { kind: 'confirm', action: 'block', title: 't', summary: 's', start_iso: 'a', end_iso: 'b' },
    });
    const res = streamResponse([cardFrame, 'Texto.', SENTINEL + json + '\n']);
    const cards: CueCard[] = [];
    const { text, pendingConfirm } = await readCueStream(res, undefined, undefined, (c) => cards.push(c));
    expect(text).toBe('Texto.');
    expect(cards).toHaveLength(1);
    expect(pendingConfirm?.action).toBe('block');
  });
});
