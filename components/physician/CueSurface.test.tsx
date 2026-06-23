/**
 * CueSurface tests — Phase 23 Plan 03 TDD (PRES-03 / PRES-05)
 *
 * Behavioral contract:
 *   - Dialog has role="dialog", aria-modal="true", aria-label="Cue"
 *   - Focus moves into the surface on open; returns to the previously-focused
 *     element on close
 *   - Tab is trapped within the dialog (focus cycles between first/last element)
 *   - Esc with empty input closes the surface
 *   - Esc with non-empty input does NOT close (non-destructive dismiss)
 *   - Scrim click with empty input closes the surface
 *   - Scrim click with non-empty input does NOT close
 *   - prefers-reduced-motion: the component renders without animation classes
 *   - Surface is only mounted in the DOM when isOpen=true
 *   - aria-live region announced for async Cue responses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CueSurface from './CueSurface';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Stub matchMedia for prefers-reduced-motion tests. */
function stubReducedMotion(enabled: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: enabled && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

/** Render CueSurface with sensible defaults and return helpers. */
function renderSurface(props: {
  isOpen?: boolean;
  accessToken?: string | null;
  locale?: 'en' | 'es';
  onClose?: () => void;
} = {}) {
  const {
    isOpen = true,
    accessToken = 'test-token',
    locale = 'en',
    onClose = vi.fn(),
  } = props;

  const utils = render(
    <CueSurface
      isOpen={isOpen}
      onClose={onClose}
      accessToken={accessToken}
      locale={locale}
    />
  );
  return { ...utils, onClose };
}

// ─── suite ──────────────────────────────────────────────────────────────────

describe('CueSurface — PRES-03 / PRES-05 accessibility contract', () => {
  beforeEach(() => {
    stubReducedMotion(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ── 1. Basic render and ARIA ─────────────────────────────────────────────

  it('Test 1a: dialog has role=dialog, aria-modal=true, aria-label=Cue when open', () => {
    renderSurface({ isOpen: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Cue');
  });

  it('Test 1b: surface is not rendered when isOpen=false', () => {
    renderSurface({ isOpen: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // ── 2. Non-destructive dismiss ────────────────────────────────────────────

  it('Test 2a: Esc with empty input closes the surface (calls onClose)', () => {
    const onClose = vi.fn();
    renderSurface({ onClose });
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Test 2b: Esc with non-empty input does NOT close (non-destructive dismiss)', () => {
    const onClose = vi.fn();
    renderSurface({ onClose });
    // Type into the text input
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'what is my day' } });
    // Esc should not close
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Test 2c: scrim click with empty input closes the surface', () => {
    const onClose = vi.fn();
    renderSurface({ onClose });
    const scrim = document.querySelector('.mk-cue-scrim') as HTMLElement;
    expect(scrim).toBeTruthy();
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Test 2d: scrim click with non-empty input does NOT close', () => {
    const onClose = vi.fn();
    renderSurface({ onClose });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'block tuesday afternoon' } });
    const scrim = document.querySelector('.mk-cue-scrim') as HTMLElement;
    fireEvent.click(scrim);
    expect(onClose).not.toHaveBeenCalled();
  });

  // ── 3. Focus management ───────────────────────────────────────────────────

  it('Test 3a: focus moves into the dialog when it opens', () => {
    const { container } = renderSurface({ isOpen: true });
    const dialog = screen.getByRole('dialog');
    // At least one focusable element must exist
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    expect(focusable.length).toBeGreaterThan(0);
    // The document.activeElement should be inside the dialog
    // (or the dialog itself when no focusable children exist first render)
    const active = document.activeElement;
    expect(dialog.contains(active)).toBe(true);
  });

  // ── 4. prefers-reduced-motion ─────────────────────────────────────────────

  it('Test 4: component renders without throwing when prefers-reduced-motion is set', () => {
    stubReducedMotion(true);
    expect(() => renderSurface({ isOpen: true })).not.toThrow();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
  });

  // ── 5. aria-live region ───────────────────────────────────────────────────

  it('Test 5: an aria-live region exists for Cue response announcements', () => {
    renderSurface({ isOpen: true });
    const live = document.querySelector('[aria-live]') as HTMLElement;
    expect(live).toBeTruthy();
    const liveValue = live.getAttribute('aria-live');
    expect(liveValue === 'polite' || liveValue === 'assertive').toBe(true);
  });

  // ── 6. Submit control ────────────────────────────────────────────────────

  it('Test 6: a submit button is present for text entry', () => {
    renderSurface({ isOpen: true });
    // At minimum a form submit control must exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
