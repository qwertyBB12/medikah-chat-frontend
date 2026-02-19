/**
 * Physician Dashboard Content Component
 *
 * Main content area for the physician dashboard showing
 * profile overview, verification status, AI diagnosis tool,
 * patient inquiries, availability editor, and network card.
 */

import { useEffect, useState } from 'react';
import { SupportedLang } from '../../lib/i18n';
import { useSupabaseToken } from '../../lib/useSupabaseToken';
import VerificationBadge from './VerificationBadge';
import ProfileOverview from './ProfileOverview';
import AIDiagnosisTool from './AIDiagnosisTool';
import InquiryList from './InquiryList';
import AvailabilityEditor from './AvailabilityEditor';
import ProfileEditor from './editor/ProfileEditor';
import WebsiteEditor from './editor/WebsiteEditor';

interface DashboardContentProps {
  physicianId: string | null;
  physicianName: string;
  verificationStatus: string | null;
  lang: SupportedLang;
}

interface DashboardData {
  specialty?: string;
  photoUrl?: string;
  email?: string;
  inquiryCount: number;
  upcomingAppointments: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
    networkCard: {
      title: 'Medikah Network',
      description: 'You are part of a network of credentialed physicians across the Americas, connecting patients with quality healthcare.',
      membersActive: 'physicians active',
      countriesServed: 'countries served',
    },
  },
  es: {
    welcome: 'Bienvenido de nuevo',
    dashboardTitle: 'Panel del M\u00e9dico',
    statusCard: {
      title: 'Estado de Verificaci\u00f3n',
      pendingDesc: 'Sus credenciales est\u00e1n siendo revisadas. Esto generalmente toma 2-5 d\u00edas h\u00e1biles.',
      underReviewDesc: 'Un especialista en verificaci\u00f3n est\u00e1 revisando sus documentos.',
      verifiedDesc: 'Sus credenciales han sido verificadas. Ya puede recibir consultas.',
      rejectedDesc: 'Se necesita informaci\u00f3n adicional. Por favor revise su correo electr\u00f3nico para m\u00e1s detalles.',
    },
    networkCard: {
      title: 'Red Medikah',
      description: 'Usted es parte de una red de m\u00e9dicos acreditados en las Am\u00e9ricas, conectando pacientes con atenci\u00f3n m\u00e9dica de calidad.',
      membersActive: 'm\u00e9dicos activos',
      countriesServed: 'pa\u00edses atendidos',
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
  const accessToken = useSupabaseToken();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    inquiryCount: 0,
    upcomingAppointments: 0,
  });

  // Fetch dashboard data from backend
  useEffect(() => {
    if (!physicianId || !accessToken) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/physicians/${physicianId}/dashboard`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setDashboardData({
            specialty: data.specialty,
            photoUrl: data.photo_url,
            email: data.email,
            inquiryCount: data.inquiry_count || 0,
            upcomingAppointments: data.upcoming_appointments || 0,
          });
        }
      } catch {
        // Use defaults
      }
    })();
  }, [physicianId, accessToken]);

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

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
      {/* Row 1: Profile Overview + Verification Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Overview */}
        <ProfileOverview
          physicianId={physicianId}
          physicianName={physicianName}
          email={dashboardData.email}
          specialty={dashboardData.specialty}
          photoUrl={dashboardData.photoUrl}
          verificationStatus={verificationStatus}
          inquiryCount={dashboardData.inquiryCount}
          upcomingAppointments={dashboardData.upcomingAppointments}
          lang={lang}
        />

        {/* Verification Status Card */}
        <div className="bg-white rounded-[12px] border border-border-line p-6 shadow-sm">
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
      </div>

      {/* Row 2: AI Diagnosis Tool - Full width */}
      <AIDiagnosisTool lang={lang} accessToken={accessToken} />

      {/* Row 3: Inquiry List - Full width */}
      {physicianId && <InquiryList physicianId={physicianId} lang={lang} accessToken={accessToken} />}

      {/* Row 4: Availability Editor - Full width */}
      {physicianId && <AvailabilityEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}

      {/* Row 5: Profile Editor - Full width */}
      {physicianId && <ProfileEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}

      {/* Row 6: Website Editor - Full width */}
      {physicianId && <WebsiteEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}

      {/* Network Card - Full width */}
      <div className="bg-gradient-to-br from-inst-blue to-[#243447] rounded-[12px] p-6 text-white shadow-lg">
        <h2 className="font-dm-sans font-semibold text-lg mb-3">
          {t.networkCard.title}
        </h2>
        <p className="font-dm-sans text-sm text-white/80 leading-relaxed mb-6">
          {t.networkCard.description}
        </p>
        <div className="flex items-center gap-8">
          <div>
            <p className="font-dm-sans text-3xl font-bold">250+</p>
            <p className="font-dm-sans text-xs text-white/60">{t.networkCard.membersActive}</p>
          </div>
          <div>
            <p className="font-dm-sans text-3xl font-bold">12</p>
            <p className="font-dm-sans text-xs text-white/60">{t.networkCard.countriesServed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
