import { describe, it, expect } from 'vitest';
import { tokens } from './design-tokens';

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
