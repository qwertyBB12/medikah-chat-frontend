/**
 * Physician Dashboard Content Component
 *
 * Main content area for the physician dashboard showing
 * profile overview, verification status, AI diagnosis tool,
 * patient inquiries, availability editor, and network card.
 */

import { useCallback, useEffect, useState } from 'react';
import { SupportedLang } from '../../lib/i18n';
import { useSupabaseToken } from '../../lib/useSupabaseToken';
import VerificationBadge from './VerificationBadge';
import ProfileOverview from './ProfileOverview';
import AIDiagnosisTool from './AIDiagnosisTool';
import InquiryList from './InquiryList';
import AvailabilityEditor from './AvailabilityEditor';
import ProfileEditor from './editor/ProfileEditor';
import WebsiteEditor from './editor/WebsiteEditor';
import USCredentialSection from './credentials/USCredentialSection';
import MXCredentialSection from './credentials/MXCredentialSection';
import ContactInfoSection from './ContactInfoSection';
import { computeCompleteness } from '../../lib/completenessService';
import type { CompletenessResult } from '../../lib/completenessService';
import { getContactInfo } from '../../lib/contactClient';
import type { ContactInfo } from '../../lib/contactTypes';
import { getCredentials } from '../../lib/credentialClient';
import type { CredentialResponse } from '../../lib/credentialTypes';
import { getMXCredentials } from '../../lib/mxCredentialClient';
import type { MXCredentialResponse } from '../../lib/mxCredentialTypes';

interface DashboardContentProps {
  physicianId: string | null;
  physicianName: string;
  verificationStatus: string | null;
  lang: SupportedLang;
  profilePhotoUrl?: string;
  profileEmail?: string;
  profileSpecialty?: string;
  initialCountryOfPractice?: string[];
}

interface DashboardData {
  specialty?: string;
  photoUrl?: string;
  email?: string;
  inquiryCount: number;
  upcomingAppointments: number;
  countryOfPractice?: string[];
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
    credentialSection: {
      title: 'Credentialing',
      subtitle: 'Complete your US credential profile at your own pace.',
    },
    mxCredentialSection: {
      title: 'Mexico Credentials',
      subtitle: 'Complete your Mexico credential profile at your own pace.',
    },
    usCredentialHeader: '🇺🇸 US Credentials',
    mxCredentialHeader: '🇲🇽 Mexico Credentials',
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
    credentialSection: {
      title: 'Acreditacion',
      subtitle: 'Complete su perfil de credenciales de EE.UU. a su propio ritmo.',
    },
    mxCredentialSection: {
      title: 'Credenciales de Mexico',
      subtitle: 'Complete su perfil de credenciales de Mexico a su propio ritmo.',
    },
    usCredentialHeader: '🇺🇸 Credenciales de EE.UU.',
    mxCredentialHeader: '🇲🇽 Credenciales de Mexico',
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
  profilePhotoUrl,
  profileEmail,
  profileSpecialty,
  initialCountryOfPractice,
}: DashboardContentProps) {
  const t = content[lang];
  const normalizedStatus = verificationStatus?.toLowerCase() || 'pending';
  const accessToken = useSupabaseToken();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    inquiryCount: 0,
    upcomingAppointments: 0,
  });
  const [countryOfPractice, setCountryOfPractice] = useState<string[]>(initialCountryOfPractice || []);

  // Sync when prop arrives after async profile fetch
  useEffect(() => {
    if (initialCountryOfPractice && initialCountryOfPractice.length > 0) {
      setCountryOfPractice(initialCountryOfPractice);
    }
  }, [initialCountryOfPractice]);

  // Phase 7 completeness state
  const [contactInfo, setContactInfo] = useState<Partial<ContactInfo>>({});
  const [usCredentials, setUSCredentials] = useState<CredentialResponse | null>(null);
  const [mxCredentials, setMXCredentials] = useState<MXCredentialResponse | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessResult>({ percentage: 0, missingItems: [] });

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
            countryOfPractice: data.country_of_practice,
          });
          if (Array.isArray(data.country_of_practice)) {
            setCountryOfPractice(data.country_of_practice);
          }
        }

      } catch {
        // Use defaults
      }
    })();
  }, [physicianId, accessToken]);

  // Fetch completeness data (credentials + contact) when physicianId and countryOfPractice are ready
  useEffect(() => {
    if (!physicianId) return;

    async function fetchCompletenessData() {
      const [contactRes, usRes, mxRes] = await Promise.all([
        getContactInfo(physicianId!),
        getCredentials(physicianId!),
        countryOfPractice.includes('MX')
          ? getMXCredentials(physicianId!)
          : Promise.resolve({ success: true, data: null as MXCredentialResponse | null }),
      ]);

      const contact = contactRes.success ? (contactRes.data || {}) : {};
      const usCreds = usRes.success ? (usRes.data || null) : null;
      const mxCreds = mxRes.success ? (mxRes.data || null) : null;

      setContactInfo(contact);
      setUSCredentials(usCreds);
      setMXCredentials(mxCreds);

      const result = computeCompleteness(countryOfPractice, usCreds, mxCreds, contact);
      setCompleteness(result);
    }

    fetchCompletenessData();
  }, [physicianId, countryOfPractice]);

  // Recalculate completeness when contact info changes (auto-save callback)
  const handleContactChange = useCallback(
    (updatedContact: Partial<ContactInfo>) => {
      setContactInfo(updatedContact);
      const result = computeCompleteness(countryOfPractice, usCredentials, mxCredentials, updatedContact);
      setCompleteness(result);
    },
    [countryOfPractice, usCredentials, mxCredentials]
  );

  // Derived: dual-credential flag
  const isDualCredential =
    countryOfPractice.includes('US') && countryOfPractice.includes('MX');

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
          email={dashboardData.email || profileEmail}
          specialty={dashboardData.specialty || profileSpecialty}
          photoUrl={dashboardData.photoUrl || profilePhotoUrl}
          verificationStatus={verificationStatus}
          inquiryCount={dashboardData.inquiryCount}
          upcomingAppointments={dashboardData.upcomingAppointments}
          lang={lang}
          completenessPercentage={completeness.percentage}
          missingItems={completeness.missingItems}
        />

        {/* Verification Status Card */}
        <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body font-semibold text-lg text-deep-charcoal">
              {t.statusCard.title}
            </h2>
            <VerificationBadge status={verificationStatus} lang={lang} />
          </div>
          <p className="font-body text-sm text-body-slate leading-relaxed">
            {getStatusDescription()}
          </p>

          {/* Status progress indicator */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-body text-xs text-archival-grey">
                {lang === 'en' ? 'Progress' : 'Progreso'}
              </span>
            </div>
            <div className="h-2 bg-linen-warm/40 rounded-full overflow-hidden">
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
              <span className="font-body text-xs text-archival-grey">
                {lang === 'en' ? 'Submitted' : 'Enviado'}
              </span>
              <span className="font-body text-xs text-archival-grey">
                {lang === 'en' ? 'Verified' : 'Verificado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: AI Diagnosis Tool - Full width */}
      <AIDiagnosisTool lang={lang} accessToken={accessToken} />

      {/* Row 2.5: Contact & Practice Info — shared section above credentials (D-05) */}
      {physicianId && (
        <ContactInfoSection
          physicianId={physicianId}
          lang={lang}
          onContactChange={handleContactChange}
        />
      )}

      {/* Row 3: Credential sections with country headers */}

      {/* Dual-credential: both US and MX with country flag headers (DUAL-02, D-10) */}
      {physicianId && isDualCredential && (
        <>
          {/* US Credentials with country header */}
          <div id="us-credential-section" className="space-y-2">
            <h2 className="font-body text-base font-bold text-deep-charcoal">
              {lang === 'es' ? t.usCredentialHeader : t.usCredentialHeader}
            </h2>
            <USCredentialSection physicianId={physicianId} lang={lang} />
          </div>

          {/* MX Credentials with country header — 32px gap (D-10) */}
          <div id="mx-credential-section" className="space-y-2 mt-8">
            <h2 className="font-body text-base font-bold text-deep-charcoal">
              {lang === 'es' ? t.mxCredentialHeader : t.mxCredentialHeader}
            </h2>
            <MXCredentialSection physicianId={physicianId} lang={lang} />
          </div>
        </>
      )}

      {/* Single-country: US-only (or legacy physicians without countryOfPractice) */}
      {physicianId && !isDualCredential && (countryOfPractice.length === 0 || countryOfPractice.includes('US')) && (
        <div id="us-credential-section" className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-body font-semibold text-lg text-deep-charcoal">
                {t.credentialSection.title}
              </h2>
              <p className="font-body text-sm text-body-slate">
                {t.credentialSection.subtitle}
              </p>
            </div>
          </div>
          <USCredentialSection physicianId={physicianId} lang={lang} />
        </div>
      )}

      {/* Single-country: MX-only */}
      {physicianId && !isDualCredential && countryOfPractice.includes('MX') && (
        <div id="mx-credential-section" className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-body font-semibold text-lg text-deep-charcoal">
                {t.mxCredentialSection.title}
              </h2>
              <p className="font-body text-sm text-body-slate">
                {t.mxCredentialSection.subtitle}
              </p>
            </div>
          </div>
          <MXCredentialSection physicianId={physicianId} lang={lang} />
        </div>
      )}

      {/* Row 4: Inquiry List - Full width */}
      {physicianId && <InquiryList physicianId={physicianId} lang={lang} accessToken={accessToken} />}

      {/* Row 5: Availability Editor - Full width */}
      {physicianId && <AvailabilityEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}

      {/* Row 6: Profile Editor - Full width */}
      {physicianId && <ProfileEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}

      {/* Row 7: Website Editor - Full width */}
      {physicianId && <WebsiteEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}

      {/* Network Card - Full width */}
      <div className="bg-gradient-to-br from-inst-blue to-[#243447] rounded-[12px] p-6 text-white shadow-lg">
        <h2 className="font-body font-semibold text-lg mb-3">
          {t.networkCard.title}
        </h2>
        <p className="font-body text-sm text-white/80 leading-relaxed mb-6">
          {t.networkCard.description}
        </p>
        <div className="flex items-center gap-8">
          <div>
            <p className="font-body text-3xl font-bold">250+</p>
            <p className="font-body text-xs text-white/60">{t.networkCard.membersActive}</p>
          </div>
          <div>
            <p className="font-body text-3xl font-bold">12</p>
            <p className="font-body text-xs text-white/60">{t.networkCard.countriesServed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
