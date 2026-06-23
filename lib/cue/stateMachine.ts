/**
 * lib/cue/stateMachine.ts — Cue voice state machine (VOICE-05).
 *
 * VERBATIM PORT of the BeNeXT/hector-ecosystem source
 * (apps/benext/src/lib/cue/voice/state-machine.ts), chosen by Hector for exact
 * parity (2026-06-23). The canonical five-state union is
 * idle/listening/thinking/speaking/intercepting — `intercepting` is the
 * barge-in target (NOT a guessed `error` state). `error` is an EVENT that
 * returns the machine to idle. `interrupted` is a deprecated alias for
 * `intercepting`, retained for one release.
 *
 *   idle ──(start)──► listening
 *   listening ──(speech-ended)──► thinking
 *   thinking ──(response-started)──► speaking
 *   speaking ──(barge-in)──► intercepting ──► listening
 *   speaking ──(response-ended)──► listening
 *   any ──(stop / error)──► idle
 *
 * Pure client-side; no network, no React. The orb visual (CueOrb.tsx)
 * subscribes to drive its appearance. Sobremesa pacing lives in
 * lib/cue/sobremesaConfig.ts (the deliberately-slowed clinical cadence — do NOT
 * re-tune it snappier; it is a brand differentiator).
 */

/** Canonical five-state orb union — use this in new code. */
export type OrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'intercepting';

/** Alias used by the orb/UI layer (VOICE-05 "five-state orb FSM"). */
export type CueState = OrbState;

/** The five canonical states, in order — for exhaustive UI mapping + tests. */
export const CUE_STATES: readonly OrbState[] = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'intercepting',
];

/**
 * @deprecated use `OrbState` — `'interrupted'` is retained as a synonym
 * for `'intercepting'` for one release.
 */
export type VoiceState = OrbState | 'interrupted';

export type VoiceEvent =
  | 'start'
  | 'speech-detected'
  | 'speech-ended'
  | 'response-started'
  | 'response-ended'
  | 'barge-in'
  | 'stop'
  | 'error';

/** Origin of a state transition — helps subscribers attribute events. */
export type OrbEventSource =
  | 'vad'
  | 'tts'
  | 'llm'
  | 'bridge'
  | 'user'
  | 'internal';

/** Rich payload emitted on every state transition. Stable for v2.0–v2.5. */
export interface OrbEventPayload {
  state: OrbState;
  prevState: OrbState;
  timestampMs: number;
  source: OrbEventSource;
  /** Only present on barge-in transitions (measured by VAD). */
  latencyMs?: number;
}

export type StateListener = (state: VoiceState, prev: VoiceState) => void;
export type OrbEventListener = (payload: OrbEventPayload) => void;

export interface SendMeta {
  source?: OrbEventSource;
  latencyMs?: number;
}

const ALLOWED: Record<OrbState, Partial<Record<VoiceEvent, OrbState>>> = {
  idle: {
    start: 'listening',
  },
  listening: {
    'speech-detected': 'listening', // still listening; transcription in flight
    'speech-ended': 'thinking',
    stop: 'idle',
    error: 'idle',
  },
  thinking: {
    'response-started': 'speaking',
    'barge-in': 'intercepting',
    stop: 'idle',
    error: 'idle',
  },
  speaking: {
    'barge-in': 'intercepting',
    'response-ended': 'listening',
    stop: 'idle',
    error: 'idle',
  },
  intercepting: {
    // The interruption handler wires back to listening once TTS is confirmed
    // stopped and mic is open. This two-step keeps the UI honest.
    'speech-ended': 'listening',
    start: 'listening',
    stop: 'idle',
    error: 'idle',
  },
};

// Legacy alias table: if an external caller mutated state to `'interrupted'`
// (the deprecated literal), accept the same transitions as `intercepting`.
const LEGACY_ALIAS_INTERRUPTED: Partial<Record<VoiceEvent, OrbState>> =
  ALLOWED.intercepting;

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export class VoiceStateMachine {
  private _state: OrbState = 'idle';
  private listeners: Set<StateListener> = new Set();
  private orbListeners: Set<OrbEventListener> = new Set();

  get state(): OrbState {
    return this._state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** New canonical subscription — receives full OrbEventPayload. */
  subscribeOrbEvents(listener: OrbEventListener): () => void {
    this.orbListeners.add(listener);
    return () => this.orbListeners.delete(listener);
  }

  /** Attempt a transition. Returns true if it fired, false if disallowed. */
  send(event: VoiceEvent, meta?: SendMeta): boolean {
    const table =
      // Defensive: if someone externally wrote the deprecated 'interrupted'
      // literal into state, fall back to the intercepting transition table.
      (this._state as string) === 'interrupted'
        ? LEGACY_ALIAS_INTERRUPTED
        : ALLOWED[this._state];
    const next = table?.[event];
    if (!next) {
      if (
        typeof console !== 'undefined' &&
        (globalThis as { __CUE_VOICE_DEBUG?: boolean }).__CUE_VOICE_DEBUG
      ) {
        console.debug('[cue-voice] illegal transition', this._state, '+', event);
      }
      return false;
    }
    const prev = this._state;
    this._state = next;
    const source: OrbEventSource = meta?.source ?? 'internal';
    const timestampMs = nowMs();
    const payload: OrbEventPayload =
      meta?.latencyMs != null
        ? { state: next, prevState: prev, timestampMs, source, latencyMs: meta.latencyMs }
        : { state: next, prevState: prev, timestampMs, source };

    // forEach (not for…of) to avoid TS downlevelIteration on Set in this repo's
    // tsconfig target; behavior is identical.
    this.listeners.forEach((l) => {
      try {
        l(next, prev);
      } catch {
        /* swallow listener errors */
      }
    });
    this.orbListeners.forEach((l) => {
      try {
        l(payload);
      } catch {
        /* swallow listener errors */
      }
    });
    return true;
  }

  reset() {
    const prev = this._state;
    this._state = 'idle';
    if (prev !== 'idle') {
      const timestampMs = nowMs();
      const payload: OrbEventPayload = {
        state: 'idle',
        prevState: prev,
        timestampMs,
        source: 'internal',
      };
      this.listeners.forEach((l) => {
        try {
          l('idle', prev);
        } catch {
          /* noop */
        }
      });
      this.orbListeners.forEach((l) => {
        try {
          l(payload);
        } catch {
          /* noop */
        }
      });
    }
  }
}
