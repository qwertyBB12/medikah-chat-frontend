/**
 * Listening-window earcons (chimes) — Phase 47.x / Wave 2.
 *
 * VoiceMode / Whisper-Kokoro style audible boundaries for Cue's bounded
 * listening windows: a soft tone when the mic OPENS (the doctor's turn to
 * speak) and a soft tone when it CLOSES (Cue takes the floor, or a confirm
 * card is awaiting a click). The point is to make the always-listening VAD
 * feel like discrete, bounded windows — and to train doctors on the real
 * mic state for a future local/terminal Cue.
 *
 * Synthesized in-browser via Web Audio (no asset files to ship or fetch).
 * Tones share the SAME unlocked AudioContext as the TTS player, so they need
 * no separate user-gesture unlock. Everything is null-safe: with no context
 * (SSR, unsupported browser, or the test mock) every method is a no-op.
 *
 * Founder owns the SOUND — the presets below are candidates; DEFAULT_CHIME is
 * the shipping choice. Keep this file's renderer + presets byte-for-byte in
 * sync with the standalone audition page so what the founder hears is what
 * ships.
 */

/** One oscillator segment within a chime. */
export interface ChimeTone {
  /** Oscillator waveform. Default 'sine' (calmest, no buzzy harmonics). */
  type?: OscillatorType
  /** Start frequency (Hz). */
  freq: number
  /** Optional glide target (Hz) — exponential ramp across the tone's duration. */
  toFreq?: number
  /** Offset from the chime's start, in seconds. */
  start: number
  /** Tone duration in seconds. */
  dur: number
  /** Peak gain (0..1) before the master scale. Default 0.075 — deliberately subtle. */
  gain?: number
  /** Attack ramp in seconds (click-free onset). Default 0.01. */
  attack?: number
  /** Release ramp in seconds (click-free tail). Default min(0.13, dur). */
  release?: number
}

/** A chime is an open earcon and a close earcon, each a small tone cluster. */
export interface ChimeSpec {
  open: ChimeTone[]
  close: ChimeTone[]
}

// ── Presets (audition candidates) ───────────────────────────────────────────
// Musical, low-amplitude, rounded. Open earcons rise (an invitation); close
// earcons settle downward (the floor is yielded).

const C5 = 523.25
const D5 = 587.33
const E5 = 659.25
const F5 = 698.46
const G5 = 783.99
const A5 = 880.0
const G4 = 392.0

/** calm — soft rising/falling fourth, pure sine. The default: warm, clinical, unobtrusive. */
export const CHIME_CALM: ChimeSpec = {
  open: [
    { freq: C5, start: 0, dur: 0.11, gain: 0.07 },
    { freq: F5, start: 0.075, dur: 0.17, gain: 0.075, release: 0.13 },
  ],
  close: [
    { freq: F5, start: 0, dur: 0.1, gain: 0.07 },
    { freq: C5, start: 0.07, dur: 0.18, gain: 0.075, release: 0.15 },
  ],
}

/** glass — brighter triangle, rising/falling fifth-ish. A touch crystalline. */
export const CHIME_GLASS: ChimeSpec = {
  open: [
    { type: 'triangle', freq: D5, start: 0, dur: 0.09, gain: 0.06 },
    { type: 'triangle', freq: A5, start: 0.07, dur: 0.16, gain: 0.06, release: 0.12 },
  ],
  close: [
    { type: 'triangle', freq: A5, start: 0, dur: 0.09, gain: 0.06 },
    { type: 'triangle', freq: D5, start: 0.07, dur: 0.17, gain: 0.06, release: 0.14 },
  ],
}

/** warm — lower octave sine pair with a faint sub for body. Soft and grounded. */
export const CHIME_WARM: ChimeSpec = {
  open: [
    { freq: G4, start: 0, dur: 0.12, gain: 0.075 },
    { freq: D5, start: 0.08, dur: 0.18, gain: 0.07, release: 0.14 },
  ],
  close: [
    { freq: D5, start: 0, dur: 0.1, gain: 0.07 },
    { freq: G4, start: 0.075, dur: 0.2, gain: 0.075, release: 0.16 },
  ],
}

/** fifth — confident perfect fifth, pure sine, slightly more present. */
export const CHIME_FIFTH: ChimeSpec = {
  open: [
    { freq: C5, start: 0, dur: 0.1, gain: 0.08 },
    { freq: G5, start: 0.08, dur: 0.16, gain: 0.08, release: 0.12 },
  ],
  close: [
    { freq: G5, start: 0, dur: 0.1, gain: 0.08 },
    { freq: C5, start: 0.08, dur: 0.18, gain: 0.08, release: 0.14 },
  ],
}

/** minimal — a single soft blip each way. The most restrained option. */
export const CHIME_MINIMAL: ChimeSpec = {
  open: [{ freq: G5, start: 0, dur: 0.14, gain: 0.08, release: 0.11 }],
  close: [{ freq: D5, start: 0, dur: 0.14, gain: 0.08, release: 0.11 }],
}

/** glide — a smooth pitch sweep up (open) / down (close). Modern, frictionless. */
export const CHIME_GLIDE: ChimeSpec = {
  open: [{ freq: E5, toFreq: A5, start: 0, dur: 0.16, gain: 0.075, release: 0.12 }],
  close: [{ freq: A5, toFreq: E5, start: 0, dur: 0.16, gain: 0.075, release: 0.12 }],
}

/** Registry for the audition page + future mode picker. */
export const CHIME_PRESETS = {
  calm: CHIME_CALM,
  glass: CHIME_GLASS,
  warm: CHIME_WARM,
  fifth: CHIME_FIFTH,
  minimal: CHIME_MINIMAL,
  glide: CHIME_GLIDE,
} as const

export type ChimePresetName = keyof typeof CHIME_PRESETS

/** Shipping default — the founder's pick. (Audition before finalizing.) */
export const DEFAULT_CHIME: ChimeSpec = CHIME_CALM

// ── Player ───────────────────────────────────────────────────────────────────

/**
 * Renders chime specs through a shared AudioContext. The context is supplied
 * lazily (via a getter) because it is created/unlocked by the TTS player during
 * the user gesture that opens the dock — after the ChimePlayer is constructed.
 */
export class ChimePlayer {
  private getCtx: () => AudioContext | null
  private spec: ChimeSpec
  private master: number

  /**
   * @param getCtx   returns the shared (unlocked) AudioContext, or null
   * @param spec     which chime to play (default DEFAULT_CHIME)
   * @param master   master gain scale 0..1 (default 1)
   */
  constructor(getCtx: () => AudioContext | null, spec: ChimeSpec = DEFAULT_CHIME, master = 1) {
    this.getCtx = getCtx
    this.spec = spec
    this.master = master
  }

  setSpec(spec: ChimeSpec): void {
    this.spec = spec
  }

  playOpen(): void {
    this.render(this.spec.open)
  }

  playClose(): void {
    this.render(this.spec.close)
  }

  /** Synthesize a tone cluster. No-op without a context (SSR / unsupported / test). */
  private render(tones: ChimeTone[]): void {
    const ctx = this.getCtx()
    if (!ctx || typeof ctx.createOscillator !== 'function') return
    // A suspended context (e.g. after tab backgrounding) won't make sound; nudge
    // it. It was unlocked during the open gesture, so this rarely matters.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    const t0 = ctx.currentTime
    for (const t of tones) {
      try {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = t.type ?? 'sine'

        const peak = Math.max(0.0001, (t.gain ?? 0.075) * this.master)
        const attack = t.attack ?? 0.01
        const release = t.release ?? Math.min(0.13, t.dur)
        const start = t0 + t.start
        const end = start + t.dur
        const holdEnd = Math.max(start + attack, end - release)

        osc.frequency.setValueAtTime(t.freq, start)
        if (t.toFreq) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.toFreq), end)
        }

        // Exponential ramps from/to a tiny floor → click-free onset and tail.
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(peak, start + attack)
        gain.gain.setValueAtTime(peak, holdEnd)
        gain.gain.exponentialRampToValueAtTime(0.0001, end)

        osc.connect(gain).connect(ctx.destination)
        osc.start(start)
        osc.stop(end + 0.02)
        osc.onended = () => {
          try {
            gain.disconnect()
          } catch {
            /* noop */
          }
        }
      } catch {
        /* a single bad tone must never break the conversation */
      }
    }
  }
}
