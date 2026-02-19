import { useState } from 'react';
import Image from 'next/image';

interface ReviewDetailPanelProps {
  review: {
    id: string;
    reviewType: string;
    priority: string;
    reason: string;
    slaDeadline: string;
    reviewData: Record<string, unknown>;
    status: string;
  };
  physician: {
    full_name: string;
    email: string;
    primary_specialty: string;
    photo_url?: string;
    verification_status: string;
  };
  onApprove: (notes: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}

const reviewTypeLabels: Record<string, string> = {
  license_not_found: 'License Not Found',
  international_credential: 'International Credential',
  data_discrepancy: 'Data Discrepancy',
  board_certification: 'Board Certification',
};

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', label: 'Urgent' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'High' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Normal' },
  low: { bg: 'bg-gray-50', text: 'text-gray-600', label: 'Low' },
};

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  in_review: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export default function ReviewDetailPanel({
  review,
  physician,
  onApprove,
  onReject,
  isSubmitting,
}: ReviewDetailPanelProps) {
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | null>(null);

  const priority = priorityStyles[review.priority] || priorityStyles.normal;
  const typeLabel = reviewTypeLabels[review.reviewType] || review.reviewType;
  const status = statusStyles[physician.verification_status] || statusStyles.pending;
  const reviewData = review.reviewData || {};
  const discrepancies = (reviewData.discrepancies || []) as Array<{ field: string; submitted: string; found: string; severity: string }>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Physician Info */}
      <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
        <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">
          Physician Information
        </h2>

        <div className="flex items-center gap-4 mb-6">
          {physician.photo_url ? (
            <Image
              src={physician.photo_url}
              alt={physician.full_name}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-clinical-surface flex items-center justify-center">
              <span className="font-dm-sans text-xl font-semibold text-body-slate">
                {physician.full_name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-dm-sans font-semibold text-deep-charcoal text-base">
              {physician.full_name}
            </h3>
            <p className="font-dm-sans text-sm text-body-slate">{physician.email}</p>
            <p className="font-dm-sans text-sm text-body-slate">{physician.primary_specialty || 'No specialty listed'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-dm-sans text-xs text-body-slate">Status:</span>
          <span className={`inline-flex items-center font-dm-sans font-medium text-xs rounded-full border px-2 py-0.5 ${status.bg} ${status.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
            {physician.verification_status || 'pending'}
          </span>
        </div>

        {/* License/credential being reviewed */}
        {reviewData.license && (
          <div className="mt-6 pt-4 border-t border-border-line">
            <h4 className="font-dm-sans font-medium text-sm text-deep-charcoal mb-2">Credential Under Review</h4>
            <dl className="space-y-2 text-sm font-dm-sans">
              {(reviewData.license as Record<string, unknown>).country && (
                <div className="flex justify-between">
                  <dt className="text-body-slate">Country</dt>
                  <dd className="text-deep-charcoal font-medium">{String((reviewData.license as Record<string, unknown>).country)}</dd>
                </div>
              )}
              {(reviewData.license as Record<string, unknown>).number && (
                <div className="flex justify-between">
                  <dt className="text-body-slate">License Number</dt>
                  <dd className="text-deep-charcoal font-medium">{String((reviewData.license as Record<string, unknown>).number)}</dd>
                </div>
              )}
              {(reviewData.license as Record<string, unknown>).state && (
                <div className="flex justify-between">
                  <dt className="text-body-slate">State</dt>
                  <dd className="text-deep-charcoal font-medium">{String((reviewData.license as Record<string, unknown>).state)}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Board lookup URL */}
        {reviewData.boardLookupUrl && (
          <div className="mt-4">
            <a
              href={String(reviewData.boardLookupUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-dm-sans text-sm text-clinical-teal hover:underline"
            >
              Open verification source
            </a>
          </div>
        )}
      </div>

      {/* Right: Review Data + Actions */}
      <div className="space-y-6">
        <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
          <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">
            Review Details
          </h2>

          <dl className="space-y-3 text-sm font-dm-sans">
            <div className="flex justify-between">
              <dt className="text-body-slate">Type</dt>
              <dd>
                <span className="font-medium text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {typeLabel}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-body-slate">Priority</dt>
              <dd>
                <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
                  {priority.label}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-body-slate mb-1">Reason</dt>
              <dd className="text-deep-charcoal">{review.reason}</dd>
            </div>
          </dl>

          {/* Discrepancies */}
          {discrepancies.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border-line">
              <h4 className="font-dm-sans font-medium text-sm text-deep-charcoal mb-3">Discrepancies Found</h4>
              <div className="space-y-2">
                {discrepancies.map((d, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-[8px] p-3 text-sm font-dm-sans">
                    <p className="font-medium text-amber-800 capitalize">{d.field}</p>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-amber-600">Submitted:</span>{' '}
                        <span className="text-amber-800">{d.submitted || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-amber-600">Found:</span>{' '}
                        <span className="text-amber-800">{d.found || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {review.status === 'pending' && (
          <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
            <h2 className="font-dm-sans font-semibold text-deep-charcoal text-lg mb-4">
              Actions
            </h2>

            {activeAction === null && (
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveAction('approve')}
                  className="flex-1 font-dm-sans font-semibold text-sm py-3 px-4 rounded-[8px] bg-confirm-green text-white hover:bg-confirm-green/90 transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => setActiveAction('reject')}
                  className="flex-1 font-dm-sans font-semibold text-sm py-3 px-4 rounded-[8px] bg-alert-garnet text-white hover:bg-alert-garnet/90 transition"
                >
                  Reject
                </button>
              </div>
            )}

            {activeAction === 'approve' && (
              <div className="space-y-3">
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                  className="w-full font-dm-sans text-sm border border-border-line rounded-[8px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-confirm-green/30 focus:border-confirm-green resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => onApprove(approveNotes)}
                    disabled={isSubmitting}
                    className="flex-1 font-dm-sans font-semibold text-sm py-3 px-4 rounded-[8px] bg-confirm-green text-white hover:bg-confirm-green/90 transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Approving...' : 'Confirm Approval'}
                  </button>
                  <button
                    onClick={() => setActiveAction(null)}
                    disabled={isSubmitting}
                    className="font-dm-sans text-sm py-3 px-4 rounded-[8px] border border-border-line text-body-slate hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {activeAction === 'reject' && (
              <div className="space-y-3">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (required)..."
                  rows={3}
                  className="w-full font-dm-sans text-sm border border-border-line rounded-[8px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-alert-garnet/30 focus:border-alert-garnet resize-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => onReject(rejectReason)}
                    disabled={isSubmitting || rejectReason.trim().length === 0}
                    className="flex-1 font-dm-sans font-semibold text-sm py-3 px-4 rounded-[8px] bg-alert-garnet text-white hover:bg-alert-garnet/90 transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => setActiveAction(null)}
                    disabled={isSubmitting}
                    className="font-dm-sans text-sm py-3 px-4 rounded-[8px] border border-border-line text-body-slate hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
