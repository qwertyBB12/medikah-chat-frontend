/**
 * LinkedIn Connect Button Component
 *
 * Initiates LinkedIn OAuth flow for profile data import.
 * Used during physician onboarding to auto-populate profile.
 */

import { useState, useCallback } from 'react';

interface LinkedInConnectButtonProps {
  sessionId: string;
  onConnect?: () => void;
  onError?: (error: string) => void;
  lang?: 'en' | 'es';
  disabled?: boolean;
  className?: string;
}

export default function LinkedInConnectButton({
  sessionId,
  onConnect,
  onError,
  lang = 'en',
  disabled = false,
  className = '',
}: LinkedInConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = useCallback(() => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    onConnect?.();

    // Open LinkedIn OAuth in a popup
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `/api/auth/linkedin?session_id=${encodeURIComponent(sessionId)}`,
      'linkedin-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    );

    if (!popup) {
      setIsLoading(false);
      onError?.(
        lang === 'en'
          ? 'Please allow popups for this site to connect with LinkedIn'
          : 'Por favor permita ventanas emergentes para conectar con LinkedIn'
      );
      return;
    }

    // Poll for popup closure or success
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        setIsLoading(false);

        // Check URL for result (page will reload with params if OAuth completed)
        const urlParams = new URLSearchParams(window.location.search);
        const linkedinStatus = urlParams.get('linkedin');

        if (linkedinStatus === 'error') {
          const errorMsg = urlParams.get('error') || 'LinkedIn connection failed';
          onError?.(errorMsg);
        }
      }
    }, 500);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkPopup);
      if (!popup.closed) {
        popup.close();
      }
      setIsLoading(false);
    }, 5 * 60 * 1000);
  }, [sessionId, disabled, isLoading, onConnect, onError, lang]);

  const buttonText = isLoading
    ? lang === 'en'
      ? 'Connecting...'
      : 'Conectando...'
    : lang === 'en'
    ? 'Connect with LinkedIn'
    : 'Conectar con LinkedIn';

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2
        px-5 py-3 rounded-lg
        font-dm-sans font-semibold text-sm
        bg-[#0A66C2] text-white
        hover:bg-[#004182]
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {/* LinkedIn Logo */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={isLoading ? 'animate-pulse' : ''}
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
      {buttonText}
    </button>
  );
}

/**
 * LinkedIn Profile Preview Component
 * Shows pulled data for user confirmation
 */
interface LinkedInProfilePreviewProps {
  profile: {
    fullName?: string;
    email?: string;
    photoUrl?: string;
    medicalSchool?: string;
    graduationYear?: number;
    currentInstitutions?: string[];
  };
  lang?: 'en' | 'es';
  onConfirm: () => void;
  onEdit: () => void;
  className?: string;
}

export function LinkedInProfilePreview({
  profile,
  lang = 'en',
  onConfirm,
  onEdit,
  className = '',
}: LinkedInProfilePreviewProps) {
  const labels = lang === 'es'
    ? {
        title: 'Datos importados de LinkedIn',
        name: 'Nombre',
        email: 'Correo',
        school: 'Escuela de Medicina',
        gradYear: 'Año de Graduación',
        institutions: 'Instituciones Actuales',
        confirm: 'Confirmar Datos',
        edit: 'Editar',
      }
    : {
        title: 'Data imported from LinkedIn',
        name: 'Name',
        email: 'Email',
        school: 'Medical School',
        gradYear: 'Graduation Year',
        institutions: 'Current Institutions',
        confirm: 'Confirm Data',
        edit: 'Edit',
      };

  return (
    <div className={`bg-white border border-border-line rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </div>
        <h3 className="font-dm-sans font-semibold text-inst-blue">{labels.title}</h3>
      </div>

      <div className="space-y-3 mb-6">
        {profile.photoUrl && (
          <div className="flex justify-center mb-4">
            <img
              src={profile.photoUrl}
              alt={profile.fullName || 'Profile'}
              className="w-20 h-20 rounded-full object-cover border-2 border-clinical-teal"
            />
          </div>
        )}

        {profile.fullName && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-archival-grey">{labels.name}</span>
            <span className="text-sm font-medium text-deep-charcoal">{profile.fullName}</span>
          </div>
        )}

        {profile.email && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-archival-grey">{labels.email}</span>
            <span className="text-sm font-medium text-deep-charcoal">{profile.email}</span>
          </div>
        )}

        {profile.medicalSchool && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-archival-grey">{labels.school}</span>
            <span className="text-sm font-medium text-deep-charcoal">{profile.medicalSchool}</span>
          </div>
        )}

        {profile.graduationYear && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-archival-grey">{labels.gradYear}</span>
            <span className="text-sm font-medium text-deep-charcoal">{profile.graduationYear}</span>
          </div>
        )}

        {profile.currentInstitutions && profile.currentInstitutions.length > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-archival-grey">{labels.institutions}</span>
            <span className="text-sm font-medium text-deep-charcoal">
              {profile.currentInstitutions.join(', ')}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 bg-clinical-teal text-white font-dm-sans font-semibold text-sm rounded-lg hover:bg-clinical-teal-dark transition-colors"
        >
          {labels.confirm}
        </button>
        <button
          onClick={onEdit}
          className="px-4 py-2.5 border border-border-line text-body-slate font-dm-sans font-medium text-sm rounded-lg hover:border-inst-blue hover:text-inst-blue transition-colors"
        >
          {labels.edit}
        </button>
      </div>
    </div>
  );
}
