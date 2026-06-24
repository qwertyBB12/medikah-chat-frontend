import { describe, it, expect, vi, afterEach } from 'vitest';
import { splitSentences, StreamingTTSPlayer } from './streamingTts';

describe('splitSentences', () => {
  it('splits on sentence boundaries', () => {
    expect(splitSentences('Hola. ¿Cómo va? Bien')).toEqual(['Hola.', '¿Cómo va?', 'Bien']);
  });
  it('returns [] for empty input', () => {
    expect(splitSentences('  ')).toEqual([]);
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
