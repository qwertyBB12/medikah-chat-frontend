import { describe, it, expect, vi } from 'vitest';
import { splitCueStream, readCueStream, PENDING_CONFIRM_SENTINEL } from './cueStream';

const SENTINEL = PENDING_CONFIRM_SENTINEL;

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
    expect(splitCueStream('Just text.')).toEqual({ text: 'Just text.', pendingConfirm: null });
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
