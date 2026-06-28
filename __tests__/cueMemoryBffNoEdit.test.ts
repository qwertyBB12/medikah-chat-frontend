/**
 * Regression guard for the deliberate "view + delete only" memory contract.
 *
 * Doctors may VIEW and DELETE what Cue remembers, but never EDIT it — rewriting a
 * note would silently change how Cue reasons (product decision 2026-06-28). The
 * FastAPI route has no PATCH endpoint; this test pins the BFF so the dead edit
 * passthrough can't be reintroduced here in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const forwardToCue = vi.fn();
vi.mock('../lib/cue/forwardToCue', () => ({
  forwardToCue: (...args: unknown[]) => forwardToCue(...args),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import handler from '../pages/api/cue/memory/[id]';

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

describe('cue memory BFF — view + delete only (no edit/PATCH)', () => {
  beforeEach(() => forwardToCue.mockClear());

  it('rejects PATCH with 405 and never forwards (the edit path must stay dead)', async () => {
    const res = mockRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler({ method: 'PATCH', query: { id: 'note-1' } } as any, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'DELETE');
    expect(forwardToCue).not.toHaveBeenCalled();
  });

  it('rejects other write verbs (PUT/POST) too', async () => {
    for (const method of ['PUT', 'POST']) {
      const res = mockRes();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler({ method, query: { id: 'n' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(405);
    }
    expect(forwardToCue).not.toHaveBeenCalled();
  });

  it('forwards DELETE to FastAPI (the privacy right is preserved)', async () => {
    const res = mockRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler({ method: 'DELETE', query: { id: 'note-2' } } as any, res);
    expect(forwardToCue).toHaveBeenCalledTimes(1);
    const opts = forwardToCue.mock.calls[0][2];
    expect(opts).toMatchObject({ method: 'DELETE', path: '/cue/memory/note-2' });
  });

  it('400s when the id is missing', async () => {
    const res = mockRes();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler({ method: 'DELETE', query: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(forwardToCue).not.toHaveBeenCalled();
  });
});
