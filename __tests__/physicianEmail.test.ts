/**
 * Doctor-journey fix wave (2026-07): welcome-email refresh + rejection email
 * + stalled-onboarding nudge.
 *
 * Guards the P0s from the journey audit:
 *  - Honorific correctness: Dr./Dra. from physicians.title, NEVER guessed;
 *    gendered "Bienvenido/Bienvenida"; neutral greeting when no title on file.
 *  - Honest verification timeline (2-5 business days, not "24-48 hours").
 *  - No legacy magic-link/"create password" block (Option A: doctors already
 *    sign in via /chat).
 *  - Rejection email includes the admin reason (HTML-escaped) + a path back.
 *  - Nudge endpoint: fail-closed auth, dark until STALLED_NUDGE_ENABLED.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Capture every Resend API call's JSON payload
const sentPayloads: Array<{ subject: string; html: string; text: string; to: string }> = [];
const fetchMock = vi.fn(async (_url: string, init?: { body?: string }) => {
  sentPayloads.push(JSON.parse(init?.body ?? '{}'));
  return {
    ok: true,
    json: async () => ({ id: 'resend-test-id' }),
  } as Response;
});

vi.stubGlobal('fetch', fetchMock);

import {
  sendPhysicianWelcomeEmail,
  sendPhysicianRejectionEmail,
  sendOnboardingNudgeEmail,
} from '../lib/physicianEmail';

beforeEach(() => {
  sentPayloads.length = 0;
  fetchMock.mockClear();
  vi.stubEnv('RESEND_API_KEY', 're_test_key');
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://medikah.health');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const baseWelcome = {
  physicianId: 'phys-1',
  fullName: 'María García Hernández',
  email: 'maria@example.com',
  primarySpecialty: 'Cardiología',
  languages: ['es', 'en'],
};

describe('sendPhysicianWelcomeEmail — honorific + honest copy', () => {
  it('ES + Dra: gendered greeting with Dra. and last-token surname', async () => {
    await sendPhysicianWelcomeEmail({ ...baseWelcome, title: 'Dra', lang: 'es' });
    const [msg] = sentPayloads;
    expect(msg.subject).toContain('Bienvenida a Medikah, Dra. Hernández');
    expect(msg.html).toContain('¡Bienvenida a Medikah, Dra. Hernández!');
    expect(msg.html).not.toContain('Dr. Hernández');
  });

  it('ES + Dr: gendered greeting with Dr.', async () => {
    await sendPhysicianWelcomeEmail({
      ...baseWelcome,
      fullName: 'Juan López',
      title: 'Dr',
      lang: 'es',
    });
    const [msg] = sentPayloads;
    expect(msg.subject).toContain('Bienvenido a Medikah, Dr. López');
    expect(msg.html).toContain('¡Bienvenido a Medikah, Dr. López!');
  });

  it('ES + no title: neutral greeting, full name, no guessed honorific', async () => {
    await sendPhysicianWelcomeEmail({ ...baseWelcome, title: null, lang: 'es' });
    const [msg] = sentPayloads;
    expect(msg.subject).toContain('Le damos la bienvenida a Medikah');
    expect(msg.html).toContain('¡Le damos la bienvenida a Medikah, María García Hernández!');
    expect(msg.html).not.toContain('Dr. ');
    expect(msg.html).not.toContain('Dra. ');
  });

  it('EN + Dra: keeps the captured honorific verbatim', async () => {
    await sendPhysicianWelcomeEmail({ ...baseWelcome, title: 'Dra', lang: 'en' });
    const [msg] = sentPayloads;
    expect(msg.subject).toContain('Welcome to Medikah, Dra. Hernández');
  });

  it('states the honest 2-5 business day timeline, never 24-48 hours', async () => {
    await sendPhysicianWelcomeEmail({ ...baseWelcome, title: 'Dra', lang: 'es' });
    await sendPhysicianWelcomeEmail({ ...baseWelcome, title: 'Dra', lang: 'en' });
    const [es, en] = sentPayloads;
    expect(es.html).toContain('2 a 5 días hábiles');
    expect(en.html).toContain('2 to 5 business days');
    for (const msg of [es, en]) {
      expect(msg.html).not.toContain('24-48');
      expect(msg.text).not.toContain('24-48');
    }
  });

  it('mentions the @medikah.health activation step', async () => {
    await sendPhysicianWelcomeEmail({ ...baseWelcome, title: 'Dra', lang: 'es' });
    const [msg] = sentPayloads;
    expect(msg.html).toContain('@medikah.health');
  });

  it('links the /chat gateway instead of the legacy password-setup magic link', async () => {
    await sendPhysicianWelcomeEmail({ ...baseWelcome, title: 'Dra', lang: 'es' });
    const [msg] = sentPayloads;
    expect(msg.html).toContain('https://medikah.health/es/chat');
    expect(msg.html).not.toContain('/physicians/setup');
    expect(msg.text).not.toContain('/physicians/setup');
    expect(msg.html.toLowerCase()).not.toContain('contraseña');
  });
});

describe('sendPhysicianRejectionEmail', () => {
  it('ES + Dra: Estimada greeting, reason included, resubmission path present', async () => {
    await sendPhysicianRejectionEmail({
      fullName: 'María García Hernández',
      email: 'maria@example.com',
      title: 'Dra',
      reason: 'La constancia de cédula no es legible',
      lang: 'es',
    });
    const [msg] = sentPayloads;
    expect(msg.subject).toBe('Actualización sobre su solicitud en Medikah');
    expect(msg.html).toContain('Estimada Dra. Hernández:');
    expect(msg.html).toContain('La constancia de cédula no es legible');
    expect(msg.html).toContain('doctors@medikah.health');
    expect(msg.html).toContain('Esto no es definitivo');
  });

  it('escapes HTML in the admin-provided reason', async () => {
    await sendPhysicianRejectionEmail({
      fullName: 'Juan López',
      email: 'juan@example.com',
      title: 'Dr',
      reason: '<script>alert("x")</script>',
      lang: 'en',
    });
    const [msg] = sentPayloads;
    expect(msg.html).not.toContain('<script>');
    expect(msg.html).toContain('&lt;script&gt;');
  });

  it('omits the reason block when no reason given; neutral greeting without title', async () => {
    await sendPhysicianRejectionEmail({
      fullName: 'Alex Rivera',
      email: 'alex@example.com',
      title: null,
      lang: 'es',
    });
    const [msg] = sentPayloads;
    expect(msg.html).toContain('Estimado(a) Alex Rivera:');
    expect(msg.html).not.toContain('Motivo de la revisión');
  });
});

describe('sendOnboardingNudgeEmail', () => {
  it('defaults to Spanish and links the ES onboarding route', async () => {
    await sendOnboardingNudgeEmail({ email: 'doc@example.com' });
    const [msg] = sentPayloads;
    expect(msg.subject).toBe('Su registro en Medikah está casi listo');
    expect(msg.html).toContain('https://medikah.health/es/physicians/onboard');
  });

  it('EN variant links the default-locale onboarding route', async () => {
    await sendOnboardingNudgeEmail({ email: 'doc@example.com', lang: 'en' });
    const [msg] = sentPayloads;
    expect(msg.subject).toBe('Your Medikah registration is almost complete');
    expect(msg.html).toContain('https://medikah.health/physicians/onboard');
    expect(msg.html).not.toContain('/es/physicians/onboard');
  });
});
