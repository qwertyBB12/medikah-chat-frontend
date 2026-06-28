/**
 * CueSurface — the "Cue Console" (Phase 23 → Cue Console pivot).
 *
 * A docked clinical command panel — Claude-Code-inside-Medikah. Instead of a
 * full-screen takeover, Cue lives as a right-docked side panel: the doctor keeps
 * their screen (calendar/email stay visible) and Cue floats over it. Mounted once
 * by PortalLayout; opens on the medikah:cue:open CustomEvent or Cmd+K
 * (handled by lib/cue/surface.ts).
 *
 * The three console pieces (cue-console-mock-v2):
 *   1. Cascading THINKING TRACE — Cue narrates its tool steps like Code
 *      ("leyendo tu bandeja ✓ 3 nuevos") as cascading terminal lines BEFORE the
 *      answer. Driven by \x1f tool-event frames on the /api/cue/chat stream
 *      (parsed by lib/cue/cueStream.ts → onToolEvent). Transparent; the wait
 *      feels alive.
 *   2. ANSWER LINE — the streamed reply (TTFT), plain text with a live cursor.
 *   3. D-03 CONFIRM CARD — block/clear write proposals, keyed ONLY off the parsed
 *      \x1e sentinel payload, NEVER off model prose (T-23-04-09). Confirm → POST
 *      /api/cue/calendar/confirm-write (the sole mutation path). Cancel → no write.
 *
 * Text-first + push-to-talk: a command line + mic at the bottom; bilingual. When
 * the browser supports continuous VAD (diagnoseVADSupport().ok) a
 * ContinuousFlowController drives the voice round-trip (VAD → transcribe →
 * /api/cue/chat → streaming TTS) and a brain-turn greeting is spoken on open;
 * otherwise the surface degrades to the text input. Voice is the accelerator, not
 * the primary modality (the round-trip can't beat text for speed).
 *
 * Accessibility:
 *   - role="dialog" aria-label="Cue" (NON-modal dock — no aria-modal, no scrim;
 *     the doctor keeps using their screen and can Tab back to it)
 *   - Stores document.activeElement on open → moves focus into the panel →
 *     returns it to the launcher on close
 *   - Esc: NON-DESTRUCTIVE when the text input is non-empty
 *   - prefers-reduced-motion: entrance + pulse animations disabled
 *   - z-index above the dashboard surface (T-23-03-01)
 *
 * Auth: text submit POSTs to /api/cue/chat via the same-origin BFF (NextAuth-JWT);
 * the workspace bearer token is sent on the confirm-write hop only (T-23-03-02).
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { VoiceStateMachine, type OrbState } from '../../lib/cue/stateMachine';
import {
  ContinuousFlowController,
  diagnoseVADSupport,
} from '../../lib/cue/voice/continuousFlow';
import {
  splitCueStream,
  readCueStream,
  PENDING_CONFIRM_SENTINEL,
  type CuePendingConfirm,
  type CueToolEvent,
} from '../../lib/cue/cueStream';
import { CueMemoryConsent, CueMemoryPanel } from './CueMemory';
import { CueModePicker } from './CueModePicker';
import {
  loadCueMode,
  saveCueMode,
  controllerFlowMode,
  DEFAULT_CUE_MODE,
  type CueMode,
} from '../../lib/cue/voice/mode';

// ── re-exports kept for tests + custom-sogo.js parity ───────────────────────
// The pure stream/sentinel helpers live in lib/cue/cueStream.ts (testable,
// React-free). Re-exported here so existing importers keep working unchanged.
export { splitCueStream, PENDING_CONFIRM_SENTINEL };
export type { CuePendingConfirm, CueToolEvent };

// Focusable selector — used to move focus into the panel on open (NOT a trap:
// the dock is non-modal, so Tab may leave it back to the doctor's screen).
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// ── Props ───────────────────────────────────────────────────────────────────

export interface CueSurfaceProps {
  /** Whether the dock is open. Owned by PortalLayout via useCueSurface. */
  isOpen: boolean;
  /** Called by the surface to request close (PortalLayout updates isOpen). */
  onClose: () => void;
  /** Workspace bearer token — used for the confirm-write hop. May be null. */
  accessToken: string | null;
  /** Active locale for bilingual rendering. */
  locale?: 'en' | 'es';
}

const LABELS = {
  en: { close: 'Close', collapse: 'Collapse', you: 'You', context: 'Clinical space',
        thinking: 'Cue is thinking…', placeholder: 'Type a command…',
        error: 'Something went wrong. Please try again.', mic: 'Send message',
        confirmBlock: 'Block this time?', confirmClear: 'Clear Cue blocks?',
        confirmEyebrow: 'Confirm before writing', confirm: 'Confirm', cancel: 'Cancel',
        hintLeft: 'Cue · English + Spanish', done: 'Done', memory: 'What Cue remembers',
        modeSettings: 'Interaction mode', tapToTalk: 'Tap to talk', tapToStop: 'Listening — tap to stop',
        blockedResult: (uid: string) => `Time blocked. (ref ${uid})`,
        clearResult: (deleted: number, kept: number) => `${deleted} removed, ${kept} kept.` },
  es: { close: 'Cerrar', collapse: 'Contraer', you: 'Tú', context: 'Espacio clínico',
        thinking: 'Cue está pensando…', placeholder: 'Escribe un comando…',
        error: 'Algo salió mal. Inténtalo de nuevo.', mic: 'Enviar mensaje',
        confirmBlock: '¿Bloquear este horario?', confirmClear: '¿Liberar los bloques de Cue?',
        confirmEyebrow: 'Confirmar antes de escribir', confirm: 'Confirmar', cancel: 'Cancelar',
        hintLeft: 'Cue · español + inglés', done: 'Listo', memory: 'Lo que Cue recuerda',
        modeSettings: 'Modo de interacción', tapToTalk: 'Toca para hablar', tapToStop: 'Escuchando — toca para terminar',
        blockedResult: (uid: string) => `Horario bloqueado. (ref ${uid})`,
        clearResult: (deleted: number, kept: number) => `${deleted} eliminados, ${kept} conservados.` },
} as const;

// Localized human phrasing for the thinking trace, keyed by tool name. The wire
// carries only the structured event (phase/tool/ok/items); the verb + unit are
// presentation, rendered in the doctor's active language.
const TOOL_LABELS: Record<'en' | 'es', Record<string, { verb: string; unit: string }>> = {
  en: {
    inbox_read_recent: { verb: 'reading your inbox', unit: 'new' },
    calendar_read_day: { verb: 'reading your calendar', unit: 'events' },
    availability_read: { verb: 'checking your availability', unit: '' },
    inquiry_list_recent: { verb: 'reviewing your queue', unit: 'patients' },
    calendar_block_time: { verb: 'preparing the block', unit: '' },
    calendar_clear_range: { verb: 'preparing to clear', unit: '' },
  },
  es: {
    inbox_read_recent: { verb: 'leyendo tu bandeja', unit: 'nuevos' },
    calendar_read_day: { verb: 'leyendo tu calendario', unit: 'eventos' },
    availability_read: { verb: 'revisando tu disponibilidad', unit: '' },
    inquiry_list_recent: { verb: 'revisando tu fila', unit: 'pacientes' },
    calendar_block_time: { verb: 'preparando el bloqueo', unit: '' },
    calendar_clear_range: { verb: 'preparando la limpieza', unit: '' },
  },
};

function toolLabel(locale: 'en' | 'es', tool: string): { verb: string; unit: string } {
  return TOOL_LABELS[locale][tool] ?? { verb: locale === 'es' ? 'trabajando' : 'working', unit: '' };
}

interface CueResponse { title: string; summary: string; }

/** One cascading trace step. The engine runs tools sequentially, so at most one
 *  step is 'run' at a time; an 'end' frame resolves the last running step. */
interface ToolStep { tool: string; status: 'run' | 'done' | 'err'; items?: number; }

function applyToolEvent(prev: ToolStep[], ev: CueToolEvent): ToolStep[] {
  if (ev.phase === 'start') return [...prev, { tool: ev.tool, status: 'run' }];
  const next = [...prev];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i].status === 'run') {
      next[i] = { ...next[i], status: ev.ok === false ? 'err' : 'done', items: ev.items };
      break;
    }
  }
  return next;
}

function stepResultText(s: ToolStep, unit: string): string {
  if (s.status === 'err') return '⚠';
  // The backend omits `items` when a tool returns no rows, so a count is shown
  // only for a positive result — `✓ 0 eventos` (success styling on an empty
  // result) never renders; an empty/headerless read shows a plain `✓`.
  if (!s.items) return '✓';
  return unit ? `✓ ${s.items} ${unit}` : `✓ ${s.items}`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CueSurface({ isOpen, onClose, accessToken, locale = 'en' }: CueSurfaceProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<Element | null>(null);
  const labels = LABELS[locale];

  const [inputValue, setInputValue] = useState('');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [spoken, setSpoken] = useState('');           // last user utterance (caption)
  const [response, setResponse] = useState<CueResponse | null>(null);
  // Conversation history threaded to /cue/chat so each turn has context. Without
  // it, every turn was sent as a single user message → Cue "forgot" what it just
  // said mid-conversation ("5 messages" → "what messages?"). Reset on each open
  // (a fresh session); the backend keeps the last 10 turns. Cross-session memory
  // to Supabase is Phase 25 (not this).
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [toolTrace, setToolTrace] = useState<ToolStep[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<CuePendingConfirm | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Phase 25 Slice 3 — cross-session memory consent + management surface.
  // avisoAck: null = unknown/loading, false = needs the one-time consent, true = active.
  const [avisoAck, setAvisoAck] = useState<boolean | null>(null);
  const [consentDismissed, setConsentDismissed] = useState(false); // "not now" for this session
  const [showMemory, setShowMemory] = useState(false);

  // Wave 3 — interaction mode (voice / push-to-talk / text). null = not resolved
  // yet (first-run picker showing). pttListening drives the PTT mic button.
  const [mode, setMode] = useState<CueMode | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pttListening, setPttListening] = useState(false);
  const greetedRef = useRef(false); // greet once per open, not on mode switches

  const smRef = useRef<VoiceStateMachine | null>(null);
  if (smRef.current === null) smRef.current = new VoiceStateMachine();
  const controllerRef = useRef<ContinuousFlowController | null>(null);
  const idempotencyTokenRef = useRef<string | null>(null);

  // Compute ONCE — diagnoseVADSupport() constructs + closes an AudioContext on
  // each call (a per-render leak), so memoize it in lazy state.
  const [voiceSupported] = useState(
    () => typeof window !== 'undefined' && diagnoseVADSupport().ok,
  );

  // Drive orbState from the FSM (single source of truth for the live indicators).
  useEffect(() => {
    const sm = smRef.current!;
    setOrbState(sm.state);
    return sm.subscribeOrbEvents((p) => setOrbState(p.state));
  }, []);

  // Phase 25 Slice 3 — load the memory aviso status each time the dock opens.
  // null on any failure → no consent prompt (fail-quiet; memory stays dark).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setShowMemory(false);
    fetch('/api/cue/memory/aviso')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setAvisoAck(Boolean(d.acknowledged)); })
      .catch(() => { /* leave null — memory dark, no prompt */ });
    return () => { cancelled = true; };
  }, [isOpen]);

  // respond() — the brain turn the controller (and text submit) call. Posts the
  // canonical messages[] shape to /api/cue/chat and STREAM-READS the reply
  // (Phase-23 TTFT): reasoning text chunks forward to opts.onTextChunk as they
  // arrive (so the controller can start speaking sentence 1 early) and tool-event
  // frames drive the thinking trace. Returns { text, pendingConfirm }.
  const respond = useCallback(async (
    userText: string,
    opts?: { signal?: AbortSignal; onTextChunk?: (chunk: string) => void },
  ): Promise<{ text: string; pendingConfirm: CuePendingConfirm | null }> => {
    setResponse(null); setErrorMsg(null); setPendingConfirm(null); setToolTrace([]);
    idempotencyTokenRef.current = null;
    const outgoing = [...historyRef.current, { role: 'user' as const, content: userText }];
    const res = await fetch('/api/cue/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: outgoing, locale }),
      signal: opts?.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Live-update the answer line + the thinking trace as the stream arrives.
    let acc = '';
    const { text, pendingConfirm: pc } = await readCueStream(
      res,
      (chunk) => {
        acc += chunk;
        setResponse({ title: 'Cue', summary: acc });
        opts?.onTextChunk?.(chunk);
      },
      (ev) => setToolTrace((prev) => applyToolEvent(prev, ev)),
    );

    // Thread this turn into history so the NEXT turn carries context (backend
    // keeps the last 10 turns). Runs for both the confirm and plain-answer paths.
    historyRef.current = [
      ...outgoing,
      { role: 'assistant' as const, content: text.trim() || '…' },
    ].slice(-20);

    if (pc && pc.kind === 'confirm') {
      idempotencyTokenRef.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID() : `cue-${Math.random().toString(36).slice(2)}`;
      setPendingConfirm(pc);
      if (text.trim()) setResponse({ title: 'Cue', summary: text });
      else setResponse(null);
      return { text, pendingConfirm: pc };
    }
    if (text.trim()) setResponse({ title: 'Cue', summary: text });
    return { text, pendingConfirm: null };
  }, [locale]);

  // Greeting (brain turn) — fetched on open, spoken via the controller's TTS so
  // it shares the unlocked AudioContext from the user gesture. Tool-free (opening
  // bypass); one short sentence, read to completion before speaking.
  const speakGreeting = useCallback(async (ctrl: ContinuousFlowController) => {
    try {
      const res = await fetch('/api/cue/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opening: true, messages: [], locale }),
      });
      if (!res.ok) return;
      const { text } = await readCueStream(res);
      if (text.trim()) { setResponse({ title: 'Cue', summary: text }); await ctrl.playReply(text); }
    } catch { /* greeting is best-effort */ }
  }, [locale]);

  // Open/close housekeeping + first-run mode resolution. The controller itself
  // is created in the mode-keyed effect below.
  useEffect(() => {
    if (!isOpen) {
      smRef.current?.reset();
      if (prevFocusRef.current) { (prevFocusRef.current as HTMLElement).focus?.(); prevFocusRef.current = null; }
      return;
    }
    prevFocusRef.current = document.activeElement;
    historyRef.current = []; // fresh conversation each open
    greetedRef.current = false;

    // Resolve the interaction mode. No voice support → text only, no picker.
    // First run (nothing stored) → show the picker BEFORE any mic/greeting, so
    // the doctor opts into voice rather than having it start unannounced.
    if (!voiceSupported) {
      setMode('text'); setShowPicker(false);
    } else {
      const stored = loadCueMode();
      if (stored) { setMode(stored); setShowPicker(false); }
      else { setMode(null); setShowPicker(true); }
    }

    const dialog = dialogRef.current;
    if (dialog) {
      const f = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
      (f.length ? f[0] : dialog).focus();
    }
  }, [isOpen, voiceSupported]);

  // Controller lifecycle — only voice/ptt use it; text has none, and the
  // first-run picker (mode still null) holds it back until the doctor chooses.
  // Re-runs on mode switch (recreates the controller) but greets only once/open.
  useEffect(() => {
    const flow = mode ? controllerFlowMode(mode) : null;
    if (!isOpen || !voiceSupported || !flow) {
      controllerRef.current?.destroy(); controllerRef.current = null;
      setPttListening(false);
      return;
    }
    const ctrl = new ContinuousFlowController({
      locale,
      flowMode: flow,
      respond,
      onOrbEvent: (p) => setOrbState(p.state),
      onUserUtterance: (t) => { setSpoken(t); setPttListening(false); },
      onError: () => setErrorMsg(labels.error),
    });
    controllerRef.current = ctrl;
    ctrl.start()
      .then(() => { if (!greetedRef.current) { greetedRef.current = true; return speakGreeting(ctrl); } })
      .catch(() => setErrorMsg(labels.error));
    // Cleanup tears down the controller so a re-run/unmount can't leak one.
    return () => { controllerRef.current?.destroy(); controllerRef.current = null; };
  }, [isOpen, voiceSupported, mode, locale, respond, speakGreeting, labels.error]);

  // Wave 2a — close the mic while a write-confirm card is up (voice OR text path),
  // so the doctor reading/clicking Confirm isn't captured as a stray utterance.
  // The voice path also holds the mic from inside the controller; the Set-based
  // hold is idempotent, and this is the single RELEASE point when the card
  // resolves (Confirm or Cancel → pendingConfirm back to null → mic reopens).
  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    if (pendingConfirm) ctrl.holdMicForConfirm();
    else ctrl.releaseMicAfterConfirm();
  }, [pendingConfirm]);

  // Non-destructive close: only when the text input is empty.
  const tryClose = useCallback(() => {
    if (inputValue.trim() === '') onClose();
  }, [inputValue, onClose]);

  function handleDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') tryClose();
  }

  // Text submit (always available; the only path when !voiceSupported).
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
      setResponse({
        title: labels.done,
        summary: pendingConfirm.action === 'block'
          ? labels.blockedResult(r.uid ?? '')
          : labels.clearResult(r.deleted ?? 0, r.skipped ?? 0),
      });
      setPendingConfirm(null);
    } catch { setErrorMsg(labels.error); }
    finally { setIsWriting(false); }
  }

  // Cancel → dismiss the confirm card, NO write (D-03).
  function handleCancelWrite() { setPendingConfirm(null); idempotencyTokenRef.current = null; }

  // Wave 3 — mode picker. Selecting applies + persists immediately; the
  // mode-keyed effect (re)creates or tears down the controller to match.
  const handleSelectMode = useCallback((m: CueMode) => {
    saveCueMode(m); setMode(m); setShowPicker(false);
  }, []);
  // Dismissing the picker without choosing: on FIRST run, fall back to the
  // recommended default so the doctor is never left without a mode; when
  // reopened from the header, just close (keep the current mode).
  const handleClosePicker = useCallback(() => {
    if (mode === null) { saveCueMode(DEFAULT_CUE_MODE); setMode(DEFAULT_CUE_MODE); }
    setShowPicker(false);
  }, [mode]);

  // Wave 3 — push-to-talk: tap to open a listening window, tap again to cancel.
  const handleMicTap = useCallback(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    if (ctrl.isListening()) { ctrl.stopListeningWindow(); setPttListening(false); }
    else { ctrl.startListeningWindow(); setPttListening(true); }
  }, []);

  if (!isOpen) return null;
  const isThinking = orbState === 'thinking';
  const isSpeaking = orbState === 'speaking';
  const hasCueTurn = toolTrace.length > 0 || response != null || pendingConfirm != null || errorMsg != null || isThinking;

  return (
    <>
      <style>{`
        @keyframes mk-dock-in { from { opacity:0; transform:translateX(18px);} to { opacity:1; transform:none;} }
        @keyframes mk-pulse { 0%,100%{opacity:.35} 50%{opacity:1} }
        @keyframes mk-blink { 50%{opacity:0} }
        .mk-dock { position:fixed; top:64px; right:0; bottom:0; width:min(416px,100vw); z-index:10000;
          display:flex; flex-direction:column; color:#eaf2f5; font-family:'Mulish', sans-serif;
          border-top-left-radius:24px; overflow:hidden; outline:none;
          background:
            radial-gradient(120% 36% at 88% 0%, rgba(58,160,181,.18), transparent 60%),
            linear-gradient(180deg,#22344e,#1B2A41 42%,#0e1726);
          box-shadow:-26px 0 70px rgba(6,12,22,.34), inset 1px 0 0 rgba(127,199,212,.12);
          animation:mk-dock-in .42s cubic-bezier(.16,1,.3,1); }
        /* soft concave seam echoing the brand wave on the dock's left edge */
        .mk-dock::before { content:''; position:absolute; left:0; top:0; bottom:0; width:24px; pointer-events:none;
          background:linear-gradient(90deg, rgba(127,199,212,.10), transparent); }
        /* a self-contained wave lip across the dock's top (flows from an arc) */
        .mk-dock-lip { position:absolute; top:0; left:0; right:0; height:16px; z-index:1; pointer-events:none; display:block; }

        .mk-dock-h { flex:none; display:flex; align-items:center; gap:11px; padding:16px 14px 10px; position:relative; z-index:2; }
        .mk-glyph { width:30px; height:30px; border-radius:9px; display:grid; place-items:center; flex:none;
          background:radial-gradient(120% 120% at 30% 20%, rgba(127,199,212,.5), transparent 62%), #16233a;
          border:1px solid rgba(127,199,212,.32); box-shadow:0 0 18px rgba(58,160,181,.32); }
        .mk-glyph svg { width:17px; height:17px; }
        .mk-dock-name { font-weight:800; letter-spacing:.05em; font-size:14px; }
        .mk-dock-ctx { font-size:11.5px; color:#9fbcc6; }
        .mk-dock-actions { margin-left:auto; display:flex; gap:6px; }
        .mk-icbtn { width:30px; height:30px; border-radius:8px; border:1px solid rgba(127,199,212,.18);
          background:rgba(255,255,255,.03); color:#cfe2e8; display:grid; place-items:center; font-size:15px;
          cursor:pointer; line-height:1; }
        .mk-icbtn:hover { background:rgba(255,255,255,.07); }
        .mk-icbtn:focus-visible { outline:2px solid #7fc7d4; outline-offset:2px; }

        .mk-thread { flex:1; overflow:auto; padding:6px 16px 8px; display:flex; flex-direction:column; gap:14px; position:relative; z-index:2; }
        .mk-thread::-webkit-scrollbar { width:8px; }
        .mk-thread::-webkit-scrollbar-thumb { background:rgba(127,199,212,.18); border-radius:8px; }
        .mk-turn { display:flex; flex-direction:column; gap:6px; }
        .mk-who { font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#7fa6b2; }
        .mk-bubble { align-self:flex-start; background:rgba(127,199,212,.1); border:1px solid rgba(127,199,212,.16);
          border-radius:12px; padding:9px 12px; font-size:13.5px; color:#dff0f4; max-width:92%; }

        /* ★ the cascading thinking trace */
        .mk-think { border-left:2px solid rgba(127,199,212,.28); padding:2px 0 2px 12px;
          display:flex; flex-direction:column; gap:5px; margin:1px 0 2px; }
        .mk-step { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:12px; color:#90b4bf;
          display:flex; align-items:center; gap:8px; }
        .mk-step .mk-pr { color:#7fc7d4; }
        .mk-step .mk-ok { margin-left:auto; color:#73c2a6; font-size:11px; display:flex; align-items:center; }
        .mk-step.mk-run { color:#cfe6ec; }
        .mk-step.mk-run .mk-ok { color:#7fa6b2; }
        .mk-dotpulse { width:6px; height:6px; border-radius:50%; background:#7fc7d4; animation:mk-pulse 1s ease-in-out infinite; }

        .mk-line { font-size:14px; line-height:1.5; color:#eaf2f5; white-space:pre-wrap; }
        .mk-cur { display:inline-block; width:8px; height:15px; vertical-align:-2px; margin-left:2px; border-radius:1px;
          background:#7fc7d4; animation:mk-blink 1s steps(2) infinite; }
        .mk-err { color:#f0b4b4; font-size:14px; margin:0; }

        /* D-03 confirm card — dark surface */
        .mk-card { background:rgba(255,255,255,.05); border:1px solid rgba(127,199,212,.18); border-radius:13px;
          padding:12px 13px; margin-top:5px; }
        .mk-card-k { font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:#7fc7d4; }
        .mk-card-ttl { font-weight:700; font-size:14.5px; margin:5px 0 2px; }
        .mk-card-sub { font-size:12.5px; color:#b6cdd4; white-space:pre-wrap; }
        .mk-card-acts { display:flex; gap:8px; margin-top:11px; }
        .mk-btn { flex:1; border:none; border-radius:9px; padding:10px; font:inherit; font-weight:700; font-size:13px;
          min-height:44px; cursor:pointer; }
        .mk-btn.mk-go { background:linear-gradient(180deg,#3aa0b5,#2C7A8C); color:#fff; box-shadow:0 6px 16px rgba(44,122,140,.4); }
        .mk-btn.mk-go:disabled { opacity:.6; cursor:default; }
        .mk-btn.mk-no { background:rgba(255,255,255,.06); color:#cfe2e8; border:1px solid rgba(127,199,212,.2); }

        .mk-cmd { flex:none; padding:11px 14px 14px; border-top:1px solid rgba(127,199,212,.1); position:relative; z-index:2; }
        .mk-cmd-row { display:flex; align-items:center; gap:9px; background:rgba(255,255,255,.045);
          border:1px solid rgba(127,199,212,.22); border-radius:12px; padding:9px 11px; }
        .mk-cmd-row:focus-within { border-color:#7fc7d4; box-shadow:0 0 0 3px rgba(127,199,212,.15); }
        .mk-prompt { font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; color:#7fc7d4; font-size:14px; }
        .mk-cmd-in { flex:1; background:none; border:none; outline:none; color:#eaf2f5; font:inherit; font-size:13.5px; min-width:0; }
        .mk-cmd-in::placeholder { color:#7fa6b2; }
        /* ≥44px tap target (PRES-05 a11y contract — matches the Confirm/Cancel buttons). */
        .mk-mic { width:44px; height:44px; border-radius:50%; flex:none; display:grid; place-items:center; border:none;
          background:linear-gradient(150deg,#2C7A8C,#3aa0b5); color:#fff; box-shadow:0 4px 12px rgba(44,122,140,.45); cursor:pointer; }
        .mk-mic svg { width:16px; height:16px; }
        .mk-mic:focus-visible { outline:2px solid #7fc7d4; outline-offset:2px; }
        .mk-mic.mk-mic-live { box-shadow:0 0 0 4px rgba(127,199,212,.25), 0 4px 12px rgba(44,122,140,.45); }
        .mk-hint { display:flex; justify-content:space-between; margin-top:7px; font-size:11px; color:#7fa6b2; }

        @media (max-width: 768px) { .mk-dock { top:0; width:100vw; border-top-left-radius:0; } }
        @media (prefers-reduced-motion: reduce) {
          .mk-dock { animation:none; }
          .mk-dotpulse, .mk-cur { animation:none; }
        }
      `}</style>

      <aside
        ref={dialogRef}
        role="dialog"
        aria-label="Cue"
        className="mk-dock"
        onKeyDown={handleDialogKeyDown}
        tabIndex={-1}
      >
        {/* self-contained wave lip — flows from an arc (brand direction: arcs up
            in the middle, navy drips lower at the edges) */}
        <svg className="mk-dock-lip" viewBox="0 0 416 16" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,0 L416,0 L416,12 C277,2 139,2 0,12 Z" fill="#1B2A41" />
          <path d="M0,12 C139,2 277,2 416,12" fill="none" stroke="rgba(127,199,212,.22)" strokeWidth="1" />
        </svg>

        <header className="mk-dock-h">
          <span className="mk-glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#7fc7d4" strokeWidth="1.7">
              <circle cx="12" cy="12" r="8.2" opacity=".5" />
              <path d="M12 4.2v15.6M4.2 12h15.6" />
            </svg>
          </span>
          <span className="mk-dock-name">Cue</span>
          <span className="mk-dock-ctx">· {labels.context}</span>
          <span className="mk-dock-actions">
            {voiceSupported && (
              <button
                type="button"
                className="mk-icbtn"
                aria-label={labels.modeSettings}
                title={labels.modeSettings}
                onClick={() => setShowPicker(true)}
              >
                {/* sliders / interaction-mode glyph */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 7h7M15 7h5M4 17h3M11 17h9" />
                  <circle cx="13" cy="7" r="2" /><circle cx="9" cy="17" r="2" />
                </svg>
              </button>
            )}
            {avisoAck === true && (
              <button
                type="button"
                className="mk-icbtn"
                aria-label={labels.memory}
                title={labels.memory}
                onClick={() => setShowMemory((v) => !v)}
              >
                {/* bookmark/memory glyph */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
            )}
            <button type="button" className="mk-icbtn" aria-label={labels.collapse} onClick={onClose}>⌄</button>
            <button type="button" className="mk-icbtn" aria-label={labels.close} onClick={onClose}>&times;</button>
          </span>
        </header>

        {/* Wave 3 — interaction-mode picker (first run, or reopened from header).
            Takes precedence over the memory aviso so the two never stack. */}
        {showPicker && (
          <CueModePicker
            locale={locale}
            current={mode}
            onSelect={handleSelectMode}
            onClose={handleClosePicker}
          />
        )}

        {/* Phase 25 Slice 3 — one-time consent overlay + memory management panel.
            Both are position:absolute inset:0 within the dock (see CueMemory.tsx). */}
        {!showPicker && avisoAck === false && !consentDismissed && (
          <CueMemoryConsent
            locale={locale}
            onAck={() => setAvisoAck(true)}
            onDecline={() => setConsentDismissed(true)}
          />
        )}
        {showMemory && avisoAck === true && (
          <CueMemoryPanel locale={locale} onClose={() => setShowMemory(false)} />
        )}

        <div className="mk-thread" aria-live="polite" aria-atomic="false">
          {spoken && (
            <div className="mk-turn mk-you">
              <div className="mk-who">{labels.you}</div>
              <div className="mk-bubble">{spoken}</div>
            </div>
          )}

          {hasCueTurn && (
            <div className="mk-turn mk-cue">
              <div className="mk-who">Cue</div>

              {toolTrace.length > 0 && (
                <div className="mk-think">
                  {toolTrace.map((s, i) => {
                    const { verb, unit } = toolLabel(locale, s.tool);
                    return (
                      <div key={i} className={`mk-step ${s.status === 'run' ? 'mk-run' : ''}`}>
                        <span className="mk-pr">&rsaquo;</span>
                        <span className="mk-step-label">{verb}</span>
                        <span className="mk-ok">
                          {s.status === 'run' ? <span className="mk-dotpulse" /> : stepResultText(s, unit)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {errorMsg && <p className="mk-err">{errorMsg}</p>}

              {response && (
                <div className="mk-line">
                  {response.summary}
                  {(isThinking || isSpeaking) && <span className="mk-cur" />}
                </div>
              )}

              {pendingConfirm && pendingConfirm.kind === 'confirm' && (
                <div className="mk-card">
                  <div className="mk-card-k">&#9670; {labels.confirmEyebrow}</div>
                  <div className="mk-card-ttl">
                    {pendingConfirm.action === 'block' ? labels.confirmBlock : labels.confirmClear}
                  </div>
                  <div className="mk-card-sub">{pendingConfirm.summary}</div>
                  <div className="mk-card-acts">
                    <button type="button" className="mk-btn mk-go" onClick={handleConfirmWrite} disabled={isWriting}>
                      {labels.confirm}
                    </button>
                    <button type="button" className="mk-btn mk-no" onClick={handleCancelWrite}>
                      {labels.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form className="mk-cmd" onSubmit={handleSubmit}>
          <div className="mk-cmd-row">
            <span className="mk-prompt" aria-hidden="true">&rsaquo;</span>
            <input
              type="text"
              className="mk-cmd-in"
              placeholder={labels.placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              aria-label={labels.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type={mode === 'ptt' ? 'button' : 'submit'}
              className={`mk-mic ${(mode === 'ptt' ? pttListening : orbState === 'listening') ? 'mk-mic-live' : ''}`}
              aria-label={mode === 'ptt' ? (pttListening ? labels.tapToStop : labels.tapToTalk) : labels.mic}
              title={mode === 'ptt' ? (pttListening ? labels.tapToStop : labels.tapToTalk) : undefined}
              onClick={mode === 'ptt' ? handleMicTap : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
          </div>
          <div className="mk-hint">
            <span>{labels.hintLeft}</span>
            <span>{isThinking ? labels.thinking : ''}</span>
          </div>
        </form>
      </aside>
    </>
  );
}
