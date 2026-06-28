import { describe, it, expect } from 'vitest';
import {
  isReviewableTable,
  decisionToStatus,
  REVIEWABLE_TABLES,
} from '../lib/adminCredentialDecision';

describe('adminCredentialDecision (B3 admin review guards)', () => {
  it('only the two canonical credential tables are reviewable', () => {
    expect(isReviewableTable('physician_specialties')).toBe(true);
    expect(isReviewableTable('physician_education')).toBe(true);
    expect(REVIEWABLE_TABLES).toEqual(['physician_specialties', 'physician_education']);
  });

  it('rejects any other table (no arbitrary-table writes)', () => {
    expect(isReviewableTable('physicians')).toBe(false);
    expect(isReviewableTable('physician_licenses')).toBe(false);
    expect(isReviewableTable('admin_users')).toBe(false);
    expect(isReviewableTable('')).toBe(false);
    expect(isReviewableTable(null)).toBe(false);
    expect(isReviewableTable(42)).toBe(false);
  });

  it('approve -> verified, reject -> rejected', () => {
    expect(decisionToStatus('approve')).toBe('verified');
    expect(decisionToStatus('reject')).toBe('rejected');
  });

  it('unknown actions yield null (endpoint 400s, never writes a bad status)', () => {
    expect(decisionToStatus('verify')).toBeNull();
    expect(decisionToStatus('VERIFIED')).toBeNull();
    expect(decisionToStatus('')).toBeNull();
    expect(decisionToStatus(undefined)).toBeNull();
    expect(decisionToStatus(null)).toBeNull();
    expect(decisionToStatus({ action: 'approve' })).toBeNull();
  });
});
