import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminUser } from '../../../lib/adminAuth';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import {
  AdminFlagKey,
  ADMIN_FLAG_KEYS,
  FlagCounts,
  FlagSummary,
  emptyFlagCounts,
  isAdminFlagKey,
} from '../../../lib/adminFlags';

// TODO(perf): If physician count exceeds 5k, move flag computation to a
// materialized view or batch RPC. Current scan-then-filter loads
// physician_licenses + physician_certifications + verification_records (fsmb)
// metadata once per request. Acceptable for Phase 9 scale (low hundreds of
// physicians, low thousands of credentials).
async function computeFlagMaps(
  db: NonNullable<typeof supabaseAdmin>,
  physiciansForCompleteness: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    primary_specialty: string | null;
    verification_status: string | null;
  }>,
): Promise<{
  perPhysician: Map<string, FlagCounts>;
  summary: FlagSummary;
  idsByFlag: Record<AdminFlagKey, Set<string>>;
}> {
  const perPhysician = new Map<string, FlagCounts>();
  const idsByFlag: Record<AdminFlagKey, Set<string>> = {
    incomplete_profile: new Set<string>(),
    unverified_credentials: new Set<string>(),
    expiring_90d: new Set<string>(),
    consejo_recert_due: new Set<string>(),
    disciplinary_found: new Set<string>(),
    manual_review_pending: new Set<string>(),
  };

  // Helper: ensure a physician id has a FlagCounts entry
  const bucket = (pid: string): FlagCounts => {
    let c = perPhysician.get(pid);
    if (!c) {
      c = emptyFlagCounts();
      perPhysician.set(pid, c);
    }
    return c;
  };

  // Three parallel reads — one per source table contributing to flags.
  const [licensesRes, certsRes, verRecordsRes] = await Promise.all([
    db
      .from('physician_licenses')
      .select('physician_id, verification_status, expiration_flag, manual_review_required'),
    db
      .from('physician_certifications')
      .select(
        'id, physician_id, certification_type, certifying_body, recertification_year, verification_status, expiration_flag, manual_review_required',
      ),
    db
      .from('verification_records')
      .select('physician_id, source, result_status, summary, raw_response')
      .eq('source', 'fsmb'),
  ]);

  if (licensesRes.error) {
    console.error('[admin/physicians] licenses query error:', licensesRes.error.message);
  }
  if (certsRes.error) {
    console.error('[admin/physicians] certifications query error:', certsRes.error.message);
  }
  if (verRecordsRes.error) {
    console.error('[admin/physicians] verification_records query error:', verRecordsRes.error.message);
  }

  const licenses = licensesRes.data ?? [];
  const certs = certsRes.data ?? [];
  const verRecords = verRecordsRes.data ?? [];

  // ----- Licenses contribute: unverified_credentials, expiring_90d, manual_review_pending
  for (const l of licenses) {
    const pid = l.physician_id as string;
    if (!pid) continue;
    const c = bucket(pid);
    if (l.verification_status === 'pending' || l.verification_status === 'manual_review') {
      c.unverified_credentials += 1;
    }
    if (l.expiration_flag === true) {
      c.expiring_90d += 1;
    }
    if (l.manual_review_required === true) {
      c.manual_review_pending += 1;
    }
  }

  // ----- Certifications contribute: same 3 flags + consejo_recert_due
  // For consejo_recert_due, we need to call the Postgres RPC per cert.
  const consejoCertIds: string[] = [];
  for (const cert of certs) {
    const pid = cert.physician_id as string;
    if (!pid) continue;
    const c = bucket(pid);
    if (cert.verification_status === 'pending' || cert.verification_status === 'manual_review') {
      c.unverified_credentials += 1;
    }
    if (cert.expiration_flag === true) {
      c.expiring_90d += 1;
    }
    if (cert.manual_review_required === true) {
      c.manual_review_pending += 1;
    }
    if (
      cert.certification_type === 'consejo' &&
      cert.recertification_year !== null &&
      cert.recertification_year !== undefined
    ) {
      consejoCertIds.push(cert.id as string);
    }
  }

  // Batch RPC for consejo_recert_due — one call per consejo cert. Skip entirely
  // if no consejo certs exist (no round-trips at all).
  if (consejoCertIds.length > 0) {
    const certPidById = new Map<string, string>();
    for (const cert of certs) {
      if (cert.id) certPidById.set(cert.id as string, cert.physician_id as string);
    }
    const rpcResults = await Promise.all(
      consejoCertIds.map(async (certId) => {
        try {
          const { data, error } = await db.rpc('is_consejo_recertification_due', {
            p_cert_id: certId,
          });
          if (error) {
            console.error('[admin/physicians] is_consejo_recertification_due rpc error:', error.message);
            return { certId, due: false };
          }
          return { certId, due: data === true };
        } catch (e) {
          console.error('[admin/physicians] is_consejo_recertification_due exception:', e);
          return { certId, due: false };
        }
      }),
    );
    for (const r of rpcResults) {
      if (r.due) {
        const pid = certPidById.get(r.certId);
        if (pid) bucket(pid).consejo_recert_due += 1;
      }
    }
  }

  // ----- Verification records (FSMB) contribute: disciplinary_found
  // Heuristic: treat as disciplinary if the summary or raw_response contains
  // any actions/disciplinary_actions array with length > 0. Wrap in try/catch
  // — never crash on shape drift (T-09-05: under-flag is safer than crash).
  for (const r of verRecords) {
    const pid = r.physician_id as string;
    if (!pid) continue;
    let isDisciplinary = false;
    try {
      const summary = (r.summary ?? null) as Record<string, unknown> | null;
      const raw = (r.raw_response ?? null) as Record<string, unknown> | null;
      const summaryActions = summary?.disciplinary_actions;
      if (Array.isArray(summaryActions) && summaryActions.length > 0) {
        isDisciplinary = true;
      }
      if (!isDisciplinary) {
        const summaryActionsAlt = summary?.actions;
        if (Array.isArray(summaryActionsAlt) && summaryActionsAlt.length > 0 && r.result_status === 'found') {
          isDisciplinary = true;
        }
      }
      if (!isDisciplinary && raw && Array.isArray(raw.results)) {
        const found = (raw.results as Array<Record<string, unknown>>).some(
          (x) => Array.isArray(x?.actions) && (x.actions as unknown[]).length > 0,
        );
        if (found) isDisciplinary = true;
      }
    } catch (e) {
      console.error('[admin/physicians] disciplinary heuristic exception (under-flagging):', e);
      isDisciplinary = false;
    }
    if (isDisciplinary) {
      bucket(pid).disciplinary_found += 1;
    }
  }

  // ----- Profile completeness: compute against the physicians list passed in
  for (const p of physiciansForCompleteness) {
    const incomplete =
      !p.verification_status || !p.primary_specialty || !p.full_name || !p.email;
    if (incomplete) {
      bucket(p.id).incomplete_profile += 1;
    }
  }

  // ----- Build idsByFlag from per-physician map (Array.from to avoid
  // requiring --downlevelIteration on the project tsconfig).
  const entries = Array.from(perPhysician.entries());
  for (const [pid, counts] of entries) {
    for (const k of ADMIN_FLAG_KEYS) {
      if (counts[k] > 0) {
        idsByFlag[k].add(pid);
      }
    }
  }

  // ----- Compute flag_summary: count of distinct physicians per flag (NOT total instances)
  const summary: FlagSummary = {
    incomplete_profile: idsByFlag.incomplete_profile.size,
    unverified_credentials: idsByFlag.unverified_credentials.size,
    expiring_90d: idsByFlag.expiring_90d.size,
    consejo_recert_due: idsByFlag.consejo_recert_due.size,
    disciplinary_found: idsByFlag.disciplinary_found.size,
    manual_review_pending: idsByFlag.manual_review_pending.size,
  };

  return { perPhysician, summary, idsByFlag };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = await getAdminUser(req, res);
  if (!admin) {
    return res.status(401).json({ error: 'Admin access required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const {
      status,
      search,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    // Validate ?flag=<key> against the canonical registry. Unknown values are
    // ignored (treated as no filter) to avoid information disclosure via
    // PostgREST error reflection (T-09-01).
    const flagParam =
      typeof req.query.flag === 'string' && isAdminFlagKey(req.query.flag) ? req.query.flag : null;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // ----- Step 1: Load all physician completeness fields once (id-set is needed
    // to compute incomplete_profile + drives flag_summary aggregate).
    // We select a lightweight column set across the WHOLE physicians table — not
    // paginated — because flag_summary must reflect ALL physicians, not just
    // the current page. Acceptable for Phase 9 scale.
    const allPhysiciansForFlagsRes = await supabaseAdmin
      .from('physicians')
      .select('id, full_name, email, primary_specialty, verification_status');

    if (allPhysiciansForFlagsRes.error) {
      console.error('[admin/physicians] failed loading flag-base set:', allPhysiciansForFlagsRes.error.message);
      return res.status(500).json({ error: 'Failed to fetch physicians' });
    }
    const allPhysiciansForFlags = allPhysiciansForFlagsRes.data ?? [];

    // ----- Step 2: Compute the per-physician flag map + summary aggregate.
    const { perPhysician, summary, idsByFlag } = await computeFlagMaps(
      supabaseAdmin,
      allPhysiciansForFlags,
    );

    // ----- Step 3: Build the main paginated query (preserves existing search/status/pagination).
    let query = supabaseAdmin
      .from('physicians')
      .select(
        'id, full_name, email, primary_specialty, verification_status, verified_at, created_at, photo_url',
        { count: 'exact' },
      );

    if (status) {
      query = query.eq('verification_status', status);
    }

    if (search) {
      // Sanitize to prevent PostgREST filter injection via special chars
      const safe = search.replace(/[%,.()\[\]\\]/g, '');
      if (safe) {
        query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
      }
    }

    // ----- Step 4: Apply ?flag= filter using the precomputed id set.
    if (flagParam) {
      const ids = Array.from(idsByFlag[flagParam]);
      if (ids.length === 0) {
        return res.status(200).json({
          physicians: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
          flag_summary: summary,
        });
      }
      query = query.in('id', ids);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching physicians:', error);
      return res.status(500).json({ error: 'Failed to fetch physicians' });
    }

    return res.status(200).json({
      physicians: (data || []).map((p) => ({
        ...p,
        flag_counts: perPhysician.get(p.id) ?? emptyFlagCounts(),
      })),
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum),
      flag_summary: summary,
    });
  } catch (err) {
    console.error('Exception fetching physicians:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
