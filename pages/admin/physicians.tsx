import { GetServerSideProps } from 'next';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getAdminFromContext, AdminUser } from '../../lib/adminAuth';
import AdminLayout from '../../components/admin/AdminLayout';
import PhysicianTable from '../../components/admin/PhysicianTable';
import {
  AdminFlagKey,
  ADMIN_FLAG_KEYS,
  ADMIN_FLAG_LABELS,
  ADMIN_FLAG_SEVERITY,
  FlagSummary,
  FlagCounts,
  emptyFlagCounts,
  isAdminFlagKey,
} from '../../lib/adminFlags';

interface PhysiciansPageProps {
  admin: AdminUser;
}

interface Physician {
  id: string;
  full_name: string;
  email: string;
  primary_specialty: string | null;
  verification_status: string | null;
  verified_at: string | null;
  created_at: string;
  photo_url?: string | null;
  flag_counts: FlagCounts;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const admin = await getAdminFromContext(ctx);
  if (!admin) {
    return { redirect: { destination: '/', permanent: false } };
  }
  return { props: { admin } };
};

export default function PhysiciansPage({ admin }: PhysiciansPageProps) {
  const router = useRouter();
  const initialFlag =
    typeof router.query.flag === 'string' && isAdminFlagKey(router.query.flag)
      ? router.query.flag
      : null;

  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState<AdminFlagKey | null>(initialFlag);
  const [flagSummary, setFlagSummary] = useState<FlagSummary>(() => emptyFlagCounts());
  const [loading, setLoading] = useState(true);

  const fetchPhysicians = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (flagFilter) params.set('flag', flagFilter);

      const res = await fetch(`/api/admin/physicians?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPhysicians(data.physicians);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.flag_summary) setFlagSummary(data.flag_summary);
    } catch {
      // silent failure
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, flagFilter]);

  useEffect(() => {
    fetchPhysicians();
  }, [fetchPhysicians]);

  // Keep URL ?flag= in sync with the current filter so deep-links from the
  // admin home page work and admins can share filtered views.
  useEffect(() => {
    const nextQuery = { ...router.query };
    if (flagFilter) {
      nextQuery.flag = flagFilter;
    } else {
      delete nextQuery.flag;
    }
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagFilter]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleFlagFilter(key: AdminFlagKey | null) {
    setFlagFilter(key);
    setPage(1);
  }

  return (
    <AdminLayout adminName={admin.fullName}>
      <div className="max-w-6xl mx-auto">
        <h1 className="font-dm-sans text-2xl font-bold text-deep-charcoal mb-1">
          Physicians
        </h1>
        <p className="font-dm-sans text-sm text-body-slate mb-6">
          All registered physicians
        </p>

        {/* Flag Chip Bar (Phase 9 ADMN-02) */}
        <div className="mb-4 -mx-1 flex flex-wrap gap-2">
          <button
            onClick={() => handleFlagFilter(null)}
            className={`font-dm-sans text-xs font-medium px-3 py-1.5 rounded-full border transition
              ${
                flagFilter === null
                  ? 'bg-clinical-teal text-white border-clinical-teal'
                  : 'bg-white text-body-slate border-border-line hover:bg-gray-50'
              }`}
          >
            All physicians
          </button>
          {ADMIN_FLAG_KEYS.map((key) => {
            const count = flagSummary[key] ?? 0;
            const active = flagFilter === key;
            const severity = ADMIN_FLAG_SEVERITY[key];
            const inactiveTone =
              severity === 'garnet'
                ? 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50';
            return (
              <button
                key={key}
                onClick={() => handleFlagFilter(key)}
                disabled={count === 0 && !active}
                className={`font-dm-sans text-xs font-medium px-3 py-1.5 rounded-full border transition disabled:opacity-40 disabled:cursor-not-allowed
                  ${
                    active
                      ? 'bg-clinical-teal text-white border-clinical-teal'
                      : inactiveTone
                  }`}
              >
                {ADMIN_FLAG_LABELS[key]}
                <span
                  className={`ml-1.5 font-semibold ${
                    active ? 'text-white' : 'text-deep-charcoal'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="font-dm-sans text-sm border border-border-line rounded-[8px] px-4 py-2.5 flex-1 focus:outline-none focus:ring-2 focus:ring-clinical-teal/30 focus:border-clinical-teal"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="font-dm-sans text-sm border border-border-line rounded-[8px] px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/30 focus:border-clinical-teal"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-4">
          {loading ? (
            <div className="py-8 text-center">
              <p className="font-dm-sans text-sm text-body-slate">Loading physicians...</p>
            </div>
          ) : (
            <PhysicianTable
              physicians={physicians}
              total={total}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onSort={() => {
                // Sort is handled client-side for now; could extend to server-side
              }}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
