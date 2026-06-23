/**
 * CueOrb — Phase 23 Plan 06 (VOICE-05 / PRES-03 / PRES-05)
 *
 * The orb visual for the Cue summon surface. Its appearance is bound to the
 * five-state voice FSM (lib/cue/stateMachine.ts): idle / listening / thinking /
 * speaking / intercepting. Anchored by the approved Medikah caduceus mark (D-04),
 * breathing at rest.
 *
 * CSS-driven (NOT WebGL) — mirrors CueLauncher.tsx's inline-<style> + keyframe
 * convention so the orb is self-contained and SOGo-injectable, and to avoid the
 * WebGL bloom/alpha pitfalls (project memory). prefers-reduced-motion disables
 * ALL motion (PRES-05); the state is still conveyed by ring color/opacity so the
 * cue survives without animation.
 *
 * Pure presentational: it reads the FSM state via the `state` prop. CueSurface
 * owns the VoiceStateMachine and passes the current state down.
 */

import Image from 'next/image';
import { cueGlyphSrc } from '../../lib/assets';
import type { OrbState } from '../../lib/cue/stateMachine';

export interface CueOrbProps {
  /** Current FSM state — drives the orb's breath/pulse/color. */
  state: OrbState;
  /** Ink tone of the centered glyph: 'dark' = navy (light surface). */
  tone?: 'dark' | 'light';
  /** Diameter in px. Default 96. */
  size?: number;
}

/** Per-state ring treatment. Motion classes are gated by prefers-reduced-motion. */
const STATE_CLASS: Record<OrbState, string> = {
  idle: 'mk-orb--idle',
  listening: 'mk-orb--listening',
  thinking: 'mk-orb--thinking',
  speaking: 'mk-orb--speaking',
  intercepting: 'mk-orb--intercepting',
};

export default function CueOrb({ state, tone = 'dark', size = 96 }: CueOrbProps) {
  const glyphSize = Math.round(size * 0.34);

  return (
    <>
      <style>{`
        @keyframes mk-orb-breath {
          0%, 100% { transform: scale(1);    opacity: 0.85; }
          50%      { transform: scale(1.05); opacity: 1; }
        }
        @keyframes mk-orb-ring {
          0%   { transform: scale(0.85); opacity: 0.55; }
          70%  { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes mk-orb-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes mk-orb-pulse {
          0%, 100% { transform: scale(1);    opacity: 0.9; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
        @keyframes mk-orb-flash {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }

        .mk-orb {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
        }

        /* Base disc — clinical-teal halo over white */
        .mk-orb-core {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 42%,
              rgba(44, 122, 140, 0.16) 0%,
              rgba(44, 122, 140, 0.10) 45%,
              rgba(27, 42, 65, 0.04) 72%,
              transparent 100%);
          border: 1.5px solid rgba(44, 122, 140, 0.28);
          transform-origin: center;
        }

        /* Expanding pulse rings — only visible in listening/speaking */
        .mk-orb-pulsering {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(44, 122, 140, 0.40);
          opacity: 0;
          transform-origin: center;
        }

        .mk-orb-glyph {
          position: relative;
          z-index: 1;
          display: block;
          object-fit: contain;
        }

        /* ── Per-state motion ─────────────────────────────────────────── */
        .mk-orb--idle .mk-orb-core {
          animation: mk-orb-breath 3.6s ease-in-out infinite;
        }
        .mk-orb--listening .mk-orb-core {
          border-color: rgba(44, 122, 140, 0.55);
        }
        .mk-orb--listening .mk-orb-pulsering {
          animation: mk-orb-ring 1.8s ease-out infinite;
        }
        .mk-orb--thinking .mk-orb-core {
          border-style: dashed;
          animation: mk-orb-spin 5.2s linear infinite;
        }
        .mk-orb--speaking .mk-orb-core {
          border-color: rgba(44, 122, 140, 0.7);
          animation: mk-orb-pulse 0.9s ease-in-out infinite;
        }
        .mk-orb--speaking .mk-orb-pulsering {
          animation: mk-orb-ring 1.1s ease-out infinite;
        }
        .mk-orb--intercepting .mk-orb-core {
          border-color: #B8860B; /* caution-amber — attention without alarm */
          animation: mk-orb-flash 0.6s ease-in-out infinite;
        }

        /* PRES-05: kill ALL motion under reduced-motion; state still conveyed
           by the ring color/opacity set above (no animation needed). */
        @media (prefers-reduced-motion: reduce) {
          .mk-orb-core,
          .mk-orb-pulsering {
            animation: none !important;
          }
          .mk-orb-pulsering { display: none; }
        }
      `}</style>

      <div
        className={`mk-orb ${STATE_CLASS[state]}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Cue ${state}`}
        data-cue-state={state}
      >
        <span className="mk-orb-pulsering" aria-hidden="true" />
        <span className="mk-orb-core" aria-hidden="true" />
        <Image
          src={cueGlyphSrc(tone)}
          alt=""
          width={glyphSize}
          height={glyphSize}
          aria-hidden="true"
          className="mk-orb-glyph"
          priority={false}
        />
      </div>
    </>
  );
}
