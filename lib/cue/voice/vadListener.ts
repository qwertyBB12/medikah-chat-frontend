/**
 * VAD-backed continuous listener — Phase 47, T1 + T4.
 *
 * Wraps @ricky0123/vad-web (MicVAD) with:
 *   • Sobremesa thresholds (see sobremesaConfig.ts).
 *   • Local vendor paths so Netlify doesn't have to resolve
 *     node_modules on the edge — assets live in /public/vendor/vad-web.
 *   • A barge-in hook that fires the instant the author starts speaking
 *     *while Cue is speaking*, so we can cut TTS within ~150ms of onset.
 *
 * WAV utterances are posted to /api/cue/transcribe (returns { transcript }).
 */

import type { SobremesaVADConfig } from '../sobremesaConfig'
import { SOBREMESA_DEFAULT } from '../sobremesaConfig'

type MicVADInstance = {
  start: () => void
  pause: () => void
  destroy?: () => void
}

export interface VADListenerOptions {
  config?: SobremesaVADConfig
  /** Locale hint forwarded to /api/companion/transcribe */
  locale?: 'en' | 'es'
  /** Fires on speech onset. If Cue is speaking, treat as barge-in. */
  onSpeechStart?: () => void
  /** Fires with transcribed text after the user's utterance ends. */
  onUtterance?: (text: string) => void
  /** Error reporter */
  onError?: (err: unknown) => void
  /** Endpoint override for transcription */
  transcribeEndpoint?: string
}

const VENDOR_BASE = '/vendor/vad-web/'

/** Returns true if continuous VAD is likely to work in this browser. */
export function isContinuousVADSupported(): boolean {
  return diagnoseVADSupport().ok
}

/** Returns granular pass/fail per capability so we can surface why mobile fails. */
export function diagnoseVADSupport(): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (typeof window === 'undefined') { reasons.push('no window'); return { ok: false, reasons } }
  const hasWasm = typeof (window as any).WebAssembly !== 'undefined'
  if (!hasWasm) reasons.push('no WebAssembly')
  const ACtor = window.AudioContext || (window as any).webkitAudioContext
  if (!ACtor) reasons.push('no AudioContext')
  // AudioWorklet specifically — required by VAD pipeline. Different from plain AudioContext.
  let hasWorklet = false
  try {
    if (ACtor) {
      const probe = new ACtor()
      hasWorklet = !!(probe as any).audioWorklet
      probe.close?.()
    }
  } catch { /* probe failed */ }
  if (!hasWorklet) reasons.push('no AudioWorklet')
  const hasMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  if (!hasMic) reasons.push('no getUserMedia (likely non-HTTPS or insecure context)')
  if (!('isSecureContext' in window) || !window.isSecureContext) reasons.push('not secure context')
  return { ok: reasons.length === 0, reasons }
}

export class VADListener {
  private mic: MicVADInstance | null = null
  private running = false
  private cfg: SobremesaVADConfig
  private opts: VADListenerOptions

  constructor(opts: VADListenerOptions = {}) {
    this.opts = opts
    this.cfg = opts.config ?? SOBREMESA_DEFAULT
  }

  async start(): Promise<void> {
    if (this.running) return
    const vad = await import('@ricky0123/vad-web')
    const { MicVAD } = vad as any

    this.mic = await MicVAD.new({
      // Asset routing — use locally-hosted vendor files.
      baseAssetPath: VENDOR_BASE,
      onnxWASMBasePath: VENDOR_BASE,
      workletURL: VENDOR_BASE + 'vad.worklet.bundle.min.js',
      modelURL: VENDOR_BASE + 'silero_vad_legacy.onnx',

      // Sobremesa thresholds
      positiveSpeechThreshold: this.cfg.positiveSpeechThreshold,
      negativeSpeechThreshold: this.cfg.negativeSpeechThreshold,
      minSpeechFrames: this.cfg.minSpeechFrames,
      redemptionFrames: this.cfg.redemptionFrames,
      preSpeechPadFrames: this.cfg.preSpeechPadFrames,

      onSpeechStart: () => {
        try {
          this.opts.onSpeechStart?.()
        } catch (err) {
          this.opts.onError?.(err)
        }
      },
      onSpeechEnd: async (audio: Float32Array) => {
        try {
          const wav = encodeWAV(audio, 16000)
          const text = await transcribe(
            wav,
            this.opts.locale ?? 'en',
            this.opts.transcribeEndpoint ?? '/api/cue/transcribe',
          )
          if (text) this.opts.onUtterance?.(text)
        } catch (err) {
          this.opts.onError?.(err)
        }
      },
      onVADMisfire: () => {
        // Sub-minimum chirp — ignore.
      },
    })

    this.mic?.start()
    this.running = true
  }

  pause(): void {
    this.mic?.pause()
    this.running = false
  }

  destroy(): void {
    this.mic?.pause()
    try {
      this.mic?.destroy?.()
    } catch {
      /* noop */
    }
    this.mic = null
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }
}

/** Minimal 16kHz mono PCM-16 WAV encoder.  Float32 in → Blob out. */
export function encodeWAV(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // PCM-16 samples
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

async function transcribe(
  wav: Blob,
  locale: 'en' | 'es',
  endpoint: string,
): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav', 'x-locale': locale },
    body: wav,
  })
  if (!res.ok) return ''
  const data = (await res.json().catch(() => null)) as { transcript?: string } | null
  return (data?.transcript ?? '').trim()
}
