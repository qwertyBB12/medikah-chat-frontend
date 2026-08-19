/**
 * BFF gate tests for POST /api/cue/appointments/confirm-write.
 *
 * This proxy is the browser's only door to the ONLY appointment mutation route.
 * What is pinned here is the envelope, not the business logic (that lives in
 * FastAPI and is tested there): the method gate, the session gate, the minted
 * HS256 bearer, the upstream path, and the error mapping — the same contract the
 * calendar sibling has carried since Plan 23-04.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const getServerSession = vi.fn();
const getToken = vi.fn();
const mintCueBackendToken = vi.fn();
const applyCueBffCors = vi.fn((..._a: unknown[]) => false);

vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
vi.mock('next-auth/jwt', () => ({ getToken: (...a: unknown[]) => getToken(...a) }));
// The real [...nextauth] module pulls in supabase + provider wiring at import
// time; the handler only needs the options object it exports.
vi.mock('../pages/api/auth/[...nextauth]', () => ({ authOptions: {}, default: () => {} }));
vi.mock('../lib/cue/bffCors', () => ({ applyCueBffCors: (...a: unknown[]) => applyCueBffCors(...a) }));
vi.mock('../lib/cue/backendToken', () => ({
  mintCueBackendToken: (...a: unknown[]) => mintCueBackendToken(...a),
}));

import handler from '../pages/api/cue/appointments/confirm-write';

function mockRes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {};
  res.statusCode = 200;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn(() => res);
  res.setHeader = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
}

const BODY = {
  action: 'create',
  patient_name: 'Ana T.',
  start_iso: '2026-07-01T09:00:00',
  end_iso: '2026-07-01T09:30:00',
  idempotency_token: 'tok-1',
  locale: 'es',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function call(over: Record<string, unknown> = {}): any {
  return { method: 'POST', body: BODY, headers: {}, ...over };
}

/** Happy-path session + token so each test only overrides what it is about. */
function authenticate() {
  getServerSession.mockResolvedValue({ user: { email: 'dra@medikah.health' } });
  getToken.mockResolvedValue({ userId: 'u-1', role: 'physician', physician_id: 'phys-1' });
  mintCueBackendToken.mockResolvedValue('minted.jws.token');
}

describe('cue appointments confirm-write BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyCueBffCors.mockReturnValue(false);
    authenticate();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('rejects non-POST with 405 and never calls upstream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const res = mockRes();
      await handler(call({ method }), res);
      expect(res.status).toHaveBeenCalledWith(405);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops at the CORS preflight without touching the session or upstream', async () => {
    applyCueBffCors.mockReturnValue(true);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler(call({ method: 'OPTIONS' }), res);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401s with no session, and never calls upstream', async () => {
    getServerSession.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler(call(), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401s when the session token lacks userId/role', async () => {
    getToken.mockResolvedValue({ userId: undefined, role: undefined });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler(call(), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('503s when the backend token cannot be minted (no unauthenticated write)', async () => {
    mintCueBackendToken.mockRejectedValue(new Error('NEXTAUTH_SECRET missing'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler(call(), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the body to the appointments route with the minted bearer', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      json: async () => ({ created: true, appointment_id: 'appt-1', synced: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler(call(), res);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith('/cue/appointments/confirm-write')).toBe(true);
    expect(url).not.toContain('/cue/calendar/');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer minted.jws.token');
    // Body passes through verbatim; FastAPI derives identity from auth (CUE-11).
    expect(JSON.parse(String(init.body))).toEqual(BODY);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      created: true, appointment_id: 'appt-1', synced: true,
    });
  });

  it('mirrors the upstream status (a 4xx is not laundered into a success)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 400, json: async () => ({ detail: 'Invalid action' }),
    })));
    const res = mockRes();
    await handler(call({ body: { ...BODY, action: 'appointment_create' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ detail: 'Invalid action' });
  });

  it('502s when the upstream is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockRes();
    await handler(call(), res);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('never references the Supabase service-role key (source gate)', () => {
    // Same gate the calendar sibling documents: this proxy forwards ONLY the
    // physician bearer. A service-role reference here would hand the browser a
    // path to god-mode credentials.
    const src = readFileSync(
      path.join(__dirname, '..', 'pages', 'api', 'cue', 'appointments', 'confirm-write.ts'),
      'utf8',
    );
    // Match identifiers, not prose — the file's own header says the words
    // "service-role key" while promising never to use one.
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|supabaseAdmin|supabaseServer/);
  });
});
