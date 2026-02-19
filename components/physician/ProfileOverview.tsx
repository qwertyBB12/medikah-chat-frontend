/**
 * ProfileOverview Component
 *
 * Displays physician photo, name, specialty, verification badge,
 * quick stats, and profile completeness.
 */

import { SupportedLang } from '../../lib/i18n';
import { nameToSlug } from '../../lib/slug';
import VerificationBadge from './VerificationBadge';

interface ProfileOverviewProps {
  physicianId: string | null;
  physicianName: string;
  email?: string;
  specialty?: string;
  photoUrl?: string;
  verificationStatus: string | null;
  inquiryCount: number;
  upcomingAppointments: number;
  lang: SupportedLang;
}

const content = {
  en: {
    profileTitle: 'Your Profile',
    pendingInquiries: 'Pending Inquiries',
    upcomingAppts: 'Upcoming Appointments',
    viewPublicProfile: 'View Public Profile',
    editProfile: 'Edit Profile',
    profileCompleteness: 'Profile Completeness',
    completeProfile: 'Complete your profile to improve visibility.',
  },
  es: {
    profileTitle: 'Su Perfil',
    pendingInquiries: 'Consultas Pendientes',
    upcomingAppts: 'Citas Proximas',
    viewPublicProfile: 'Ver Perfil Publico',
    editProfile: 'Editar Perfil',
    profileCompleteness: 'Completitud del Perfil',
    completeProfile: 'Complete su perfil para mejorar su visibilidad.',
  },
};

function computeCompleteness(props: ProfileOverviewProps): number {
  let filled = 0;
  const total = 5;
  if (props.physicianName) filled++;
  if (props.email) filled++;
  if (props.specialty) filled++;
  if (props.photoUrl) filled++;
  if (props.verificationStatus === 'verified') filled++;
  return Math.round((filled / total) * 100);
}

export default function ProfileOverview(props: ProfileOverviewProps) {
  const {
    physicianId,
    physicianName,
    specialty,
    photoUrl,
    verificationStatus,
    inquiryCount,
    upcomingAppointments,
    lang,
  } = props;
  const t = content[lang];
  const firstName = physicianName.split(' ')[0] || physicianName;
  const completeness = computeCompleteness(props);

  return (
    <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={physicianName}
              className="w-16 h-16 rounded-full object-cover border-2 border-clinical-teal/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-clinical-teal/10 flex items-center justify-center">
              <span className="font-dm-sans text-xl font-bold text-clinical-teal">
                {firstName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Name, specialty, badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-dm-sans font-bold text-lg text-deep-charcoal truncate">
              Dr. {physicianName}
            </h2>
            <VerificationBadge status={verificationStatus} lang={lang} size="sm" />
          </div>
          {specialty && (
            <p className="font-dm-sans text-sm text-body-slate mt-0.5">{specialty}</p>
          )}
          {physicianId && (
            <p className="font-dm-sans text-xs text-archival-grey mt-1">
              ID: {physicianId.slice(0, 8)}
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="bg-clinical-surface rounded-lg p-3 text-center">
          <p className="font-dm-sans text-2xl font-bold text-inst-blue">{inquiryCount}</p>
          <p className="font-dm-sans text-xs text-body-slate">{t.pendingInquiries}</p>
        </div>
        <div className="bg-clinical-surface rounded-lg p-3 text-center">
          <p className="font-dm-sans text-2xl font-bold text-clinical-teal">{upcomingAppointments}</p>
          <p className="font-dm-sans text-xs text-body-slate">{t.upcomingAppts}</p>
        </div>
      </div>

      {/* Profile completeness */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-dm-sans text-xs font-medium text-body-slate">
            {t.profileCompleteness}
          </span>
          <span className="font-dm-sans text-xs font-bold text-deep-charcoal">{completeness}%</span>
        </div>
        <div className="h-2 bg-clinical-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completeness >= 80
                ? 'bg-confirm-green'
                : completeness >= 50
                ? 'bg-caution-amber'
                : 'bg-alert-garnet'
            }`}
            style={{ width: `${completeness}%` }}
          />
        </div>
        {completeness < 100 && (
          <p className="font-dm-sans text-xs text-archival-grey mt-1">{t.completeProfile}</p>
        )}
      </div>

      {/* Edit profile button */}
      {physicianId && (
        <button
          onClick={() => document.getElementById('profile-editor')?.scrollIntoView({ behavior: 'smooth' })}
          className="block w-full mt-4 text-center font-dm-sans text-sm font-semibold text-clinical-teal hover:text-clinical-teal/80 transition"
        >
          {t.editProfile}
        </button>
      )}

      {/* Public profile link */}
      {physicianId && verificationStatus === 'verified' && (
        <a
          href={`/dr/${nameToSlug(physicianName)}`}
          className="block mt-2 text-center font-dm-sans text-sm font-semibold text-clinical-teal hover:text-clinical-teal/80 transition"
        >
          {t.viewPublicProfile}
        </a>
      )}
    </div>
  );
}
