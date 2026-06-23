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
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import CueSurface, { splitCueStream } from './CueSurface';

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

// ─── D-03 confirm-before-write (Plan 23-04) ───────────────────────────────────

describe('CueSurface — D-03 sentinel split + confirm card', () => {
  beforeEach(() => {
    stubReducedMotion(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const SENTINEL = '\x1e';

  it('splitCueStream: returns null pendingConfirm for a plain-text body', () => {
    const { text, pendingConfirm } = splitCueStream('Just my schedule for Monday.');
    expect(text).toBe('Just my schedule for Monday.');
    expect(pendingConfirm).toBeNull();
  });

  it('splitCueStream: parses pending_confirm from the U+001E sentinel line', () => {
    const body =
      'Reasoning text' +
      SENTINEL +
      JSON.stringify({
        pending_confirm: {
          kind: 'confirm',
          action: 'block',
          title: 'Blocked by Cue',
          summary: 'Block 14:00–16:00?',
          start_iso: '2026-07-01T14:00:00+00:00',
          end_iso: '2026-07-01T16:00:00+00:00',
        },
      }) +
      '\n';
    const { text, pendingConfirm } = splitCueStream(body);
    expect(text).toBe('Reasoning text');
    expect(pendingConfirm).not.toBeNull();
    expect(pendingConfirm?.kind).toBe('confirm');
    expect(pendingConfirm?.action).toBe('block');
  });

  it('splitCueStream: a prose body that merely says "confirm" yields no card', () => {
    // The confirm card must be keyed off the sentinel payload, NEVER off prose
    // (T-23-04-09). A model sentence containing the word "confirm" must NOT
    // produce a pendingConfirm.
    const { pendingConfirm } = splitCueStream(
      'I will confirm your block once you approve it.'
    );
    expect(pendingConfirm).toBeNull();
  });

  it('renders a Confirm/Cancel card off the parsed sentinel and POSTs to confirm-write on Confirm', async () => {
    const blockBody =
      '' +
      SENTINEL +
      JSON.stringify({
        pending_confirm: {
          kind: 'confirm',
          action: 'block',
          title: 'Blocked by Cue',
          summary: 'Block 14:00–16:00 on 2026-07-01?',
          start_iso: '2026-07-01T14:00:00+00:00',
          end_iso: '2026-07-01T16:00:00+00:00',
        },
      }) +
      '\n';

    const fetchMock = vi
      .fn()
      // 1st call: /cue/chat → returns the sentinel body
      .mockResolvedValueOnce({
        ok: true,
        text: async () => blockBody,
      })
      // 2nd call: /api/cue/calendar/confirm-write → returns the write result
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ blocked: true, uid: 'cue-fixed-uid-1' }),
        text: async () => '',
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', { randomUUID: () => 'tok-fixed-uuid' });

    render(
      <CueSurface isOpen onClose={vi.fn()} accessToken="tok" locale="en" />
    );

    // Submit a message → triggers /cue/chat
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'block 2-4pm tomorrow' } });
    const form = input.closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    // The confirm card appears (off the parsed payload).
    const confirmBtn = await screen.findByText('Confirm');
    expect(confirmBtn).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();

    // Click Confirm → POSTs to /api/cue/calendar/confirm-write.
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    // The chat call routes through the same-origin BFF proxy (NextAuth-JWT auth),
    // never straight to FastAPI with a Supabase token (would 401 in prod).
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall[0]).toBe('/api/cue/chat');

    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall[0]).toBe('/api/cue/calendar/confirm-write');
    const sentBody = JSON.parse(secondCall[1].body);
    expect(sentBody.action).toBe('block');
    expect(sentBody.idempotency_token).toBe('tok-fixed-uuid');
    expect(sentBody.start_iso).toBe('2026-07-01T14:00:00+00:00');
  });

  it('Cancel dismisses the card and writes nothing', async () => {
    const clearBody =
      '' +
      SENTINEL +
      JSON.stringify({
        pending_confirm: {
          kind: 'confirm',
          action: 'clear',
          title: '',
          summary: 'Clear Cue blocks 09:00–17:00?',
          start_iso: '2026-07-01T09:00:00+00:00',
          end_iso: '2026-07-01T17:00:00+00:00',
        },
      }) +
      '\n';

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => clearBody,
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', { randomUUID: () => 'tok-clear-uuid' });

    render(
      <CueSurface isOpen onClose={vi.fn()} accessToken="tok" locale="en" />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'clear my morning' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    const cancelBtn = await screen.findByText('Cancel');
    fireEvent.click(cancelBtn);

    // Card is gone and NO write call was made (only the initial /cue/chat).
    await waitFor(() => {
      expect(screen.queryByText('Cancel')).toBeNull();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
