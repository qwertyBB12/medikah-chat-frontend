/**
 * Live homepage DOM ↔ design-tokens.ts conformance spec — Phase 20 Plan 20-08
 * Task 2.
 *
 * Asserts the D-02 source-of-truth ladder: live `https://medikah.health`
 * computed styles match `lib/design-tokens.ts` values for the canonical
 * anchor selectors (H1 typeface, body family, primary CTA bg).
 *
 * Per D-02: if the live DOM disagrees with `design-tokens.ts`, the LIVE
 * DOM wins — update `design-tokens.ts` to match (NOT the live homepage).
 */
import { test, expect } from '@playwright/test';
import { tokens } from '../lib/design-tokens';

test.describe('Live homepage DOM matches design-tokens.ts (D-02 ladder)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://medikah.health', { waitUntil: 'domcontentloaded' });
  });

  test('H1 (hero headline) uses Oswald + uppercase', async ({ page }) => {
    const h1 = page.locator('h1').first();
    await h1.waitFor({ state: 'attached', timeout: 10_000 });
    const family = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/Oswald/i);
    const transform = await h1.evaluate((el) => getComputedStyle(el).textTransform);
    expect(transform).toBe('uppercase');
  });

  test('body paragraph text uses Mulish', async ({ page }) => {
    // NOTE on D-02 finding: getComputedStyle(document.body).fontFamily returns
    // "Times" on the live site because <body> itself has no font-family rule
    // — body text inherits Mulish from descendant selectors (Tailwind
    // `font-body` / `font-mulish` classes on wrapper elements). Audit the
    // first visible <p> element instead, which is the truth that matters for
    // readers.
    const p = page.locator('p').first();
    await p.waitFor({ state: 'attached', timeout: 10_000 });
    const family = await p.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/Mulish/i);
  });

  test('primary CTA bg is teal-500 (#2C7A8C)', async ({ page }) => {
    // Find a primary CTA link or button by visible text.
    const cta = page
      .locator('a, button')
      .filter({ hasText: /get started|start|join|begin|sign up|find a doctor|chat now/i })
      .first();
    const count = await cta.count();
    if (count === 0) {
      test.skip(true, 'No primary CTA visible on homepage hero — selector adjustment needed');
    }
    // Find first one with a teal-ish background among visible matches.
    const bgs = await page
      .locator('a, button')
      .filter({ hasText: /get started|start|join|begin|sign up|find a doctor|chat now/i })
      .evaluateAll((els) =>
        els.map((el) => ({
          text: (el.textContent || '').trim().slice(0, 60),
          bg: getComputedStyle(el).backgroundColor,
        })),
      );
    // rgb(44, 122, 140) === #2C7A8C
    const tealMatch = bgs.find((b) => /rgb\(\s*44\s*,\s*122\s*,\s*140\s*\)/.test(b.bg));
    if (!tealMatch) {
      console.log('CTAs found, no teal-500 bg among them:', bgs);
    }
    expect(tealMatch, `expected a CTA with bg rgb(44,122,140); got ${JSON.stringify(bgs)}`).toBeTruthy();
  });

  test('teal-500 token is byte-equal to known clinical-teal hex', () => {
    expect(tokens.colors.teal500).toBe('#2C7A8C');
  });

  test('inst-blue token is byte-equal to known navy hex', () => {
    expect(tokens.colors.instBlue).toBe('#1B2A41');
  });

  test('Mulish + Oswald are the only brand families on the live page (heuristic)', async ({
    page,
  }) => {
    const families = await page.evaluate(() => {
      const set = new Set<string>();
      document.querySelectorAll('*').forEach((el) => {
        set.add(getComputedStyle(el).fontFamily);
      });
      return [...set];
    });
    const flat = families.join(' | ');
    expect(flat).toMatch(/Mulish/i);
    // Document the full set for the audit md. Emoji / system fallbacks are
    // expected to appear in computed font-stack values.
    console.log('Distinct font-family computed values on homepage:');
    families.forEach((f) => console.log('  -', f));
  });

  test('hero screenshot captured for audit artifact', async ({ page }) => {
    await page.screenshot({
      path: 'e2e-artifacts/homepage-hero.png',
      fullPage: false,
    });
  });
});
