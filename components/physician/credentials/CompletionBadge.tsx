/** Shared CompletionBadge — extracted from USCredentialSection for reuse (Phase 7 D-09). */

export type CompletionStatus = 'empty' | 'in_progress' | 'complete';

interface CompletionBadgeProps {
  status: CompletionStatus;
  label: string;
}

export default function CompletionBadge({ status, label }: CompletionBadgeProps) {
  if (status === 'complete') {
    return (
      <span className="flex items-center gap-1 font-dm-sans text-xs text-confirm-green bg-confirm-green/10 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        {label}
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="flex items-center gap-1 font-dm-sans text-xs text-caution-amber bg-caution-amber/10 px-2 py-0.5 rounded-full">
        <span className="w-2 h-2 rounded-full bg-caution-amber inline-block" />
        {label}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 font-dm-sans text-xs text-archival-grey bg-warm-gray-800/[0.06] px-2 py-0.5 rounded-full">
      <span className="w-2 h-2 rounded-full bg-archival-grey/40 inline-block" />
      {label}
    </span>
  );
}
