/**
 * Physician Dashboard Content Component
 *
 * Main content area for the physician dashboard showing
 * welcome message, verification status, and quick actions.
 */

import { SupportedLang } from '../../lib/i18n';
import VerificationBadge from './VerificationBadge';

interface DashboardContentProps {
  physicianId: string | null;
  physicianName: string;
  verificationStatus: string | null;
  lang: SupportedLang;
}

const content = {
  en: {
    welcome: 'Welcome back',
    dashboardTitle: 'Physician Dashboard',
    statusCard: {
      title: 'Verification Status',
      pendingDesc: 'Your credentials are being reviewed. This usually takes 2-5 business days.',
      underReviewDesc: 'A verification specialist is reviewing your documents.',
      verifiedDesc: 'Your credentials have been verified. You can now receive consultations.',
      rejectedDesc: 'Additional information is needed. Please check your email for details.',
    },
    profileCard: {
      title: 'Your Profile',
      viewProfile: 'View Profile',
      editProfile: 'Edit Profile',
    },
    actionsCard: {
      title: 'Quick Actions',
      viewConsultations: 'View Consultations',
      updateAvailability: 'Update Availability',
      viewDocuments: 'View Documents',
      contactSupport: 'Contact Support',
    },
    networkCard: {
      title: 'Medikah Network',
      description: 'You are part of a network of credentialed physicians across the Americas, connecting patients with quality healthcare.',
      membersActive: 'physicians active',
      countriesServed: 'countries served',
    },
  },
  es: {
    welcome: 'Bienvenido de nuevo',
    dashboardTitle: 'Panel del Médico',
    statusCard: {
      title: 'Estado de Verificación',
      pendingDesc: 'Sus credenciales están siendo revisadas. Esto generalmente toma 2-5 días hábiles.',
      underReviewDesc: 'Un especialista en verificación está revisando sus documentos.',
      verifiedDesc: 'Sus credenciales han sido verificadas. Ya puede recibir consultas.',
      rejectedDesc: 'Se necesita información adicional. Por favor revise su correo electrónico para más detalles.',
    },
    profileCard: {
      title: 'Su Perfil',
      viewProfile: 'Ver Perfil',
      editProfile: 'Editar Perfil',
    },
    actionsCard: {
      title: 'Acciones Rápidas',
      viewConsultations: 'Ver Consultas',
      updateAvailability: 'Actualizar Disponibilidad',
      viewDocuments: 'Ver Documentos',
      contactSupport: 'Contactar Soporte',
    },
    networkCard: {
      title: 'Red Medikah',
      description: 'Usted es parte de una red de médicos acreditados en las Américas, conectando pacientes con atención médica de calidad.',
      membersActive: 'médicos activos',
      countriesServed: 'países atendidos',
    },
  },
};

export default function DashboardContent({
  physicianId,
  physicianName,
  verificationStatus,
  lang,
}: DashboardContentProps) {
  const t = content[lang];
  const normalizedStatus = verificationStatus?.toLowerCase() || 'pending';

  // Get status description
  const getStatusDescription = () => {
    switch (normalizedStatus) {
      case 'verified':
        return t.statusCard.verifiedDesc;
      case 'under_review':
        return t.statusCard.underReviewDesc;
      case 'rejected':
        return t.statusCard.rejectedDesc;
      default:
        return t.statusCard.pendingDesc;
    }
  };

  // Extract first name for greeting
  const firstName = physicianName.split(' ')[0] || physicianName;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <p className="font-dm-sans text-sm text-body-slate mb-1">{t.welcome},</p>
        <h1 className="font-dm-serif text-3xl text-inst-blue mb-2">
          Dr. {firstName}
        </h1>
        <p className="font-dm-sans text-sm text-archival-grey">
          {physicianId ? `ID: ${physicianId.slice(0, 8)}` : ''}
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verification Status Card */}
        <div className="bg-white rounded-xl border border-border-line p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-dm-sans font-semibold text-lg text-deep-charcoal">
              {t.statusCard.title}
            </h2>
            <VerificationBadge status={verificationStatus} lang={lang} />
          </div>
          <p className="font-dm-sans text-sm text-body-slate leading-relaxed">
            {getStatusDescription()}
          </p>

          {/* Status progress indicator */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-dm-sans text-xs text-archival-grey">
                {lang === 'en' ? 'Progress' : 'Progreso'}
              </span>
            </div>
            <div className="h-2 bg-clinical-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  normalizedStatus === 'verified'
                    ? 'w-full bg-emerald-500'
                    : normalizedStatus === 'under_review'
                    ? 'w-2/3 bg-blue-500'
                    : normalizedStatus === 'rejected'
                    ? 'w-1/3 bg-red-500'
                    : 'w-1/3 bg-amber-500'
                }`}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-dm-sans text-xs text-archival-grey">
                {lang === 'en' ? 'Submitted' : 'Enviado'}
              </span>
              <span className="font-dm-sans text-xs text-archival-grey">
                {lang === 'en' ? 'Verified' : 'Verificado'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-xl border border-border-line p-6 shadow-sm">
          <h2 className="font-dm-sans font-semibold text-lg text-deep-charcoal mb-4">
            {t.actionsCard.title}
          </h2>
          <div className="space-y-3">
            <button
              disabled={normalizedStatus !== 'verified'}
              className="font-dm-sans w-full text-left px-4 py-3 rounded-lg border border-border-line text-body-slate hover:bg-clinical-surface hover:text-inst-blue hover:border-clinical-teal transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.actionsCard.viewConsultations}
            </button>
            <button
              disabled={normalizedStatus !== 'verified'}
              className="font-dm-sans w-full text-left px-4 py-3 rounded-lg border border-border-line text-body-slate hover:bg-clinical-surface hover:text-inst-blue hover:border-clinical-teal transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.actionsCard.updateAvailability}
            </button>
            <button className="font-dm-sans w-full text-left px-4 py-3 rounded-lg border border-border-line text-body-slate hover:bg-clinical-surface hover:text-inst-blue hover:border-clinical-teal transition">
              {t.actionsCard.viewDocuments}
            </button>
            <button className="font-dm-sans w-full text-left px-4 py-3 rounded-lg border border-border-line text-body-slate hover:bg-clinical-surface hover:text-inst-blue hover:border-clinical-teal transition">
              {t.actionsCard.contactSupport}
            </button>
          </div>
        </div>

        {/* Network Card - Full width */}
        <div className="md:col-span-2 bg-gradient-to-br from-inst-blue to-[#243447] rounded-xl p-6 text-white shadow-lg">
          <h2 className="font-dm-sans font-semibold text-lg mb-3">
            {t.networkCard.title}
          </h2>
          <p className="font-dm-sans text-sm text-white/80 leading-relaxed mb-6">
            {t.networkCard.description}
          </p>
          <div className="flex items-center gap-8">
            <div>
              <p className="font-dm-serif text-3xl font-bold">250+</p>
              <p className="font-dm-sans text-xs text-white/60">{t.networkCard.membersActive}</p>
            </div>
            <div>
              <p className="font-dm-serif text-3xl font-bold">12</p>
              <p className="font-dm-sans text-xs text-white/60">{t.networkCard.countriesServed}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
