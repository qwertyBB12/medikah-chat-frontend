import { describe, it, expect } from 'vitest';
import { orbVisualState } from '../../lib/cue/voice/orbVisualState';

describe('orbVisualState', () => {
  it('maps idle → ready and passes the others through', () => {
    expect(orbVisualState('idle')).toBe('ready');
    expect(orbVisualState('listening')).toBe('listening');
    expect(orbVisualState('thinking')).toBe('thinking');
    expect(orbVisualState('speaking')).toBe('speaking');
    expect(orbVisualState('intercepting')).toBe('intercepting');
  });
});
