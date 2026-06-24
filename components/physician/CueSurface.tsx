/**
 * CueSurface — Phase 23 voice port (PRES-03 / PRES-04 / PRES-05).
 *
 * The dark codex stage: a centered navy command surface mounted once by
 * PortalLayout. Opens on the medikah:cue:open CustomEvent or Cmd+K
 * (handled by lib/cue/surface.ts).
 *
 * Voice-first by default (continuous flow), text always-on as the fallback:
 *   - When the browser supports continuous VAD + WebGL (diagnoseVADSupport().ok),
 *     a full-card CueOrb3D (Three.js, lazy, ssr:false) is bound to the five-state
 *     FSM, and a ContinuousFlowController auto-listen loop drives the round-trip
 *     (VAD → transcribe → /api/cue/chat → streaming TTS). A brain-turn greeting is
 *     fetched + spoken on open.
 *   - When it doesn't (older browsers, jsdom test env, no AudioWorklet / mic /
 *     secure context), the surface degrades to the CSS CueOrb + the text input.
 *     Text submit is the only path and posts the SAME messages[] shape to
 *     /api/cue/chat.
 *
 * Accessibility contract (PRES-05 / LENS-REVIEW-v2 hard gates):
 *   - role="dialog" aria-modal="true" aria-label="Cue"
 *   - Stores document.activeElement on open → moves focus into the dialog
 *   - Tab trapped within the dialog (hand-rolled, ~20 LOC, no library dep)
 *   - Returns focus to the previously-focused element (the launcher) on close
 *   - Esc / scrim click: NON-DESTRUCTIVE when the text input is non-empty
 *   - prefers-reduced-motion: entrance + wave animations disabled
 *   - z-index: 10000 (above SOGo dialogs at ~9999) — T-23-03-01 mitigation
 *
 * Architecture notes:
 *   - Text submit POSTs to /api/cue/chat via the same-origin BFF (NextAuth-JWT
 *     auth); the workspace bearer token is sent on the confirm-write hop only
 *     (Authorization header — T-23-03-02 mitigation).
 *   - Responses render as CueActionCard components, NEVER chat bubbles (D-04).
 *   - Confirm-before-write (D-03 / Plan 23-04): the /api/cue/chat stream is split
 *     on the U+001E (RS) sentinel — text before it is reasoning prose; the JSON
 *     after it carries pending_confirm. The confirm card is keyed ONLY off the
 *     parsed payload — NEVER off model prose (T-23-04-09). Confirm → POST
 *     /api/cue/calendar/confirm-write (the sole mutation path). Cancel → no write.
 *   - A voice-initiated block/clear is NEVER spoken as a fait accompli: respond()
 *     returns '' for a pending write so the controller's TTS stays silent until
 *     the explicit Confirm tap (D-03 voice parity).
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import CueActionCard from './CueActionCard';
import CueOrb from './CueOrb'; // CSS fallback orb (unsupported browsers)
import { VoiceStateMachine, type OrbState } from '../../lib/cue/stateMachine';
import {
  ContinuousFlowController,
  diagnoseVADSupport,
} from '../../lib/cue/voice/continuousFlow';

const CueOrb3D = dynamic(() => import('./CueOrb3D'), { ssr: false });

// ── exports kept for tests + custom-sogo.js parity ──────────────────────────

/**
 * The {kind:'confirm', ...} payload surfaced by run_cue_turn and emitted on the
 * /api/cue/chat stream as the U+001E sentinel line (D-03 / Plan 23-04 canonical
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
export const PENDING_CONFIRM_SENTINEL = '\x1e';

/**
 * Split a /api/cue/chat response body on the pending_confirm sentinel.
 * Everything BEFORE the first sentinel is the reasoning text; the JSON line
 * AFTER it (if present) carries { pending_confirm }. Returns null pendingConfirm
 * when no sentinel is present (Phase-22 plain-text path, byte-identical).
 */
export function splitCueStream(body: string): {
  text: string;
  pendingConfirm: CuePendingConfirm | null;
} {
  const idx = body.indexOf(PENDING_CONFIRM_SENTINEL);
  if (idx === -1) return { text: body, pendingConfirm: null };
  const text = body.slice(0, idx);
  const rest = body.slice(idx + 1).trim();
  try {
    const parsed = JSON.parse(rest) as { pending_confirm?: CuePendingConfirm };
    const pc = parsed?.pending_confirm ?? null;
    return { text, pendingConfirm: pc && pc.kind === 'confirm' ? pc : null };
  } catch {
    return { text, pendingConfirm: null };
  }
}

// ── Focus trap (hand-rolled, no library dep) ────────────────────────────────

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement) {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusable.length === 0) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  function handler(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) { if (document.activeElement === first) { last.focus(); e.preventDefault(); } }
    else { if (document.activeElement === last) { first.focus(); e.preventDefault(); } }
  }
  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

// ── Props ───────────────────────────────────────────────────────────────────

export interface CueSurfaceProps {
  /** Whether the surface is visible. Owned by PortalLayout via useCueSurface. */
  isOpen: boolean;
  /** Called by the surface to request close (PortalLayout updates isOpen). */
  onClose: () => void;
  /** Workspace bearer token — used for the confirm-write hop. May be null. */
  accessToken: string | null;
  /** Active locale for bilingual rendering. */
  locale?: 'en' | 'es';
}

const LABELS = {
  en: { close: 'Close', listening: 'Listening', thinking: 'Cue is thinking…',
        placeholder: 'or type a command…', error: 'Something went wrong. Please try again.',
        confirmBlock: 'Block this time?', confirmClear: 'Clear Cue blocks?',
        done: 'Done', esc: 'esc to pause', context: 'Workspace' },
  es: { close: 'Cerrar', listening: 'Escuchando', thinking: 'Cue está pensando…',
        placeholder: 'o escribe un comando…', error: 'Algo salió mal. Inténtalo de nuevo.',
        confirmBlock: '¿Bloquear este horario?', confirmClear: '¿Liberar los bloques de Cue?',
        done: 'Listo', esc: 'esc para pausar', context: 'Espacio' },
} as const;

interface CueResponse { title: string; summary: string; }

// ── Component ───────────────────────────────────────────────────────────────

export default function CueSurface({ isOpen, onClose, accessToken, locale = 'en' }: CueSurfaceProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<Element | null>(null);
  const labels = LABELS[locale];

  const [inputValue, setInputValue] = useState('');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [spoken, setSpoken] = useState('');           // last user utterance (caption)
  const [response, setResponse] = useState<CueResponse | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<CuePendingConfirm | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [typingPaused, setTypingPaused] = useState(false);

  const smRef = useRef<VoiceStateMachine | null>(null);
  if (smRef.current === null) smRef.current = new VoiceStateMachine();
  const controllerRef = useRef<ContinuousFlowController | null>(null);
  const idempotencyTokenRef = useRef<string | null>(null);

  // Compute ONCE — diagnoseVADSupport() constructs + closes an AudioContext on
  // each call (a per-render leak), so memoize it in lazy state (Resolution 1).
  const [voiceSupported] = useState(
    () => typeof window !== 'undefined' && diagnoseVADSupport().ok,
  );

  // Drive orbState from the FSM (single source of truth for the orb visual).
  useEffect(() => {
    const sm = smRef.current!;
    setOrbState(sm.state);
    return sm.subscribeOrbEvents((p) => setOrbState(p.state));
  }, []);

  // respond() — the brain turn the controller (and text submit) call. Posts the
  // canonical messages[] shape to /api/cue/chat, splits on the D-03 sentinel, and
  // returns the spoken text ('' for a pending write so it is never spoken).
  const respond = useCallback(async (userText: string, opts?: { signal?: AbortSignal }): Promise<string> => {
    setResponse(null); setErrorMsg(null); setPendingConfirm(null);
    idempotencyTokenRef.current = null;
    const res = await fetch('/api/cue/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: userText }], locale }),
      signal: opts?.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { text, pendingConfirm: pc } = splitCueStream(await res.text());
    if (pc && pc.kind === 'confirm') {
      idempotencyTokenRef.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID() : `cue-${Math.random().toString(36).slice(2)}`;
      setPendingConfirm(pc);
      if (text.trim()) setResponse({ title: 'Cue', summary: text });
      return ''; // don't speak a pending write as done (D-03 voice parity)
    }
    if (text.trim()) setResponse({ title: 'Cue', summary: text });
    return text;
  }, [locale]);

  // Greeting (brain turn) — fetched on open, spoken via the controller's TTS so
  // it shares the unlocked AudioContext from the user gesture.
  const speakGreeting = useCallback(async (ctrl: ContinuousFlowController) => {
    try {
      const res = await fetch('/api/cue/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opening: true, messages: [], locale }),
      });
      if (!res.ok) return;
      const { text } = splitCueStream(await res.text());
      if (text.trim()) { setResponse({ title: 'Cue', summary: text }); await ctrl.playReply(text); }
    } catch { /* greeting is best-effort */ }
  }, [locale]);

  // Open: start continuous flow (supported) inside the user gesture; on close,
  // tear down the controller + restore focus.
  useEffect(() => {
    if (!isOpen) {
      controllerRef.current?.destroy(); controllerRef.current = null;
      smRef.current?.reset();
      if (prevFocusRef.current) { (prevFocusRef.current as HTMLElement).focus?.(); prevFocusRef.current = null; }
      return;
    }
    prevFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog) {
      const f = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
      (f.length ? f[0] : dialog).focus();
    }
    const removeTrap = dialog ? trapFocus(dialog) : undefined;

    if (voiceSupported) {
      const ctrl = new ContinuousFlowController({
        locale,
        respond,
        onOrbEvent: (p) => setOrbState(p.state),
        onUserUtterance: (t) => setSpoken(t),
        onError: () => setErrorMsg(labels.error),
      });
      controllerRef.current = ctrl;
      ctrl.start().then(() => speakGreeting(ctrl)).catch(() => setErrorMsg(labels.error));
    }
    // Cleanup also tears down the controller so a re-run/unmount can't leak one
    // (Resolution 2 — destroy in cleanup, not only the !isOpen branch).
    return () => { removeTrap?.(); controllerRef.current?.destroy(); controllerRef.current = null; };
  }, [isOpen, voiceSupported, locale, respond, speakGreeting, labels.error]);

  // Non-destructive close: only when the text input is empty.
  const tryClose = useCallback(() => {
    if (inputValue.trim() === '') onClose();
  }, [inputValue, onClose]);

  function handleDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') tryClose();
  }

  // Text fallback submit (always available; the only path when !voiceSupported).
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message) return;
    setInputValue(''); setSpoken(message);
    const sm = smRef.current!;
    sm.send('start'); sm.send('speech-ended'); // idle→listening→thinking
    try { await respond(message); } catch { setErrorMsg(labels.error); sm.send('error'); return; }
    sm.send('stop');
  }

  // Confirm → POST /api/cue/calendar/confirm-write (the sole mutation path).
  async function handleConfirmWrite() {
    if (!pendingConfirm || isWriting) return;
    const token = idempotencyTokenRef.current; if (!token) return;
    setIsWriting(true); setErrorMsg(null);
    try {
      const res = await fetch('/api/cue/calendar/confirm-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({
          action: pendingConfirm.action, start_iso: pendingConfirm.start_iso, end_iso: pendingConfirm.end_iso,
          title: pendingConfirm.title || undefined, idempotency_token: token, locale,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const r = (await res.json()) as { uid?: string; deleted?: number; skipped?: number };
      setResponse({ title: labels.done, summary: pendingConfirm.action === 'block'
        ? `${labels.done} (${r.uid ?? ''})` : `${r.deleted ?? 0} / ${r.skipped ?? 0}` });
      setPendingConfirm(null);
    } catch { setErrorMsg(labels.error); }
    finally { setIsWriting(false); }
  }

  // Cancel → dismiss the confirm card, NO write (D-03).
  function handleCancelWrite() { setPendingConfirm(null); idempotencyTokenRef.current = null; }

  if (!isOpen) return null;
  const isListening = orbState === 'listening';
  const isThinking = orbState === 'thinking';

  return (
    <>
      <style>{`
        @keyframes mk-stage-in { from { opacity:0; transform:translate(-50%,-48%) scale(.96);} to { opacity:1; transform:translate(-50%,-50%) scale(1);} }
        @keyframes mk-bar { 0%,100%{transform:scaleY(.4)} 50%{transform:scaleY(1)} }
        .mk-cue-surface { position:fixed; inset:0; z-index:10000; }
        .mk-cue-scrim { position:absolute; inset:0; background:rgba(8,13,22,.5);
          backdrop-filter:blur(10px) saturate(.9); -webkit-backdrop-filter:blur(10px) saturate(.9); }
        @supports not (backdrop-filter: blur(1px)) { .mk-cue-scrim { background:rgba(8,13,22,.9); } }
        .mk-stage { position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);
          width:880px; max-width:calc(100vw - 48px); border-radius:30px; overflow:hidden;
          background:radial-gradient(120% 90% at 78% 0%, rgba(58,160,181,.20), transparent 55%),
            radial-gradient(90% 80% at 10% 110%, rgba(44,122,140,.16), transparent 55%),
            linear-gradient(160deg, #22344e, #1B2A41 45%, #0e1726);
          box-shadow:0 60px 160px rgba(6,12,22,.6), 0 0 0 1px rgba(127,199,212,.12), inset 0 1px 0 rgba(255,255,255,.06);
          color:#eaf2f5; font-family:'Mulish', sans-serif; animation:mk-stage-in .5s cubic-bezier(.16,1,.3,1); outline:none; }
        .mk-stage-head { display:flex; align-items:center; gap:12px; padding:22px 28px 0; position:relative; z-index:1; }
        .mk-stage-head .n { font-weight:800; font-size:15px; letter-spacing:.06em; text-transform:uppercase; }
        .mk-stage-head .ctx { font-size:12px; color:#b3cad2; }
        .mk-stage-head .esc { margin-left:auto; font-size:11px; color:#b3cad2; border:1px solid rgba(127,199,212,.3); border-radius:7px; padding:6px 9px; }
        .mk-close { width:44px; height:44px; border-radius:50%; border:none; background:transparent; color:#cfe2e8; font-size:1.25rem; cursor:pointer; }
        .mk-close:focus-visible { outline:2px solid #7fc7d4; outline-offset:2px; }
        .mk-hero { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:11px; padding:0 28px 6px; text-align:center; }
        .mk-glyph-spacer { height:234px; }
        .mk-listen { display:flex; flex-direction:column; align-items:center; gap:11px; }
        .mk-listening { font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:#7fc7d4; }
        .mk-wave { display:flex; align-items:flex-end; gap:5px; height:34px; }
        .mk-wave i { width:4px; border-radius:3px; background:linear-gradient(180deg,#7fc7d4,#3aa0b5); animation:mk-bar 1.1s ease-in-out infinite; }
        .mk-spoken { font-size:25px; font-weight:300; color:#fff; line-height:1.25; margin:4px 0 2px; }
        .mk-resolved { position:relative; z-index:1; padding:6px 24px 4px; }
        .mk-foot { display:flex; align-items:center; gap:12px; padding:16px 24px 22px; position:relative; z-index:1; }
        .mk-foot input { margin-left:auto; background:rgba(255,255,255,.05); border:1px solid rgba(127,199,212,.2); border-radius:11px;
          padding:12px 13px; color:#eaf2f5; font:inherit; font-size:13.5px; width:230px; height:44px; outline:none; box-sizing:border-box; }
        .mk-foot input:focus { border-color:#7fc7d4; box-shadow:0 0 0 3px rgba(127,199,212,.15); }
        @media (prefers-reduced-motion: reduce) {
          .mk-stage { animation:none; transform:translate(-50%,-50%); }
          .mk-wave i { animation:none; }
        }
      `}</style>

      <div className="mk-cue-surface">
        <div className="mk-cue-scrim" onClick={tryClose} aria-hidden="true" />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Cue"
          className="mk-stage"
          onKeyDown={handleDialogKeyDown}
          tabIndex={-1}
        >
          {voiceSupported
            ? <CueOrb3D state={orbState} paused={typingPaused} />
            : <div className="mk-glyph-spacer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CueOrb state={orbState} tone="light" size={120} />
              </div>}

          <div className="mk-stage-head">
            <span className="n">Cue</span>
            <span className="ctx">· {labels.context}</span>
            <span className="esc">{labels.esc}</span>
            <button type="button" className="mk-close" aria-label={labels.close} onClick={onClose}>&times;</button>
          </div>

          <div className="mk-hero">
            {voiceSupported && <div className="mk-glyph-spacer" />}
            {(isListening || isThinking) && (
              <div className="mk-listen">
                <div className="mk-listening">{isThinking ? labels.thinking : labels.listening}</div>
                <div className="mk-wave">{Array.from({ length: 9 }).map((_, i) => (
                  <i key={i} style={{ height: [12, 24, 34, 20, 30, 16, 28, 22, 12][i], animationDelay: `${i * 0.08}s` }} />
                ))}</div>
              </div>
            )}
            {spoken && <div className="mk-spoken">&ldquo;{spoken}&rdquo;</div>}
          </div>

          <div className="mk-resolved" aria-live="polite" aria-atomic="true">
            {errorMsg && <p style={{ color: '#f0b4b4', fontSize: 14 }}>{errorMsg}</p>}
            {response && (
              <CueActionCard title={response.title} summary={response.summary} locale={locale} onConfirm={undefined} onCancel={undefined} />
            )}
            {pendingConfirm && pendingConfirm.kind === 'confirm' && (
              <CueActionCard
                title={pendingConfirm.action === 'block' ? labels.confirmBlock : labels.confirmClear}
                summary={pendingConfirm.summary}
                locale={locale}
                onConfirm={isWriting ? undefined : handleConfirmWrite}
                onCancel={handleCancelWrite}
              />
            )}
          </div>

          <form className="mk-foot" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder={labels.placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setTypingPaused(true)}
              onBlur={() => setTypingPaused(false)}
              aria-label={labels.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        </div>
      </div>
    </>
  );
}
