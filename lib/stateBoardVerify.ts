/**
 * State Board License Verification for TX, NM, CA launch states.
 *
 * Each state board has a public search endpoint. This service:
 * 1. Calls the state's public lookup API with the license number
 * 2. Checks if a matching active license is returned
 * 3. Updates physician_licenses verification_status accordingly
 *
 * Non-launch states are skipped — they remain 'pending'.
 *
 * Design: fire-and-forget from credentials.ts POST. The verification runs async
 * and updates the DB row directly. The next GET /credentials call picks up the result.
 */

import { supabaseAdmin } from './supabaseServer';

const LAUNCH_STATES = ['TX', 'NM', 'CA'] as const;
type LaunchState = (typeof LAUNCH_STATES)[number];

interface StateBoardResult {
  found: boolean;
  status: 'active' | 'inactive' | 'not_found' | 'error';
  licenseeName?: string;
  expirationDate?: string;
  error?: string;
}

const STATE_BOARD_ENDPOINTS: Record<LaunchState, { name: string; searchUrl: string }> = {
  TX: {
    name: 'Texas Medical Board',
    searchUrl: 'https://profile.tmb.state.tx.us/PublicSearch/Search',
  },
  NM: {
    name: 'New Mexico Medical Board',
    searchUrl: 'https://www.nmmb.state.nm.us/verification',
  },
  CA: {
    name: 'Medical Board of California',
    searchUrl: 'https://www.breeze.ca.gov/datamart/mainMenu.do',
  },
};

function isLaunchState(state: string): state is LaunchState {
  return LAUNCH_STATES.includes(state as LaunchState);
}

/**
 * Verify a state medical license against the state board API.
 *
 * Returns immediately for non-launch states (no verification attempted).
 * For launch states, calls the board API and updates the DB row.
 *
 * @param licenseId - The physician_licenses row ID
 * @param state - Two-letter state code (e.g., 'TX')
 * @param licenseNumber - The license number to verify
 * @param physicianId - The physician UUID (for audit logging)
 */
export async function verifyStateLicense(
  licenseId: string,
  state: string,
  licenseNumber: string,
  physicianId: string
): Promise<void> {
  if (!isLaunchState(state)) {
    return;
  }

  if (!supabaseAdmin) {
    console.error('stateBoardVerify: supabaseAdmin not available');
    return;
  }

  const board = STATE_BOARD_ENDPOINTS[state];
  let result: StateBoardResult;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(board.searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        licenseNumber: licenseNumber,
        licenseType: 'MD',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();

      const hasLicense = text.toLowerCase().includes(licenseNumber.toLowerCase());
      const isActive = text.toLowerCase().includes('active');

      if (hasLicense && isActive) {
        result = { found: true, status: 'active' };
      } else if (hasLicense) {
        result = { found: true, status: 'inactive' };
      } else {
        result = { found: false, status: 'not_found' };
      }
    } else {
      result = { found: false, status: 'error', error: `HTTP ${response.status}` };
    }
  } catch (err) {
    result = {
      found: false,
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  let verificationStatus: string;
  if (result.status === 'active') {
    verificationStatus = 'verified';
  } else if (result.status === 'inactive' || result.status === 'not_found') {
    verificationStatus = 'manual_review';
  } else {
    verificationStatus = 'manual_review';
  }

  await supabaseAdmin
    .from('physician_licenses')
    .update({
      verification_status: verificationStatus,
      verification_source: `state_board_${state.toLowerCase()}`,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', licenseId);

  await supabaseAdmin
    .from('physician_onboarding_audit')
    .insert({
      physician_id: physicianId,
      email: 'system',
      action: 'state_board_verification',
      data_snapshot: {
        licenseId,
        state,
        licenseNumber,
        board: board.name,
        result: {
          found: result.found,
          status: result.status,
          error: result.error,
        },
      },
      language: 'en',
    });
}
