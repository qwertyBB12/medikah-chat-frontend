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
import { buildProposalLine, type CueProposal } from './proposalLine'
import { ChimePlayer, DEFAULT_CHIME, type ChimeSpec } from './chimes'
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

/** What respond() resolves to: the streamed reasoning text plus an optional
 *  write proposal (D-03). Text chunks are delivered live via opts.onTextChunk. */
export interface CueRespondResult {
  text: string
  pendingConfirm: CueProposal | null
}

export interface ContinuousFlowOptions {
  locale?: 'en' | 'es'
  config?: SobremesaVADConfig
  respond: (
    userText: string,
    opts?: { signal?: AbortSignal; onTextChunk?: (chunk: string) => void },
  ) => Promise<CueRespondResult>
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
  /** Wave 2: play audible open/close earcons at listening-window boundaries.
   *  Default true. The chime player is null-safe, so this is purely a mute. */
  chimes?: boolean
  /** Which earcon to play (default DEFAULT_CHIME). Founder-tunable. */
  chimeSpec?: ChimeSpec
  /**
   * Wave 3: mic cadence.
   *   'continuous' (default) — the mic rests OPEN; Cue listens hands-free.
   *   'ptt'                  — the mic rests CLOSED; it opens only for a window
   *                            the doctor taps open (push-to-talk).
   */
  flowMode?: 'continuous' | 'ptt'
}

export { isContinuousVADSupported, diagnoseVADSupport }

export class ContinuousFlowController {
  private listener: VADListener | null = null
  private tts: StreamingTTSPlayer
  private state = new VoiceStateMachine()
  private opts: ContinuousFlowOptions
  private destroyed = false
  private activeAbort: AbortController | null = null
  /**
   * Reasons the mic is currently held closed. The mic is physically open iff this
   * set is empty. Reference-counted by reason so two independent holders (Cue
   * speaking + a confirm card awaiting a click) can overlap and the mic only
   * reopens once BOTH clear — fixing the bug where the speech-end `finally`
   * reopened the mic while a confirm card was still up.
   */
  private micHolds = new Set<'speech' | 'confirm' | 'ptt'>()
  /** Wave 3: mic cadence — 'continuous' rests open, 'ptt' rests closed. */
  private flowMode: 'continuous' | 'ptt'
  /** Wave 2: have we played an OPEN chime yet this session? Gates the close
   *  chime so the very first earcon a doctor hears is the OPEN one after the
   *  greeting — never a lone close chime before Cue has even spoken. */
  private chimedOpen = false
  private chimes: ChimePlayer
  private chimesEnabled: boolean

  constructor(opts: ContinuousFlowOptions) {
    this.opts = opts
    this.tts = new StreamingTTSPlayer({
      locale: opts.locale ?? 'en',
      onSentenceStart: opts.onCueSentence,
      onSentence: opts.onCueSentence,   // Phase 55: caption strip (D-08)
    })
    this.chimesEnabled = opts.chimes !== false
    this.flowMode = opts.flowMode ?? 'continuous'
    // Earcons share the TTS player's already-unlocked AudioContext (sourced
    // lazily — it is created in tts.unlock() during start()).
    this.chimes = new ChimePlayer(
      () => this.tts.audioContext,
      opts.chimeSpec ?? DEFAULT_CHIME,
    )
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
    // Wave 3: in push-to-talk the mic rests CLOSED — close it immediately so it
    // only ever opens for a window the doctor taps. (chimedOpen is false here, so
    // no close earcon fires before the greeting.)
    if (this.flowMode === 'ptt') this.addMicHold('ptt')
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
    this.pauseMicForSpeech() // half-duplex: close the mic while the greeting plays
    try {
      await this.tts.play(text)
    } finally {
      this.resumeMicAfterSpeech()
    }
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

  /**
   * Mic gating — half-duplex self-barge-in fix (Phase 47.x) + confirm-card hold
   * (Wave 2). Reference-counted by reason: the mic physically closes on the
   * FIRST hold and reopens only when the LAST hold clears.
   *
   * Cue's TTS plays through the speakers; with an open mic (especially on loud
   * room speakers where browser echo cancellation is insufficient) that audio
   * leaks back in, the VAD reads it as the user talking, and barge-in cuts Cue
   * off mid-sentence — and the captured audio gets transcribed back as a fake
   * user utterance. So we close the mic while Cue speaks (reason 'speech') AND
   * while a write-confirm card awaits a click (reason 'confirm').
   *
   * vad-web's pause() does track.stop() (mic indicator goes off); resume()
   * re-acquires via resumeStream. getUserMedia does not re-prompt for an
   * already-granted origin, so the reopen is seamless.
   *
   * Wave 2 earcons: a CLOSE chime on the open→closed edge and an OPEN chime on
   * the closed→open edge make the listening window audible (VoiceMode style).
   * The close chime is suppressed until the first open chime has played, so the
   * opening greeting is never preceded by a lone close earcon.
   */
  private addMicHold(reason: 'speech' | 'confirm' | 'ptt'): void {
    const wasOpen = this.micHolds.size === 0
    this.micHolds.add(reason)
    if (!wasOpen) return // already closed — nothing to pause/chime
    try {
      this.listener?.pause()
    } catch {
      /* noop */
    }
    if (this.chimesEnabled && this.chimedOpen) this.chimes.playClose()
  }

  private releaseMicHold(reason: 'speech' | 'confirm' | 'ptt'): void {
    if (!this.micHolds.has(reason)) return
    this.micHolds.delete(reason)
    if (this.micHolds.size > 0) return // still held by another reason
    // Wave 3: push-to-talk rests CLOSED. When a turn ends (speech/confirm
    // clears), don't reopen to continuous listening — fall back to the idle
    // 'ptt' hold so the doctor taps to talk again. Releasing 'ptt' itself IS the
    // tap-to-talk, so that one falls through and reopens.
    if (this.flowMode === 'ptt' && reason !== 'ptt') {
      this.micHolds.add('ptt') // mic is already physically paused — keep it closed, no chime
      return
    }
    if (this.destroyed) return
    try {
      this.listener?.resume()
    } catch {
      /* noop */
    }
    if (this.chimesEnabled) {
      this.chimes.playOpen()
      this.chimedOpen = true
    }
  }

  /** Half-duplex: close the mic while Cue speaks. */
  private pauseMicForSpeech(): void {
    this.addMicHold('speech')
  }

  /** Half-duplex: reopen the mic once Cue's speech drains — UNLESS a confirm
   *  card is still holding it closed. */
  private resumeMicAfterSpeech(): void {
    this.releaseMicHold('speech')
  }

  /**
   * Wave 2a: keep the mic closed while a write-confirm card awaits a click, so
   * the doctor reading/clicking Confirm isn't captured as an utterance. Driven
   * by CueSurface for the text path AND deterministically by handleUtterance on
   * the voice path (so the speech-end `finally` can't reopen mid-card). Public.
   */
  holdMicForConfirm(): void {
    if (this.destroyed) return
    this.addMicHold('confirm')
  }

  /** Wave 2a: the confirm card was resolved (Confirm or Cancel) — reopen. */
  releaseMicAfterConfirm(): void {
    this.releaseMicHold('confirm')
  }

  /**
   * Wave 3 (push-to-talk): the doctor tapped "talk" — open a bounded listening
   * window (mic opens, open earcon). VAD captures the utterance; the turn then
   * returns the mic to its idle-closed PTT rest automatically. No-op outside ptt.
   */
  startListeningWindow(): void {
    if (this.destroyed || this.flowMode !== 'ptt') return
    this.releaseMicHold('ptt')
  }

  /** Wave 3 (push-to-talk): tap again to cancel an open window without speaking. */
  stopListeningWindow(): void {
    if (this.destroyed || this.flowMode !== 'ptt') return
    this.addMicHold('ptt')
  }

  /** Is the mic currently open and listening (no holds)? Drives the PTT button. */
  isListening(): boolean {
    return !this.destroyed && this.micHolds.size === 0
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
   * User finished speaking.  We have transcribed text; ask the caller to produce
   * Cue's reply and STREAM it into the TTS player as it arrives (Phase-23 TTFT):
   *   • flip the orb thinking → speaking on the FIRST text token (not after the
   *     whole reply assembles), so the wait feels instant
   *   • speak sentence 1 while later sentences are still generating
   *   • on a write proposal (D-03), cut any streamed preamble and speak a
   *     CONTROLLED templated line instead (never the model's prose)
   */
  private async handleUtterance(text: string): Promise<void> {
    if (!text) return
    this.opts.onUserUtterance?.(text)
    this.state.send('speech-ended', { source: 'vad' }) // listening → thinking
    // Half-duplex (diagnosis 2026-06-28): close the mic the MOMENT the doctor
    // stops talking — for the whole `thinking` gap, not just once Cue starts
    // speaking. Before, the mic stayed live through the (slow) model/tool wait,
    // so a cough or side-remark fired barge-in and silently aborted the very
    // reply the doctor just asked for, and the mic indicator stayed lit ("it
    // left my mic on"). Closing here also guarantees the 'speech' hold is set
    // before ANY error/empty path, so push-to-talk reliably returns to its
    // idle-closed rest (no leaked-open mic), and the close earcon lands at
    // speech-end ("got it") instead of colliding with Cue's first word.
    this.pauseMicForSpeech()

    const ac = new AbortController()
    this.activeAbort = ac

    // Open an incremental TTS session up front; its promise resolves when the
    // streamed playback finishes ('done') or is cut ('interrupted').
    const ttsDone = this.tts.beginStreaming()
    let startedSpeaking = false

    // Outer try/finally guarantees the mic reopens on EVERY exit path once we
    // have closed it for speech (half-duplex self-barge-in fix).
    try {
      let result: CueRespondResult
      try {
        result = await this.opts.respond(text, {
          signal: ac.signal,
          onTextChunk: (chunk) => {
            if (this.destroyed) return
            // Only feed/transition while we still own this turn (a barge-in moves
            // state out of thinking/speaking).
            const s = this.state.state
            if (s !== 'thinking' && s !== 'speaking') return
            if (!startedSpeaking) {
              startedSpeaking = true
              this.state.send('response-started', { source: 'llm' }) // thinking → speaking
              // Mic was already closed at speech-end (above) — it stays closed
              // straight through thinking → speaking, no reopen in between.
            }
            this.tts.pushText(chunk)
          },
        })
      } catch (err) {
        this.tts.stop() // tear down the streaming session
        const name = (err as { name?: string } | null)?.name
        if (name === 'AbortError') {
          // Expected cancellation from a barge-in during `thinking`. The barge-in
          // handler already walked state to `intercepting → listening`.
          return
        }
        this.opts.onError?.(err)
        this.state.send('error', { source: 'llm' })
        this.state.send('start', { source: 'internal' })
        return
      } finally {
        if (this.activeAbort === ac) this.activeAbort = null
      }
      if (this.destroyed) { this.tts.stop(); return }

      // A barge-in already moved us out of thinking/speaking — don't play a now
      // stale reply. (Could be `intercepting`/`listening`/`idle`.)
      if (this.state.state !== 'thinking' && this.state.state !== 'speaking') {
        this.tts.stop()
        return
      }

      // D-03: a calendar write was proposed. Cut any streamed preamble audio and
      // speak a CONTROLLED, interrogative templated line built from the structured
      // payload (never model prose, never past-tense). The write still requires
      // the explicit Confirm tap — this line only asks.
      if (result.pendingConfirm) {
        this.tts.stop()
        await ttsDone // let the cut streaming session fully unwind before re-playing
        if (this.destroyed) return
        if (this.state.state === 'thinking') {
          this.state.send('response-started', { source: 'llm' }) // ensure speaking
        }
        // Keep the mic closed for the templated line too (covers the case where
        // no preamble streamed, so pauseMicForSpeech never ran above).
        this.pauseMicForSpeech()
        const line = buildProposalLine(result.pendingConfirm, this.opts.locale ?? 'en')
        await this.tts.play(line)
        if (this.destroyed) return
        this.state.send('response-ended', { source: 'tts' })
        // Wave 2a: hand the mic-closed state off from 'speech' to 'confirm' BEFORE
        // the outer finally releases 'speech', so the mic never flickers open while
        // the confirm card is up. CueSurface releases this on Confirm/Cancel.
        this.holdMicForConfirm()
        return
      }

      // No speakable text at all (empty reply, no chunks streamed) — close out.
      if (!startedSpeaking && !result.text.trim()) {
        this.tts.stop()
        this.state.send('response-ended', { source: 'llm' })
        return
      }

      // Normal path: no more text is coming — flush the trailing partial and wait
      // for the streamed playback to drain.
      this.tts.endPushing()
      const outcome = await ttsDone
      if (this.destroyed) return
      if (outcome === 'done') {
        this.state.send('response-ended', { source: 'tts' })
      } else {
        // Interrupted — state machine already advanced to `intercepting`.
        // Bring it back to listening so the next utterance flows.
        this.state.send('speech-ended', { source: 'tts' })
      }
    } finally {
      // Half-duplex: whatever path we took, reopen the mic if we closed it.
      this.resumeMicAfterSpeech()
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
