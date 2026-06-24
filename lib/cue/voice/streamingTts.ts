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

  constructor(private opts: StreamingTTSOptions = {}) {}

  /** Must be called during a user gesture to unlock Safari audio. */
  unlock(existingCtx?: AudioContext): void {
    if (!this.ctx) {
      this.ctx =
        existingCtx ??
        new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  isPlaying(): boolean {
    return this.playing
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
    const endpoint = this.opts.endpoint ?? '/api/cue/tts'
    const locale = this.opts.locale ?? 'en'
    const concurrency = Math.max(1, this.opts.concurrency ?? 3)

    // Kick off fetches with a simple rolling concurrency gate so we don't
    // wait for sentence N to start decoding sentence N+1 — but also don't
    // blast 30 parallel requests.
    this.queue = []
    let inFlight = 0
    let nextFetch = 0

    const fetchOne = async (text: string): Promise<AudioBuffer | null> => {
      if (this.stopped) return null
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: applyTtsPronunciation(text, locale), locale }),
          signal: this.abortController?.signal,
        })
        if (!res.ok || res.status === 204) return null
        const arrayBuf = await res.arrayBuffer()
        if (this.stopped || !this.ctx) return null
        return await this.ctx.decodeAudioData(arrayBuf)
      } catch {
        return null
      }
    }

    const primeQueue = () => {
      while (inFlight < concurrency && nextFetch < sentences.length) {
        const text = sentences[nextFetch++]
        inFlight++
        const bufferPromise = fetchOne(text).finally(() => {
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
