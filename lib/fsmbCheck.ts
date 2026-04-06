/**
 * FSMB/DocInfo Disciplinary Check Service
 *
 * DocInfo (docinfo.org) is FSMB's free physician lookup tool.
 * It provides board action/disciplinary history for US physicians.
 *
 * IMPORTANT: DocInfo does not have a public API. The free lookup is browser-only.
 * This service uses the DocInfo physician search endpoint which returns
 * publicly available board action data. If DocInfo blocks programmatic access,
 * the check gracefully degrades to 'pending' status for manual review.
 *
 * Alternative: FSMB Physician Data Center (PDC) has a paid API.
 * For MVP we attempt the free lookup and fall back to manual review.
 */

const DOCINFO_SEARCH_URL = 'https://www.docinfo.org/api/search';

export interface FSMBCheckResult {
  status: 'clear' | 'flagged' | 'error' | 'manual_review';
  hasActions: boolean | null; // null if check couldn't complete
  actionCount?: number;
  checkedAt: string; // ISO timestamp
  source: 'docinfo' | 'manual';
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export async function checkFSMB(npiNumber: string, fullName?: string): Promise<FSMBCheckResult> {
  const checkedAt = new Date().toISOString();

  // Validate NPI format
  if (!/^\d{10}$/.test(npiNumber)) {
    return {
      status: 'error',
      hasActions: null,
      checkedAt,
      source: 'docinfo',
      error: 'Invalid NPI format',
    };
  }

  try {
    // Attempt DocInfo lookup
    // DocInfo may not expose a public API — if this fails, we fall back to manual_review
    const response = await fetch(DOCINFO_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ npi: npiNumber, name: fullName }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      // DocInfo doesn't have a public API — expected to fail
      // Fall back to manual review
      console.log(`FSMB/DocInfo returned ${response.status} — queuing for manual review`);
      return {
        status: 'manual_review',
        hasActions: null,
        checkedAt,
        source: 'manual',
        error: `DocInfo returned HTTP ${response.status} — manual review required`,
      };
    }

    const data = await response.json();

    // Parse DocInfo response for board actions
    const hasActions = Array.isArray(data.actions) && data.actions.length > 0;

    return {
      status: hasActions ? 'flagged' : 'clear',
      hasActions,
      actionCount: hasActions ? data.actions.length : 0,
      checkedAt,
      source: 'docinfo',
      rawResponse: data,
    };
  } catch (err) {
    // Network error or timeout — expected since DocInfo may block programmatic access
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.log(`FSMB/DocInfo check failed: ${message} — queuing for manual review`);
    return {
      status: 'manual_review',
      hasActions: null,
      checkedAt,
      source: 'manual',
      error: `DocInfo lookup failed: ${message}`,
    };
  }
}
