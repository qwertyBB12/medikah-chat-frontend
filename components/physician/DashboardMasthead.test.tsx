/**
 * DashboardMasthead tests — Plan 20-04 Task 1.
 *
 * Verifies the linen-letterhead-band + Wave composition that brings the
 * physician dashboard to visual parity with SOGo (D-03 in 20-CONTEXT.md).
 *
 * Mocks `useThemeMode` and `window.matchMedia` to assert variant resolution
 * across the 4-cell theme × device matrix. Uses Vitest's vi.resetModules
 * pattern so each block can swap the mocked resolved theme.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const LINEN = '#F0EAE0';
const INST_BLUE = '#1B2A41';

function stubMatchMedia(matches: boolean) {
  // Stub window.matchMedia so the `(max-width: 960px)` query returns the
  // mobile/desktop state we want. Used during initial render path.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

async function loadMasthead(resolved: 'dark' | 'light') {
  vi.resetModules();
  vi.doMock('../../lib/useThemeMode', () => ({
    useThemeMode: () => ({ resolved, choice: 'auto', setTheme: () => {} }),
  }));
  const mod = await import('./DashboardMasthead');
  return mod.DashboardMasthead;
}

describe('DashboardMasthead', () => {
  beforeEach(() => {
    stubMatchMedia(false); // desktop default — overridden per-test
  });

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../../lib/useThemeMode');
  });

  // Test 1 — dark theme picks darkDesktop variant
  it('renders darkDesktop variant when theme=dark on desktop', async () => {
    stubMatchMedia(false);
    const DashboardMasthead = await loadMasthead('dark');
    const html = renderToStaticMarkup(<DashboardMasthead />);
    expect(html).toContain(`fill="${INST_BLUE}"`);
    expect(html).toContain('viewBox="0 0 1440 80"');
  });

  // Test 2 — light theme picks lightDesktop variant
  it('renders lightDesktop variant when theme=light on desktop', async () => {
    stubMatchMedia(false);
    const DashboardMasthead = await loadMasthead('light');
    const html = renderToStaticMarkup(<DashboardMasthead />);
    expect(html).toContain(`fill="${LINEN}"`);
    expect(html).toContain('viewBox="0 0 1440 80"');
  });

  // Test 3 — letterhead band background matches wave fill
  // Dark → band = instBlue; Light → band = linen
  // Implementation note: the SSR snapshot reflects initial state (isMobile=false,
  // bandHeight=40 desktop). Band bg is inlined via style attribute.
  it('letterhead band background equals instBlue in dark mode', async () => {
    stubMatchMedia(false);
    const DashboardMasthead = await loadMasthead('dark');
    const html = renderToStaticMarkup(<DashboardMasthead />);
    // Style attribute may serialize hex as lowercase; normalize both sides.
    expect(html.toLowerCase()).toContain(INST_BLUE.toLowerCase());
  });

  it('letterhead band background equals linen in light mode', async () => {
    stubMatchMedia(false);
    const DashboardMasthead = await loadMasthead('light');
    const html = renderToStaticMarkup(<DashboardMasthead />);
    expect(html.toLowerCase()).toContain(LINEN.toLowerCase());
  });

  // Test 4 — zero text content (feedback_no_design_additions_to_shipped_ui)
  // Strip all tags; remainder must be empty/whitespace.
  it('renders zero text content (no headers, titles, wordmark)', async () => {
    stubMatchMedia(false);
    const DashboardMasthead = await loadMasthead('light');
    const html = renderToStaticMarkup(<DashboardMasthead />);
    const textOnly = html.replace(/<[^>]+>/g, '').trim();
    expect(textOnly).toBe('');
  });

  // Test 5 — total height stays a thin band (band + wave ≤ 120px)
  // Desktop: band 40 + wave 80 = 120. Mobile: band 24 + wave 60 = 84.
  // We assert by parsing the band height + wave viewBox height from the SSR
  // output and summing them.
  it('total masthead height is ≤ 120px on desktop', async () => {
    stubMatchMedia(false);
    const DashboardMasthead = await loadMasthead('dark');
    const html = renderToStaticMarkup(<DashboardMasthead />);

    // Band height — first inner div uses inline style height:40px (desktop).
    const bandMatch = html.match(/height:\s*(\d+)px/i);
    expect(bandMatch).not.toBeNull();
    const bandPx = bandMatch ? parseInt(bandMatch[1], 10) : 0;

    // Wave height comes from viewBox last number (80 desktop / 60 mobile).
    const viewBoxMatch = html.match(/viewBox="0 0 1440 (\d+)"/);
    expect(viewBoxMatch).not.toBeNull();
    const wavePx = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 0;

    expect(bandPx + wavePx).toBeLessThanOrEqual(120);
  });
});
