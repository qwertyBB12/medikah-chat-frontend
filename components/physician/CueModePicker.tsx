/**
 * components/physician/CueModePicker.tsx
 * --------------------------------------
 * Cue interaction-mode chooser (Wave 3), rendered inside the CueSurface dock.
 * One-time on first run (before the greeting speaks) and reopenable anytime from
 * the dock header. Bilingual (ES primary), matching the mk-dock dark navy/teal
 * aesthetic — conformance, no new design language (mirrors CueMemoryConsent).
 *
 *   voice — continuous voice with chimes (recommended; hands-free)
 *   ptt   — push-to-talk (the mic opens only for a window you tap)
 *   text  — text only (no mic, no spoken greeting)
 *
 * Picking an option applies it immediately. The X dismisses without changing
 * (the caller decides what "dismiss" means: first-run keeps the default).
 */
import type { CueMode } from '../../lib/cue/voice/mode';

type Locale = 'en' | 'es';

const COPY: Record<Locale, {
  eyebrow: string; title: string; changeAnytime: string; close: string; recommended: string;
  options: { mode: CueMode; title: string; desc: string }[];
}> = {
  es: {
    eyebrow: 'Cómo quieres hablar con Cue',
    title: 'Elige tu modo',
    changeAnytime: 'Puedes cambiarlo cuando quieras desde el encabezado de Cue.',
    close: 'Cerrar',
    recommended: 'Recomendado',
    options: [
      { mode: 'voice', title: 'Voz con tonos',
        desc: 'Cue te escucha y responde en voz. Un tono suave marca cuándo es tu turno.' },
      { mode: 'ptt', title: 'Mantén para hablar',
        desc: 'El micrófono escucha solo cuando tú lo abres. Toca para hablar, toca para terminar.' },
      { mode: 'text', title: 'Solo texto',
        desc: 'Escribe tus comandos. Sin micrófono ni voz.' },
    ],
  },
  en: {
    eyebrow: 'How you’d like to talk with Cue',
    title: 'Choose your mode',
    changeAnytime: 'You can change this anytime from Cue’s header.',
    close: 'Close',
    recommended: 'Recommended',
    options: [
      { mode: 'voice', title: 'Voice with chimes',
        desc: 'Cue listens and replies aloud. A soft tone marks when it’s your turn.' },
      { mode: 'ptt', title: 'Push to talk',
        desc: 'The mic listens only when you open it. Tap to talk, tap to finish.' },
      { mode: 'text', title: 'Text only',
        desc: 'Type your commands. No mic, no voice.' },
    ],
  },
};

function ModeIcon({ mode }: { mode: CueMode }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
    stroke: '#7fc7d4', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (mode === 'voice') {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    );
  }
  if (mode === 'ptt') {
    // a hand / tap glyph
    return (
      <svg {...common} aria-hidden="true">
        <path d="M9 11V6a1.5 1.5 0 0 1 3 0v4" />
        <path d="M12 10V4.5a1.5 1.5 0 0 1 3 0V10" />
        <path d="M15 10V6.5a1.5 1.5 0 0 1 3 0V13a6 6 0 0 1-6 6h-1.2a4 4 0 0 1-3.1-1.5L6 15.5c-.7-.9-.5-1.8.3-2.3.6-.4 1.4-.3 2 .2L9 14V8a1.5 1.5 0 0 1 3 0" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h0M11 10h0M15 10h0M8 14h8" />
    </svg>
  );
}

export function CueModePicker({
  locale,
  current,
  onSelect,
  onClose,
}: {
  locale: Locale;
  /** The active mode (for the ✓ when reopened); null on first run. */
  current: CueMode | null;
  onSelect: (mode: CueMode) => void;
  onClose: () => void;
}) {
  const t = COPY[locale];
  return (
    <div className="cue-mode" role="dialog" aria-label={t.title}>
      <style>{`
        .cue-mode { position:absolute; inset:0; z-index:7; display:flex; flex-direction:column;
          background:linear-gradient(180deg,#0e2230 0%,#0b1a25 100%); color:#e8f1f4;
          font-family:inherit; animation:cue-mode-in .32s cubic-bezier(.16,1,.3,1); }
        @keyframes cue-mode-in { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }
        .cue-mode-h { flex:none; display:flex; align-items:flex-start; gap:10px; padding:18px 18px 6px; }
        .cue-mode-x { margin-left:auto; background:transparent; border:none; color:#9fbcc6; cursor:pointer;
          font-size:18px; line-height:1; padding:4px 6px; border-radius:8px; }
        .cue-mode-x:hover { background:rgba(120,160,175,.1); color:#e8f1f4; }
        .cue-mode-x:focus-visible { outline:2px solid #7fc7d4; outline-offset:2px; }
        .cue-mode-eyebrow { font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#5fb6c9; font-weight:700; }
        .cue-mode-title { font-size:18px; font-weight:800; line-height:1.2; margin:5px 0 0; }
        .cue-mode-body { flex:1; overflow-y:auto; padding:10px 18px 8px; display:flex; flex-direction:column; gap:10px; }
        .cue-mode-opt { display:flex; gap:12px; text-align:left; width:100%; cursor:pointer;
          background:rgba(255,255,255,.04); border:1px solid rgba(127,199,212,.18); border-radius:14px;
          padding:13px 14px; color:inherit; font-family:inherit; transition:background .14s, border-color .14s, transform .04s; }
        .cue-mode-opt:hover { background:rgba(127,199,212,.1); border-color:rgba(127,199,212,.4); }
        .cue-mode-opt:active { transform:translateY(1px); }
        .cue-mode-opt:focus-visible { outline:2px solid #7fc7d4; outline-offset:2px; }
        .cue-mode-opt.sel { border-color:rgba(58,160,181,.65); box-shadow:0 0 0 1px rgba(58,160,181,.35) inset; }
        .cue-mode-ic { flex:none; width:38px; height:38px; border-radius:11px; display:grid; place-items:center;
          background:radial-gradient(120% 120% at 30% 20%, rgba(127,199,212,.28), transparent 62%), #16233a;
          border:1px solid rgba(127,199,212,.26); }
        .cue-mode-tx { flex:1; min-width:0; }
        .cue-mode-row { display:flex; align-items:center; gap:8px; }
        .cue-mode-ot { font-size:14.5px; font-weight:800; letter-spacing:.01em; }
        .cue-mode-badge { font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; font-weight:800; color:#fff;
          background:linear-gradient(180deg,#3aa0b5,#2C7A8C); border-radius:999px; padding:2px 8px; }
        .cue-mode-check { margin-left:auto; color:#73c2a6; font-size:15px; }
        .cue-mode-od { font-size:12.5px; line-height:1.5; color:#b6cdd4; margin-top:3px; }
        .cue-mode-foot { flex:none; font-size:11.5px; line-height:1.5; color:#7e9aa4; padding:8px 18px 18px; }
      `}</style>

      <div className="cue-mode-h">
        <div>
          <div className="cue-mode-eyebrow">{t.eyebrow}</div>
          <h2 className="cue-mode-title">{t.title}</h2>
        </div>
        <button type="button" className="cue-mode-x" onClick={onClose} aria-label={t.close}>&times;</button>
      </div>

      <div className="cue-mode-body">
        {t.options.map((o) => {
          const selected = current === o.mode;
          return (
            <button
              key={o.mode}
              type="button"
              className={`cue-mode-opt${selected ? ' sel' : ''}`}
              onClick={() => onSelect(o.mode)}
              aria-pressed={selected}
            >
              <span className="cue-mode-ic"><ModeIcon mode={o.mode} /></span>
              <span className="cue-mode-tx">
                <span className="cue-mode-row">
                  <span className="cue-mode-ot">{o.title}</span>
                  {o.mode === 'voice' && <span className="cue-mode-badge">{t.recommended}</span>}
                  {selected && <span className="cue-mode-check" aria-hidden="true">✓</span>}
                </span>
                <span className="cue-mode-od">{o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="cue-mode-foot">{t.changeAnytime}</div>
    </div>
  );
}
