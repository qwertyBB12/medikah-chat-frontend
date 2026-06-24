import { describe, it, expect, vi, beforeEach } from 'vitest';

const vadHandlers: { onSpeechStart?: () => void; onUtterance?: (t: string) => void } = {};
vi.mock('./vadListener', () => ({
  isContinuousVADSupported: () => true,
  diagnoseVADSupport: () => ({ ok: true, reasons: [] }),
  VADListener: class {
    constructor(opts: { onSpeechStart?: () => void; onUtterance?: (t: string) => void }) { vadHandlers.onSpeechStart = opts.onSpeechStart; vadHandlers.onUtterance = opts.onUtterance; }
    async start() {}
    pause() {}
    destroy() {}
  },
}));

let playMode: 'resolve' | 'pending' = 'resolve';
let releasePlay: ((v: 'done' | 'interrupted') => void) | null = null;
const ttsStop = vi.fn();
vi.mock('./streamingTts', () => ({
  StreamingTTSPlayer: class {
    unlock() {}
    stop() { ttsStop(); releasePlay?.('interrupted'); releasePlay = null; }
    play() {
      if (playMode === 'resolve') return Promise.resolve('done' as const);
      return new Promise<'done' | 'interrupted'>((res) => { releasePlay = res; });
    }
  },
}));

import { ContinuousFlowController } from './continuousFlow';
import type { OrbState } from '../stateMachine';

describe('ContinuousFlowController', () => {
  beforeEach(() => { ttsStop.mockClear(); playMode = 'resolve'; releasePlay = null; });

  it('runs a turn: listening → thinking → speaking', async () => {
    const states: OrbState[] = [];
    const ctrl = new ContinuousFlowController({
      respond: async () => 'Bien.',
      onStateChange: (s) => states.push(s as OrbState),
    });
    await ctrl.start();
    await vadHandlers.onUtterance!('hola');
    expect(states).toContain('listening');
    expect(states).toContain('thinking');
    expect(states).toContain('speaking');
  });

  it('barge-in while speaking stops TTS', async () => {
    playMode = 'pending';
    const states: OrbState[] = [];
    const ctrl = new ContinuousFlowController({
      respond: async () => 'Una respuesta larga.',
      onStateChange: (s) => states.push(s as OrbState),
    });
    await ctrl.start();
    const turn = vadHandlers.onUtterance!('hola');
    await vi.waitFor(() => expect(states).toContain('speaking'));
    vadHandlers.onSpeechStart!(); // user interrupts mid-speech
    expect(ttsStop).toHaveBeenCalled();
    await turn;
  });
});
