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
  pending: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    en: 'Pending Review',
    es: 'Revisión Pendiente',
  },
  under_review: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    en: 'Under Review',
    es: 'En Revisión',
  },
  verified: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    en: 'Verified',
    es: 'Verificado',
  },
  rejected: {
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    en: 'Action Required',
    es: 'Acción Requerida',
  },
  expired: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
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
          ${normalizedStatus === 'verified' ? 'bg-emerald-500' : ''}
          ${normalizedStatus === 'pending' ? 'bg-amber-500' : ''}
          ${normalizedStatus === 'under_review' ? 'bg-blue-500' : ''}
          ${normalizedStatus === 'rejected' ? 'bg-red-500' : ''}
          ${normalizedStatus === 'expired' ? 'bg-gray-500' : ''}
        `}
      />
      {lang === 'en' ? config.en : config.es}
    </span>
  );
}
