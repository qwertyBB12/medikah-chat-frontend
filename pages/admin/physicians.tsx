import { GetServerSideProps } from 'next';
import { useEffect, useState, useCallback } from 'react';
import { getAdminFromContext, AdminUser } from '../../lib/adminAuth';
import AdminLayout from '../../components/admin/AdminLayout';
import PhysicianTable from '../../components/admin/PhysicianTable';

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
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const admin = await getAdminFromContext(ctx);
  if (!admin) {
    return { redirect: { destination: '/', permanent: false } };
  }
  return { props: { admin } };
};

export default function PhysiciansPage({ admin }: PhysiciansPageProps) {
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPhysicians = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/physicians?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPhysicians(data.physicians);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // silent failure
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchPhysicians();
  }, [fetchPhysicians]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(value: string) {
    setStatusFilter(value);
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
