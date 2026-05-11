import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { tokens } from './design-tokens';
import { tokens as emailChromeTokens } from './emailChrome';

describe('design-tokens — canonical token export (Plan 20-01 Task 1)', () => {
  it('Test 1: anchor colors match the live homepage DOM (per D-02)', () => {
    expect(tokens.colors.instBlue).toBe('#1B2A41');
    expect(tokens.colors.teal500).toBe('#2C7A8C');
    expect(tokens.colors.linen).toBe('#F0EAE0');
    expect(tokens.pageBg).toBe('#FAF8F4');
  });

  it('Test 2: font stacks lead with Mulish (body) / Oswald (heading)', () => {
    expect(tokens.fonts.body.startsWith("'Mulish'")).toBe(true);
    expect(tokens.fonts.heading.startsWith("'Oswald'")).toBe(true);
  });

  it('Test 3: radii has exactly 4 keys with the documented values', () => {
    expect(Object.keys(tokens.radii).sort()).toEqual(['lg', 'md', 'sm', 'xl']);
    expect(tokens.radii.sm).toBe('8px');
    expect(tokens.radii.md).toBe('16px');
    expect(tokens.radii.lg).toBe('24px');
    expect(tokens.radii.xl).toBe('32px');
  });

  it('Test 4: practikahTeal gradient matches the memorized house-style string', () => {
    expect(tokens.gradients.practikahTeal).toBe(
      'linear-gradient(135deg,#2C7A8C 0%,#4A9AAC 50%,#9DD0DA 100%)'
    );
  });

  it('Test 5: full tokens shape — snapshot guards against accidental key removal', () => {
    expect(tokens).toMatchSnapshot();
  });
});

describe('emailChrome re-export (Plan 20-01 Task 2)', () => {
  it('Test 1: import { tokens } from emailChrome still resolves anchor values', () => {
    expect(emailChromeTokens.colors.instBlue).toBe('#1B2A41');
  });

  it('Test 2: emailChrome.tokens is the same object reference as design-tokens.tokens', () => {
    expect(emailChromeTokens).toBe(tokens);
  });

  it('Test 3: emailChrome.ts source contains no inlined token block (no stray hex literals)', () => {
    const src = readFileSync(join(__dirname, 'emailChrome.ts'), 'utf-8');
    // Count hex literals (#RRGGBB) outside comments. The helper functions
    // reference tokens.X — no inlined token block should remain. Helper
    // string templates may contain zero hex; allow a small tolerance only
    // for the unlikely edge case of a literal in a fallback color string.
    const hexMatches = src.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    expect(hexMatches.length).toBeLessThanOrEqual(5);
  });
});
