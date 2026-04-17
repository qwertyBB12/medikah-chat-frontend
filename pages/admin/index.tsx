import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { getAdminFromContext, AdminUser } from '../../lib/adminAuth';
import { supabaseAdmin } from '../../lib/supabaseServer';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  ADMIN_FLAG_KEYS,
  ADMIN_FLAG_LABELS,
  ADMIN_FLAG_SEVERITY,
  FlagSummary,
  AdminFlagKey,
} from '../../lib/adminFlags';

interface DashboardStats {
  pendingReviews: number;
  totalPhysicians: number;
  verifiedCount: number;
  rejectedCount: number;
}

interface RecentActivity {
  id: string;
  physicianName: string;
  reviewType: string;
  status: string;
  resolvedAt: string;
  resolvedBy: string;
}

interface AdminDashboardProps {
  admin: AdminUser;
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  flagSummary: FlagSummary;
}

function emptySummary(): FlagSummary {
  return {
    incomplete_profile: 0,
    unverified_credentials: 0,
    expiring_90d: 0,
    consejo_recert_due: 0,
    disciplinary_found: 0,
    manual_review_pending: 0,
  };
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const admin = await getAdminFromContext(ctx);
  if (!admin) {
    return { redirect: { destination: '/', permanent: false } };
  }

  let stats: DashboardStats = {
    pendingReviews: 0,
    totalPhysicians: 0,
    verifiedCount: 0,
    rejectedCount: 0,
  };
  let recentActivity: RecentActivity[] = [];
  let flagSummary: FlagSummary = emptySummary();

  if (supabaseAdmin) {
    const [pendingRes, totalRes, verifiedRes, rejectedRes, recentRes] = await Promise.all([
      supabaseAdmin.from('physician_manual_review_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('physicians').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('physicians').select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      supabaseAdmin.from('physicians').select('id', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
      supabaseAdmin
        .from('physician_manual_review_queue')
        .select('id, review_data, review_type, status, resolved_at, resolved_by')
        .neq('status', 'pending')
        .order('resolved_at', { ascending: false })
        .limit(5),
    ]);

    stats = {
      pendingReviews: pendingRes.count || 0,
      totalPhysicians: totalRes.count || 0,
      verifiedCount: verifiedRes.count || 0,
      rejectedCount: rejectedRes.count || 0,
    };

    recentActivity = (recentRes.data || []).map((r) => ({
      id: r.id,
      physicianName: (r.review_data as Record<string, unknown>)?.physicianName as string || 'Unknown',
      reviewType: r.review_type,
      status: r.status,
      resolvedAt: r.resolved_at,
      resolvedBy: r.resolved_by,
    }));

    // ----- Phase 9 ADMN-02: compute flag_summary for the "Physicians Needing
    // Attention" panel. NOTE: this duplicates the per-flag heuristics inside
    // pages/api/admin/physicians.ts (computeFlagMaps). Both paths must stay in
    // sync — if you change one, change the other. The API route cannot be
    // imported here cleanly because it is itself a Next.js handler. A future
    // refactor could extract the shared logic into lib/adminFlags.ts; for now
    // both call sites cite ADMN-02 and use the same lib/adminFlags constants
    // for keys and severity, which prevents drift on the public surface even
    // if the heuristic implementations live in two files.
    try {
      const [licRes, certRes, verRes, physRes] = await Promise.all([
        supabaseAdmin
          .from('physician_licenses')
          .select('physician_id, verification_status, expiration_flag, manual_review_required'),
        supabaseAdmin
          .from('physician_certifications')
          .select(
            'id, physician_id, certification_type, recertification_year, verification_status, expiration_flag, manual_review_required',
          ),
        supabaseAdmin
          .from('verification_records')
          .select('physician_id, source, result_status, summary, raw_response')
          .eq('source', 'fsmb'),
        supabaseAdmin
          .from('physicians')
          .select('id, verification_status, primary_specialty, full_name, email'),
      ]);

      const sets: Record<AdminFlagKey, Set<string>> = {
        incomplete_profile: new Set<string>(),
        unverified_credentials: new Set<string>(),
        expiring_90d: new Set<string>(),
        consejo_recert_due: new Set<string>(),
        disciplinary_found: new Set<string>(),
        manual_review_pending: new Set<string>(),
      };

      for (const l of licRes.data || []) {
        const pid = l.physician_id as string;
        if (!pid) continue;
        if (l.verification_status === 'pending' || l.verification_status === 'manual_review') {
          sets.unverified_credentials.add(pid);
        }
        if (l.expiration_flag === true) sets.expiring_90d.add(pid);
        if (l.manual_review_required === true) sets.manual_review_pending.add(pid);
      }

      for (const c of certRes.data || []) {
        const pid = c.physician_id as string;
        if (!pid) continue;
        if (c.verification_status === 'pending' || c.verification_status === 'manual_review') {
          sets.unverified_credentials.add(pid);
        }
        if (c.expiration_flag === true) sets.expiring_90d.add(pid);
        if (c.manual_review_required === true) sets.manual_review_pending.add(pid);
      }

      // Consejo recert: invoke Postgres function per consejo cert (low volume;
      // pre-gated on recertification_year != null so non-consejo certs cost zero round-trips).
      const consejoCerts = (certRes.data || []).filter(
        (x) => x.certification_type === 'consejo' && x.recertification_year != null,
      );
      for (const c of consejoCerts) {
        try {
          const { data: due } = await supabaseAdmin.rpc('is_consejo_recertification_due', {
            p_cert_id: c.id,
          });
          if (due === true) sets.consejo_recert_due.add(c.physician_id as string);
        } catch (e) {
          console.error('[admin/index] is_consejo_recertification_due exception:', e);
        }
      }

      // Disciplinary heuristic — wrapped in try/catch (under-flag is safer than crash, T-09-05)
      for (const r of verRes.data || []) {
        const pid = r.physician_id as string;
        if (!pid) continue;
        try {
          const summary = (r.summary ?? null) as Record<string, unknown> | null;
          const raw = (r.raw_response ?? null) as Record<string, unknown> | null;
          let hasDisc = false;
          const summaryActions = summary?.disciplinary_actions;
          if (Array.isArray(summaryActions) && summaryActions.length > 0) {
            hasDisc = true;
          }
          if (!hasDisc) {
            const summaryActionsAlt = summary?.actions;
            if (
              Array.isArray(summaryActionsAlt) &&
              summaryActionsAlt.length > 0 &&
              r.result_status === 'found'
            ) {
              hasDisc = true;
            }
          }
          if (!hasDisc && raw && Array.isArray(raw.results)) {
            const found = (raw.results as Array<Record<string, unknown>>).some(
              (x) => Array.isArray(x?.actions) && (x.actions as unknown[]).length > 0,
            );
            if (found) hasDisc = true;
          }
          if (hasDisc) sets.disciplinary_found.add(pid);
        } catch (e) {
          console.error('[admin/index] disciplinary heuristic exception (under-flagging):', e);
        }
      }

      // Incomplete profile: missing any of the 4 core columns
      for (const p of physRes.data || []) {
        if (!p.verification_status || !p.primary_specialty || !p.full_name || !p.email) {
          sets.incomplete_profile.add(p.id as string);
        }
      }

      flagSummary = {
        incomplete_profile: sets.incomplete_profile.size,
        unverified_credentials: sets.unverified_credentials.size,
        expiring_90d: sets.expiring_90d.size,
        consejo_recert_due: sets.consejo_recert_due.size,
        disciplinary_found: sets.disciplinary_found.size,
        manual_review_pending: sets.manual_review_pending.size,
      };
    } catch (e) {
      console.error('[admin/index] flagSummary computation failed:', e);
      // Leave flagSummary at zeros on failure; panel will render but tiles show 0.
    }
  }

  return {
    props: { admin, stats, recentActivity, flagSummary },
  };
};

const reviewTypeLabels: Record<string, string> = {
  license_not_found: 'License Not Found',
  international_credential: 'International Credential',
  data_discrepancy: 'Data Discrepancy',
  board_certification: 'Board Certification',
};

export default function AdminDashboard({ admin, stats, recentActivity, flagSummary }: AdminDashboardProps) {
  return (
    <AdminLayout adminName={admin.fullName} pendingReviewCount={stats.pendingReviews}>
      <div className="max-w-6xl mx-auto">
        <h1 className="font-dm-sans text-2xl font-bold text-deep-charcoal mb-1">
          Welcome back, {admin.fullName.split(' ')[0]}
        </h1>
        <p className="font-dm-sans text-sm text-body-slate mb-8">
          Medikah Admin Dashboard
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pending Reviews" value={stats.pendingReviews} accent={stats.pendingReviews > 0 ? 'amber' : 'default'} />
          <StatCard label="Total Physicians" value={stats.totalPhysicians} accent="default" />
          <StatCard label="Verified" value={stats.verifiedCount} accent="green" />
          <StatCard label="Rejected" value={stats.rejectedCount} accent={stats.rejectedCount > 0 ? 'red' : 'default'} />
        </div>

        {/* Quick Links */}
        <div className="flex gap-3 mb-8">
          <Link
            href="/admin/review-queue"
            className="font-dm-sans font-semibold text-sm py-3 px-6 rounded-[8px] bg-clinical-teal text-white hover:bg-clinical-teal-dark transition"
          >
            Review Queue
          </Link>
          <Link
            href="/admin/physicians"
            className="font-dm-sans font-semibold text-sm py-3 px-6 rounded-[8px] border border-border-line text-deep-charcoal hover:bg-gray-50 transition"
          >
            All Physicians
          </Link>
        </div>

        {/* Flag Summary Panel (Phase 9 ADMN-02) */}
        <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6 mb-8">
          <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">
            Physicians Needing Attention
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {ADMIN_FLAG_KEYS.map((key) => {
              const count = flagSummary[key] ?? 0;
              const severity = ADMIN_FLAG_SEVERITY[key];
              const tone =
                count === 0
                  ? 'border-border-line text-body-slate'
                  : severity === 'garnet'
                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                    : 'border-amber-200 text-amber-700 hover:bg-amber-50';
              return (
                <Link
                  key={key}
                  href={`/admin/physicians?flag=${key}`}
                  className={`block rounded-[8px] border p-3 transition ${tone}`}
                >
                  <p className="font-dm-sans text-xs font-medium uppercase tracking-wider">
                    {ADMIN_FLAG_LABELS[key]}
                  </p>
                  <p className="font-dm-sans text-2xl font-bold mt-1">
                    {count}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
          <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="font-dm-sans text-sm text-body-slate">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border-line/50 last:border-0">
                  <div>
                    <p className="font-dm-sans text-sm font-medium text-deep-charcoal">
                      {item.physicianName}
                    </p>
                    <p className="font-dm-sans text-xs text-body-slate">
                      {reviewTypeLabels[item.reviewType] || item.reviewType}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-dm-sans text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                    {item.resolvedAt && (
                      <p className="font-dm-sans text-xs text-archival-grey mt-1">
                        {new Date(item.resolvedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'default' | 'amber' | 'green' | 'red' }) {
  const accentColors = {
    default: 'border-border-line',
    amber: 'border-amber-300',
    green: 'border-emerald-300',
    red: 'border-red-300',
  };

  const valueColors = {
    default: 'text-deep-charcoal',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
    red: 'text-red-700',
  };

  return (
    <div className={`bg-white rounded-[12px] border ${accentColors[accent]} shadow-sm p-5`}>
      <p className="font-dm-sans text-xs font-medium text-body-slate uppercase tracking-wider">{label}</p>
      <p className={`font-dm-sans text-3xl font-bold mt-1 ${valueColors[accent]}`}>{value}</p>
    </div>
  );
}
