import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  splitSentences,
  splitSentencesIncremental,
  StreamingTTSPlayer,
} from './streamingTts';

describe('splitSentences', () => {
  it('splits on sentence boundaries', () => {
    expect(splitSentences('Hola. ¿Cómo va? Bien')).toEqual(['Hola.', '¿Cómo va?', 'Bien']);
  });
  it('returns [] for empty input', () => {
    expect(splitSentences('  ')).toEqual([]);
  });
});

describe('splitSentencesIncremental', () => {
  it('extracts complete sentences and carries the trailing partial', () => {
    expect(splitSentencesIncremental('Hola. ¿Cómo')).toEqual({
      complete: ['Hola.'],
      pending: '¿Cómo',
    });
  });
  it('holds a partial with no terminal punctuation', () => {
    expect(splitSentencesIncremental('Hel')).toEqual({ complete: [], pending: 'Hel' });
  });
  it('returns multiple complete sentences and empty pending when text ends on punct', () => {
    expect(splitSentencesIncremental('One. Two! Three?')).toEqual({
      complete: ['One.', 'Two!', 'Three?'],
      pending: '',
    });
  });
  it('drops lone-punctuation fragments (no click/silence sentences)', () => {
    // " . Hi" → the stray "." must not become a spoken sentence
    expect(splitSentencesIncremental('End. . Start')).toEqual({
      complete: ['End.'],
      pending: 'Start',
    });
  });
});

describe('StreamingTTSPlayer incremental session', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reveals streamed sentences in order across pushes, then resolves done', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0),
    } as Response)));
    const revealed: string[] = [];
    const player = new StreamingTTSPlayer({ locale: 'en', onSentence: (t) => revealed.push(t) });

    const done = player.beginStreaming();
    player.pushText('Hello there. How are ');
    player.pushText('you? Bye.');
    player.endPushing();
    const result = await done;

    expect(result).toBe('done');
    // jsdom has no AudioContext → audio buffers are null, but the text is still
    // revealed in strict FIFO order (no reordering).
    expect(revealed).toEqual(['Hello there.', 'How are you?', 'Bye.']);
  });

  it('stop() interrupts an in-flight streaming session', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0),
    } as Response)));
    const player = new StreamingTTSPlayer({ locale: 'en' });
    const done = player.beginStreaming();
    player.pushText('A sentence with no terminator yet');
    // no endPushing — consumer is parked waiting for more; stop() must unblock it
    player.stop();
    const result = await done;
    expect(result).toBe('interrupted');
  });
});

describe('StreamingTTSPlayer pronunciation', () => {
  afterEach(() => vi.restoreAllMocks());
  it('respells brand words in the request body before TTS', async () => {
    const bodies: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string).text);
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0) } as Response;
    }));
    const player = new StreamingTTSPlayer({ locale: 'en' });
    // No AudioContext in jsdom → unlock is a no-op guard; play still issues fetches.
    await player.play('Cue here.');
    expect(bodies[0]).toContain('Kew');
  });
});
