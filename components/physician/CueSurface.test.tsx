/**
 * CueSurface tests — Phase 23 voice port + Cue Console pivot (docked panel).
 *
 * Behavioral contract (preserved across the modal→docked-console rewrite):
 *   - Surface has role="dialog", aria-label="Cue" (now a non-modal right dock —
 *     no aria-modal, no scrim; the doctor keeps their screen)
 *   - Focus moves into the surface on open; returns to the previously-focused
 *     element on close
 *   - Esc with empty input closes the surface (non-destructive dismiss)
 *   - Esc with non-empty input does NOT close
 *   - The close (×) button closes the dock
 *   - prefers-reduced-motion: the component renders without throwing
 *   - Surface is only mounted in the DOM when isOpen=true
 *   - aria-live region announced for async Cue responses
 *   - D-03 sentinel split + Confirm/Cancel confirm-before-write card
 *   - Thinking trace: \x1f tool-event frames render as cascading steps
 *
 * Test environment note: in jsdom diagnoseVADSupport() returns ok:false (no
 * AudioWorklet / getUserMedia / secure context), so voiceSupported is false and
 * the surface renders the always-on text-fallback path (CSS CueOrb + <input>).
 * The 3D orb (CueOrb3D) is dynamic({ ssr:false }) and never imported here, and
 * the VAD continuous-flow loop is not exercised in jsdom (verified live + Task 9).
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
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

  it('Test 1a: surface has role=dialog, aria-label=Cue when open (non-modal dock)', () => {
    renderSurface({ isOpen: true });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-label')).toBe('Cue');
    // The docked console is NOT modal — the doctor keeps using their screen.
    expect(dialog.getAttribute('aria-modal')).not.toBe('true');
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

  it('Test 2c: the close (×) button closes the dock', () => {
    const onClose = vi.fn();
    renderSurface({ onClose });
    // The docked console has no scrim; the close button dismisses it.
    expect(document.querySelector('.mk-cue-scrim')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── 3. Focus management ───────────────────────────────────────────────────

  it('Test 3a: focus moves into the dialog when it opens', () => {
    renderSurface({ isOpen: true });
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

  // ── 6. Text fallback (no Send button in the dark-stage footer) ─────────────

  it('Test 6: the always-on text fallback input is present (Enter-to-submit, no Send button)', () => {
    renderSurface({ isOpen: true });
    // The dark-stage footer is a single <input> inside a <form> — submitted on
    // Enter, with no dedicated Send button (matches the approved cue-stage mock).
    const input = screen.getByRole('textbox');
    expect(input).toBeTruthy();
    expect(input.closest('form')).toBeTruthy();
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

    // Route by URL — the dock's Phase-25 aviso effect also fetches on open,
    // so order-dependent mockResolvedValueOnce chains get eaten by it.
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/cue/chat') {
        return { ok: true, text: async () => blockBody };
      }
      if (url === '/api/cue/calendar/confirm-write') {
        return {
          ok: true,
          json: async () => ({ blocked: true, uid: 'cue-fixed-uid-1' }),
          text: async () => '',
        };
      }
      return { ok: false, text: async () => '', json: async () => ({}) }; // aviso no-op
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', { randomUUID: () => 'tok-fixed-uuid' });

    render(
      <CueSurface isOpen onClose={vi.fn()} accessToken="tok" locale="en" />
    );

    // Submit a message → triggers /api/cue/chat
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

    const callsTo = (target: string) =>
      fetchMock.mock.calls.filter((c) => c[0] === target);
    await waitFor(() => {
      expect(callsTo('/api/cue/calendar/confirm-write').length).toBe(1);
    });
    // The chat call routes through the same-origin BFF proxy (NextAuth-JWT auth),
    // never straight to FastAPI with a Supabase token (would 401 in prod).
    expect(callsTo('/api/cue/chat').length).toBe(1);

    const writeCall = callsTo('/api/cue/calendar/confirm-write')[0];
    const sentBody = JSON.parse(writeCall[1].body);
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

    // Route by URL (see the Confirm test above — aviso effect eats ordered mocks).
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/api/cue/chat') {
        return { ok: true, text: async () => clearBody };
      }
      return { ok: false, text: async () => '', json: async () => ({}) }; // aviso no-op
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

    // Card is gone and NO write call was made (only the initial /api/cue/chat).
    await waitFor(() => {
      expect(screen.queryByText('Cancel')).toBeNull();
    });
    const writeCalls = fetchMock.mock.calls.filter(
      (c) => c[0] === '/api/cue/calendar/confirm-write'
    );
    expect(writeCalls.length).toBe(0);
    expect(
      fetchMock.mock.calls.filter((c) => c[0] === '/api/cue/chat').length
    ).toBe(1);
  });
});

// ─── Phase 23 voice port — messages[] chat shape + text fallback ──────────────

describe('CueSurface — Phase 23 voice port', () => {
  beforeEach(() => {
    stubReducedMotion(false);
    // jsdom: no getUserMedia/MediaRecorder/WebGL → unsupported → text-fallback path.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, text: async () => 'Listo.', headers: new Headers(),
    } as Response)));
  });
  afterEach(() => { vi.restoreAllMocks(); cleanup(); });

  it('posts the messages[] shape (not {message}) to /api/cue/chat on text submit', async () => {
    render(<CueSurface isOpen onClose={() => {}} accessToken="t" locale="es" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hola' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/cue/chat', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"messages"'),
    })));
    const fetchMock = fetch as unknown as Mock;
    const chatCall = fetchMock.mock.calls.find((c: unknown[]) => c[0] === '/api/cue/chat')!;
    const body = JSON.parse((chatCall[1] as RequestInit).body as string);
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'hola' });
  });

  it('still renders role="dialog" with aria-label Cue and a text fallback input', () => {
    render(<CueSurface isOpen onClose={() => {}} accessToken="t" locale="en" />);
    expect(screen.getByRole('dialog', { name: 'Cue' })).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });
});

// ─── Cue Console — cascading thinking trace (\x1f tool-event frames) ───────────

describe('CueSurface — thinking trace', () => {
  beforeEach(() => stubReducedMotion(false));
  afterEach(() => { vi.restoreAllMocks(); cleanup(); });

  const US = '\x1f';

  /** A streaming fetch mock whose /api/cue/chat body yields the given chunks. */
  function streamFetch(chunks: string[]) {
    const enc = new TextEncoder();
    let i = 0;
    return vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: async () =>
            i < chunks.length
              ? { done: false, value: enc.encode(chunks[i++]) }
              : { done: true, value: undefined },
          cancel: async () => {},
        }),
      },
      text: async () => chunks.join(''),
    }));
  }

  it('renders a cascading step (localized label + ✓ count) from tool-event frames', async () => {
    const start = US + JSON.stringify({ phase: 'start', tool: 'inbox_read_recent' }) + '\n';
    const end = US + JSON.stringify({ phase: 'end', tool: 'inbox_read_recent', ok: true, items: 3 }) + '\n';
    vi.stubGlobal('fetch', streamFetch([start, 'Tienes ', end, '3 mensajes nuevos.']));

    render(<CueSurface isOpen onClose={vi.fn()} accessToken="t" locale="es" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '¿qué hay en mi bandeja?' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    // The trace step renders with the Spanish label for inbox_read_recent…
    expect(await screen.findByText('leyendo tu bandeja')).toBeTruthy();
    // …and resolves to a checked count once the end frame arrives.
    await waitFor(() => expect(screen.getByText(/3\s+nuevos/)).toBeTruthy());
  });
});

// ─── history scrollback ──────────────────────────────────────────────────────

describe('CueSurface — history scrollback', () => {
  beforeEach(() => stubReducedMotion(false));
  afterEach(() => { vi.restoreAllMocks(); cleanup(); });

  /** Streaming fetch mock: each /api/cue/chat call streams the next turn's
   *  chunks; other endpoints (memory aviso) get a quiet 404. */
  function multiTurnFetch(turns: string[][]) {
    const enc = new TextEncoder();
    let call = 0;
    return vi.fn(async (url: unknown) => {
      if (!String(url).includes('/api/cue/chat')) {
        return { ok: false, status: 404, json: async () => ({}) };
      }
      const chunks = turns[Math.min(call++, turns.length - 1)];
      let i = 0;
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: async () =>
              i < chunks.length
                ? { done: false, value: enc.encode(chunks[i++]) }
                : { done: true, value: undefined },
            cancel: async () => {},
          }),
        },
        text: async () => chunks.join(''),
      };
    });
  }

  it('keeps the previous exchange visible when a new turn starts', async () => {
    vi.stubGlobal('fetch', multiTurnFetch([['First answer.'], ['Second answer.']]));
    render(<CueSurface isOpen onClose={vi.fn()} accessToken="t" locale="en" />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'first question' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByText('First answer.')).toBeTruthy();

    fireEvent.change(input, { target: { value: 'second question' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByText('Second answer.')).toBeTruthy();

    // Scrollback: the first exchange is STILL on screen above the live turn…
    expect(screen.getByText('first question')).toBeTruthy();
    expect(screen.getByText('First answer.')).toBeTruthy();
    // …and the live turn shows the new user bubble.
    expect(screen.getByText('second question')).toBeTruthy();
  });
});

// ─── file share (defect: drop navigated the browser away) ────────────────────

describe('CueSurface — file share graceful rejection', () => {
  beforeEach(() => stubReducedMotion(false));
  afterEach(() => { vi.restoreAllMocks(); cleanup(); });

  it('a file dropped on the dock shows the honest no-files message (ES)', () => {
    render(<CueSurface isOpen onClose={vi.fn()} accessToken="t" locale="es" />);
    const dialog = screen.getByRole('dialog');
    const file = new File(['x'], 'presentacion.pptx');
    fireEvent.drop(dialog, { dataTransfer: { files: [file] } });
    expect(screen.getByText(/aún no puede recibir archivos/)).toBeTruthy();
  });

  it('a non-file drop (text drag) is ignored', () => {
    render(<CueSurface isOpen onClose={vi.fn()} accessToken="t" locale="en" />);
    const dialog = screen.getByRole('dialog');
    fireEvent.drop(dialog, { dataTransfer: { files: [] } });
    expect(screen.queryByText(/can't receive files/)).toBeNull();
  });
});

// ─── clinical decision support card (Phase 24) ────────────────────────────────

describe('CueSurface — clinical decision support card', () => {
  beforeEach(() => stubReducedMotion(false));
  afterEach(() => { vi.restoreAllMocks(); cleanup(); });

  const GS = '\x1d';

  /** A streaming fetch mock whose /api/cue/chat body yields the given chunks. */
  function streamFetch(chunks: string[]) {
    const enc = new TextEncoder();
    let i = 0;
    return vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: async () =>
            i < chunks.length
              ? { done: false, value: enc.encode(chunks[i++]) }
              : { done: true, value: undefined },
          cancel: async () => {},
        }),
      },
      text: async () => chunks.join(''),
    }));
  }

  const cardFrame =
    GS +
    JSON.stringify({
      card: {
        kind: 'clinical_support',
        considerations: [
          {
            condition: 'Acute viral pharyngitis',
            rationale: 'Sore throat with low-grade fever',
            confidence: 'HIGH',
            distinguishing_factors: 'Centor criteria; rapid strep antigen',
          },
        ],
        red_flags: ['Difficulty breathing or drooling (possible epiglottitis)'],
        disclaimer: 'Clinical decision support only — not a diagnosis.',
      },
    }) +
    '\n';

  it('renders the card off a \\x1d frame (condition, red flag, disclaimer) + the narration after it', async () => {
    vi.stubGlobal('fetch', streamFetch([cardFrame, 'Quick walkthrough below.']));

    render(<CueSurface isOpen onClose={vi.fn()} accessToken="t" locale="en" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'decision support: sore throat, fever 3 days' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    // The structured card renders off the parsed payload (never model prose).
    expect(await screen.findByText('Acute viral pharyngitis')).toBeTruthy();
    expect(screen.getByText(/Difficulty breathing/)).toBeTruthy();
    // The on-card disclaimer (from the payload) DENIES being a diagnosis.
    expect(screen.getByText(/not a diagnosis/i)).toBeTruthy();
    // The card is additive — Cue's narration after it is still shown.
    expect(screen.getByText('Quick walkthrough below.')).toBeTruthy();
  });

  it('shows the input-side PHI / de-identification notice', () => {
    // The dock's aviso effect fetches on open — return a thenable so it no-ops.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    render(<CueSurface isOpen onClose={vi.fn()} accessToken="t" locale="en" />);
    expect(screen.getByText(/de-identified information only/i)).toBeTruthy();
  });

  it('offers Email + Save-as-PDF actions and posts the card to the email endpoint', async () => {
    const fetchMock = streamFetch([cardFrame, 'Walkthrough.']);
    vi.stubGlobal('fetch', fetchMock);

    render(<CueSurface isOpen onClose={vi.fn()} accessToken="t" locale="en" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'support: sore throat' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    const emailBtn = await screen.findByText('Email to me');
    expect(screen.getByText('Save as PDF')).toBeTruthy();

    fireEvent.click(emailBtn);
    await waitFor(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const urls = (fetchMock as any).mock.calls.map((c: any[]) => c[0]);
      expect(urls).toContain('/api/cue/clinical-support/email');
    });
  });
});
