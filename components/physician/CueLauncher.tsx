/**
 * CueLauncher — Phase 22 (PRES-01 / PRES-02)
 *
 * The BARE Medikah glyph as the omnipresent Cue entry point on the cross-surface
 * rail. No icon background, no square chip, no button chrome. Just the mark.
 *
 * Visual contract:
 *   - Light surfaces  → /logo-BLU.png  (navy caduceus, transparent bg)
 *   - Dark surfaces   → /logo.png      (white caduceus, transparent bg)
 *   - A gentle "breath" animation (scale + opacity pulse) signals interactivity
 *     without chrome. Disabled when prefers-reduced-motion is set.
 *   - Hover/focus states add a soft teal glow — reads as interactive.
 *   - Tap target ≥ 44 × 44 px (accessibility requirement, PRES-05 partial).
 *
 * Phase 22 scope — LAUNCHER ONLY:
 *   The click handler is a no-op placeholder. The summoned centered voice-first
 *   surface (PRES-03 / PRES-04 / PRES-05 / PRES-06) ships in Phase 23.
 *   TODO (Phase 23): Replace `onOpen` stub with the surface summon logic.
 *
 * Usage:
 *   <CueLauncher tone="dark" lang="en" />
 *
 * `tone` matches PhysicianIconRail's TONE convention — it describes the INK, not
 * the background (the rail passes its own tone straight through):
 *   tone="dark"  → navy mark  (dark ink, for LIGHT/linen rail surfaces)
 *   tone="light" → white mark (light ink, for DARK/navy rail surfaces)
 * Must stay aligned with TONE[] in PhysicianIconRail.tsx (see cueGlyphSrc).
 */

import Image from 'next/image';
import { cueGlyphSrc } from '../../lib/assets';

export interface CueLauncherProps {
  /** Match the rail's tone (ink, not background): 'dark' = navy glyph for a light
   *  surface, 'light' = white glyph for a dark surface. */
  tone?: 'dark' | 'light';
  /** Bilingual label for aria / title */
  lang?: 'en' | 'es';
  /**
   * Called when the user activates the launcher.
   * Phase 22: no-op stub — Phase 23 will provide the summoned surface.
   */
  onOpen?: () => void;
  className?: string;
}

const ARIA_LABEL: Record<'en' | 'es', string> = {
  en: 'Cue',
  es: 'Cue',
};

export default function CueLauncher({
  tone = 'dark',
  lang = 'en',
  onOpen,
  className = '',
}: CueLauncherProps) {
  const logoSrc = cueGlyphSrc(tone);
  const label = ARIA_LABEL[lang];

  function handleActivate(e: React.MouseEvent | React.KeyboardEvent) {
    if ('key' in e && e.key !== 'Enter' && e.key !== ' ') return;
    if ('key' in e) e.preventDefault();
    if (onOpen) {
      onOpen();
    }
    // TODO (Phase 23): open the centered Cue stage surface here.
    // The summoned surface (PRES-03..06) is not built yet.
  }

  return (
    <>
      <style>{`
        @keyframes mk-cue-breath {
          0%, 100% { transform: scale(1);   opacity: 0.72; }
          50%       { transform: scale(1.06); opacity: 1; }
        }

        .mk-cue-launcher {
          display: flex;
          align-items: center;
          justify-content: center;
          /* ≥ 44 × 44 px tap target (PRES-05 a11y partial) */
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          outline: none;
          padding: 0;
          position: relative;
          /* Smooth hover / focus transitions */
          transition: box-shadow 220ms ease, background-color 220ms ease;
          flex-shrink: 0;
        }

        .mk-cue-launcher:hover,
        .mk-cue-launcher:focus-visible {
          background-color: rgba(44, 122, 140, 0.10);
          box-shadow: 0 0 0 6px rgba(44, 122, 140, 0.12);
        }

        .mk-cue-launcher:focus-visible {
          box-shadow: 0 0 0 3px rgba(44, 122, 140, 0.55);
        }

        .mk-cue-glyph {
          display: block;
          width: 22px;
          height: 22px;
          object-fit: contain;
          /* Breath: gentle scale + opacity pulse.
             Disabled via prefers-reduced-motion (PRES-02 / PRES-05). */
          animation: mk-cue-breath 3.2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .mk-cue-glyph {
            animation: none;
            opacity: 0.80;
          }
        }
      `}</style>

      <button
        type="button"
        className={`mk-cue-launcher${className ? ' ' + className : ''}`}
        aria-label={label}
        title={label}
        onClick={handleActivate}
        onKeyDown={handleActivate}
      >
        <Image
          src={logoSrc}
          alt=""
          width={22}
          height={22}
          aria-hidden="true"
          className="mk-cue-glyph"
          priority={false}
        />
      </button>
    </>
  );
}
