/**
 * CueActionCard — Phase 23 (PRES-04 / D-04)
 *
 * Structured Cue response card. Renders a title, summary text, optional
 * items list, and (when onConfirm is provided) Confirm/Cancel buttons.
 *
 * Design rules:
 *   - Uses the SettingsTab card container shape (bg-white rounded-md border p-6 shadow-sm)
 *   - NOT a chat bubble — no role="log", no message list, no timestamp
 *   - Bilingual labels via practikahWorkspaceContent cue.* keys
 *   - Confirm/Cancel buttons are INERT in Plan 23-03; wired in Plan 23-04
 *   - All interactive controls ≥ 44px tap target (PRES-05)
 *   - Only rendered inside CueSurface — never standalone outside the modal
 */

export interface CueActionCardProps {
  /** Card headline (e.g. "Your day — Monday"). */
  title: string;
  /** Card body text (assistant's prose response). */
  summary: string;
  /** Optional structured list items (e.g. event titles for read_day). */
  items?: string[];
  /** Active locale for bilingual button labels. */
  locale?: 'en' | 'es';
  /**
   * Confirm callback. If provided, the Confirm button is shown.
   * INERT in Plan 23-03 — wired in Plan 23-04 (block_time / clear_range).
   */
  onConfirm?: (() => void) | undefined;
  /**
   * Cancel callback. Shown alongside Confirm when onConfirm is provided.
   * INERT in Plan 23-03.
   */
  onCancel?: (() => void) | undefined;
}

/** Bilingual button labels (minimal set needed here; full cue.* keys in practikahWorkspaceContent.ts). */
const CUE_LABELS = {
  en: { confirm: 'Confirm', cancel: 'Cancel' },
  es: { confirm: 'Confirmar', cancel: 'Cancelar' },
} as const;

export default function CueActionCard({
  title,
  summary,
  items,
  locale = 'en',
  onConfirm,
  onCancel,
}: CueActionCardProps) {
  const l = CUE_LABELS[locale];
  const hasActions = typeof onConfirm !== 'undefined';

  return (
    <>
      {/* Inline styles keep the card self-contained and consistent with
          CueLauncher/CueSurface's inline <style> project convention. */}
      <style>{`
        .mk-cue-card {
          background: #ffffff;
          /* rounded-md = 16px per tailwind.config.js */
          border-radius: 16px;
          border: 1px solid rgba(27, 42, 65, 0.06);
          padding: 24px;
          box-shadow: 0 1px 3px rgba(27, 42, 65, 0.06);
        }

        .mk-cue-card-title {
          font-family: 'Mulish', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #1C1C1E; /* deep-charcoal */
          margin: 0 0 8px;
        }

        .mk-cue-card-summary {
          font-family: 'Mulish', sans-serif;
          font-size: 0.875rem;
          color: #4A5568; /* body-slate */
          margin: 0;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .mk-cue-card-items {
          margin: 12px 0 0;
          padding: 0 0 0 18px;
          font-family: 'Mulish', sans-serif;
          font-size: 0.875rem;
          color: #4A5568;
          line-height: 1.7;
        }

        .mk-cue-card-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        /* Confirm — clinical-teal; ≥44px tap target */
        .mk-cue-card-confirm {
          min-height: 44px;
          padding: 0 20px;
          border-radius: 16px;
          border: none;
          background: #2C7A8C; /* clinical-teal */
          color: #ffffff;
          font-family: 'Mulish', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 180ms ease;
        }

        .mk-cue-card-confirm:hover {
          background: rgba(44, 122, 140, 0.88);
        }

        /* Cancel — body-slate ghost; ≥44px tap target */
        .mk-cue-card-cancel {
          min-height: 44px;
          padding: 0 20px;
          border-radius: 16px;
          border: 1.5px solid rgba(74, 85, 104, 0.25);
          background: transparent;
          color: #4A5568;
          font-family: 'Mulish', sans-serif;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 180ms ease, border-color 180ms ease;
        }

        .mk-cue-card-cancel:hover {
          background: rgba(74, 85, 104, 0.06);
          border-color: rgba(74, 85, 104, 0.45);
        }
      `}</style>

      <div className="mk-cue-card">
        <p className="mk-cue-card-title">{title}</p>
        <p className="mk-cue-card-summary">{summary}</p>

        {items && items.length > 0 && (
          <ul className="mk-cue-card-items">
            {items.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        )}

        {/* Confirm/Cancel — only when onConfirm is provided (D-03 / 23-04) */}
        {hasActions && (
          <div className="mk-cue-card-actions">
            <button
              type="button"
              className="mk-cue-card-confirm"
              onClick={onConfirm}
            >
              {l.confirm}
            </button>
            <button
              type="button"
              className="mk-cue-card-cancel"
              onClick={onCancel}
            >
              {l.cancel}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
