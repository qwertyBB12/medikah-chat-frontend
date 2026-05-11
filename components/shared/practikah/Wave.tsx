/**
 * Wave — shared Práctikah workspace signature primitive.
 *
 * Pure-SVG. Zero hooks, zero state, zero effects. Server-renderable to a
 * static string by Plan 20-03's build-sogo-wave script, and runtime-renderable
 * for Plan 20-04's physician dashboard masthead.
 *
 * Source-of-truth for both surfaces: lib/design-tokens.ts (canonical token
 * export landed in Plan 20-01). Fill colors are inlined as literal hex into
 * the rendered SVG so SOGo's --mk-wave-fill CSS variable becomes redundant
 * (RESEARCH Pitfall 5).
 *
 * Geometry is canonical (RESEARCH Pattern 3):
 *   - Desktop 80h: M0,80 C480,0 960,0 1440,80 L1440,0 L0,0 Z
 *       → matches custom-sogo.js:4670
 *   - Mobile  60h: M0,60 C480,0 960,0 1440,60 L1440,0 L0,0 Z
 *       → matches custom-sogo.js:3199
 *
 * Do NOT add a 40h variant — that is the homepage CurveDivider.tsx, a
 * separate "section divider" pattern kept as-is per D-01.
 */

import { tokens } from '../../../lib/design-tokens';
import type { WaveProps } from './Wave.types';

const PATHS = {
  desktop: 'M0,80 C480,0 960,0 1440,80 L1440,0 L0,0 Z', // custom-sogo.js:4670
  mobile: 'M0,60 C480,0 960,0 1440,60 L1440,0 L0,0 Z', // custom-sogo.js:3199
} as const;

export function Wave({ variant, className }: WaveProps) {
  const isDark = variant.startsWith('dark');
  const isMobile = variant.endsWith('Mobile');
  const fill = isDark ? tokens.colors.instBlue : tokens.colors.linen;
  const path = isMobile ? PATHS.mobile : PATHS.desktop;
  const h = isMobile ? 60 : 80;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 1440 ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: `${h}px` }}
    >
      <path d={path} fill={fill} />
    </svg>
  );
}

export type { WaveProps, WaveVariant } from './Wave.types';
