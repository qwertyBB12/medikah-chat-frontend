/**
 * Tests for the cédula-verification write builder (Cédula Verification Cockpit,
 * slice 3). This is the schema-critical mapping: a human admin's confirm/reject
 * decision → the exact rows we write to verification_records (append-only audit)
 * and physician_licenses (badge flip). Getting the column values wrong corrupts
 * the legal audit trail, so it is pinned by tests. Pure function — `now` is
 * injected, no Date.now, no network.
 *
 * Verified schema (migrations 013 + 016, no blocking CHECK constraints):
 *  - verification_records.source         : free TEXT  → 'rnp_manual'
 *  - verification_records.result_status  : free TEXT  → 'found' | 'not_found'
 *  - physician_licenses.verification_status : 'verified' | 'failed' | ...
 *  - physician_licenses.verification_source : free TEXT → 'rnp_manual'
 */

import { describe, it, expect } from 'vitest';
import { buildCedulaWrites } from '../lib/verification/cedulaVerify';
import type { ConstanciaFields } from '../lib/verification/constanciaParse';

const FIELDS: ConstanciaFields = {
  nombre: 'JOSÉ LUIS AGUIRRE RODRÍGUEZ',
  titulo: 'MÉDICO CIRUJANO',
  cedula: '1234567',
  institucion: 'UNAM',
  anio: '1998',
};

const BASE = {
  physicianId: '11111111-1111-1111-1111-111111111111',
  licenseId: '22222222-2222-2222-2222-222222222222',
  cedula: '1234567',
  pais: 'MX',
  reviewerEmail: 'jaguirre@medikah.health',
  fields: FIELDS,
  match: { verdict: 'match' as const, score: 1 },
  evidencePath: '11111111-1111-1111-1111-111111111111/cedula_constancia/170_c.pdf',
  source: 'text' as const,
};

const NOW = '2026-06-28T22:30:00.000Z';

describe('buildCedulaWrites', () => {
  it('on a "verified" decision flips the license to verified via rnp_manual', () => {
    const { licenseUpdate } = buildCedulaWrites({ ...BASE, decision: 'verified' }, NOW);
    expect(licenseUpdate.verification_status).toBe('verified');
    expect(licenseUpdate.verified_at).toBe(NOW);
    expect(licenseUpdate.verification_source).toBe('rnp_manual');
  });

  it('writes an append-only verification_records row tied to the license', () => {
    const { record } = buildCedulaWrites({ ...BASE, decision: 'verified' }, NOW);
    expect(record.physician_id).toBe(BASE.physicianId);
    expect(record.source).toBe('rnp_manual');
    expect(record.related_table).toBe('physician_licenses');
    expect(record.related_id).toBe(BASE.licenseId);
    expect(record.result_status).toBe('found');
    // lookup_input captures what the human reviewed; raw_response is the evidence.
    expect(record.lookup_input).toMatchObject({ cedula: '1234567', pais: 'MX', reviewer: BASE.reviewerEmail });
    expect(record.raw_response).toMatchObject({ fields: FIELDS, source: 'text' });
    // summary is the admin-facing convenience copy.
    expect(record.summary).toMatchObject({
      verdict: 'match',
      score: 1,
      decision: 'verified',
      evidence_path: BASE.evidencePath,
      reviewer: BASE.reviewerEmail,
      reviewed_at: NOW,
    });
  });

  it('on a "rejected" decision marks the license failed and the record not_found', () => {
    const { licenseUpdate, record } = buildCedulaWrites({ ...BASE, decision: 'rejected' }, NOW);
    expect(licenseUpdate.verification_status).toBe('failed');
    expect(licenseUpdate.verification_source).toBe('rnp_manual');
    expect(record.result_status).toBe('not_found');
    expect(record.summary.decision).toBe('rejected');
  });

  it('carries a null evidence_path through (e.g. evidence upload skipped)', () => {
    const { record } = buildCedulaWrites({ ...BASE, decision: 'verified', evidencePath: null }, NOW);
    expect(record.summary.evidence_path).toBeNull();
  });

  it('never emits a status outside the documented physician_licenses set', () => {
    const verified = buildCedulaWrites({ ...BASE, decision: 'verified' }, NOW);
    const rejected = buildCedulaWrites({ ...BASE, decision: 'rejected' }, NOW);
    expect(['verified', 'failed', 'manual_review', 'pending']).toContain(
      verified.licenseUpdate.verification_status,
    );
    expect(['verified', 'failed', 'manual_review', 'pending']).toContain(
      rejected.licenseUpdate.verification_status,
    );
  });
});
