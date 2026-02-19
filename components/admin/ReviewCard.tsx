import Link from 'next/link';

interface ReviewCardProps {
  review: {
    id: string;
    physicianName: string;
    physicianEmail: string;
    reviewType: string;
    priority: string;
    reason: string;
    slaDeadline: string;
    createdAt?: string;
  };
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

function getSlaStatus(deadline: string): { label: string; isOverdue: boolean } {
  const now = new Date();
  const sla = new Date(deadline);
  const diffMs = sla.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { label: 'Overdue', isOverdue: true };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return { label: `${days}d ${hours % 24}h remaining`, isOverdue: false };
  }

  return { label: `${hours}h ${minutes}m remaining`, isOverdue: false };
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const priority = priorityStyles[review.priority] || priorityStyles.normal;
  const sla = getSlaStatus(review.slaDeadline);
  const typeLabel = reviewTypeLabels[review.reviewType] || review.reviewType;

  return (
    <Link
      href={`/admin/review/${review.id}`}
      className="block bg-white rounded-[12px] border border-border-line shadow-sm hover:shadow-md transition-shadow p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-dm-sans font-semibold text-deep-charcoal text-base truncate">
            {review.physicianName}
          </h3>
          <p className="font-dm-sans text-sm text-body-slate mt-0.5 truncate">
            {review.physicianEmail}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`font-dm-sans text-xs font-medium px-2 py-0.5 rounded-full ${priority.bg} ${priority.text}`}>
            {priority.label}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <span className="font-dm-sans text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {typeLabel}
        </span>
        <span className={`font-dm-sans text-xs font-medium ${sla.isOverdue ? 'text-red-600' : 'text-body-slate'}`}>
          {sla.label}
        </span>
      </div>

      <p className="font-dm-sans text-sm text-body-slate mt-3 line-clamp-2">
        {review.reason}
      </p>
    </Link>
  );
}
