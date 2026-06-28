/**
 * Cue interaction mode — Wave 3.
 *
 * Three ways a doctor can talk to Cue, chosen on first run and changeable
 * anytime from the dock header. Persisted in localStorage (per-device, instant;
 * a backend sync across devices is a later nicety, not this). Mirrors the lean
 * localStorage approach the VAD overrides already use.
 *
 *   'voice' — continuous voice with chimes (hands-free; the default/recommended)
 *   'ptt'   — push-to-talk: the mic listens only for a window the doctor opens
 *   'text'  — text only: no mic, no spoken greeting
 */
export type CueMode = 'voice' | 'ptt' | 'text'

export const CUE_MODE_VALUES: readonly CueMode[] = ['voice', 'ptt', 'text']
export const DEFAULT_CUE_MODE: CueMode = 'voice'
export const CUE_MODE_STORAGE_KEY = 'cue.voice.mode'

function isCueMode(v: unknown): v is CueMode {
  return v === 'voice' || v === 'ptt' || v === 'text'
}

/**
 * The doctor's chosen mode, or null if they haven't chosen yet (→ show the
 * first-run picker). Sanitizes: an unknown/legacy value reads as "not chosen".
 */
export function loadCueMode(): CueMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CUE_MODE_STORAGE_KEY)
    return isCueMode(raw) ? raw : null
  } catch {
    return null
  }
}

/** Persist the doctor's choice. No-op on invalid input or storage failure. */
export function saveCueMode(mode: CueMode): void {
  if (typeof window === 'undefined' || !isCueMode(mode)) return
  try {
    window.localStorage.setItem(CUE_MODE_STORAGE_KEY, mode)
  } catch {
    /* private mode / quota — non-fatal, the mode just won't persist */
  }
}

/**
 * Map the doctor-facing mode onto the voice controller's flow mode. 'text' has
 * no controller at all, so it returns null (CueSurface skips the controller).
 */
export function controllerFlowMode(mode: CueMode): 'continuous' | 'ptt' | null {
  if (mode === 'voice') return 'continuous'
  if (mode === 'ptt') return 'ptt'
  return null
}
