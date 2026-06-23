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
 *   - Confirm/Cancel in CueActionCard are INERT in this plan (wired in 23-04)
 *   - Scrim: rgba(27,42,65,0.72) + backdrop-filter blur; solid-color fallback
 *     for Safari/SOGo compositor (T-23-03-03 mitigation)
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import CueActionCard from './CueActionCard';

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

// ─── Labels ──────────────────────────────────────────────────────────────────

const LABELS = {
  en: {
    placeholder: 'Ask Cue anything about your calendar…',
    submit: 'Send',
    close: 'Close',
    loading: 'Cue is thinking…',
    error: 'Something went wrong. Please try again.',
  },
  es: {
    placeholder: 'Pregúntale a Cue sobre tu calendario…',
    submit: 'Enviar',
    close: 'Cerrar',
    loading: 'Cue está pensando…',
    error: 'Algo salió mal. Inténtalo de nuevo.',
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

  const labels = LABELS[locale];

  // ── Open / Close lifecycle ───────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
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

  // ── Text submit → /cue/chat ──────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = inputValue.trim();
    if (!message || isLoading) return;

    setIsLoading(true);
    setResponse(null);
    setErrorMsg(null);

    try {
      const apiUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || '')
        : '';

      const res = await fetch(`${apiUrl}/cue/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Bearer token in Authorization header only — T-23-03-02 mitigation
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ message, locale }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Read the streaming plain-text response (Phase 22 StreamingResponse shape)
      const text = await res.text();
      setResponse({
        title: locale === 'es' ? 'Cue' : 'Cue',
        summary: text,
      });
      setInputValue('');
    } catch {
      setErrorMsg(labels.error);
    } finally {
      setIsLoading(false);
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

        .mk-cue-response-area {
          min-height: 0;
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

        /* prefers-reduced-motion: disable entrance + breath animations */
        @media (prefers-reduced-motion: reduce) {
          .mk-cue-entrance,
          .mk-cue-dialog,
          .mk-cue-scrim {
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

            {/* Response area */}
            <div className="mk-cue-response-area" aria-live="polite" aria-atomic="true">
              {isLoading && (
                <p className="mk-cue-loading">{labels.loading}</p>
              )}
              {errorMsg && (
                <p className="mk-cue-error">{errorMsg}</p>
              )}
              {response && !isLoading && (
                <CueActionCard
                  title={response.title}
                  summary={response.summary}
                  items={response.items}
                  locale={locale}
                  // Confirm/Cancel stay INERT in this plan (wired in 23-04)
                  onConfirm={undefined}
                  onCancel={undefined}
                />
              )}
            </div>

            {/* Text input form */}
            <form className="mk-cue-form" onSubmit={handleSubmit}>
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
