import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Image from 'next/image';
import { getAdminFromContext, AdminUser } from '../../../lib/adminAuth';
import { supabaseAdmin } from '../../../lib/supabaseServer';
import AdminLayout from '../../../components/admin/AdminLayout';

interface VerificationResult {
  id: string;
  verification_type: string;
  status: string;
  verification_method: string;
  match_confidence: number | null;
  notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

interface ReviewHistoryItem {
  id: string;
  review_type: string;
  priority: string;
  status: string;
  reason: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface PhysicianDetailProps {
  admin: AdminUser;
  physician: Record<string, unknown>;
  verificationResults: VerificationResult[];
  reviewHistory: ReviewHistoryItem[];
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const admin = await getAdminFromContext(ctx);
  if (!admin) {
    return { redirect: { destination: '/', permanent: false } };
  }

  const physicianId = ctx.params?.id as string;
  if (!physicianId || !supabaseAdmin) {
    return { notFound: true };
  }

  const { data: physician, error } = await supabaseAdmin
    .from('physicians')
    .select('*')
    .eq('id', physicianId)
    .single();

  if (error || !physician) {
    return { notFound: true };
  }

  const [verRes, reviewRes] = await Promise.all([
    supabaseAdmin
      .from('physician_verification_results')
      .select('*')
      .eq('physician_id', physicianId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('physician_manual_review_queue')
      .select('*')
      .eq('physician_id', physicianId)
      .order('created_at', { ascending: false }),
  ]);

  return {
    props: {
      admin,
      physician,
      verificationResults: verRes.data || [],
      reviewHistory: reviewRes.data || [],
    },
  };
};

const statusStyles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Verified' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
  in_review: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'In Review' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Rejected' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Failed' },
  manual_review: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Manual Review' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
};

const verificationTypeLabels: Record<string, string> = {
  license_mexico: 'Mexico License (COFEPRIS)',
  license_usa: 'USA Medical License',
  education_linkedin: 'LinkedIn Education',
  publications_scholar: 'Google Scholar',
  professional_presence: 'Professional Presence',
  board_certification: 'Board Certification',
  international_credential: 'International Credential',
};

export default function PhysicianDetailPage({ admin, physician, verificationResults, reviewHistory }: PhysicianDetailProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const st = statusStyles[physician.verification_status as string || 'pending'] || statusStyles.pending;

  async function handleForceReVerify() {
    setIsUpdating(true);
    try {
      await fetch(`/api/admin/physicians/${physician.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_status: 'pending', verified_at: null, verified_by: null }),
      });
      router.reload();
    } catch {
      alert('Failed to update');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleSetStatus(status: string) {
    setIsUpdating(true);
    try {
      const updates: Record<string, unknown> = { verification_status: status };
      if (status === 'verified') {
        updates.verified_at = new Date().toISOString();
        updates.verified_by = `admin:${admin.id}`;
      }
      await fetch(`/api/admin/physicians/${physician.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      router.reload();
    } catch {
      alert('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <AdminLayout adminName={admin.fullName}>
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/admin/physicians')}
          className="font-dm-sans text-sm text-clinical-teal hover:underline mb-4 inline-block"
        >
          &larr; Back to Physicians
        </button>

        {/* Physician Header */}
        <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            {physician.photo_url ? (
              <Image
                src={physician.photo_url as string}
                alt={physician.full_name as string}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-clinical-surface flex items-center justify-center flex-shrink-0">
                <span className="font-dm-sans text-2xl font-semibold text-body-slate">
                  {(physician.full_name as string).charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-dm-sans text-2xl font-bold text-deep-charcoal">
                {physician.full_name as string}
              </h1>
              <p className="font-dm-sans text-sm text-body-slate mt-1">{physician.email as string}</p>
              <p className="font-dm-sans text-sm text-body-slate">
                {physician.primary_specialty as string || 'No specialty listed'}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className={`inline-flex items-center font-dm-sans font-medium text-xs rounded-full border px-2 py-0.5 ${st.bg} ${st.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${st.dot}`} />
                  {st.label}
                </span>
                {!!physician.verification_tier && (
                  <span className="font-dm-sans text-xs text-body-slate">
                    Tier: {physician.verification_tier as string}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6 mb-6">
          <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">Admin Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleForceReVerify}
              disabled={isUpdating}
              className="font-dm-sans text-sm font-medium py-2 px-4 rounded-[8px] border border-border-line text-body-slate hover:bg-gray-50 transition disabled:opacity-50"
            >
              Force Re-Verify
            </button>
            <button
              onClick={() => handleSetStatus('verified')}
              disabled={isUpdating}
              className="font-dm-sans text-sm font-medium py-2 px-4 rounded-[8px] bg-confirm-green text-white hover:bg-confirm-green/90 transition disabled:opacity-50"
            >
              Manually Verify
            </button>
            <button
              onClick={() => handleSetStatus('rejected')}
              disabled={isUpdating}
              className="font-dm-sans text-sm font-medium py-2 px-4 rounded-[8px] bg-alert-garnet text-white hover:bg-alert-garnet/90 transition disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Physician Details */}
          <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
            <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">Details</h2>
            <dl className="space-y-3 text-sm font-dm-sans">
              <DetailRow label="Medical School" value={physician.medical_school as string} />
              <DetailRow label="Graduation Year" value={physician.graduation_year as string} />
              <DetailRow label="Languages" value={Array.isArray(physician.languages) ? (physician.languages as string[]).join(', ') : null} />
              <DetailRow label="Timezone" value={physician.timezone as string} />
              <DetailRow label="LinkedIn" value={physician.linkedin_url as string} isLink />
              <DetailRow label="Google Scholar" value={physician.google_scholar_url as string} isLink />
              <DetailRow label="Website" value={physician.website_url as string} isLink />
              <DetailRow label="Created" value={physician.created_at ? new Date(physician.created_at as string).toLocaleString() : null} />
              <DetailRow label="Onboarding Completed" value={physician.onboarding_completed_at ? new Date(physician.onboarding_completed_at as string).toLocaleString() : null} />
            </dl>
          </div>

          {/* Verification History */}
          <div className="space-y-6">
            <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
              <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">Verification Results</h2>
              {verificationResults.length === 0 ? (
                <p className="font-dm-sans text-sm text-body-slate">No verification results</p>
              ) : (
                <div className="space-y-3">
                  {verificationResults.map((r) => {
                    const rStatus = statusStyles[r.status] || statusStyles.pending;
                    return (
                      <div key={r.id} className="border border-border-line/50 rounded-[8px] p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-dm-sans text-sm font-medium text-deep-charcoal">
                            {verificationTypeLabels[r.verification_type] || r.verification_type}
                          </span>
                          <span className={`inline-flex items-center font-dm-sans font-medium text-xs rounded-full px-2 py-0.5 ${rStatus.bg} ${rStatus.text}`}>
                            {rStatus.label}
                          </span>
                        </div>
                        <p className="font-dm-sans text-xs text-body-slate">
                          Method: {r.verification_method}
                          {r.match_confidence != null && ` | Confidence: ${r.match_confidence}%`}
                        </p>
                        {r.notes && (
                          <p className="font-dm-sans text-xs text-body-slate mt-1">{r.notes}</p>
                        )}
                        {r.verified_at && (
                          <p className="font-dm-sans text-xs text-archival-grey mt-1">
                            {new Date(r.verified_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
              <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">Review History</h2>
              {reviewHistory.length === 0 ? (
                <p className="font-dm-sans text-sm text-body-slate">No review history</p>
              ) : (
                <div className="space-y-3">
                  {reviewHistory.map((r) => {
                    const rStatus = statusStyles[r.status] || statusStyles.pending;
                    return (
                      <div key={r.id} className="border border-border-line/50 rounded-[8px] p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-dm-sans text-sm font-medium text-deep-charcoal capitalize">
                            {r.review_type.replace(/_/g, ' ')}
                          </span>
                          <span className={`inline-flex items-center font-dm-sans font-medium text-xs rounded-full px-2 py-0.5 ${rStatus.bg} ${rStatus.text}`}>
                            {rStatus.label}
                          </span>
                        </div>
                        <p className="font-dm-sans text-xs text-body-slate">{r.reason}</p>
                        {r.resolution_notes && (
                          <p className="font-dm-sans text-xs text-body-slate mt-1">
                            Resolution: {r.resolution_notes}
                          </p>
                        )}
                        <p className="font-dm-sans text-xs text-archival-grey mt-1">
                          {new Date(r.created_at).toLocaleString()}
                          {r.resolved_at && ` | Resolved: ${new Date(r.resolved_at).toLocaleString()}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function DetailRow({ label, value, isLink }: { label: string; value: string | null | undefined; isLink?: boolean }) {
  if (!value) {
    return (
      <div className="flex justify-between">
        <dt className="text-body-slate">{label}</dt>
        <dd className="text-archival-grey">-</dd>
      </div>
    );
  }

  return (
    <div className="flex justify-between gap-4">
      <dt className="text-body-slate flex-shrink-0">{label}</dt>
      <dd className="text-deep-charcoal font-medium text-right truncate">
        {isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-clinical-teal hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
