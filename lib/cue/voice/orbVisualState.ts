import type { OrbState } from '../stateMachine';

/** The orb's own visual-state vocabulary (cue-stage.html STATES, extended to 5). */
export type OrbVisual = 'ready' | 'listening' | 'thinking' | 'speaking' | 'intercepting';

/** Map the 5-state FSM onto the orb's visual states. idle → calm "ready". */
export function orbVisualState(state: OrbState): OrbVisual {
  return state === 'idle' ? 'ready' : state;
}
