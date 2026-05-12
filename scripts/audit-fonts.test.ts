/**
 * Font-family conformance audit — Phase 20 Plan 20-08 Task 1 (DSGN-05).
 *
 * Scans pages/ + components/ + lib/ for every Tailwind font-* class and every
 * inline font-family declaration. Asserts:
 *
 *   1. Every font-* class is in either the new-code allowlist or the
 *      legacy-alias list (CLAUDE.md typography override).
 *   2. Every inline `font-family:` value is Mulish / Oswald / a CSS variable
 *      / a generic system fallback.
 *   3. The Wave primitive contains zero font references — pure visual chrome.
 *   4. Informational: log legacy-alias usage count (does not fail).
 *
 * NOTE on 20-04.1 pivot: `DashboardMasthead.tsx` was deleted when Plan 20-04
 * pivoted to a sidebar/mobile-header wave inside `PortalLayout.tsx`. Test 3
 * audits the Wave primitive only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

const FRONTEND_ROOT = resolve(__dirname, '..');

// New-code allowlist (CLAUDE.md typography override).
const ALLOWED_NEW = new Set([
  'font-body',
  'font-heading',
  'font-mulish',
  'font-oswald',
  'font-sans',
  'font-mono',
  'font-serif',
]);

// Backwards-compat aliases — flagged informationally, not failing.
const LEGACY_ALIASES = new Set([
  'font-dm-sans',
  'font-dm-serif',
  'font-display',
  'font-inter',
  'font-instrument',
  'font-playfair',
  'font-source',
  'font-fraunces',
]);

// Tailwind weight + style utilities that share the `font-` prefix but are not
// font-family selectors.
const FONT_WEIGHTS = new Set([
  'font-thin',
  'font-extralight',
  'font-light',
  'font-normal',
  'font-medium',
  'font-semibold',
  'font-bold',
  'font-extrabold',
  'font-black',
  // Tailwind italic helper is `italic` not `font-italic`, but be defensive.
  'font-italic',
]);

function listSrcFiles(): string[] {
  const out = execSync(
    `find pages components lib -type f \\( -name '*.tsx' -o -name '*.ts' \\) ` +
      `-not -name '*.test.*' -not -name 'audit-fonts.test.ts'`,
    { cwd: FRONTEND_ROOT, encoding: 'utf8' },
  );
  return out.split('\n').filter(Boolean);
}

describe('Font-family conformance audit (DSGN-05)', () => {
  const files = listSrcFiles();

  it('every Tailwind font-* class is in allowlist or legacy-alias list', () => {
    const violations: { file: string; cls: string }[] = [];
    for (const f of files) {
      const src = readFileSync(resolve(FRONTEND_ROOT, f), 'utf8');
      // Match `font-X` only as a Tailwind class token — must NOT be preceded
      // by `-` (CSS custom property like `--font-fraunces`) or `$` (Sass var).
      for (const m of src.matchAll(/(?<![-$a-zA-Z0-9_])font-([a-z][a-z-]*)\b/g)) {
        const cls = `font-${m[1]}`;
        if (FONT_WEIGHTS.has(cls)) continue;
        // CSS property names like `font-family:`, `font-feature-settings:`,
        // `font-variant:`, `font-size:`, `font-style:`, `font-weight:`,
        // `font-stretch:` — skip when followed by `:` (CSS property syntax).
        // We only care about Tailwind utility class tokens.
        const offset = m.index ?? 0;
        const after = src.slice(offset + cls.length, offset + cls.length + 2);
        if (after.startsWith(':')) continue;
        if (
          cls === 'font-family' ||
          cls === 'font-feature-settings' ||
          cls === 'font-variant' ||
          cls === 'font-size' ||
          cls === 'font-style' ||
          cls === 'font-weight' ||
          cls === 'font-stretch' ||
          cls === 'font-variant-numeric'
        ) {
          continue;
        }
        if (!ALLOWED_NEW.has(cls) && !LEGACY_ALIASES.has(cls)) {
          violations.push({ file: f, cls });
        }
      }
    }
    if (violations.length) {
      // eslint-disable-next-line no-console
      console.log('Font-class violations:', violations);
    }
    expect(violations).toEqual([]);
  });

  it('every inline font-family is Mulish / Oswald / CSS-variable / system fallback', () => {
    const violations: { file: string; value: string }[] = [];
    // Allowed: brand families, brand CSS vars, generic system fallbacks.
    const ALLOWED_FAMILY =
      /Mulish|Oswald|var\(--font-[a-z-]+\)|var\(--[a-z-]+\)|\$\{tokens\.fonts\.[a-zA-Z]+|\$\{[a-zA-Z_$][\w.[\]'"]*fonts?\.[a-zA-Z]+|-apple-system|BlinkMacSystemFont|Segoe UI|Roboto|Helvetica|Arial|sans-serif|serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|Apple Color Emoji|Segoe UI Emoji|Courier New|Courier|Menlo|Monaco|Consolas|Liberation Mono|inherit|initial|unset/i;
    for (const f of files) {
      const src = readFileSync(resolve(FRONTEND_ROOT, f), 'utf8');
      for (const m of src.matchAll(/font-family:\s*([^;}\n'"]+|'[^']+'|"[^"]+")/g)) {
        const v = m[1].trim();
        if (!ALLOWED_FAMILY.test(v)) {
          violations.push({ file: f, value: v });
        }
      }
    }
    if (violations.length) {
      // eslint-disable-next-line no-console
      console.log('Inline font-family violations:', violations);
    }
    expect(violations).toEqual([]);
  });

  it('Wave primitive contains zero font references (pure visual chrome)', () => {
    const wave = readFileSync(
      resolve(FRONTEND_ROOT, 'components/shared/practikah/Wave.tsx'),
      'utf8',
    );
    expect(wave).not.toMatch(/font-family/);
    expect(wave).not.toMatch(/\bfont-(body|heading|mulish|oswald|sans|display|dm-sans|dm-serif)\b/);
  });

  it('reports legacy-alias usage count (informational baseline)', () => {
    let count = 0;
    const breakdown: Record<string, number> = {};
    for (const f of files) {
      const src = readFileSync(resolve(FRONTEND_ROOT, f), 'utf8');
      for (const cls of LEGACY_ALIASES) {
        const matches = src.match(new RegExp(`\\b${cls}\\b`, 'g')) || [];
        if (matches.length) {
          count += matches.length;
          breakdown[cls] = (breakdown[cls] ?? 0) + matches.length;
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `Legacy font-alias usage count: ${count} (informational; CLAUDE.md backwards-compat allowed)`,
      breakdown,
    );
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
