/**
 * lib/cue/stateMachine.test.ts — VOICE-05 FSM contract.
 *
 * Ported from the BeNeXT source test (apps/benext/.../__tests__/state-machine.test.ts),
 * minus the out-of-scope streaming-tts (splitSentences) block. Asserts the five
 * canonical states, the happy-path + barge-in transitions, that illegal
 * transitions are rejected without mutating state, and the OrbEvent payload.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  VoiceStateMachine,
  CUE_STATES,
  type OrbEventPayload,
  type OrbState,
} from './stateMachine';

describe('CueState enumeration (VOICE-05 five-state orb FSM)', () => {
  it('enumerates exactly the five canonical states', () => {
    expect(CUE_STATES).toEqual([
      'idle',
      'listening',
      'thinking',
      'speaking',
      'intercepting',
    ]);
    expect(CUE_STATES.length).toBe(5);
  });
});

describe('VoiceStateMachine', () => {
  it('idle transitions to listening on start', () => {
    const sm = new VoiceStateMachine();
    expect(sm.state).toBe('idle');
    expect(sm.send('start')).toBe(true);
    expect(sm.state).toBe('listening');
  });

  it('listening → thinking → speaking → listening is the happy path', () => {
    const sm = new VoiceStateMachine();
    sm.send('start');
    sm.send('speech-ended');
    expect(sm.state).toBe('thinking');
    sm.send('response-started');
    expect(sm.state).toBe('speaking');
    sm.send('response-ended');
    expect(sm.state).toBe('listening');
  });

  it('barge-in from speaking routes through intercepting', () => {
    const sm = new VoiceStateMachine();
    sm.send('start');
    sm.send('speech-ended');
    sm.send('response-started');
    expect(sm.send('barge-in')).toBe(true);
    expect(sm.state).toBe('intercepting');
    sm.send('speech-ended');
    expect(sm.state).toBe('listening');
  });

  it('illegal transitions are rejected without mutating state', () => {
    const sm = new VoiceStateMachine();
    expect(sm.send('barge-in')).toBe(false);
    expect(sm.state).toBe('idle');
  });

  it('stop from any state returns to idle', () => {
    const sm = new VoiceStateMachine();
    sm.send('start');
    sm.send('speech-ended');
    sm.send('response-started');
    sm.send('stop');
    expect(sm.state).toBe('idle');
  });

  it('error event from any active state returns to idle', () => {
    const sm = new VoiceStateMachine();
    sm.send('start');
    expect(sm.send('error')).toBe(true);
    expect(sm.state).toBe('idle');
  });

  it('subscribers are notified with prev and next state', () => {
    const sm = new VoiceStateMachine();
    const events: Array<[string, string]> = [];
    sm.subscribe((next, prev) => events.push([prev, next]));
    sm.send('start');
    expect(events).toEqual([['idle', 'listening']]);
  });
});

describe('VoiceStateMachine — OrbEvent payload', () => {
  it('subscribeOrbEvents receives payload with state, prevState, timestampMs, source', () => {
    const sm = new VoiceStateMachine();
    const payloads: OrbEventPayload[] = [];
    sm.subscribeOrbEvents((p) => payloads.push(p));
    sm.send('start');
    expect(payloads.length).toBe(1);
    const p = payloads[0];
    expect(p.state).toBe('listening');
    expect(p.prevState).toBe('idle');
    expect(typeof p.timestampMs).toBe('number');
    expect(p.source).toBeDefined();
  });

  it("source defaults to 'internal' when not provided", () => {
    const sm = new VoiceStateMachine();
    const payloads: OrbEventPayload[] = [];
    sm.subscribeOrbEvents((p) => payloads.push(p));
    sm.send('start');
    expect(payloads[0].source).toBe('internal');
  });

  it("source is propagated when passed: send('barge-in', { source: 'vad' })", () => {
    const sm = new VoiceStateMachine();
    sm.send('start');
    sm.send('speech-ended');
    sm.send('response-started');
    const payloads: OrbEventPayload[] = [];
    sm.subscribeOrbEvents((p) => payloads.push(p));
    sm.send('barge-in', { source: 'vad' });
    expect(payloads[0].source).toBe('vad');
    expect(payloads[0].state).toBe('intercepting');
  });

  it('latencyMs is included on payload when passed and omitted otherwise', () => {
    const sm = new VoiceStateMachine();
    const payloads: OrbEventPayload[] = [];
    sm.subscribeOrbEvents((p) => payloads.push(p));
    sm.send('start');
    expect(payloads[0].latencyMs).toBeUndefined();
    sm.send('speech-ended');
    sm.send('response-started');
    sm.send('barge-in', { source: 'vad', latencyMs: 12 });
    const bargePayload = payloads.find((p) => p.state === 'intercepting')!;
    expect(bargePayload.latencyMs).toBe(12);
  });

  it('unsubscribe stops further notifications', () => {
    const sm = new VoiceStateMachine();
    const listener = vi.fn();
    const unsub = sm.subscribeOrbEvents(listener);
    sm.send('start');
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    sm.send('speech-ended');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('legacy subscribe API still fires with (state, prev)', () => {
    const sm = new VoiceStateMachine();
    const events: Array<[OrbState | 'interrupted', OrbState | 'interrupted']> = [];
    sm.subscribe((next, prev) => events.push([next, prev]));
    sm.send('start');
    expect(events).toEqual([['listening', 'idle']]);
  });
});
