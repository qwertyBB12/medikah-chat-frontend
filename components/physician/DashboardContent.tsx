/**
 * Physician Dashboard Content Component
 *
 * Main content area for the physician dashboard showing
 * profile overview, verification status, AI diagnosis tool,
 * patient inquiries, availability editor, and network card.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { SupportedLang } from '../../lib/i18n';
import { useBackendToken } from '../../lib/useBackendToken';
import VerificationBadge from './VerificationBadge';
import DashboardWelcomeCard from './DashboardWelcomeCard';
import ProfileOverview from './ProfileOverview';
import ClinicalSupportTool from './ClinicalSupportTool';
import InquiryList from './InquiryList';
import AvailabilityEditor from './AvailabilityEditor';
import ProfileEditor from './editor/ProfileEditor';
import WebsiteEditor from './editor/WebsiteEditor';
import { nameToSlug } from '../../lib/slug';
import USCredentialSection from './credentials/USCredentialSection';
import MXCredentialSection from './credentials/MXCredentialSection';
import ContactInfoSection from './ContactInfoSection';
import EducationSection from './EducationSection';
import WorkspaceTabContainer from './workspace/WorkspaceTabContainer';
import { PHYSICIAN_INQUIRIES_OPEN, CLINICAL_SUPPORT_IN_DASH } from '../../lib/featureFlags';
import { computeCompleteness } from '../../lib/completenessService';
import type { CompletenessResult } from '../../lib/completenessService';
import { getContactInfo } from '../../lib/contactClient';
import type { ContactInfo } from '../../lib/contactTypes';
import { getCredentials } from '../../lib/credentialClient';
import type { CredentialResponse } from '../../lib/credentialTypes';
import { getMXCredentials } from '../../lib/mxCredentialClient';
import type { MXCredentialResponse } from '../../lib/mxCredentialTypes';
import { toggleCountry } from '../../lib/licensing';
import { getSpecialties } from '../../lib/specialtyClient';
import type { PhysicianSpecialty } from '../../lib/specialtyTypes';

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

// U1 (Aguirre audit): split the long mixed dashboard into top-level tabs so
// credentialing (internal verification) is clearly separated from the public
// profile (what patients see). Availability + Workspace get their own tabs to
// tame the long scroll.
type DashboardTab = 'credentials' | 'profile' | 'availability' | 'workspace';
const VALID_DASHBOARD_TABS = new Set<DashboardTab>([
  'credentials',
  'profile',
  'availability',
  'workspace',
]);

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
    licensedIn: {
      title: 'Where are you licensed to practice?',
      subtitle: 'This determines which credentials we ask for. You can change it anytime.',
      us: 'United States',
      mx: 'Mexico',
    },
    tabs: {
      credentials: 'Credentials',
      profile: 'Public Profile',
      availability: 'Availability',
      workspace: 'Workspace',
    },
    networkCard: {
      title: 'Medikah Network',
      description: 'You are part of a network of credentialed physicians across the Americas, connecting patients with quality healthcare.',
      launchingCopy: 'Launching across the Americas.',
    },
    preview: {
      title: 'Your public profile',
      hint: 'See exactly what patients see on your live profile page.',
      button: 'Preview public profile',
      unavailable: 'Your public profile goes live once your credentials are verified.',
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
    licensedIn: {
      title: '¿Dónde tiene licencia para ejercer?',
      subtitle: 'Esto determina qué credenciales le pedimos. Puede cambiarlo cuando quiera.',
      us: 'Estados Unidos',
      mx: 'México',
    },
    tabs: {
      credentials: 'Credenciales',
      profile: 'Perfil Público',
      availability: 'Disponibilidad',
      workspace: 'Espacio de Trabajo',
    },
    networkCard: {
      title: 'Red Medikah',
      description: 'Usted es parte de una red de m\u00e9dicos acreditados en las Am\u00e9ricas, conectando pacientes con atenci\u00f3n m\u00e9dica de calidad.',
      launchingCopy: 'Lanzando en todo el continente.',
    },
    preview: {
      title: 'Su perfil p\u00fablico',
      hint: 'Vea exactamente lo que ven los pacientes en su perfil p\u00fablico.',
      button: 'Vista previa del perfil p\u00fablico',
      unavailable: 'Su perfil p\u00fablico se activa una vez que sus credenciales sean verificadas.',
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
  const accessToken = useBackendToken();
  const router = useRouter();

  // U1: active top-level tab. Defaults to Credentials. Hydrates from `?section=`
  // so deep links (e.g. welcome email → profile) land on the right tab.
  const [activeTab, setActiveTab] = useState<DashboardTab>('credentials');
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.section;
    const candidate = Array.isArray(q) ? q[0] : q;
    if (candidate && VALID_DASHBOARD_TABS.has(candidate as DashboardTab)) {
      setActiveTab(candidate as DashboardTab);
    }
  }, [router.isReady, router.query.section]);

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
  const [specialtiesData, setSpecialtiesData] = useState<PhysicianSpecialty[]>([]);

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
      const [contactRes, usRes, mxRes, specRes] = await Promise.all([
        getContactInfo(physicianId!),
        getCredentials(physicianId!),
        countryOfPractice.includes('MX')
          ? getMXCredentials(physicianId!)
          : Promise.resolve({ success: true, data: null as MXCredentialResponse | null }),
        getSpecialties(physicianId!),
      ]);

      const contact = contactRes.success ? (contactRes.data || {}) : {};
      const usCreds = usRes.success ? (usRes.data || null) : null;
      const mxCreds = mxRes.success ? (mxRes.data || null) : null;
      const specs = specRes.success && specRes.data ? specRes.data.specialties : [];

      setContactInfo(contact);
      setUSCredentials(usCreds);
      setMXCredentials(mxCreds);
      setSpecialtiesData(specs);

      const result = computeCompleteness(countryOfPractice, usCreds, mxCreds, contact, specs);
      setCompleteness(result);
    }

    fetchCompletenessData();
  }, [physicianId, countryOfPractice]);

  // Recalculate completeness when contact info changes (auto-save callback)
  const handleContactChange = useCallback(
    (updatedContact: Partial<ContactInfo>) => {
      setContactInfo(updatedContact);
      const result = computeCompleteness(countryOfPractice, usCredentials, mxCredentials, updatedContact, specialtiesData);
      setCompleteness(result);
    },
    [countryOfPractice, usCredentials, mxCredentials, specialtiesData]
  );

  // Derived: dual-credential flag
  const isDualCredential =
    countryOfPractice.includes('US') && countryOfPractice.includes('MX');

  // U6: dual-credential gate. The physician checks United States and/or Mexico
  // (Annotation 1 — "Both" removed). Persists country_of_practice optimistically.
  const handleCountryToggle = useCallback(
    async (code: 'US' | 'MX') => {
      const codes = toggleCountry(countryOfPractice, code);
      setCountryOfPractice(codes);
      if (!physicianId) return;
      try {
        await fetch(`/api/physicians/${physicianId}/update-profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ countryOfPractice: codes }),
        });
      } catch {
        // Optimistic — the UI already reflects the choice; a failed save retries on next change.
      }
    },
    [countryOfPractice, physicianId]
  );

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
      {/* First-visit orientation while verification is pending (journey P2):
          what's happening, what to do meanwhile, what arrives when verified.
          Dismissible; gone for good once the doctor is verified. */}
      {normalizedStatus !== 'verified' && (
        <DashboardWelcomeCard
          physicianId={physicianId}
          lang={lang}
          onGoToTab={(tab) => setActiveTab(tab)}
        />
      )}

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
        <div className="bg-linen-white rounded-md border border-warm-gray-800/[0.06] p-6 shadow-sm">
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
                    ? 'w-full bg-confirm-green'
                    : normalizedStatus === 'under_review'
                    ? 'w-2/3 bg-info-blue'
                    : normalizedStatus === 'rejected'
                    ? 'w-1/3 bg-alert-garnet'
                    : 'w-1/3 bg-caution-amber'
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

      {/* U1 (Aguirre audit): top-level tab bar separating Credentials (internal
          verification) from Public Profile (patient-facing), plus Availability
          and Workspace. Replaces the long single-scroll mixed form. */}
      <div className="flex flex-wrap gap-2 border-b border-warm-gray-800/[0.08] pb-2">
        {([
          { key: 'credentials', label: t.tabs.credentials },
          { key: 'profile', label: t.tabs.profile },
          { key: 'availability', label: t.tabs.availability },
          ...(normalizedStatus === 'verified'
            ? [{ key: 'workspace' as DashboardTab, label: t.tabs.workspace }]
            : []),
        ] as Array<{ key: DashboardTab; label: string }>).map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-md font-body text-sm font-medium transition-all ${
                isActive
                  ? 'bg-clinical-teal text-white'
                  : 'bg-linen text-body-slate hover:bg-linen/70'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Credentials tab: contact info + formal credential records ── */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          {/* U6: dual-credential gate — pick US / Mexico / Both; only the
              relevant credential sections render below. */}
          {physicianId && (
            <div className="bg-linen-white rounded-md border border-warm-gray-800/[0.06] p-5">
              <h3 className="font-body font-semibold text-sm text-deep-charcoal">
                {t.licensedIn.title}
              </h3>
              <p className="font-body text-xs text-body-slate mt-1 mb-3">
                {t.licensedIn.subtitle}
              </p>
              <div className="flex flex-wrap gap-2">
                {([
                  { code: 'US' as const, label: t.licensedIn.us },
                  { code: 'MX' as const, label: t.licensedIn.mx },
                ]).map(({ code, label }) => {
                  const isOn = countryOfPractice.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleCountryToggle(code)}
                      role="checkbox"
                      aria-checked={isOn}
                      className={`px-4 py-2 rounded-md font-body text-sm font-medium transition-all flex items-center gap-2 ${
                        isOn
                          ? 'bg-clinical-teal text-white'
                          : 'bg-linen text-body-slate hover:bg-linen/70'
                      }`}
                    >
                      <span aria-hidden="true">{isOn ? '✓' : '✕'}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact & Practice Info — shared section above credentials (D-05) */}
          {physicianId && (
            <ContactInfoSection
              physicianId={physicianId}
              lang={lang}
              onContactChange={handleContactChange}
            />
          )}

          {/* Education & Training — canonical home (Phase B2); country-agnostic.
              Public Profile becomes a visibility layer over this store. */}
          {physicianId && <EducationSection physicianId={physicianId} lang={lang} />}

          {/* Credential sections with country headers */}

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
        </div>
      )}

      {/* ── Public Profile tab: what patients see ── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Preview public profile (Aguirre annotation E). Only verified
              physicians have a live /dr/[slug]; unverified ones would 404, so the
              link is shown only when verified. */}
          <div className="bg-white rounded-md border border-border-line shadow-sm p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-dm-sans font-semibold text-lg text-deep-charcoal">{t.preview.title}</h2>
              <p className="font-dm-sans text-sm text-body-slate mt-1">
                {normalizedStatus === 'verified' ? t.preview.hint : t.preview.unavailable}
              </p>
            </div>
            {normalizedStatus === 'verified' && physicianName && (
              <a
                href={`/dr/${nameToSlug(physicianName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-dm-sans text-sm font-semibold px-5 py-2.5 rounded-lg bg-clinical-teal text-white hover:bg-clinical-teal/90 transition whitespace-nowrap inline-flex items-center gap-2 self-start"
              >
                {t.preview.button}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          {physicianId && <ProfileEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}
          {physicianId && <WebsiteEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}
        </div>
      )}

      {/* ── Availability tab: scheduling + (flag-gated) inquiries / AI tool ── */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          {/* Clinical Support Tool — hidden for soft launch; the Cue
              clinical-support card is the live surface
              (see CLINICAL_SUPPORT_IN_DASH in lib/featureFlags.ts). */}
          {CLINICAL_SUPPORT_IN_DASH && <ClinicalSupportTool lang={lang} accessToken={accessToken} />}
          {/* Inquiry List — hidden for the physicians-only soft launch
              (see PHYSICIAN_INQUIRIES_OPEN in lib/featureFlags.ts). */}
          {PHYSICIAN_INQUIRIES_OPEN && physicianId && <InquiryList physicianId={physicianId} lang={lang} accessToken={accessToken} />}
          {physicianId && <AvailabilityEditor physicianId={physicianId} lang={lang} accessToken={accessToken} />}
        </div>
      )}

      {/* ── Workspace tab (Práctikah) — Mailbox / Calendar / Site / Settings.
          Only verified physicians have a provisioned workspace. ── */}
      {activeTab === 'workspace' && physicianId && normalizedStatus === 'verified' && (
        <WorkspaceTabContainer
          physicianId={physicianId}
          lang={lang}
          accessToken={accessToken}
          physicianFullName={physicianName}
        />
      )}

      {/* Network Card - Full width */}
      <div className="bg-gradient-to-br from-inst-blue to-[#243447] rounded-md p-6 text-white shadow-lg">
        <h2 className="font-body font-semibold text-lg mb-3">
          {t.networkCard.title}
        </h2>
        <p className="font-body text-sm text-white/80 leading-relaxed mb-6">
          {t.networkCard.description}
        </p>
        <p className="font-body text-sm text-white/60 italic">
          {t.networkCard.launchingCopy}
        </p>
      </div>
    </div>
  );
}
