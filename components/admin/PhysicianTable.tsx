import { useState } from 'react';
import Link from 'next/link';

interface Physician {
  id: string;
  full_name: string;
  email: string;
  primary_specialty: string | null;
  verification_status: string | null;
  verified_at: string | null;
  created_at: string;
}

interface PhysicianTableProps {
  physicians: Physician[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSort: (field: string, direction: 'asc' | 'desc') => void;
}

const statusStyles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Verified' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
  in_review: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'In Review' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Rejected' },
};

type SortField = 'full_name' | 'email' | 'primary_specialty' | 'verification_status' | 'verified_at';

export default function PhysicianTable({
  physicians,
  total,
  page,
  totalPages,
  onPageChange,
  onSort,
}: PhysicianTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleSort(field: SortField) {
    let dir: 'asc' | 'desc' = 'asc';
    if (sortField === field && sortDir === 'asc') {
      dir = 'desc';
    }
    setSortField(field);
    setSortDir(dir);
    onSort(field, dir);
  }

  function SortArrow({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="text-gray-300 ml-1">{'\u2195'}</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-line">
              <th
                className="font-dm-sans text-xs font-semibold text-body-slate text-left py-3 px-4 cursor-pointer hover:text-deep-charcoal select-none"
                onClick={() => handleSort('full_name')}
              >
                Name <SortArrow field="full_name" />
              </th>
              <th
                className="font-dm-sans text-xs font-semibold text-body-slate text-left py-3 px-4 cursor-pointer hover:text-deep-charcoal select-none"
                onClick={() => handleSort('email')}
              >
                Email <SortArrow field="email" />
              </th>
              <th
                className="font-dm-sans text-xs font-semibold text-body-slate text-left py-3 px-4 cursor-pointer hover:text-deep-charcoal select-none hidden md:table-cell"
                onClick={() => handleSort('primary_specialty')}
              >
                Specialty <SortArrow field="primary_specialty" />
              </th>
              <th
                className="font-dm-sans text-xs font-semibold text-body-slate text-left py-3 px-4 cursor-pointer hover:text-deep-charcoal select-none"
                onClick={() => handleSort('verification_status')}
              >
                Status <SortArrow field="verification_status" />
              </th>
              <th
                className="font-dm-sans text-xs font-semibold text-body-slate text-left py-3 px-4 cursor-pointer hover:text-deep-charcoal select-none hidden lg:table-cell"
                onClick={() => handleSort('verified_at')}
              >
                Verified At <SortArrow field="verified_at" />
              </th>
            </tr>
          </thead>
          <tbody>
            {physicians.map((p) => {
              const st = statusStyles[p.verification_status || 'pending'] || statusStyles.pending;
              return (
                <tr key={p.id} className="border-b border-border-line/50 hover:bg-clinical-surface/50 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/physicians/${p.id}`}
                      className="font-dm-sans text-sm font-medium text-deep-charcoal hover:text-clinical-teal transition"
                    >
                      {p.full_name}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-dm-sans text-sm text-body-slate">{p.email}</span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="font-dm-sans text-sm text-body-slate">{p.primary_specialty || '-'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center font-dm-sans font-medium text-xs rounded-full border px-2 py-0.5 ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${st.dot}`} />
                      {st.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <span className="font-dm-sans text-sm text-body-slate">
                      {p.verified_at ? new Date(p.verified_at).toLocaleDateString() : '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {physicians.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center font-dm-sans text-sm text-body-slate">
                  No physicians found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-line">
          <p className="font-dm-sans text-sm text-body-slate">
            Showing {physicians.length} of {total} physicians
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="font-dm-sans text-sm px-3 py-1.5 rounded-[8px] border border-border-line text-body-slate hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="font-dm-sans text-sm text-body-slate">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="font-dm-sans text-sm px-3 py-1.5 rounded-[8px] border border-border-line text-body-slate hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
