// @vitest-environment node

/**
 * Phase 22 (PRES-01/02) regression — Cue launcher glyph contrast.
 *
 * Root cause this guards against (found 2026-06-22): CueLauncher treated `tone`
 * as a BACKGROUND descriptor while PhysicianIconRail (its only consumer) uses
 * `tone` to describe the INK. The rail passes its own tone straight through, so
 * the inverted mapping painted the glyph white-on-linen (desktop dashboard chrome,
 * tone="dark") and navy-on-navy (mobile header, tone="light") → invisible on every
 * surface, even though the element was in the DOM.
 *
 * The shared convention (must match TONE[] in PhysicianIconRail.tsx):
 *   tone='dark'  → dark ink on a LIGHT surface → navy mark  (LOGO_DARK_SRC)
 *   tone='light' → light ink on a DARK surface → white mark (LOGO_SRC)
 */

import { describe, it, expect } from 'vitest';
import { cueGlyphSrc, LOGO_SRC, LOGO_DARK_SRC } from '../lib/assets';

describe('cueGlyphSrc — rail tone → contrasting glyph', () => {
  it('tone="dark" (dark ink, LIGHT surface) → navy mark, visible on linen', () => {
    expect(cueGlyphSrc('dark')).toBe(LOGO_DARK_SRC);
  });

  it('tone="light" (light ink, DARK surface) → white mark, visible on navy', () => {
    expect(cueGlyphSrc('light')).toBe(LOGO_SRC);
  });

  it('the two tones never resolve to the same asset', () => {
    expect(cueGlyphSrc('dark')).not.toBe(cueGlyphSrc('light'));
  });
});
