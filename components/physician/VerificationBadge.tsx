/**
 * Verification Badge Component
 *
 * Displays the physician's verification status with appropriate styling.
 */

import { SupportedLang } from '../../lib/i18n';

interface VerificationBadgeProps {
  status: string | null;
  lang: SupportedLang;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  en: string;
  es: string;
}> = {
  // Brand semantic palette (5-zone alert tokens) — matches ProfileOverview's
  // completeness bar + DashboardContent status bar so the whole card speaks ONE
  // palette (UI/UX review 2026-06-22, fix #2). bg/border are low-opacity tints
  // of the same token; text + dot are full strength.
  pending: {
    color: 'text-caution-amber',
    bgColor: 'bg-caution-amber/10',
    borderColor: 'border-caution-amber/20',
    en: 'Pending Review',
    es: 'Revisión Pendiente',
  },
  under_review: {
    color: 'text-info-blue',
    bgColor: 'bg-info-blue/10',
    borderColor: 'border-info-blue/20',
    en: 'Under Review',
    es: 'En Revisión',
  },
  verified: {
    color: 'text-confirm-green',
    bgColor: 'bg-confirm-green/10',
    borderColor: 'border-confirm-green/20',
    en: 'Verified',
    es: 'Verificado',
  },
  rejected: {
    color: 'text-alert-garnet',
    bgColor: 'bg-alert-garnet/10',
    borderColor: 'border-alert-garnet/20',
    en: 'Action Required',
    es: 'Acción Requerida',
  },
  expired: {
    color: 'text-archival-grey',
    bgColor: 'bg-archival-grey/10',
    borderColor: 'border-archival-grey/20',
    en: 'Expired',
    es: 'Expirado',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function VerificationBadge({
  status,
  lang,
  size = 'md',
}: VerificationBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || 'pending';
  const config = statusConfig[normalizedStatus] || statusConfig.pending;

  return (
    <span
      className={`
        inline-flex items-center font-dm-sans font-medium rounded-full border
        ${config.color} ${config.bgColor} ${config.borderColor}
        ${sizeClasses[size]}
      `}
    >
      {/* Status dot */}
      <span
        className={`
          w-1.5 h-1.5 rounded-full mr-1.5
          ${normalizedStatus === 'verified' ? 'bg-confirm-green' : ''}
          ${normalizedStatus === 'pending' ? 'bg-caution-amber' : ''}
          ${normalizedStatus === 'under_review' ? 'bg-info-blue' : ''}
          ${normalizedStatus === 'rejected' ? 'bg-alert-garnet' : ''}
          ${normalizedStatus === 'expired' ? 'bg-archival-grey' : ''}
        `}
      />
      {lang === 'en' ? config.en : config.es}
    </span>
  );
}
