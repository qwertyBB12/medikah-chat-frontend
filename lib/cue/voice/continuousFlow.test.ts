import { describe, it, expect, vi, beforeEach } from 'vitest';

const vadHandlers: { onSpeechStart?: () => void; onUtterance?: (t: string) => void } = {};
const vadPause = vi.fn();
const vadResume = vi.fn();
vi.mock('./vadListener', () => ({
  isContinuousVADSupported: () => true,
  diagnoseVADSupport: () => ({ ok: true, reasons: [] }),
  VADListener: class {
    constructor(opts: { onSpeechStart?: () => void; onUtterance?: (t: string) => void }) { vadHandlers.onSpeechStart = opts.onSpeechStart; vadHandlers.onUtterance = opts.onUtterance; }
    async start() {}
    pause() { vadPause(); }
    resume() { vadResume(); }
    destroy() {}
  },
}));

// ── TTS player mock — Phase 23 streaming API (beginStreaming/pushText/endPushing)
let streamMode: 'resolve' | 'pending' = 'resolve';
let releaseStream: ((v: 'done' | 'interrupted') => void) | null = null;
const ttsStop = vi.fn();
const pushTextSpy = vi.fn();
const endPushingSpy = vi.fn();
const playSpy = vi.fn();
vi.mock('./streamingTts', () => ({
  StreamingTTSPlayer: class {
    unlock() {}
    stop() { ttsStop(); releaseStream?.('interrupted'); releaseStream = null; }
    beginStreaming() {
      if (streamMode === 'resolve') return Promise.resolve('done' as const);
      return new Promise<'done' | 'interrupted'>((res) => { releaseStream = res; });
    }
    pushText(c: string) { pushTextSpy(c); }
    endPushing() { endPushingSpy(); }
    play(text: string) { playSpy(text); return Promise.resolve('done' as const); }
  },
}));

import { ContinuousFlowController } from './continuousFlow';
import type { OrbState } from '../stateMachine';

const ok = (text: string) => async (_t: string, opts?: { onTextChunk?: (c: string) => void }) => {
  opts?.onTextChunk?.(text);
  return { text, pendingConfirm: null };
};

describe('ContinuousFlowController', () => {
  beforeEach(() => {
    ttsStop.mockClear(); pushTextSpy.mockClear(); endPushingSpy.mockClear(); playSpy.mockClear();
    vadPause.mockClear(); vadResume.mockClear();
    streamMode = 'resolve'; releaseStream = null;
  });

  it('runs a turn: listening → thinking → speaking', async () => {
    const states: OrbState[] = [];
    const ctrl = new ContinuousFlowController({
      respond: ok('Bien.'),
      onStateChange: (s) => states.push(s as OrbState),
    });
    await ctrl.start();
    await vadHandlers.onUtterance!('hola');
    expect(states).toContain('listening');
    expect(states).toContain('thinking');
    expect(states).toContain('speaking');
  });

  it('flips to speaking on the FIRST streamed token, then feeds TTS incrementally', async () => {
    const states: OrbState[] = [];
    const ctrl = new ContinuousFlowController({
      // emit two chunks; the FIRST should already move us to speaking
      respond: async (_t, opts) => {
        opts?.onTextChunk?.('Hola. ');
        expect(states).toContain('speaking'); // speaking happened on chunk 1, before chunk 2
        opts?.onTextChunk?.('¿En qué te ayudo?');
        return { text: 'Hola. ¿En qué te ayudo?', pendingConfirm: null };
      },
      onStateChange: (s) => states.push(s as OrbState),
    });
    await ctrl.start();
    await vadHandlers.onUtterance!('hola');
    expect(pushTextSpy).toHaveBeenCalledWith('Hola. ');
    expect(pushTextSpy).toHaveBeenCalledWith('¿En qué te ayudo?');
    expect(endPushingSpy).toHaveBeenCalled();
  });

  it('barge-in while speaking stops TTS', async () => {
    streamMode = 'pending';
    const states: OrbState[] = [];
    const ctrl = new ContinuousFlowController({
      respond: ok('Una respuesta larga.'),
      onStateChange: (s) => states.push(s as OrbState),
    });
    await ctrl.start();
    const turn = vadHandlers.onUtterance!('hola');
    await vi.waitFor(() => expect(states).toContain('speaking'));
    vadHandlers.onSpeechStart!(); // user interrupts mid-speech
    expect(ttsStop).toHaveBeenCalled();
    await turn;
  });

  it('half-duplex: pauses the mic while Cue speaks, then resumes when the turn ends', async () => {
    // The mic must be closed while Cue is speaking so her own audio leaking into
    // an open mic cannot trigger barge-in (self-interruption) or be transcribed
    // back as a user utterance. It must reopen once playback drains.
    const ctrl = new ContinuousFlowController({ respond: ok('Hola.') });
    await ctrl.start();
    await vadHandlers.onUtterance!('hola');
    expect(vadPause).toHaveBeenCalled();   // paused on entering `speaking`
    expect(vadResume).toHaveBeenCalled();  // resumed after the turn ends
    // resume must come AFTER pause (not the other way round)
    expect(Math.min(...vadResume.mock.invocationCallOrder))
      .toBeGreaterThan(Math.min(...vadPause.mock.invocationCallOrder));
  });

  it('half-duplex: greeting (playReply) also pauses then resumes the mic', async () => {
    const ctrl = new ContinuousFlowController({ respond: ok('x') });
    await ctrl.start();
    vadPause.mockClear(); vadResume.mockClear();
    await ctrl.playReply('Hola, soy Cue.');
    expect(vadPause).toHaveBeenCalled();
    expect(vadResume).toHaveBeenCalled();
  });

  it('D-03: speaks a CONTROLLED templated line on a write proposal, not model prose', async () => {
    const ctrl = new ContinuousFlowController({
      locale: 'en',
      respond: async (_t, opts) => {
        opts?.onTextChunk?.("I'll prepare that block."); // model preamble (must be cut)
        return {
          text: "I'll prepare that block.",
          pendingConfirm: { action: 'block', summary: '2–3 PM', start_iso: 'a', end_iso: 'b' },
        };
      },
    });
    await ctrl.start();
    await vadHandlers.onUtterance!('block 2 to 3');
    // preamble was cut (stop) and the templated interrogative line was spoken
    expect(ttsStop).toHaveBeenCalled();
    expect(playSpy).toHaveBeenCalledTimes(1);
    const spoken = playSpy.mock.calls[0][0] as string;
    expect(spoken).toBe('Block 2–3 PM? Confirm below.');
    expect(spoken).not.toContain('prepare'); // never the model's prose
  });

  // ── Wave 3: push-to-talk ────────────────────────────────────────────────────

  it('continuous (default): the mic rests OPEN after start', async () => {
    const ctrl = new ContinuousFlowController({ respond: ok('x') });
    await ctrl.start();
    expect(ctrl.isListening()).toBe(true);
    expect(vadPause).not.toHaveBeenCalled(); // no idle hold in continuous mode
  });

  it('ptt: the mic rests CLOSED after start (no continuous listening)', async () => {
    const ctrl = new ContinuousFlowController({ respond: ok('x'), flowMode: 'ptt' });
    await ctrl.start();
    expect(ctrl.isListening()).toBe(false);
    expect(vadPause).toHaveBeenCalled(); // idle 'ptt' hold closes the mic
  });

  it('ptt: tap opens a listening window, and the mic re-closes after the turn', async () => {
    const ctrl = new ContinuousFlowController({ respond: ok('Bien.'), flowMode: 'ptt' });
    await ctrl.start();
    vadPause.mockClear(); vadResume.mockClear();

    ctrl.startListeningWindow();
    expect(vadResume).toHaveBeenCalled();      // window opened
    expect(ctrl.isListening()).toBe(true);

    await vadHandlers.onUtterance!('hola');     // speak → Cue answers → turn ends
    expect(ctrl.isListening()).toBe(false);     // PTT returns to idle-closed
    expect(vadPause).toHaveBeenCalled();        // closed for Cue's speech, stayed closed
  });

  it('ptt: tapping again cancels an open window without speaking', async () => {
    const ctrl = new ContinuousFlowController({ respond: ok('x'), flowMode: 'ptt' });
    await ctrl.start();
    ctrl.startListeningWindow();
    expect(ctrl.isListening()).toBe(true);
    ctrl.stopListeningWindow();
    expect(ctrl.isListening()).toBe(false);
  });
});
