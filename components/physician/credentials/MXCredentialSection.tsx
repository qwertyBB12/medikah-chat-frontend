/**
 * MXCredentialSection — Vertical accordion container for Mexico credential forms.
 * Five panels: Cedula Profesional, Especialidades, Consejo, Identity (CURP+INE), Colegios.
 * Loads credential data on mount, passes to sub-forms with refresh callbacks.
 *
 * T-06-15: country_of_practice gating is UX convenience, not security.
 * API routes enforce ownership regardless of which section the UI shows.
 */

import { useState, useEffect, useCallback } from 'react';
import type { MXCredentialResponse } from '../../../lib/mxCredentialTypes';
import { getMXCredentials } from '../../../lib/mxCredentialClient';
import type { SupportedLang } from '../../../lib/i18n';
import CedulaProfesionalForm from './CedulaProfesionalForm';
import IdentityForm from './IdentityForm';
import EspecialidadesForm from './EspecialidadesForm';
import ConsejoForm from './ConsejoForm';
import ColegiosForm from './ColegiosForm';

interface MXCredentialSectionProps {
  physicianId: string;
  lang: SupportedLang;
}

type MXPanelId = 'cedulaProfesional' | 'especialidades' | 'consejo' | 'identity' | 'colegios';
type CompletionStatus = 'empty' | 'in_progress' | 'complete';

const content = {
  en: {
    sectionTitle: 'Mexico Credentials',
    cedulaProfesional: 'Cedula Profesional & Registro Estatal',
    especialidades: 'Especialidades (Cedulas de Especialidad)',
    consejo: 'Consejo Board Certifications',
    identity: 'Identity (CURP & INE)',
    colegios: 'Professional Society Memberships',
    empty: 'Not started',
    inProgress: 'In progress',
    complete: 'Complete',
    loading: 'Loading credentials...',
    loadError: 'Could not load credentials. Please refresh.',
    optional: 'Optional',
  },
  es: {
    sectionTitle: 'Credenciales de Mexico',
    cedulaProfesional: 'Cedula Profesional y Registro Estatal',
    especialidades: 'Especialidades (Cedulas de Especialidad)',
    consejo: 'Certificaciones de Consejo',
    identity: 'Identidad (CURP e INE)',
    colegios: 'Membresias de Colegios Profesionales',
    empty: 'No iniciado',
    inProgress: 'En progreso',
    complete: 'Completo',
    loading: 'Cargando credenciales...',
    loadError: 'No se pudieron cargar las credenciales. Por favor recargue.',
    optional: 'Opcional',
  },
};

// Completion status helpers

function getCedulaProfesionalCompletion(data: MXCredentialResponse | null): CompletionStatus {
  if (!data?.cedulaProfesional) return 'empty';
  if (data.cedulaProfesional.verificationStatus === 'verified') return 'complete';
  return 'in_progress';
}

function getEspecialidadesCompletion(data: MXCredentialResponse | null): CompletionStatus {
  if (!data || data.especialidades.length === 0) return 'empty';
  if (data.especialidades.every(e => e.verificationStatus === 'verified')) return 'complete';
  return 'in_progress';
}

function getConsejoCompletion(data: MXCredentialResponse | null): CompletionStatus {
  if (!data || data.consejos.length === 0) return 'empty';
  return 'in_progress'; // No verification in Phase 6
}

function getIdentityCompletion(data: MXCredentialResponse | null): CompletionStatus {
  if (!data) return 'empty';
  const { curp, ineFrontUploaded, ineBackUploaded } = data.identity;
  if (!curp && !ineFrontUploaded && !ineBackUploaded) return 'empty';
  if (curp && ineFrontUploaded && ineBackUploaded) return 'complete';
  return 'in_progress';
}

function getColegiosCompletion(data: MXCredentialResponse | null): CompletionStatus {
  if (!data || data.colegios.length === 0) return 'empty';
  return 'in_progress';
}

// Sub-components

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
    <span className="flex items-center gap-1 font-dm-sans text-xs text-archival-grey bg-archival-grey/10 px-2 py-0.5 rounded-full">
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

export default function MXCredentialSection({ physicianId, lang }: MXCredentialSectionProps) {
  const t = content[lang];
  const [openPanel, setOpenPanel] = useState<MXPanelId | null>('cedulaProfesional');
  const [data, setData] = useState<MXCredentialResponse | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const fetchData = useCallback(async () => {
    const result = await getMXCredentials(physicianId);
    if (result.success && result.data) {
      setData(result.data);
      setLoadStatus('loaded');
    } else {
      setLoadStatus('error');
    }
  }, [physicianId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshData = useCallback(async () => {
    const result = await getMXCredentials(physicianId);
    if (result.success && result.data) setData(result.data);
  }, [physicianId]);

  const togglePanel = (panelId: MXPanelId) => {
    setOpenPanel(prev => (prev === panelId ? null : panelId));
  };

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

  const getCompletionLabel = (status: CompletionStatus): string => {
    if (status === 'complete') return t.complete;
    if (status === 'in_progress') return t.inProgress;
    return t.empty;
  };

  const panels: {
    id: MXPanelId;
    label: string;
    completion: CompletionStatus;
    optional?: boolean;
  }[] = [
    {
      id: 'cedulaProfesional',
      label: t.cedulaProfesional,
      completion: getCedulaProfesionalCompletion(data),
    },
    {
      id: 'especialidades',
      label: t.especialidades,
      completion: getEspecialidadesCompletion(data),
    },
    {
      id: 'consejo',
      label: t.consejo,
      completion: getConsejoCompletion(data),
    },
    {
      id: 'identity',
      label: t.identity,
      completion: getIdentityCompletion(data),
    },
    {
      id: 'colegios',
      label: t.colegios,
      completion: getColegiosCompletion(data),
      optional: true,
    },
  ];

  return (
    <div className="space-y-3">
      {panels.map(panel => {
        const isOpen = openPanel === panel.id;
        return (
          <div
            key={panel.id}
            className={`bg-white rounded-sm shadow-sm overflow-hidden ${
              isOpen ? 'border-l-4 border-clinical-teal' : 'border border-warm-gray-800/[0.06]'
            }`}
          >
            {/* Panel header */}
            <button
              type="button"
              onClick={() => togglePanel(panel.id)}
              className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-linen/30 transition-colors"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-dm-sans text-sm font-semibold text-deep-charcoal">
                  {panel.label}
                </span>
                <CompletionBadge
                  status={panel.completion}
                  label={getCompletionLabel(panel.completion)}
                />
                {panel.optional && (
                  <span className="font-dm-sans text-xs text-archival-grey italic">
                    ({t.optional})
                  </span>
                )}
              </div>
              <Chevron open={isOpen} />
            </button>

            {/* Panel body */}
            {isOpen && (
              <div className="px-5 pb-5 border-t border-warm-gray-800/[0.06]">
                <div className="pt-4">
                  {panel.id === 'cedulaProfesional' && (
                    <CedulaProfesionalForm
                      physicianId={physicianId}
                      lang={lang}
                      cedulaProfesional={data?.cedulaProfesional ?? null}
                      registroEstatal={data?.registroEstatal ?? null}
                      onRefresh={refreshData}
                    />
                  )}
                  {panel.id === 'especialidades' && (
                    <EspecialidadesForm
                      physicianId={physicianId}
                      lang={lang}
                      especialidades={data?.especialidades ?? []}
                      onRefresh={refreshData}
                    />
                  )}
                  {panel.id === 'consejo' && (
                    <ConsejoForm
                      physicianId={physicianId}
                      lang={lang}
                      consejos={data?.consejos ?? []}
                      especialidades={data?.especialidades ?? []}
                      onRefresh={refreshData}
                    />
                  )}
                  {panel.id === 'identity' && (
                    <IdentityForm
                      physicianId={physicianId}
                      lang={lang}
                      identity={data?.identity ?? { ineFrontUploaded: false, ineBackUploaded: false }}
                      onRefresh={refreshData}
                    />
                  )}
                  {panel.id === 'colegios' && (
                    <ColegiosForm
                      physicianId={physicianId}
                      lang={lang}
                      colegios={data?.colegios ?? []}
                      onRefresh={refreshData}
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
