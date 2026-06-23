/**
 * CueSurface — Phase 23 (PRES-03 / PRES-04 / PRES-05)
 *
 * Centered, voice-first Cue command surface. Mounted once by PortalLayout.
 * Opens on the medikah:cue:open CustomEvent or Cmd+K (handled by lib/cue/surface.ts).
 *
 * Accessibility contract (PRES-05 / LENS-REVIEW-v2 hard gates):
 *   - role="dialog" aria-modal="true" aria-label="Cue"
 *   - Stores document.activeElement on open → moves focus into the dialog
 *   - Tab trapped within the dialog (hand-rolled, ~20 LOC, no library dep)
 *   - Returns focus to the previously-focused element (the launcher) on close
 *   - Esc / scrim click: NON-DESTRUCTIVE when input is non-empty
 *   - prefers-reduced-motion: entrance + breath animations disabled
 *   - All interactive controls ≥ 44px tap target
 *   - z-index: 10000 (above SOGo dialogs at ~9999) — T-23-03-01 mitigation
 *
 * Architecture notes:
 *   - Text submit POSTs to /cue/chat with the workspace bearer token
 *     (token in Authorization header only — T-23-03-02 mitigation)
 *   - Responses render as CueActionCard components, NEVER chat bubbles (D-04)
 *   - Confirm-before-write (D-03 / Plan 23-04): the /cue/chat stream is split on
 *     the U+001E (RS) sentinel — the text before it is the reasoning prose; the
 *     JSON after it carries pending_confirm. When pending_confirm.kind==='confirm'
 *     a Confirm/Cancel CueActionCard is rendered. The confirm card is keyed ONLY
 *     off the parsed pending_confirm payload — NEVER off model prose (T-23-04-09).
 *     Confirm → POST /api/cue/calendar/confirm-write (the sole mutation path; the
 *     model loop never writes). Cancel → dismiss, no write.
 *   - Scrim: rgba(27,42,65,0.72) + backdrop-filter blur; solid-color fallback
 *     for Safari/SOGo compositor (T-23-03-03 mitigation)
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import CueActionCard from './CueActionCard';
import CueOrb from './CueOrb';
import { VoiceStateMachine, type OrbState } from '../../lib/cue/stateMachine';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CueSurfaceProps {
  /** Whether the surface is visible. Owned by PortalLayout via useCueSurface. */
  isOpen: boolean;
  /** Called by the surface to request close (PortalLayout updates isOpen). */
  onClose: () => void;
  /** Workspace bearer token — used for /cue/chat fetch. May be null before init. */
  accessToken: string | null;
  /** Active locale for bilingual rendering. */
  locale?: 'en' | 'es';
}

// ─── Focus trap ──────────────────────────────────────────────────────────────

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement) {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handler(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

// ─── Response card type ───────────────────────────────────────────────────────

interface CueResponse {
  title: string;
  summary: string;
  items?: string[];
}

/**
 * The {kind:'confirm', ...} payload surfaced by run_cue_turn and emitted on the
 * /cue/chat stream as the U+001E sentinel line (D-03 / Plan 23-04 canonical
 * contract). The confirm card is keyed off THIS — never off model prose.
 */
export interface CuePendingConfirm {
  kind: 'confirm';
  action: 'block' | 'clear';
  title: string;
  summary: string;
  start_iso: string;
  end_iso: string;
}

/** U+001E (RECORD SEPARATOR) — the canonical pending_confirm sentinel byte. */
const PENDING_CONFIRM_SENTINEL = '\x1e';

/**
 * Split a /cue/chat response body on the pending_confirm sentinel.
 * Everything BEFORE the first sentinel is the reasoning text; the JSON line
 * AFTER it (if present) carries { pending_confirm }. Returns null pending_confirm
 * when no sentinel is present (Phase-22 plain-text path, byte-identical).
 */
export function splitCueStream(body: string): {
  text: string;
  pendingConfirm: CuePendingConfirm | null;
} {
  const idx = body.indexOf(PENDING_CONFIRM_SENTINEL);
  if (idx === -1) {
    return { text: body, pendingConfirm: null };
  }
  const text = body.slice(0, idx);
  const rest = body.slice(idx + 1).trim();
  try {
    const parsed = JSON.parse(rest) as { pending_confirm?: CuePendingConfirm };
    const pc = parsed?.pending_confirm ?? null;
    return {
      text,
      pendingConfirm: pc && pc.kind === 'confirm' ? pc : null,
    };
  } catch {
    return { text, pendingConfirm: null };
  }
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const LABELS = {
  en: {
    placeholder: 'Ask Cue anything about your calendar…',
    submit: 'Send',
    close: 'Close',
    loading: 'Cue is thinking…',
    error: 'Something went wrong. Please try again.',
    confirmTitleBlock: 'Block this time?',
    confirmTitleClear: 'Clear Cue blocks?',
    resultTitle: 'Done',
    blockedResult: (uid: string) => `Time blocked. (ref ${uid})`,
    clearResult: (deleted: number, kept: number) =>
      `${deleted} removed, ${kept} kept.`,
    micStart: 'Hold to speak',
    micStop: 'Stop',
    listening: 'Listening…',
    transcribing: 'Transcribing…',
    voiceUnsupported: 'Voice input is not available in this browser — type instead.',
  },
  es: {
    placeholder: 'Pregúntale a Cue sobre tu calendario…',
    submit: 'Enviar',
    close: 'Cerrar',
    loading: 'Cue está pensando…',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    confirmTitleBlock: '¿Bloquear este horario?',
    confirmTitleClear: '¿Liberar los bloques de Cue?',
    resultTitle: 'Listo',
    blockedResult: (uid: string) => `Horario bloqueado. (ref ${uid})`,
    clearResult: (deleted: number, kept: number) =>
      `${deleted} eliminados, ${kept} conservados.`,
    micStart: 'Mantén para hablar',
    micStop: 'Detener',
    listening: 'Escuchando…',
    transcribing: 'Transcribiendo…',
    voiceUnsupported: 'La entrada de voz no está disponible en este navegador — escribe.',
  },
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function CueSurface({
  isOpen,
  onClose,
  accessToken,
  locale = 'en',
}: CueSurfaceProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFocusRef = useRef<Element | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<CueResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // D-03 confirm card state (Plan 23-04). pendingConfirm is keyed off the parsed
  // sentinel payload only — never off model prose.
  const [pendingConfirm, setPendingConfirm] = useState<CuePendingConfirm | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  // A fresh idempotency token is generated per proposal and reused across retries
  // of the SAME proposal, so a double-click cannot double-write (HANDS-04).
  const idempotencyTokenRef = useRef<string | null>(null);

  const labels = LABELS[locale];

  // ── Voice round-trip state (Plan 23-06 — PRES-03 voice-first, VOICE-05/08) ──
  // The five-state orb FSM drives the orb visual. Mic capture posts to the
  // /api/cue/transcribe BFF (auth-correct same-origin hop — see the route file),
  // feeds the transcript into the SAME /api/cue/chat path as text, then optionally
  // speaks the reply via the /api/cue/tts BFF. Text stays the always-on fallback.
  const smRef = useRef<VoiceStateMachine | null>(null);
  if (smRef.current === null) smRef.current = new VoiceStateMachine();
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Voice is available only when the browser exposes getUserMedia + MediaRecorder
  // (jsdom/test + older browsers fall through to text-only — graceful degrade).
  const voiceSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined';

  // Drive orbState from the FSM (single source of truth for the orb visual).
  useEffect(() => {
    const sm = smRef.current!;
    setOrbState(sm.state);
    const unsub = sm.subscribeOrbEvents((p) => setOrbState(p.state));
    return unsub;
  }, []);

  // ── Open / Close lifecycle ───────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
      // Stop any in-flight mic/audio and reset the orb when the surface closes.
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      setIsRecording(false);
      audioElRef.current?.pause();
      smRef.current?.reset();
      // Return focus to whatever had it before we opened
      if (prevFocusRef.current) {
        (prevFocusRef.current as HTMLElement).focus?.();
        prevFocusRef.current = null;
      }
      return;
    }

    // Store the element that had focus before we opened (the launcher button)
    prevFocusRef.current = document.activeElement;

    // Move focus into the dialog
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      dialog.focus();
    }

    // Activate focus trap
    const removeTrap = trapFocus(dialog);
    return removeTrap;
  }, [isOpen]);

  // ── Non-destructive close ────────────────────────────────────────────────

  const tryClose = useCallback(() => {
    // Non-destructive: only close if the input is empty+idle (D-03 / LENS-REVIEW-v2)
    const isEmpty = inputValue.trim() === '';
    if (isEmpty && !isLoading) {
      onClose();
    }
  }, [inputValue, isLoading, onClose]);

  // ── Keyboard handler (Esc) ───────────────────────────────────────────────

  function handleDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      tryClose();
    }
  }

  // ── Core chat turn (shared by text + voice) → /api/cue/chat ──────────────

  async function sendChatMessage(
    message: string,
    opts?: { speak?: boolean },
  ): Promise<void> {
    setIsLoading(true);
    setResponse(null);
    setErrorMsg(null);
    setPendingConfirm(null);
    idempotencyTokenRef.current = null;

    try {
      // Route through the same-origin BFF proxy (/api/cue/chat): it reads the
      // NextAuth session cookie and forwards the NextAuth HS256 JWT that the
      // FastAPI cue gate (authenticated_physician) verifies. Posting straight to
      // FastAPI with the Supabase token 401'd; the browser never touches FastAPI
      // directly (D-04) — same BFF pattern as the confirm-write proxy. The voice
      // path (transcribe/tts) uses the same BFF hop for the same reason.
      const res = await fetch('/api/cue/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, locale }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Read the response and split on the U+001E pending_confirm sentinel
      // (D-03 / Plan 23-04). Text before the sentinel is reasoning prose; the
      // JSON after it carries pending_confirm. The confirm card is keyed ONLY
      // off the parsed payload — never off prose (T-23-04-09).
      const body = await res.text();
      const { text, pendingConfirm: pc } = splitCueStream(body);

      if (pc && pc.kind === 'confirm') {
        // Fresh idempotency token per proposal; reused across retries so a
        // double-click cannot double-write (HANDS-04).
        idempotencyTokenRef.current =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `cue-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setPendingConfirm(pc);
        // Show the reasoning text too, if any (no Confirm/Cancel on this card —
        // the confirm affordance lives on the dedicated CuePendingConfirm card).
        if (text.trim()) {
          setResponse({ title: 'Cue', summary: text });
        }
      } else {
        setResponse({ title: 'Cue', summary: text });
      }

      // Voice path: speak the reasoning text. A voice-initiated block/clear is
      // NEVER auto-executed and NEVER spoken as a fait accompli — it still
      // surfaces the D-03 confirm card and requires the explicit Confirm tap, so
      // we only speak when there is no pending confirm (D-03 voice parity).
      if (opts?.speak && text.trim() && !pc) {
        void speakReply(text);
      } else if (opts?.speak) {
        // Nothing to speak (confirm card or empty) → return the orb to rest.
        smRef.current?.send('stop');
      }
    } catch {
      setErrorMsg(labels.error);
      smRef.current?.send('error'); // surface failure on the orb (→ idle)
    } finally {
      setIsLoading(false);
    }
  }

  // ── Text submit → shared chat turn ───────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message || isLoading) return;
    setInputValue('');
    await sendChatMessage(message);
  }

  // ── Confirm → POST /api/cue/calendar/confirm-write (the sole mutation path) ──

  async function handleConfirmWrite() {
    if (!pendingConfirm || isWriting) return;
    const token = idempotencyTokenRef.current;
    if (!token) return;

    setIsWriting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/cue/calendar/confirm-write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          action: pendingConfirm.action,
          start_iso: pendingConfirm.start_iso,
          end_iso: pendingConfirm.end_iso,
          title: pendingConfirm.title || undefined,
          idempotency_token: token, // reused across retries of THIS proposal
          locale,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = (await res.json()) as {
        blocked?: boolean;
        uid?: string;
        deleted?: number;
        skipped?: number;
      };

      // Surface the write result as a follow-up card.
      if (pendingConfirm.action === 'block') {
        setResponse({
          title: labels.resultTitle,
          summary: labels.blockedResult(result.uid ?? ''),
        });
      } else {
        setResponse({
          title: labels.resultTitle,
          summary: labels.clearResult(result.deleted ?? 0, result.skipped ?? 0),
        });
      }
      // Dismiss the confirm card (the write is done).
      setPendingConfirm(null);
    } catch {
      setErrorMsg(labels.error);
    } finally {
      setIsWriting(false);
    }
  }

  // ── Cancel → dismiss the confirm card, NO write (D-03) ──────────────────────

  function handleCancelWrite() {
    setPendingConfirm(null);
    idempotencyTokenRef.current = null;
  }

  // ── Mic capture (tap to start, tap to stop) → /api/cue/transcribe BFF ─────
  // Tap-to-talk via the browser-native MediaRecorder (NO new npm dep — T-23-06-SC).
  // The deliberately-slowed sobremesa VAD cadence (lib/cue/sobremesaConfig.ts) is
  // the tuning source of truth for a future automatic end-of-turn; v1 ends the
  // turn on the explicit second tap.

  function stopTracks(): void {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }

  async function startRecording(): Promise<void> {
    if (!voiceSupported || isRecording || isLoading) return;
    const sm = smRef.current!;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        void handleRecordingStop(recorder.mimeType);
      };
      recorder.start();
      setIsRecording(true);
      sm.send('start'); // idle → listening
    } catch {
      setErrorMsg(labels.voiceUnsupported);
      stopTracks();
    }
  }

  function stopRecording(): void {
    if (!isRecording) return;
    const recorder = mediaRecorderRef.current;
    setIsRecording(false);
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop(); // fires onstop → handleRecordingStop
    }
  }

  function toggleMic(): void {
    if (isRecording) stopRecording();
    else void startRecording();
  }

  async function handleRecordingStop(mimeType: string): Promise<void> {
    const sm = smRef.current!;
    stopTracks();
    const chunks = audioChunksRef.current;
    audioChunksRef.current = [];
    if (chunks.length === 0) {
      sm.send('stop'); // listening → idle (nothing captured)
      return;
    }
    sm.send('speech-ended'); // listening → thinking
    const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
    try {
      // Post audio to the same-origin BFF (auth-correct hop; the absolute backend
      // target ${NEXT_PUBLIC_API_URL}/cue/transcribe lives in the BFF route file).
      const res = await fetch('/api/cue/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'audio/webm', 'X-Locale': locale },
        body: blob,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { transcript?: string; language?: string };
      const transcript = (data.transcript || '').trim();
      if (!transcript) {
        sm.send('stop');
        return;
      }
      // Feed the transcript into the SAME /api/cue/chat path as text, and speak
      // the reply (sendChatMessage drives the FSM thinking → speaking → idle).
      await sendChatMessage(transcript, { speak: true });
    } catch {
      setErrorMsg(labels.error);
      sm.send('error'); // → idle
    }
  }

  // ── Speak Cue's reply via /api/cue/tts BFF (voice path only; best-effort) ──
  async function speakReply(text: string): Promise<void> {
    const sm = smRef.current;
    try {
      const res = await fetch('/api/cue/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, locale }),
      });
      if (!res.ok) {
        sm?.send('stop'); // TTS unavailable — the carded text is already shown.
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = audioElRef.current ?? new Audio();
      audioElRef.current = audio;
      audio.src = url;
      sm?.send('response-started'); // thinking → speaking
      const finish = () => {
        URL.revokeObjectURL(url);
        sm?.send('stop'); // speaking → idle (tap-to-talk: one turn at a time)
      };
      audio.onended = finish;
      audio.onerror = finish;
      // play() returns a Promise in browsers (undefined in some test envs) —
      // guard so a non-Promise return doesn't throw; onended drives the FSM.
      const playback = audio.play() as Promise<void> | undefined;
      if (playback && typeof playback.then === 'function') {
        playback.catch(finish); // autoplay blocked → degrade to text
      }
    } catch {
      sm?.send('stop');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      {/* ── Inline styles: keyframes + surface layout ─────────────────────
          Mirror the inline <style> approach from CueLauncher.tsx (project
          convention) to keep the surface self-contained and SOGo-injectable. */}
      <style>{`
        @keyframes mk-cue-entrance {
          from { opacity: 0; transform: scale(0.97) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes mk-cue-scrim-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .mk-cue-surface {
          position: fixed;
          inset: 0;
          /* T-23-03-01: above SOGo dialogs (~9999); PRES-06 injection safe */
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }

        .mk-cue-scrim {
          position: absolute;
          inset: 0;
          /* inst-blue rgba scrim */
          background: rgba(27, 42, 65, 0.72);
          /* rack-focus blur — T-23-03-03: solid-color fallback if unsupported */
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: mk-cue-scrim-in 180ms ease forwards;
        }

        /* Solid-color fallback for Safari/SOGo contexts where backdrop-filter
           creates a black rectangle (T-23-03-03 / LENS-REVIEW-v2 pitfall 5). */
        @supports not (backdrop-filter: blur(1px)) {
          .mk-cue-scrim {
            background: rgba(27, 42, 65, 0.88);
          }
        }

        .mk-cue-dialog {
          position: relative;
          z-index: 10001;
          /* rounded-lg = 24px per tailwind.config.js */
          border-radius: 24px;
          background: #ffffff;
          width: 100%;
          max-width: 640px;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
          box-shadow:
            0 20px 60px rgba(27, 42, 65, 0.22),
            0 4px 16px rgba(27, 42, 65, 0.10);
          animation: mk-cue-entrance 220ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          outline: none;
        }

        .mk-cue-inner {
          padding: 28px 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mk-cue-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .mk-cue-label {
          font-family: 'Mulish', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #2C7A8C; /* clinical-teal */
        }

        /* Close button — ≥44px tap target (PRES-05) */
        .mk-cue-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #4A5568; /* body-slate */
          font-family: 'Mulish', sans-serif;
          font-size: 1.25rem;
          line-height: 1;
          transition: background-color 180ms ease;
          flex-shrink: 0;
        }

        .mk-cue-close:hover,
        .mk-cue-close:focus-visible {
          background: rgba(27, 42, 65, 0.06);
          outline: 2px solid rgba(44, 122, 140, 0.55);
          outline-offset: 2px;
        }

        .mk-cue-orb-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 0 2px;
        }

        .mk-cue-response-area {
          min-height: 0;
        }

        /* Mic button — ≥44px tap target (PRES-05). Teal when armed/recording. */
        .mk-cue-mic {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 16px;
          border: 1.5px solid rgba(27, 42, 65, 0.18);
          background: #ffffff;
          color: #2C7A8C; /* clinical-teal */
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
        }

        .mk-cue-mic:hover:not(:disabled),
        .mk-cue-mic:focus-visible {
          border-color: #2C7A8C;
          background: rgba(44, 122, 140, 0.08);
          outline: none;
        }

        .mk-cue-mic--on {
          background: #2C7A8C;
          border-color: #2C7A8C;
          color: #ffffff;
          animation: mk-cue-mic-pulse 1.4s ease-in-out infinite;
        }

        .mk-cue-mic:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes mk-cue-mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(44, 122, 140, 0.35); }
          50%      { box-shadow: 0 0 0 6px rgba(44, 122, 140, 0); }
        }

        .mk-cue-loading {
          font-family: 'Mulish', sans-serif;
          font-size: 0.875rem;
          color: #4A5568;
          padding: 12px 0;
          text-align: center;
        }

        .mk-cue-error {
          font-family: 'Mulish', sans-serif;
          font-size: 0.875rem;
          color: #B83D3D; /* alert-garnet */
          padding: 8px 0;
        }

        .mk-cue-form {
          display: flex;
          gap: 8px;
          align-items: stretch;
        }

        /* Text input — ≥44px height (PRES-05) */
        .mk-cue-input {
          flex: 1;
          height: 44px;
          border-radius: 16px; /* rounded-md per tailwind.config.js */
          border: 1.5px solid rgba(27, 42, 65, 0.18);
          padding: 0 16px;
          font-family: 'Mulish', sans-serif;
          font-size: 0.9375rem;
          color: #1C1C1E; /* deep-charcoal */
          background: #ffffff;
          outline: none;
          transition: border-color 180ms ease, box-shadow 180ms ease;
          box-sizing: border-box;
        }

        .mk-cue-input::placeholder {
          color: #8A8D91; /* archival-grey */
        }

        .mk-cue-input:focus {
          border-color: #2C7A8C;
          box-shadow: 0 0 0 3px rgba(44, 122, 140, 0.18);
        }

        /* Submit button — ≥44px (PRES-05) */
        .mk-cue-submit {
          height: 44px;
          padding: 0 20px;
          border-radius: 16px;
          border: none;
          background: #2C7A8C; /* clinical-teal */
          color: #ffffff;
          font-family: 'Mulish', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 180ms ease;
          flex-shrink: 0;
        }

        .mk-cue-submit:hover:not(:disabled) {
          background: rgba(44, 122, 140, 0.88);
        }

        .mk-cue-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* prefers-reduced-motion: disable entrance + breath + mic animations */
        @media (prefers-reduced-motion: reduce) {
          .mk-cue-entrance,
          .mk-cue-dialog,
          .mk-cue-scrim,
          .mk-cue-mic--on {
            animation: none;
          }
        }
      `}</style>

      <div className="mk-cue-surface" aria-hidden="false">
        {/* Scrim — click-away closes only when input is empty */}
        <div
          className="mk-cue-scrim"
          onClick={tryClose}
          aria-hidden="true"
        />

        {/* Dialog */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Cue"
          className="mk-cue-dialog"
          onKeyDown={handleDialogKeyDown}
          tabIndex={-1}
        >
          <div className="mk-cue-inner">
            {/* Header: label + close button */}
            <header className="mk-cue-header">
              <span className="mk-cue-label">Cue</span>
              <button
                type="button"
                className="mk-cue-close"
                aria-label={labels.close}
                onClick={onClose}
              >
                &times;
              </button>
            </header>

            {/* Orb — voice-first, mark-anchored (D-04 / PRES-03). Driven by the
                five-state FSM; breathes at rest, pulses while listening/speaking. */}
            <div className="mk-cue-orb-wrap">
              <CueOrb state={orbState} tone="dark" size={88} />
            </div>

            {/* Response area */}
            <div className="mk-cue-response-area" aria-live="polite" aria-atomic="true">
              {isRecording && (
                <p className="mk-cue-loading">{labels.listening}</p>
              )}
              {isLoading && (
                <p className="mk-cue-loading">{labels.loading}</p>
              )}
              {errorMsg && (
                <p className="mk-cue-error">{errorMsg}</p>
              )}
              {/* Reasoning / result card — never carries Confirm/Cancel. */}
              {response && !isLoading && (
                <CueActionCard
                  title={response.title}
                  summary={response.summary}
                  items={response.items}
                  locale={locale}
                  onConfirm={undefined}
                  onCancel={undefined}
                />
              )}
              {/* D-03 confirm card — rendered ONLY off the parsed pending_confirm
                  payload (kind==='confirm'), never off model prose (T-23-04-09).
                  Confirm POSTs to /api/cue/calendar/confirm-write; Cancel writes
                  nothing. */}
              {pendingConfirm && pendingConfirm.kind === 'confirm' && !isLoading && (
                <CueActionCard
                  title={
                    pendingConfirm.action === 'block'
                      ? labels.confirmTitleBlock
                      : labels.confirmTitleClear
                  }
                  summary={pendingConfirm.summary}
                  locale={locale}
                  onConfirm={handleConfirmWrite}
                  onCancel={handleCancelWrite}
                />
              )}
            </div>

            {/* Text input form — text is the always-on fallback; the mic adds the
                voice round-trip when the browser supports it (graceful degrade). */}
            <form className="mk-cue-form" onSubmit={handleSubmit}>
              {voiceSupported && (
                <button
                  type="button"
                  className={`mk-cue-mic${isRecording ? ' mk-cue-mic--on' : ''}`}
                  onClick={toggleMic}
                  disabled={isLoading}
                  aria-label={isRecording ? labels.micStop : labels.micStart}
                  aria-pressed={isRecording}
                  title={isRecording ? labels.micStop : labels.micStart}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0" />
                    <line x1="12" y1="18" x2="12" y2="21" />
                  </svg>
                </button>
              )}
              <input
                ref={inputRef}
                type="text"
                className="mk-cue-input"
                placeholder={labels.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                aria-label={labels.placeholder}
                autoComplete="off"
                spellCheck={false}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="mk-cue-submit"
                disabled={isLoading || !inputValue.trim()}
                aria-label={labels.submit}
              >
                {labels.submit}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
