import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { getAdminFromContext, AdminUser } from '../../lib/adminAuth';
import { supabaseAdmin } from '../../lib/supabaseServer';
import AdminLayout from '../../components/admin/AdminLayout';

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
  }

  return {
    props: { admin, stats, recentActivity },
  };
};

const reviewTypeLabels: Record<string, string> = {
  license_not_found: 'License Not Found',
  international_credential: 'International Credential',
  data_discrepancy: 'Data Discrepancy',
  board_certification: 'Board Certification',
};

export default function AdminDashboard({ admin, stats, recentActivity }: AdminDashboardProps) {
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
