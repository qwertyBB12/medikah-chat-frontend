/**
 * Continuous-flow controller — Phase 47 / Phase 47.1.
 *
 * Composes VADListener + StreamingTTSPlayer + VoiceStateMachine into a
 * single handle the UI can start/stop.  This is the default mode for the
 * new Cue voice experience; push-to-talk remains available as a fallback.
 *
 * The caller provides:
 *   • `respond(text, { signal })` — a function that sends the user's
 *     transcribed utterance to the conversation API and returns Cue's full
 *     reply text.  We wrap that reply in StreamingTTSPlayer for playback.
 *     The caller keeps owning conversation state; this module only knows
 *     about audio I/O. The optional `signal` lets the controller cancel
 *     the upstream LLM request when the user barges in during `thinking`.
 *
 * Interruption path (the 150ms target):
 *   VAD onSpeechStart → state.send('barge-in', { source: 'vad', latencyMs })
 *                     → if thinking: activeAbort.abort() (cancel LLM)
 *                     → if speaking: tts.stop() (cancel playback)
 *                     → state → listening
 *
 * VAD threshold overrides (Phase 47.1 Plan 03):
 *   On start(), if no explicit `config` option was passed, the controller
 *   reads localStorage['cue.voice.vadOverrides'] and merges the four
 *   whitelisted keys over SOBREMESA_DEFAULT. See sobremesa-config.ts for
 *   the overridable keys and validator rules.
 *
 *   For live dogfooding from DevTools, a debug-only setter is installed on
 *   `window.__setCueVadOverrides(obj | null)`. Pass an object to save, or
 *   null to clear. The read path sanitizes, so invalid values simply fall
 *   back to the defaults — the writer is an unvalidated passthrough.
 */

import { VADListener, isContinuousVADSupported, diagnoseVADSupport } from './vadListener'
import { StreamingTTSPlayer } from './streamingTts'
import {
  VoiceStateMachine,
  type VoiceState,
  type OrbEventPayload,
} from '../stateMachine'
import {
  SOBREMESA_DEFAULT,
  VAD_OVERRIDES_STORAGE_KEY,
  loadVadOverrides,
  mergeVadConfig,
  type SobremesaVADConfig,
  type VadOverrides,
} from '../sobremesaConfig'

export interface ContinuousFlowOptions {
  locale?: 'en' | 'es'
  config?: SobremesaVADConfig
  respond: (
    userText: string,
    opts?: { signal?: AbortSignal },
  ) => Promise<string>
  onStateChange?: (state: VoiceState) => void
  /** New canonical subscription — receives full OrbEventPayload for each transition. */
  onOrbEvent?: (payload: OrbEventPayload) => void
  onUserUtterance?: (text: string) => void
  onCueSentence?: (text: string) => void
  onError?: (err: unknown) => void
  /** Reuse an existing AudioContext (unlocked during user gesture) */
  audioContext?: AudioContext
  /** Latency telemetry — emits ms from barge-in to TTS-stop */
  onInterruptionLatency?: (ms: number) => void
}

export { isContinuousVADSupported, diagnoseVADSupport }

export class ContinuousFlowController {
  private listener: VADListener | null = null
  private tts: StreamingTTSPlayer
  private state = new VoiceStateMachine()
  private opts: ContinuousFlowOptions
  private destroyed = false
  private activeAbort: AbortController | null = null

  constructor(opts: ContinuousFlowOptions) {
    this.opts = opts
    this.tts = new StreamingTTSPlayer({
      locale: opts.locale ?? 'en',
      onSentenceStart: opts.onCueSentence,
      onSentence: opts.onCueSentence,   // Phase 55: caption strip (D-08)
    })
    if (opts.onStateChange) {
      this.state.subscribe((s) => opts.onStateChange!(s))
    }
    if (opts.onOrbEvent) {
      this.state.subscribeOrbEvents((p) => opts.onOrbEvent!(p))
    }
  }

  get currentState(): VoiceState {
    return this.state.state
  }

  /** Must be called during a user gesture (button click). */
  async start(): Promise<void> {
    if (this.destroyed) throw new Error('ContinuousFlowController destroyed')
    this.tts.unlock(this.opts.audioContext)

    if (!this.listener) {
      // Resolve effective VAD config: explicit opts.config wins. Otherwise
      // merge author overrides from localStorage on top of SOBREMESA_DEFAULT.
      const effectiveConfig: SobremesaVADConfig =
        this.opts.config ?? mergeVadConfig(SOBREMESA_DEFAULT, loadVadOverrides())

      this.listener = new VADListener({
        config: effectiveConfig,
        locale: this.opts.locale ?? 'en',
        onSpeechStart: () => this.handleSpeechStart(),
        onUtterance: (t) => this.handleUtterance(t),
        onError: this.opts.onError,
      })
    }
    await this.listener.start()
    this.state.send('start', { source: 'user' })
  }

  stop(): void {
    this.tts.stop()
    this.listener?.pause()
    this.state.send('stop', { source: 'user' })
  }

  /**
   * Speak a one-off line (the open-greeting) through the shared TTS player.
   * Used by CueSurface so the brain-turn greeting plays via the same unlocked
   * AudioContext as the conversational replies. State transitions are
   * best-effort (the greeting fires right after start(), when the machine is in
   * `listening`); the TTS playback is the load-bearing part.
   */
  async playReply(text: string): Promise<void> {
    if (!text) return
    this.state.send('response-started', { source: 'llm' }) // thinking→speaking (best-effort)
    await this.tts.play(text)
    this.state.send('response-ended', { source: 'tts' })
  }

  destroy(): void {
    this.destroyed = true
    this.tts.stop()
    this.listener?.destroy()
    this.listener = null
    try {
      this.activeAbort?.abort()
    } catch {
      /* noop */
    }
    this.activeAbort = null
  }

  /** Barge-in hook.  Fires the moment VAD sees new speech. */
  private handleSpeechStart(): void {
    const current = this.state.state
    // If Cue is mid-utterance, this is a barge-in.
    if (current === 'speaking' || current === 'thinking') {
      const t0 =
        typeof performance !== 'undefined' ? performance.now() : Date.now()

      // Cancel whichever path is active: LLM (thinking) or TTS (speaking).
      if (current === 'thinking') {
        try {
          this.activeAbort?.abort()
        } catch {
          /* noop — AbortController.abort() is idempotent but guard anyway */
        }
      } else {
        try {
          this.tts.stop()
        } catch {
          /* noop */
        }
      }

      const t1 =
        typeof performance !== 'undefined' ? performance.now() : Date.now()
      const latencyMs = t1 - t0

      this.state.send('barge-in', { source: 'vad', latencyMs })
      this.opts.onInterruptionLatency?.(latencyMs)

      // From intercepting, walk back to listening so the next turn flows.
      if (current === 'thinking') {
        this.state.send('speech-ended', { source: 'vad' })
      }
    }
    // If we were idle / listening, nothing to cut.  VAD will emit onUtterance
    // on speech-end; no state transition needed here.
  }

  /**
   * User finished speaking.  We have transcribed text; now ask the caller
   * to produce Cue's reply, then play it.
   */
  private async handleUtterance(text: string): Promise<void> {
    if (!text) return
    this.opts.onUserUtterance?.(text)
    this.state.send('speech-ended', { source: 'vad' }) // listening → thinking

    const ac = new AbortController()
    this.activeAbort = ac
    let reply = ''
    try {
      reply = await this.opts.respond(text, { signal: ac.signal })
    } catch (err) {
      const name = (err as { name?: string } | null)?.name
      if (name === 'AbortError') {
        // Expected cancellation from a barge-in during `thinking`. The
        // barge-in handler already walked state to `intercepting → listening`,
        // so we simply bail without emitting onError.
        return
      }
      this.opts.onError?.(err)
      // Return to listening on error; don't strand the state in `thinking`.
      this.state.send('error', { source: 'llm' })
      this.state.send('start', { source: 'internal' })
      return
    } finally {
      if (this.activeAbort === ac) this.activeAbort = null
    }
    if (this.destroyed) return

    // If a barge-in already fired, state is no longer `thinking` — don't
    // override it by trying to play a now-stale reply.
    if (this.state.state !== 'thinking') return

    if (!reply) {
      this.state.send('response-ended', { source: 'llm' })
      return
    }

    this.state.send('response-started', { source: 'llm' })
    const outcome = await this.tts.play(reply)
    if (this.destroyed) return
    if (outcome === 'done') {
      this.state.send('response-ended', { source: 'tts' })
    } else {
      // Interrupted — state machine already advanced to `intercepting`.
      // Bring it back to listening so the next utterance flows.
      this.state.send('speech-ended', { source: 'tts' })
    }
  }
}

/* -------------------------------------------------------------------------- *
 * DevTools helper — Phase 47.1 Plan 03
 *
 * Install a debug-only writer on window.__setCueVadOverrides. Pass an object
 * to save overrides; pass null to clear. The read path (loadVadOverrides)
 * sanitizes everything — the setter is a deliberately dumb passthrough so
 * authors can experiment via DevTools without a rebuild.
 *
 * Usage:
 *   window.__setCueVadOverrides({ positiveSpeechThreshold: 0.5 })
 *   window.__setCueVadOverrides(null) // clear
 * -------------------------------------------------------------------------- */

type SetCueVadOverridesResult =
  | { ok: true; saved: VadOverrides }
  | { ok: true; cleared: true }
  | { ok: false; error: string }

declare global {
  interface Window {
    __setCueVadOverrides?: (
      obj: VadOverrides | null,
    ) => SetCueVadOverridesResult
  }
}

if (
  typeof window !== 'undefined' &&
  typeof (window as Window).__setCueVadOverrides === 'undefined'
) {
  ;(window as Window).__setCueVadOverrides = (
    obj: VadOverrides | null,
  ): SetCueVadOverridesResult => {
    try {
      if (obj === null) {
        window.localStorage.removeItem(VAD_OVERRIDES_STORAGE_KEY)
        return { ok: true, cleared: true }
      }
      if (typeof obj !== 'object' || Array.isArray(obj)) {
        return { ok: false, error: 'expected object or null' }
      }
      window.localStorage.setItem(
        VAD_OVERRIDES_STORAGE_KEY,
        JSON.stringify(obj),
      )
      return { ok: true, saved: obj }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
}
