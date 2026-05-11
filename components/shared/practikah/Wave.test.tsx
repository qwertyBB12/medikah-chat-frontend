/**
 * Wave primitive tests — Vitest + react-dom/server.
 *
 * Uses renderToStaticMarkup (Node-only) instead of @testing-library/react
 * to keep this aligned with Plan 20-03's SOGo build target, which uses the
 * same render path. Snapshots committed here become the byte-equality
 * reference for the prebuilt SOGo wave.js (T-20-02-01 mitigation).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Wave } from './Wave';
import { WAVE_VARIANTS, type WaveVariant } from './Wave.types';

const DESKTOP_PATH = 'M0,80 C480,0 960,0 1440,80 L1440,0 L0,0 Z';
const MOBILE_PATH = 'M0,60 C480,0 960,0 1440,60 L1440,0 L0,0 Z';
const INST_BLUE = '#1B2A41';
const LINEN = '#F0EAE0';

function render(variant: WaveVariant): string {
  return renderToStaticMarkup(<Wave variant={variant} />);
}

describe('Wave primitive', () => {
  // Test 6 — Snapshot test for all 4 variants (Plan 20-03 byte-equality ref)
  WAVE_VARIANTS.forEach((variant) => {
    it(`renders ${variant} variant (snapshot)`, () => {
      const html = render(variant);
      expect(html).toMatchSnapshot();
    });
  });

  // Test 1 — viewBox per device
  it('desktop variants use viewBox 0 0 1440 80', () => {
    expect(render('darkDesktop')).toContain('viewBox="0 0 1440 80"');
    expect(render('lightDesktop')).toContain('viewBox="0 0 1440 80"');
  });

  it('mobile variants use viewBox 0 0 1440 60', () => {
    expect(render('darkMobile')).toContain('viewBox="0 0 1440 60"');
    expect(render('lightMobile')).toContain('viewBox="0 0 1440 60"');
  });

  // Test 2 — dark fill is instBlue
  it('darkDesktop fill is instBlue (#1B2A41)', () => {
    expect(render('darkDesktop')).toContain(`fill="${INST_BLUE}"`);
  });

  it('darkMobile fill is instBlue (#1B2A41)', () => {
    expect(render('darkMobile')).toContain(`fill="${INST_BLUE}"`);
  });

  // Test 3 — light fill is linen
  it('lightDesktop fill is linen (#F0EAE0)', () => {
    expect(render('lightDesktop')).toContain(`fill="${LINEN}"`);
  });

  it('lightMobile fill is linen (#F0EAE0)', () => {
    expect(render('lightMobile')).toContain(`fill="${LINEN}"`);
  });

  // Test 4 — exact path geometry
  it('desktop variants use the canonical 80h path', () => {
    expect(render('darkDesktop')).toContain(`d="${DESKTOP_PATH}"`);
    expect(render('lightDesktop')).toContain(`d="${DESKTOP_PATH}"`);
  });

  it('mobile variants use the canonical 60h path', () => {
    expect(render('darkMobile')).toContain(`d="${MOBILE_PATH}"`);
    expect(render('lightMobile')).toContain(`d="${MOBILE_PATH}"`);
  });

  // Test 5 — accessibility + aspect ratio attrs
  it('all variants set aria-hidden="true" and preserveAspectRatio="none"', () => {
    WAVE_VARIANTS.forEach((variant) => {
      const html = render(variant);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('preserveAspectRatio="none"');
    });
  });

  // Test 7 — Wave.tsx source contains zero hooks (server-renderability guard)
  it('Wave.tsx source has zero React hooks (server-renderable guarantee)', () => {
    const source = readFileSync(resolve(__dirname, 'Wave.tsx'), 'utf8');
    // Strip comments before scanning so prose mentions don't false-positive
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const HOOKS = /\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer|useLayoutEffect)\b/;
    expect(stripped).not.toMatch(HOOKS);
  });
});
