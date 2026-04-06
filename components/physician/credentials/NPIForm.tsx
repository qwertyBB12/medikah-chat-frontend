/**
 * NPIForm — NPI entry with auto-populate from NPI Registry and conflict resolution.
 * Triggers FSMB disciplinary check after NPI verified.
 * T-05-12: Client-side NPI format validation (/^\d{10}$/) before API call.
 * T-05-13: FSMB status shows only Clear/Flagged/Pending — no action details or raw data.
 * T-05-15: NPI Registry data rendered via React JSX (auto-escaped). No dangerouslySetInnerHTML.
 */

import { useState, useCallback, useRef } from 'react';
import type { NPIEntry, CredentialResponse } from '../../../lib/credentialTypes';
import { saveCredential } from '../../../lib/credentialClient';
import type { SupportedLang } from '../../../lib/i18n';

interface NPIFormProps {
  physicianId: string;
  npiData: NPIEntry | null;
  fsmbStatus: CredentialResponse['fsmb'];
  onSave: () => void;
  lang: SupportedLang;
}

interface NPILookupResult {
  fullName?: string;
  primarySpecialty?: string;
  practiceState?: string;
  npiNumber?: string;
}

type ConflictField = 'fullName' | 'primarySpecialty' | 'practiceState';

interface ConflictResolution {
  fullName?: 'npi' | 'mine';
  primarySpecialty?: 'npi' | 'mine';
  practiceState?: 'npi' | 'mine';
}

const content = {
  en: {
    label: 'NPI Number',
    placeholder: '10-digit NPI',
    verifying: 'Verifying NPI...',
    notFound: 'NPI not found in the National Provider Registry. Please verify the number.',
    invalidFormat: 'NPI must be exactly 10 digits.',
    fullName: 'Full Name',
    primarySpecialty: 'Primary Specialty',
    practiceState: 'Practice State',
    useNPI: 'Use NPI',
    useMine: 'Use Mine',
    npiRegistryLabel: 'NPI Registry',
    yourEntryLabel: 'Your entry',
    fsmbClear: 'Disciplinary check: Clear',
    fsmbFlagged: 'Disciplinary check: Flagged — our team will follow up.',
    fsmbPending: 'Disciplinary check: Pending',
    fsmbUnderReview: 'Disciplinary check: Under review',
    fsmbError: 'Disciplinary check: Could not complete check.',
    savedLabel: 'Verified',
    errorLabel: 'Verification failed',
  },
  es: {
    label: 'Numero NPI',
    placeholder: 'NPI de 10 digitos',
    verifying: 'Verificando NPI...',
    notFound: 'NPI no encontrado en el Registro Nacional de Proveedores. Por favor verifique el numero.',
    invalidFormat: 'El NPI debe tener exactamente 10 digitos.',
    fullName: 'Nombre completo',
    primarySpecialty: 'Especialidad principal',
    practiceState: 'Estado de practica',
    useNPI: 'Usar NPI',
    useMine: 'Usar el mio',
    npiRegistryLabel: 'Registro NPI',
    yourEntryLabel: 'Su entrada',
    fsmbClear: 'Verificacion disciplinaria: Sin hallazgos',
    fsmbFlagged: 'Verificacion disciplinaria: Marcado — nuestro equipo dara seguimiento.',
    fsmbPending: 'Verificacion disciplinaria: Pendiente',
    fsmbUnderReview: 'Verificacion disciplinaria: En revision',
    fsmbError: 'Verificacion disciplinaria: No se pudo completar la verificacion.',
    savedLabel: 'Verificado',
    errorLabel: 'Verificacion fallida',
  },
};

export default function NPIForm({
  physicianId,
  npiData,
  fsmbStatus,
  onSave,
  lang,
}: NPIFormProps) {
  const t = content[lang];
  const [npiInput, setNpiInput] = useState(npiData?.npiNumber || '');
  const [validationError, setValidationError] = useState('');
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'found' | 'not_found' | 'error'>('idle');
  const [lookupResult, setLookupResult] = useState<NPILookupResult | null>(null);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>({});
  const isFetchingRef = useRef(false);

  const hasConflict = useCallback(
    (field: ConflictField, registryValue?: string): boolean => {
      if (!npiData || !registryValue) return false;
      const existingValue = npiData[field];
      return Boolean(existingValue && existingValue !== registryValue);
    },
    [npiData]
  );

  const handleBlur = useCallback(async () => {
    const trimmed = npiInput.trim();
    if (!trimmed) return;

    // T-05-12: Client-side NPI format validation
    if (!/^\d{10}$/.test(trimmed)) {
      setValidationError(t.invalidFormat);
      return;
    }
    setValidationError('');

    // Skip if already verified with same number
    if (npiData?.npiNumber === trimmed && npiData?.verificationStatus === 'verified') return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLookupStatus('loading');

    try {
      const res = await fetch(`/api/physicians/${physicianId}/npi-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npiNumber: trimmed }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        const data = json.data as NPILookupResult;
        setLookupResult(data);
        setLookupStatus('found');

        // Save NPI entry to credentials
        await saveCredential(physicianId, {
          section: 'npi',
          data: {
            npiNumber: trimmed,
            fullName: data.fullName,
            primarySpecialty: data.primarySpecialty,
            practiceState: data.practiceState,
            verificationStatus: 'verified',
            verifiedAt: new Date().toISOString(),
          },
        });
        onSave();

        // T-05-13: Trigger FSMB check — display only Clear/Flagged/Pending
        fetch(`/api/physicians/${physicianId}/fsmb-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ npiNumber: trimmed, fullName: data.fullName }),
        })
          .then(() => onSave())
          .catch(() => {/* FSMB check failure is non-blocking */});
      } else {
        setLookupStatus('not_found');
      }
    } catch {
      setLookupStatus('error');
    } finally {
      isFetchingRef.current = false;
    }
  }, [npiInput, npiData, physicianId, onSave, t]);

  const resolveField = (field: ConflictField, choice: 'npi' | 'mine') => {
    setConflictResolution(prev => ({ ...prev, [field]: choice }));
  };

  const getDisplayValue = (field: ConflictField, registryValue?: string): string => {
    const resolution = conflictResolution[field];
    if (resolution === 'mine') return npiData?.[field] || registryValue || '';
    return registryValue || npiData?.[field] || '';
  };

  const renderFsmbStatus = () => {
    if (!fsmbStatus) {
      return <span className="font-dm-sans text-sm text-archival-grey">{t.fsmbPending}</span>;
    }
    switch (fsmbStatus.status) {
      case 'clear':
        return (
          <span className="font-dm-sans text-sm text-confirm-green flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t.fsmbClear}
          </span>
        );
      case 'flagged':
        return (
          <span className="font-dm-sans text-sm text-caution-amber flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            {t.fsmbFlagged}
          </span>
        );
      case 'error':
        return <span className="font-dm-sans text-sm text-archival-grey">{t.fsmbError}</span>;
      default:
        return <span className="font-dm-sans text-sm text-archival-grey">{t.fsmbPending}</span>;
    }
  };

  const renderConflictRow = (
    field: ConflictField,
    label: string,
    registryValue?: string
  ) => {
    if (!hasConflict(field, registryValue)) {
      return (
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-confirm-green mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-dm-sans text-xs text-archival-grey">{label}</p>
            <p className="font-body text-sm text-deep-charcoal">{getDisplayValue(field, registryValue)}</p>
          </div>
        </div>
      );
    }

    // Conflict resolution UI
    const currentChoice = conflictResolution[field] || 'npi';
    return (
      <div className="space-y-1">
        <p className="font-dm-sans text-xs text-archival-grey">{label}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div
            className={`flex-1 border rounded-sm px-3 py-2 cursor-pointer transition-colors ${
              currentChoice === 'npi'
                ? 'border-clinical-teal bg-clinical-teal/5'
                : 'border-warm-gray-800/[0.12] bg-white'
            }`}
            onClick={() => resolveField(field, 'npi')}
          >
            <p className="font-dm-sans text-xs text-archival-grey">{t.npiRegistryLabel}</p>
            <p className="font-body text-sm text-deep-charcoal">&ldquo;{registryValue}&rdquo;</p>
          </div>
          <div
            className={`flex-1 border rounded-sm px-3 py-2 cursor-pointer transition-colors ${
              currentChoice === 'mine'
                ? 'border-clinical-teal bg-clinical-teal/5'
                : 'border-warm-gray-800/[0.12] bg-white'
            }`}
            onClick={() => resolveField(field, 'mine')}
          >
            <p className="font-dm-sans text-xs text-archival-grey">{t.yourEntryLabel}</p>
            <p className="font-body text-sm text-deep-charcoal">&ldquo;{npiData?.[field]}&rdquo;</p>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => resolveField(field, 'npi')}
            className={`font-dm-sans text-xs px-3 py-1 rounded-sm border transition-colors ${
              currentChoice === 'npi'
                ? 'bg-clinical-teal text-white border-clinical-teal'
                : 'bg-white text-clinical-teal border-clinical-teal hover:bg-clinical-teal/10'
            }`}
          >
            {t.useNPI}
          </button>
          <button
            onClick={() => resolveField(field, 'mine')}
            className={`font-dm-sans text-xs px-3 py-1 rounded-sm border transition-colors ${
              currentChoice === 'mine'
                ? 'bg-clinical-teal text-white border-clinical-teal'
                : 'bg-white text-clinical-teal border-clinical-teal hover:bg-clinical-teal/10'
            }`}
          >
            {t.useMine}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* NPI Input */}
      <div>
        <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1.5">
          {t.label}
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={npiInput}
            onChange={e => setNpiInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onBlur={handleBlur}
            placeholder={t.placeholder}
            className={`w-full font-dm-sans text-base tracking-wider border rounded-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
              validationError
                ? 'border-alert-garnet bg-alert-garnet/5'
                : 'border-warm-gray-800/[0.15] bg-white'
            }`}
          />
          {lookupStatus === 'loading' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin text-clinical-teal" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="font-dm-sans text-xs text-archival-grey">{t.verifying}</span>
            </div>
          )}
        </div>
        {validationError && (
          <p className="font-dm-sans text-xs text-alert-garnet mt-1">{validationError}</p>
        )}
      </div>

      {/* NPI Not Found */}
      {lookupStatus === 'not_found' && (
        <p className="font-dm-sans text-sm text-alert-garnet">{t.notFound}</p>
      )}

      {/* Auto-populated fields (from lookup or existing verified data) */}
      {(lookupStatus === 'found' || (npiData?.verificationStatus === 'verified')) && (
        <div className="space-y-3 bg-linen/30 rounded-sm p-4 border border-warm-gray-800/[0.06]">
          {renderConflictRow('fullName', t.fullName, lookupResult?.fullName || npiData?.fullName)}
          {renderConflictRow('primarySpecialty', t.primarySpecialty, lookupResult?.primarySpecialty || npiData?.primarySpecialty)}
          {renderConflictRow('practiceState', t.practiceState, lookupResult?.practiceState || npiData?.practiceState)}
        </div>
      )}

      {/* FSMB Status — T-05-13: Only shows Clear/Flagged/Pending, no action details */}
      {(npiData || lookupStatus === 'found') && (
        <div className="pt-1">
          {renderFsmbStatus()}
        </div>
      )}
    </div>
  );
}
