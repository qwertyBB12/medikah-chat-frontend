/**
 * USCredentialSection — Vertical accordion container for US credential forms.
 * Four panels: NPI, State Licenses, Board Certifications, Sub-specialties/Fellowships.
 * Loads credential data on mount, passes to sub-forms with auto-save callbacks.
 */

import { useState, useEffect, useCallback } from 'react';
import type { CredentialResponse } from '../../../lib/credentialTypes';
import { getCredentials } from '../../../lib/credentialClient';
import type { SupportedLang } from '../../../lib/i18n';
import NPIForm from './NPIForm';
import StateLicenseForm from './StateLicenseForm';
import BoardCertForm from './BoardCertForm';
import SubSpecialtyForm from './SubSpecialtyForm';

interface USCredentialSectionProps {
  physicianId: string;
  lang: SupportedLang;
}

type PanelId = 'npi' | 'stateLicenses' | 'boardCerts' | 'subSpecialties';
type CompletionStatus = 'empty' | 'in_progress' | 'complete';

const content = {
  en: {
    sectionTitle: 'US Credentials',
    npi: 'NPI Number',
    stateLicenses: 'State Medical Licenses',
    boardCerts: 'Board Certifications',
    subSpecialties: 'Sub-specialties & Fellowships',
    empty: 'Not started',
    inProgress: 'In progress',
    complete: 'Complete',
    fsmbClear: 'Disciplinary check: Clear',
    fsmbFlagged: 'Disciplinary check: Flagged — our team will follow up.',
    fsmbPending: 'Disciplinary check: Pending',
    loading: 'Loading credentials...',
    loadError: 'Could not load credentials. Please refresh.',
  },
  es: {
    sectionTitle: 'Credenciales de EE.UU.',
    npi: 'Numero NPI',
    stateLicenses: 'Licencias Medicas Estatales',
    boardCerts: 'Certificaciones de Junta',
    subSpecialties: 'Sub-especialidades y Becas',
    empty: 'No iniciado',
    inProgress: 'En progreso',
    complete: 'Completo',
    fsmbClear: 'Verificacion disciplinaria: Sin hallazgos',
    fsmbFlagged: 'Verificacion disciplinaria: Marcado — nuestro equipo dara seguimiento.',
    fsmbPending: 'Verificacion disciplinaria: Pendiente',
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
  if (data.stateLicenses.some(l => l.isPrimary)) return 'complete';
  return 'in_progress';
}

function getBoardCertCompletion(data: CredentialResponse | null): CompletionStatus {
  if (!data || data.boardCertifications.length === 0) return 'empty';
  return 'complete';
}

function getSubSpecCompletion(data: CredentialResponse | null): CompletionStatus {
  if (!data || data.subSpecialties.length === 0) return 'empty';
  return 'complete';
}

interface CompletionBadgeProps {
  status: CompletionStatus;
  label: string;
}

function CompletionBadge({ status, label }: CompletionBadgeProps) {
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
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const fetchCredentials = useCallback(async () => {
    const result = await getCredentials(physicianId);
    if (result.success && result.data) {
      setCredentials(result.data);
      setLoadStatus('loaded');
    } else {
      setLoadStatus('error');
    }
  }, [physicianId]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const togglePanel = (panelId: PanelId) => {
    setOpenPanel(prev => (prev === panelId ? null : panelId));
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

  const panels: { id: PanelId; label: string; completion: CompletionStatus; completionLabel: string }[] = [
    {
      id: 'npi',
      label: t.npi,
      completion: getNPICompletion(credentials),
      completionLabel: getNPICompletion(credentials) === 'complete'
        ? t.complete
        : getNPICompletion(credentials) === 'in_progress'
        ? t.inProgress
        : t.empty,
    },
    {
      id: 'stateLicenses',
      label: t.stateLicenses,
      completion: getLicenseCompletion(credentials),
      completionLabel: getLicenseCompletion(credentials) === 'complete'
        ? t.complete
        : getLicenseCompletion(credentials) === 'in_progress'
        ? t.inProgress
        : t.empty,
    },
    {
      id: 'boardCerts',
      label: t.boardCerts,
      completion: getBoardCertCompletion(credentials),
      completionLabel: getBoardCertCompletion(credentials) === 'complete'
        ? t.complete
        : t.empty,
    },
    {
      id: 'subSpecialties',
      label: t.subSpecialties,
      completion: getSubSpecCompletion(credentials),
      completionLabel: getSubSpecCompletion(credentials) === 'complete'
        ? t.complete
        : t.empty,
    },
  ];

  return (
    <div className="space-y-3">
      {panels.map(panel => {
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
                <CompletionBadge status={panel.completion} label={panel.completionLabel} />
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
                  {panel.id === 'boardCerts' && (
                    <BoardCertForm
                      physicianId={physicianId}
                      certifications={credentials?.boardCertifications ?? []}
                      onSave={handleSave}
                      lang={lang}
                    />
                  )}
                  {panel.id === 'subSpecialties' && (
                    <SubSpecialtyForm
                      physicianId={physicianId}
                      entries={credentials?.subSpecialties ?? []}
                      onSave={handleSave}
                      lang={lang}
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
