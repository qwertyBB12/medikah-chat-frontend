/**
 * BFF tests: POST /api/cue/clinical-support/email (Phase 24 / Slice 3).
 *
 * The summary emails to the doctor's OWN @medikah.health mailbox (resolved
 * server-side, never from the body). Guards: method, auth, payload validity,
 * mailbox presence, and the Resend send shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getServerSession = vi.fn();
const getToken = vi.fn();

vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
vi.mock('next-auth/jwt', () => ({ getToken: (...a: unknown[]) => getToken(...a) }));
vi.mock('../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let physicianRow: any = { id: 'phys-1', full_name: 'García', title: 'Dra' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let workspaceRow: any = { mailbox_address: 'dra-garcia@medikah.health' };

vi.mock('../lib/supabaseServer', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        ilike: () => chain,
        maybeSingle: async () => ({
          data:
            table === 'physicians'
              ? physicianRow
              : table === 'physician_workspace_accounts'
                ? workspaceRow
                : null,
        }),
      };
      return chain;
    },
  },
}));

import handler from '../pages/api/cue/clinical-support/email';

function mockRes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = vi.fn((c: number) => { res.statusCode = c; return res; });
  res.json = vi.fn((b: unknown) => { res.body = b; return res; });
  res.setHeader = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
}

const CARD = {
  kind: 'clinical_support',
  considerations: [
    { condition: 'X', rationale: 'r', confidence: 'HIGH', distinguishing_factors: 'd' },
  ],
  red_flags: ['flag'],
  disclaimer: 'Clinical decision support only — not a diagnosis.',
};

describe('POST /api/cue/clinical-support/email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    physicianRow = { id: 'phys-1', full_name: 'García', title: 'Dra' };
    workspaceRow = { mailbox_address: 'dra-garcia@medikah.health' };
    process.env.RESEND_API_KEY = 'test-key';
    getServerSession.mockResolvedValue({ user: { email: 'dra@gmail.com' } });
    getToken.mockResolvedValue({ physician_id: 'phys-1' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ id: 'email-1' }) })));
  });

  it('405s non-POST', async () => {
    const res = mockRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler({ method: 'GET' } as any, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('401s when unauthenticated', async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = mockRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler({ method: 'POST', body: { card: CARD, locale: 'es' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('400s on an invalid card payload', async () => {
    const res = mockRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler({ method: 'POST', body: { card: { kind: 'nope' }, locale: 'es' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('409s when the doctor has no Medikah mailbox', async () => {
    workspaceRow = { mailbox_address: null };
    const res = mockRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler({ method: 'POST', body: { card: CARD, locale: 'es' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the branded summary to the doctor\'s own mailbox via Resend', async () => {
    const res = mockRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler({ method: 'POST', body: { card: CARD, locale: 'es' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({ sent: true, to: 'dra-garcia@medikah.health' });

    expect(fetch).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [url, opts] = (fetch as any).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const sent = JSON.parse(opts.body);
    expect(sent.to).toBe('dra-garcia@medikah.health'); // resolved server-side, NOT from the body
    expect(sent.subject.toLowerCase()).toContain('decisión clínica');
    expect(sent.html).toContain('not a diagnosis'); // disclaimer present in the branded HTML
    expect(sent.html).toContain('Dra. García'); // physician name composed
  });
});
