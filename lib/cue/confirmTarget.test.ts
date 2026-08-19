/**
 * confirmTarget tests — which route a confirm card writes to, and with what body.
 *
 * Two properties matter more than the mapping itself:
 *   - BACKWARD COMPATIBILITY: a card with no `endpoint` is a pre-vertical
 *     calendar card and must behave byte-identically to before.
 *   - FAIL CLOSED: an endpoint we cannot name, or a card missing a field its
 *     action requires, must produce NO write rather than a write aimed at the
 *     other route. This is a mutation path; guessing is the wrong default.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveConfirmRoute,
  buildConfirmBody,
  isAppointmentConfirm,
  CALENDAR_CONFIRM_ROUTE,
  APPOINTMENTS_CONFIRM_ROUTE,
} from './confirmTarget';
import type { CuePendingConfirm } from './cueStream';

const APPT_ENDPOINT = '/cue/appointments/confirm-write';

/** A confirm card with sensible defaults; override per test. */
function card(over: Partial<CuePendingConfirm> = {}): CuePendingConfirm {
  return {
    kind: 'confirm',
    action: 'block',
    title: 'Blocked by Cue',
    summary: 'Block 14:00–16:00?',
    start_iso: '2026-07-01T14:00:00',
    end_iso: '2026-07-01T16:00:00',
    ...over,
  };
}

describe('resolveConfirmRoute', () => {
  it('no endpoint → the calendar route (old cards behave identically)', () => {
    expect(resolveConfirmRoute(undefined)).toBe(CALENDAR_CONFIRM_ROUTE);
    expect(resolveConfirmRoute('')).toBe(CALENDAR_CONFIRM_ROUTE);
  });

  it('appointment endpoint → the appointments BFF route', () => {
    expect(resolveConfirmRoute(APPT_ENDPOINT)).toBe(APPOINTMENTS_CONFIRM_ROUTE);
  });

  it('the explicit calendar endpoint also resolves', () => {
    expect(resolveConfirmRoute('/cue/calendar/confirm-write')).toBe(CALENDAR_CONFIRM_ROUTE);
  });

  it('an unrecognized endpoint resolves to null, never to a fallback route', () => {
    // The card rides the model-loop stream, so its endpoint is not trusted as a
    // URL. Anything off the allowlist must stop the write, not redirect it.
    for (const bad of [
      '/cue/credential',
      'https://evil.example/cue/appointments/confirm-write',
      '//evil.example/x',
      '/api/cue/appointments/confirm-write', // already-BFF path is not a card value
      '/cue/appointments/confirm-write/../../x',
    ]) {
      expect(resolveConfirmRoute(bad)).toBeNull();
    }
  });
});

describe('isAppointmentConfirm', () => {
  it('is true only for the appointments endpoint', () => {
    expect(isAppointmentConfirm({ endpoint: APPT_ENDPOINT })).toBe(true);
    expect(isAppointmentConfirm({ endpoint: undefined })).toBe(false);
    expect(isAppointmentConfirm({ endpoint: '/cue/calendar/confirm-write' })).toBe(false);
    expect(isAppointmentConfirm({ endpoint: '/nope' })).toBe(false);
  });
});

describe('buildConfirmBody — calendar cards (unchanged wire shape)', () => {
  it('block sends action/start/end/title/token/locale', () => {
    expect(buildConfirmBody(card({ action: 'block' }), 'tok-1', 'en')).toEqual({
      action: 'block',
      start_iso: '2026-07-01T14:00:00',
      end_iso: '2026-07-01T16:00:00',
      title: 'Blocked by Cue',
      idempotency_token: 'tok-1',
      locale: 'en',
    });
  });

  it('clear omits an empty title (undefined, as before)', () => {
    const body = buildConfirmBody(card({ action: 'clear', title: '' }), 'tok-2', 'es');
    expect(body).toMatchObject({ action: 'clear', idempotency_token: 'tok-2', locale: 'es' });
    expect(body?.title).toBeUndefined();
  });

  it('an appointment action on a calendar card is refused', () => {
    // No endpoint means the calendar route, which knows nothing about
    // appointment_create. Sending it would 400; better to never send it.
    expect(buildConfirmBody(card({ action: 'appointment_create' }), 'tok', 'en')).toBeNull();
  });
});

describe('buildConfirmBody — appointment cards', () => {
  it('create: translates the action and sends the minimized patient name', () => {
    // The route validates action ∈ {create, move, cancel}; the CARD carries
    // appointment_create. The translation lives here, and this is what pins it.
    const body = buildConfirmBody(
      card({
        action: 'appointment_create',
        endpoint: APPT_ENDPOINT,
        title: 'Ana T.',
        patient_name: 'Ana T.',
      }),
      'tok-create',
      'es',
    );
    expect(body).toEqual({
      action: 'create',
      patient_name: 'Ana T.',
      start_iso: '2026-07-01T14:00:00',
      end_iso: '2026-07-01T16:00:00',
      idempotency_token: 'tok-create',
      locale: 'es',
    });
  });

  it('create: falls back to the card title when patient_name is absent', () => {
    const body = buildConfirmBody(
      card({ action: 'appointment_create', endpoint: APPT_ENDPOINT, title: 'Luis M.' }),
      'tok',
      'en',
    );
    expect(body?.patient_name).toBe('Luis M.');
  });

  it('create: no name anywhere → no write', () => {
    expect(
      buildConfirmBody(
        card({ action: 'appointment_create', endpoint: APPT_ENDPOINT, title: '' }),
        'tok',
        'en',
      ),
    ).toBeNull();
  });

  it('move: sends the id and the NEW window', () => {
    const body = buildConfirmBody(
      card({
        action: 'appointment_move',
        endpoint: APPT_ENDPOINT,
        appointment_id: 'appt-9',
        start_iso: '2026-07-02T09:00:00',
        end_iso: '2026-07-02T09:30:00',
      }),
      'tok-move',
      'en',
    );
    expect(body).toEqual({
      action: 'move',
      appointment_id: 'appt-9',
      start_iso: '2026-07-02T09:00:00',
      end_iso: '2026-07-02T09:30:00',
      idempotency_token: 'tok-move',
      locale: 'en',
    });
  });

  it('cancel: sends the id alone, no window', () => {
    const body = buildConfirmBody(
      card({
        action: 'appointment_cancel',
        endpoint: APPT_ENDPOINT,
        appointment_id: 'appt-3',
      }),
      'tok-cancel',
      'es',
    );
    expect(body).toEqual({
      action: 'cancel',
      appointment_id: 'appt-3',
      idempotency_token: 'tok-cancel',
      locale: 'es',
    });
    expect(body).not.toHaveProperty('start_iso');
  });

  it('move/cancel without an appointment_id → no write', () => {
    for (const action of ['appointment_move', 'appointment_cancel'] as const) {
      expect(
        buildConfirmBody(card({ action, endpoint: APPT_ENDPOINT }), 'tok', 'en'),
      ).toBeNull();
    }
  });

  it('create/move without a window → no write', () => {
    expect(
      buildConfirmBody(
        card({
          action: 'appointment_create',
          endpoint: APPT_ENDPOINT,
          patient_name: 'Ana T.',
          start_iso: '',
          end_iso: '',
        }),
        'tok',
        'en',
      ),
    ).toBeNull();
  });

  it('never forwards a patient_contact even if a card carries one', () => {
    // The backend accepts patient_contact for a later non-model surface; a raw
    // identifier must not travel out through the model-fed confirm card.
    const body = buildConfirmBody(
      {
        ...card({
          action: 'appointment_create',
          endpoint: APPT_ENDPOINT,
          patient_name: 'Ana T.',
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ patient_contact: 'ana@example.com' } as any),
      },
      'tok',
      'en',
    );
    expect(body).not.toHaveProperty('patient_contact');
  });
});
