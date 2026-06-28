/**
 * USCredentialSection — Vertical accordion container for US credential forms.
 * Four panels: NPI, State Licenses, Specialties (unified primary + subspecialties
 * with per-row board-certified), and — historically — separate board/sub panels.
 * Phase B1 (Annotation 3) collapsed Board Certifications + Sub-specialties into the
 * single canonical Specialties panel backed by physician_specialties.
 * Loads credential + specialty data on mount, passes to sub-forms with auto-save.
 */

import { useState, useEffect, useCallback } from 'react';
import type { CredentialResponse } from '../../../lib/credentialTypes';
import { getCredentials } from '../../../lib/credentialClient';
import type { PhysicianSpecialty } from '../../../lib/specialtyTypes';
import { getSpecialties } from '../../../lib/specialtyClient';
import type { SupportedLang } from '../../../lib/i18n';
import NPIForm from './NPIForm';
import StateLicenseForm from './StateLicenseForm';
import SpecialtiesSection from './SpecialtiesSection';
import USIdentityForm from './USIdentityForm';
import CompletionBadge from './CompletionBadge';
import type { CompletionStatus } from './CompletionBadge';
import { getUSIdentity } from '../../../lib/usIdentityClient';
import type { USIdentity } from '../../../lib/usIdentityTypes';

interface USCredentialSectionProps {
  physicianId: string;
  lang: SupportedLang;
}

type PanelId = 'npi' | 'stateLicenses' | 'specialties' | 'identity';

const content = {
  en: {
    sectionTitle: 'US Credentials',
    npi: 'NPI Number',
    stateLicenses: 'State Medical Licenses',
    specialties: 'Specialties',
    identity: 'State ID / Driver License',
    empty: 'Not started',
    inProgress: 'In progress',
    complete: 'Complete',
    loading: 'Loading credentials...',
    loadError: 'Could not load credentials. Please refresh.',
  },
  es: {
    sectionTitle: 'Credenciales de EE.UU.',
    npi: 'Numero NPI',
    stateLicenses: 'Licencias Medicas Estatales',
    specialties: 'Especialidades',
    identity: 'Identificación estatal / licencia de conducir',
    empty: 'No iniciado',
    inProgress: 'En progreso',
    complete: 'Completo',
    loading: 'Cargando credenciales...',
    loadError: 'No se pudieron cargar las credenciales. Por favor recargue.',
  },
};

function getNPICompletion(data: CredentialResponse | null): CompletionStatus {
  if (!data?.npi) return 'empty';
  if (data.npi.verificationStatus === 'verified') return 'complete';
  return 'in_progress';
}

function getLicenseCompletion(data: CredentialResponse | null): CompletionStatus {
  if (!data || data.stateLicenses.length === 0) return 'empty';
  if (data.stateLicenses.some((l) => l.isPrimary)) return 'complete';
  return 'in_progress';
}

function getSpecialtiesCompletion(specialties: PhysicianSpecialty[]): CompletionStatus {
  const us = specialties.filter((s) => s.country === 'US');
  if (us.length === 0) return 'empty';
  if (us.some((s) => s.role === 'primary' && s.name.trim())) return 'complete';
  return 'in_progress';
}

function getIdentityCompletion(identity: USIdentity | null): CompletionStatus {
  if (!identity) return 'empty';
  const hasState = !!identity.issuingState?.trim();
  const hasNumber = !!identity.idNumber?.trim();
  if (hasState && hasNumber) return 'complete';
  if (hasState || hasNumber || identity.idFrontUploaded || identity.idBackUploaded)
    return 'in_progress';
  return 'empty';
}

interface ChevronProps {
  open: boolean;
}

function Chevron({ open }: ChevronProps) {
  return (
    <svg
      className={`w-4 h-4 text-archival-grey transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function USCredentialSection({ physicianId, lang }: USCredentialSectionProps) {
  const t = content[lang];
  const [openPanel, setOpenPanel] = useState<PanelId | null>('npi');
  const [credentials, setCredentials] = useState<CredentialResponse | null>(null);
  const [specialties, setSpecialties] = useState<PhysicianSpecialty[]>([]);
  const [usIdentity, setUSIdentity] = useState<USIdentity | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const fetchCredentials = useCallback(async () => {
    const [credResult, specResult, identityResult] = await Promise.all([
      getCredentials(physicianId),
      getSpecialties(physicianId),
      getUSIdentity(physicianId),
    ]);
    if (credResult.success && credResult.data) {
      setCredentials(credResult.data);
      setSpecialties(specResult.success && specResult.data ? specResult.data.specialties : []);
      setUSIdentity(identityResult.success && identityResult.data ? identityResult.data : null);
      setLoadStatus('loaded');
    } else {
      setLoadStatus('error');
    }
  }, [physicianId]);

  const refreshIdentity = useCallback(async () => {
    const result = await getUSIdentity(physicianId);
    if (result.success && result.data) setUSIdentity(result.data);
  }, [physicianId]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const refreshSpecialties = useCallback(async () => {
    const specResult = await getSpecialties(physicianId);
    if (specResult.success && specResult.data) setSpecialties(specResult.data.specialties);
  }, [physicianId]);

  const togglePanel = (panelId: PanelId) => {
    setOpenPanel((prev) => (prev === panelId ? null : panelId));
  };

  const handleSave = useCallback(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  if (loadStatus === 'loading') {
    return (
      <div className="py-6 text-center">
        <span className="font-dm-sans text-sm text-archival-grey">{t.loading}</span>
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="py-4">
        <p className="font-dm-sans text-sm text-alert-garnet">{t.loadError}</p>
      </div>
    );
  }

  const completionLabel = (c: CompletionStatus): string =>
    c === 'complete' ? t.complete : c === 'in_progress' ? t.inProgress : t.empty;

  const panels: { id: PanelId; label: string; completion: CompletionStatus }[] = [
    { id: 'npi', label: t.npi, completion: getNPICompletion(credentials) },
    { id: 'stateLicenses', label: t.stateLicenses, completion: getLicenseCompletion(credentials) },
    { id: 'specialties', label: t.specialties, completion: getSpecialtiesCompletion(specialties) },
    { id: 'identity', label: t.identity, completion: getIdentityCompletion(usIdentity) },
  ];

  return (
    <div className="space-y-3">
      {panels.map((panel) => {
        const isOpen = openPanel === panel.id;
        return (
          <div
            key={panel.id}
            className="bg-white rounded-sm border border-warm-gray-800/[0.06] shadow-sm overflow-hidden"
          >
            {/* Panel header */}
            <button
              type="button"
              onClick={() => togglePanel(panel.id)}
              className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-linen/30 transition-colors"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <span className="font-dm-sans text-sm font-semibold text-deep-charcoal">
                  {panel.label}
                </span>
                <CompletionBadge status={panel.completion} label={completionLabel(panel.completion)} />
              </div>
              <Chevron open={isOpen} />
            </button>

            {/* Panel body */}
            {isOpen && (
              <div className="px-5 pb-5 border-t border-warm-gray-800/[0.06]">
                <div className="pt-4">
                  {panel.id === 'npi' && (
                    <NPIForm
                      physicianId={physicianId}
                      npiData={credentials?.npi ?? null}
                      fsmbStatus={credentials?.fsmb ?? null}
                      onSave={handleSave}
                      lang={lang}
                    />
                  )}
                  {panel.id === 'stateLicenses' && (
                    <StateLicenseForm
                      physicianId={physicianId}
                      licenses={credentials?.stateLicenses ?? []}
                      onSave={handleSave}
                      lang={lang}
                    />
                  )}
                  {panel.id === 'specialties' && (
                    <SpecialtiesSection
                      physicianId={physicianId}
                      lang={lang}
                      country="US"
                      specialties={specialties}
                      onRefresh={refreshSpecialties}
                    />
                  )}
                  {panel.id === 'identity' && (
                    <USIdentityForm
                      physicianId={physicianId}
                      lang={lang}
                      identity={usIdentity ?? {
                        idFrontUploaded: false,
                        idBackUploaded: false,
                      }}
                      onRefresh={refreshIdentity}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
