/**
 * Phase 8 VERF-02: Pure helpers for 90-day expiration detection.
 * Used by both server-side services (to set physician_licenses.manual_review_required)
 * and client-side UI (to display expiration warnings).
 *
 * The DB trigger in migration 016 maintains the expiration_flag column authoritatively.
 * These helpers let application code compute the same classification without a DB round-trip.
 */

import type { ExpirationClass } from './verificationTypes';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const WINDOW_DAYS = 90;

/**
 * Returns the parsed Date (UTC midnight) for an ISO YYYY-MM-DD string, or null if invalid.
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // Normalize to midnight UTC to avoid TZ off-by-one
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function normalizeToday(today?: Date): Date {
  const t = today ?? new Date();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
}

/**
 * TRUE when expirationDate is between today and today+90 days (inclusive).
 * Matches the DB trigger condition in migration 016.
 *
 * @param expirationDate - ISO date string (YYYY-MM-DD) or null/undefined.
 * @param today - Optional override for "today" (test injection). Defaults to new Date().
 */
export function isWithin90Days(
  expirationDate: string | null | undefined,
  today?: Date,
): boolean {
  const exp = parseDate(expirationDate);
  if (!exp) return false;
  const now = normalizeToday(today);
  const diffDays = Math.round((exp.getTime() - now.getTime()) / MS_PER_DAY);
  return diffDays >= 0 && diffDays <= WINDOW_DAYS;
}

/**
 * Number of days from today to expirationDate. Negative if expired, 0 same day.
 * Returns null for invalid/missing input.
 */
export function daysUntilExpiration(
  expirationDate: string | null | undefined,
  today?: Date,
): number | null {
  const exp = parseDate(expirationDate);
  if (!exp) return null;
  const now = normalizeToday(today);
  return Math.round((exp.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Classify an expiration date into one of four buckets.
 * - 'none': input is null/invalid (e.g., MX cedula with no expiration)
 * - 'expired': date is in the past
 * - 'within_90_days': date is today..today+90 days
 * - 'future': date is more than 90 days out
 */
export function classifyExpiration(
  expirationDate: string | null | undefined,
  today?: Date,
): ExpirationClass {
  const days = daysUntilExpiration(expirationDate, today);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  if (days <= WINDOW_DAYS) return 'within_90_days';
  return 'future';
}
