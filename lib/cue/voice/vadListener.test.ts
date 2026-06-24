import { describe, it, expect } from 'vitest';
import { encodeWAV } from './vadListener';

describe('encodeWAV', () => {
  it('produces a RIFF/WAVE 16kHz mono PCM-16 blob of the right size', async () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const blob = encodeWAV(samples, 16000);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + samples.length * 2); // header + PCM16
    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    expect(String.fromCharCode(...header)).toBe('RIFF');
  });
});
