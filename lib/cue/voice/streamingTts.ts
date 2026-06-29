/**
 * Streaming TTS playback — Phase 47, T3.
 *
 * Voxtral's HTTP endpoint currently returns a single base64-encoded MP3
 * payload (see apps/benext/src/pages/api/cue/tts.ts). True
 * chunked streaming is a server-side change deferred to Phase 47 v2.
 *
 * What we can do today without touching the server:
 *   • Split the reply text into sentences on the client.
 *   • Kick off all TTS fetches in parallel (bounded concurrency).
 *   • Decode each MP3 into an AudioBuffer and play in order through a
 *     single AudioContext.
 *   • Expose a synchronous `stop()` that calls AudioBufferSourceNode.stop()
 *     immediately — the <150ms interruption target in the spec.
 *
 * This class is intentionally NOT the existing window.VoiceEngine (which uses
 * HTMLAudioElement). HTMLAudioElement.pause() has unreliable cut latency on
 * Safari; WebAudio stop() is sample-accurate.
 */

import { applyTtsPronunciation } from './pronunciation';

export interface StreamingTTSOptions {
  endpoint?: string // default '/api/cue/tts'
  locale?: 'en' | 'es'
  /** Concurrency cap for in-flight fetches (keeps network from stampeding) */
  concurrency?: number
  /** Max fetch attempts per sentence before giving up (1 = no retry). Default 3.
   *  A transient TTS failure (429 / 5xx / network) was silently dropping the whole
   *  sentence's audio — the doctor saw the text but heard nothing. */
  maxAttempts?: number
  /** Base backoff in ms between retries (attempt n waits n * base). Default 200.
   *  Set 0 in tests. */
  retryBackoffMs?: number
  /** Called when each sentence begins playing (for UI reveal) */
  onSentenceStart?: (sentence: string) => void
  /** Phase 55 (ORB-03): fires at sentence boundary so the caption strip can
   *  replace text mid-speaking. Equivalent to onSentenceStart; kept separate
   *  for semantic clarity in the state-bridge (D-07, D-08). */
  onSentence?: (text: string) => void
  /** Called when the full utterance has finished playing */
  onDone?: () => void
  /** Called if stop() was invoked before natural completion */
  onInterrupted?: () => void
}

interface QueuedChunk {
  text: string
  bufferPromise: Promise<AudioBuffer | null>
}

export class StreamingTTSPlayer {
  private ctx: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private queue: QueuedChunk[] = []
  private playing = false
  private stopped = false
  private abortController: AbortController | null = null

  // ── Gapless playback (streaming path) ──────────────────────────────────────
  // The streaming consumer schedules each sentence clip on the AudioContext
  // clock at `nextStartTime` (chained from the previous clip's end) instead of
  // calling src.start() at "now" after the previous clip's onended fires. That
  // eliminated the per-sentence seam — the audible "stutter" (diagnosis
  // 2026-06-28). `scheduledSources` tracks every clip queued on the timeline so
  // stop() (barge-in) can cut ALL of them, not just the latest.
  private nextStartTime = 0
  private scheduledSources = new Set<AudioBufferSourceNode>()

  // ── Incremental streaming session (Phase 23 TTFT) ──────────────────────────
  // beginStreaming() → pushText(chunk)* → endPushing(). Lets playback start on
  // sentence 1 while later sentences are still arriving from /api/cue/chat,
  // instead of waiting for the whole reply (play(fullText)).
  private streamQueue: QueuedChunk[] = []
  private streamPending = ''
  private streamDonePushing = false
  private streamWaiters: Array<() => void> = []

  // Concurrency semaphore for streaming TTS fetches. The play() path has its own
  // rolling gate (primeQueue); the streaming path used to fire one fetch per
  // sentence with NO bound — a multi-sentence reply stampeded the TTS endpoint,
  // rate-limited, and silently dropped sentences. This caps in-flight fetches.
  private streamInFlight = 0
  private streamSlotWaiters: Array<() => void> = []

  constructor(private opts: StreamingTTSOptions = {}) {}

  /** Must be called during a user gesture to unlock Safari audio. */
  unlock(existingCtx?: AudioContext): void {
    if (!this.ctx) {
      this.ctx =
        existingCtx ??
        new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  isPlaying(): boolean {
    return this.playing
  }

  /** The shared (unlocked) AudioContext, once unlock() has run — else null.
   *  Lets sibling audio (e.g. the chime player) reuse the same already-unlocked
   *  context and speaker output instead of creating a second one. */
  get audioContext(): AudioContext | null {
    return this.ctx
  }

  /**
   * Play a full reply.  Splits on sentence boundaries and streams each chunk.
   * Resolves when playback completes (or is interrupted).
   */
  async play(fullText: string): Promise<'done' | 'interrupted'> {
    this.stopped = false
    this.playing = true
    this.abortController = new AbortController()

    const sentences = splitSentences(fullText)
    const concurrency = Math.max(1, this.opts.concurrency ?? 3)

    // Kick off fetches with a simple rolling concurrency gate so we don't
    // wait for sentence N to start decoding sentence N+1 — but also don't
    // blast 30 parallel requests.
    this.queue = []
    let inFlight = 0
    let nextFetch = 0

    const primeQueue = () => {
      while (inFlight < concurrency && nextFetch < sentences.length) {
        const text = sentences[nextFetch++]
        inFlight++
        const bufferPromise = this._fetchSentence(text).finally(() => {
          inFlight--
          primeQueue()
        })
        this.queue.push({ text, bufferPromise })
      }
    }
    primeQueue()

    // Play sequentially.
    for (let i = 0; i < this.queue.length; i++) {
      if (this.stopped) break
      const chunk = this.queue[i]
      const buffer = await chunk.bufferPromise
      if (this.stopped) break
      if (!buffer) {
        // Still reveal the text even if audio failed.
        this.opts.onSentenceStart?.(chunk.text)
        this.opts.onSentence?.(chunk.text)
        continue
      }
      this.opts.onSentenceStart?.(chunk.text)
      this.opts.onSentence?.(chunk.text)
      await this.playBuffer(buffer)
      if (this.stopped) break
    }

    this.playing = false
    if (this.stopped) {
      this.opts.onInterrupted?.()
      return 'interrupted'
    }
    this.opts.onDone?.()
    return 'done'
  }

  /** Fetch + decode one sentence's audio. Shared by play() and the streaming
   *  session. Retries transient failures (429 / 5xx / network) so one cold-start
   *  blip can't silently drop a whole sentence's audio. Returns null only after
   *  exhausting attempts or on a hard error (caller still reveals the text). */
  private async _fetchSentence(text: string): Promise<AudioBuffer | null> {
    if (this.stopped) return null
    const endpoint = this.opts.endpoint ?? '/api/cue/tts'
    const locale = this.opts.locale ?? 'en'
    const maxAttempts = Math.max(1, this.opts.maxAttempts ?? 3)
    const body = JSON.stringify({ text: applyTtsPronunciation(text, locale), locale })

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (this.stopped) return null
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: this.abortController?.signal,
        })
        if (res.status === 204) return null // genuinely empty — nothing to retry
        if (!res.ok) {
          // Retry only transient server-side failures; a hard 4xx (401/403/422)
          // won't change on retry, so give up immediately (no wasted calls).
          if (this._isTransient(res.status) && attempt < maxAttempts) {
            await this._backoff(attempt)
            continue
          }
          return null
        }
        const arrayBuf = await res.arrayBuffer()
        if (this.stopped || !this.ctx) return null
        return await this.ctx.decodeAudioData(arrayBuf)
      } catch {
        // Network/abort/decode error. Don't retry once stopped (barge-in aborts
        // the shared signal); otherwise retry the transient blip.
        if (this.stopped || attempt >= maxAttempts) return null
        await this._backoff(attempt)
      }
    }
    return null
  }

  /** 429 (rate limit) and 5xx (incl. cold-start 502/503) are worth retrying. */
  private _isTransient(status: number): boolean {
    return status === 429 || status >= 500
  }

  private _backoff(attempt: number): Promise<void> {
    const base = this.opts.retryBackoffMs ?? 200
    if (base <= 0) return Promise.resolve()
    return new Promise((resolve) => setTimeout(resolve, base * attempt))
  }

  // ── Streaming-fetch concurrency gate ────────────────────────────────────────
  // Acquire a slot before hitting the network; release when the fetch settles.
  // The slot is handed directly to the next waiter on release (no re-check race).
  private async _acquireSlot(): Promise<void> {
    const cap = Math.max(1, this.opts.concurrency ?? 3)
    if (this.streamInFlight < cap) {
      this.streamInFlight++
      return
    }
    await new Promise<void>((resolve) => this.streamSlotWaiters.push(resolve))
    // A releaser handed us its slot — streamInFlight count is unchanged.
  }

  private _releaseSlot(): void {
    const next = this.streamSlotWaiters.shift()
    if (next) next()            // hand the slot over; count stays the same
    else this.streamInFlight--  // no one waiting — free the slot
  }

  /** Gated wrapper: bound the streaming path's network concurrency to the cap so a
   *  burst of sentences can't stampede the TTS endpoint. Order is preserved by the
   *  FIFO streamQueue; only the fetch START is deferred until a slot frees. */
  private async _gatedFetchSentence(text: string): Promise<AudioBuffer | null> {
    if (this.stopped) return null
    await this._acquireSlot()
    try {
      if (this.stopped) return null
      return await this._fetchSentence(text)
    } finally {
      this._releaseSlot()
    }
  }

  // ── Incremental streaming session (Phase 23 TTFT) ──────────────────────────

  /**
   * Begin an incremental TTS session. Feed text with pushText() as it streams
   * in, then call endPushing() when the reply is complete. The returned promise
   * resolves when playback finishes ('done') or is cut by stop() ('interrupted').
   *
   * Unlike play(fullText), playback can begin on sentence 1 while later
   * sentences are still being generated upstream — the core TTFT win.
   */
  beginStreaming(): Promise<'done' | 'interrupted'> {
    this.stopped = false
    this.playing = true
    this.abortController = new AbortController()
    this.streamQueue = []
    this.streamPending = ''
    this.streamDonePushing = false
    this.streamWaiters = []
    this.streamInFlight = 0
    this.streamSlotWaiters = []
    this.nextStartTime = 0
    this.scheduledSources.clear()
    return this._consumeStream()
  }

  /**
   * Feed a text chunk into the active streaming session. Complete sentences are
   * fetched + queued immediately; the trailing partial is held until the next
   * chunk completes it (so we never synthesize a half-sentence).
   */
  pushText(chunk: string): void {
    if (this.stopped || !chunk) return
    this.streamPending += chunk
    const { complete, pending } = splitSentencesIncremental(this.streamPending)
    this.streamPending = pending
    for (const s of complete) this._enqueueStreamSentence(s)
    if (complete.length) this._wake()
  }

  /** Signal that no more text will be pushed; flush the trailing partial as a
   *  final sentence so it is spoken even without terminal punctuation. */
  endPushing(): void {
    const tail = this.streamPending.trim()
    this.streamPending = ''
    if (tail) this._enqueueStreamSentence(tail)
    this.streamDonePushing = true
    this._wake()
  }

  private _enqueueStreamSentence(text: string): void {
    if (this.stopped) return
    // Gate the network fetch behind the concurrency semaphore (no stampede) and
    // let _fetchSentence retry transient failures (no silent drop).
    const bufferPromise = this._gatedFetchSentence(text)
    this.streamQueue.push({ text, bufferPromise })
  }

  private async _consumeStream(): Promise<'done' | 'interrupted'> {
    // FIFO: schedule sentences in order as their audio resolves; wait when the
    // queue drains until more text arrives (or endPushing/stop wakes us). Each
    // clip is scheduled GAPLESSLY on the AudioContext clock (see _scheduleGapless)
    // — we no longer block on the previous clip's onended before starting the
    // next, which is what left the audible seam between sentences.
    this.nextStartTime = 0
    this.scheduledSources.clear()
    const tails: Promise<void>[] = []
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.stopped) break
      if (this.streamQueue.length === 0) {
        if (this.streamDonePushing) break
        await this._waitForMore()
        continue
      }
      const chunk = this.streamQueue.shift()!
      const buffer = await chunk.bufferPromise
      if (this.stopped) break
      this.opts.onSentenceStart?.(chunk.text)
      this.opts.onSentence?.(chunk.text)
      if (buffer && this.ctx) {
        tails.push(this._scheduleGapless(buffer))
      }
    }
    // onDone must fire after the audio actually finishes — not when the last
    // clip is merely scheduled — so await every scheduled clip's end. stop()
    // ends them early (barge-in), which also resolves these.
    if (!this.stopped && tails.length) {
      try {
        await Promise.all(tails)
      } catch {
        /* a source error already resolved its tail */
      }
    }
    this.playing = false
    if (this.stopped) {
      this.opts.onInterrupted?.()
      return 'interrupted'
    }
    this.opts.onDone?.()
    return 'done'
  }

  /** Schedule one decoded clip on the AudioContext timeline so it plays
   *  immediately after the previously-scheduled clip (gapless). Returns a
   *  promise that resolves when this clip ends (naturally or via stop()). */
  private _scheduleGapless(buffer: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.ctx
      if (!ctx || this.stopped) return resolve()
      const src = ctx.createBufferSource()
      src.buffer = buffer
      const gain = ctx.createGain()
      gain.gain.value = 0.85
      src.connect(gain).connect(ctx.destination)
      // Chain from the previous clip's scheduled end; never schedule in the past
      // (if generation fell behind playback, start at "now" — an unavoidable gap).
      const startAt = Math.max(ctx.currentTime, this.nextStartTime)
      this.nextStartTime = startAt + buffer.duration
      this.scheduledSources.add(src)
      this.currentSource = src
      src.onended = () => {
        this.scheduledSources.delete(src)
        if (this.currentSource === src) this.currentSource = null
        resolve()
      }
      try {
        src.start(startAt)
      } catch {
        this.scheduledSources.delete(src)
        resolve()
      }
    })
  }

  private _wake(): void {
    const waiters = this.streamWaiters
    this.streamWaiters = []
    for (const w of waiters) w()
  }

  private _waitForMore(): Promise<void> {
    return new Promise((resolve) => {
      this.streamWaiters.push(resolve)
    })
  }

  private playBuffer(buffer: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ctx || this.stopped) return resolve()
      const src = this.ctx.createBufferSource()
      src.buffer = buffer
      const gain = this.ctx.createGain()
      gain.gain.value = 0.85
      src.connect(gain).connect(this.ctx.destination)
      this.currentSource = src
      src.onended = () => {
        this.currentSource = null
        resolve()
      }
      try {
        src.start()
      } catch {
        resolve()
      }
    })
  }

  /**
   * Synchronous stop — measured against the <150ms interruption target.
   * AudioBufferSourceNode.stop(0) is sample-accurate; the only real latency
   * is the event-loop hop from VAD callback → here.
   */
  stop(): void {
    this.stopped = true
    this.abortController?.abort()
    // Cut EVERY clip queued on the timeline — schedule-ahead may have several
    // pending, and barge-in must silence all of them, not just the latest.
    // (forEach, not for…of: the project's tsconfig target predates Set iteration.)
    this.scheduledSources.forEach((src) => {
      try {
        src.stop(0)
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect()
      } catch {
        /* noop */
      }
    })
    this.scheduledSources.clear()
    this.nextStartTime = 0
    if (this.currentSource) {
      try {
        this.currentSource.stop(0)
      } catch {
        /* already stopped */
      }
      this.currentSource.disconnect()
      this.currentSource = null
    }
    this.playing = false
    // Wake any streaming consumer parked in _waitForMore so it exits promptly
    // (resolving its beginStreaming() promise as 'interrupted').
    this._wake()
    // Release any fetches parked on the concurrency gate so their promises settle
    // (each re-checks `stopped` and returns null) instead of dangling.
    const slotWaiters = this.streamSlotWaiters
    this.streamSlotWaiters = []
    for (const w of slotWaiters) w()
  }
}

/** Naive sentence splitter — good enough for conversational replies. */
export function splitSentences(text: string): string[] {
  const cleaned = text.trim()
  if (!cleaned) return []
  const parts = cleaned.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g)
  if (!parts) return [cleaned]
  return parts.map((s) => s.trim()).filter((s) => s.length > 0)
}

/**
 * Incremental sentence splitter for the streaming path. Returns the COMPLETE
 * sentences found in `text` (each ending in terminal punctuation) plus the
 * trailing `pending` partial (no terminal punctuation yet) to carry forward.
 *
 *   "Hola. ¿Cómo" → { complete: ["Hola."], pending: "¿Cómo" }
 *   "Hel"         → { complete: [],        pending: "Hel" }
 */
export function splitSentencesIncremental(text: string): {
  complete: string[]
  pending: string
} {
  const complete: string[] = []
  const re = /[^.!?]*[.!?]+\s*/g
  const raw: string[] = []
  let m: RegExpExecArray | null
  let lastIndex = 0
  while ((m = re.exec(text)) !== null) {
    raw.push(m[0])
    lastIndex = re.lastIndex
  }
  // Merge FALSE sentence boundaries so each clip is a real spoken unit: a period
  // inside a decimal ("2.5 mg"), a clock meridiem ("a las 2 p.m."), or an
  // abbreviation ("Dr. Aguirre") must NOT split — synthesizing the fragments
  // separately mangles the number/title and multiplies the gappy per-clip
  // playback (diagnosis 2026-06-28). Lone-punctuation fragments are still dropped.
  // The abbreviation must be at a word boundary so ordinary words ending in
  // a/p/m (e.g. "Hola.") are NOT treated as the a.m./p.m. abbreviation.
  const ABBREV = /(?:^|[\s(¿"'«])(?:dr|dra|sr|sra|srta|ud|uds|vs|etc|aprox|av|lic|ing|esq|col|p|a|m|núm|num)\.$/i
  let acc = ''
  for (let i = 0; i < raw.length; i++) {
    acc += raw[i]
    const trimmed = acc.trimEnd()
    const falseBoundary = /\d\.$/.test(trimmed) || ABBREV.test(trimmed)
    // Keep accumulating across a false boundary. A trailing one (no further
    // match) stays in `acc` and is carried into `pending` to await the rest of
    // the stream (endPushing flushes it if the reply ends there).
    if (falseBoundary) continue
    const out = acc.trim()
    if (out && !/^[.!?]+$/.test(out)) complete.push(out)
    acc = ''
  }
  // A trailing false-boundary fragment with no following match is carried into
  // pending (so "2." waits for the "5 mg." that completes the decimal).
  return { complete, pending: acc + text.slice(lastIndex) }
}
