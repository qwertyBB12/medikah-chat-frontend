/**
 * CedulaProfesionalForm — Panel 1 of the MX credential accordion.
 * Cedula Profesional with SEP lookup on blur + Registro Estatal fields below.
 *
 * T-06-14: SEP auto-populated fields rendered via React JSX (auto-escaped) — no XSS risk.
 * D-03: SEP lookup fires on blur of cedula number input.
 * D-05: manual_review status shows warning but does NOT block the doctor.
 * D-11: Auto-save on blur for all editable fields.
 */

import { useState, useCallback, useRef } from 'react';
import type { CedulaProfesionalEntry, RegistroEstatalEntry } from '../../../lib/mxCredentialTypes';
import { MX_ESTADOS } from '../../../lib/mxCredentialTypes';
import { triggerSEPLookup, saveMXCredential } from '../../../lib/mxCredentialClient';
import type { SupportedLang } from '../../../lib/i18n';

interface CedulaProfesionalFormProps {
  physicianId: string;
  lang: SupportedLang;
  cedulaProfesional: CedulaProfesionalEntry | null;
  registroEstatal: RegistroEstatalEntry | null;
  onRefresh: () => void;
}

const content = {
  en: {
    cedulaLabel: 'Cedula Profesional Number',
    cedulaPlaceholder: 'Enter your Cedula Profesional number',
    lookingUp: 'Looking up cedula in SEP registry...',
    verified: 'Verified via SEP registry',
    manualReview: 'Could not verify automatically. Our team will review.',
    nameLabel: 'Name (from SEP)',
    degreeLabel: 'Degree (from SEP)',
    institutionLabel: 'Institution (from SEP)',
    yearLabel: 'Year Registered',
    registroTitle: 'Registro Estatal',
    registroNumber: 'Registration Number',
    issuingState: 'Issuing State',
    degreeType: 'Degree Type',
    registrationDate: 'Registration Date',
    saved: 'Saved',
    saving: 'Saving...',
    selectState: 'Select state',
    nameEditHint: 'You may edit the name if it differs from your legal name.',
    degreeEditHint: 'You may edit the degree if the auto-populated value is incorrect.',
  },
  es: {
    cedulaLabel: 'Numero de Cedula Profesional',
    cedulaPlaceholder: 'Ingrese su numero de Cedula Profesional',
    lookingUp: 'Buscando cedula en el registro de la SEP...',
    verified: 'Verificado via registro de la SEP',
    manualReview: 'No se pudo verificar automaticamente. Nuestro equipo lo revisara.',
    nameLabel: 'Nombre (de la SEP)',
    degreeLabel: 'Titulo (de la SEP)',
    institutionLabel: 'Institucion (de la SEP)',
    yearLabel: 'Anio de Registro',
    registroTitle: 'Registro Estatal',
    registroNumber: 'Numero de Registro',
    issuingState: 'Estado Emisor',
    degreeType: 'Tipo de Titulo',
    registrationDate: 'Fecha de Registro',
    saved: 'Guardado',
    saving: 'Guardando...',
    selectState: 'Seleccione estado',
    nameEditHint: 'Puede editar el nombre si difiere de su nombre legal.',
    degreeEditHint: 'Puede editar el titulo si el valor no es correcto.',
  },
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function CedulaProfesionalForm({
  physicianId,
  lang,
  cedulaProfesional,
  registroEstatal,
  onRefresh,
}: CedulaProfesionalFormProps) {
  const t = content[lang];

  // Cedula Profesional state
  const [cedulaNumber, setCedulaNumber] = useState(cedulaProfesional?.cedulaNumber || '');
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'verified' | 'manual_review' | 'error'>('idle');
  const [fullName, setFullName] = useState(cedulaProfesional?.fullName || '');
  const [titulo, setTitulo] = useState(cedulaProfesional?.titulo || '');
  const [institucion, setInstitucion] = useState(cedulaProfesional?.institucion || '');
  const [anioRegistro, setAnioRegistro] = useState(cedulaProfesional?.anioRegistro || '');
  const [cedulaSaveStatus, setCedulaSaveStatus] = useState<SaveStatus>('idle');
  const isFetchingRef = useRef(false);
  const lastLookedUpRef = useRef('');

  // Registro Estatal state
  const [numeroRegistro, setNumeroRegistro] = useState(registroEstatal?.numeroRegistro || '');
  const [issuingState, setIssuingState] = useState(registroEstatal?.issuingState || '');
  const [degreeType, setDegreeType] = useState(registroEstatal?.degreeType || '');
  const [registrationDate, setRegistrationDate] = useState(registroEstatal?.registrationDate || '');
  const [registroSaveStatus, setRegistroSaveStatus] = useState<SaveStatus>('idle');

  // Determine initial lookup status from existing data
  const initialVerificationStatus = cedulaProfesional?.verificationStatus;
  const isVerified = lookupStatus === 'verified' || (lookupStatus === 'idle' && initialVerificationStatus === 'verified');
  const isManualReview = lookupStatus === 'manual_review' || (lookupStatus === 'idle' && initialVerificationStatus === 'manual_review');
  const showAutoPopulated = isVerified || isManualReview || (lookupStatus === 'idle' && initialVerificationStatus && initialVerificationStatus !== 'pending');

  const handleCedulaBlur = useCallback(async () => {
    const trimmed = cedulaNumber.trim();
    if (!trimmed || trimmed === lastLookedUpRef.current) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    lastLookedUpRef.current = trimmed;
    setLookupStatus('loading');

    try {
      const result = await triggerSEPLookup(physicianId, trimmed, 'cedula_profesional');

      if (result.success && result.data) {
        const { verificationStatus, sepData } = result.data;

        if (verificationStatus === 'verified' && sepData) {
          setFullName(sepData.fullName || '');
          setTitulo(sepData.titulo || '');
          setInstitucion(sepData.institucion || '');
          setAnioRegistro(sepData.anioRegistro || '');
          setLookupStatus('verified');
        } else {
          setLookupStatus('manual_review');
        }

        // Auto-save cedula entry after lookup
        const saveStatus = verificationStatus === 'verified' ? 'verified' : 'manual_review';
        setCedulaSaveStatus('saving');
        await saveMXCredential(physicianId, {
          section: 'cedula_profesional',
          data: {
            cedulaNumber: trimmed,
            fullName: result.data.sepData?.fullName || fullName,
            titulo: result.data.sepData?.titulo || titulo,
            institucion: result.data.sepData?.institucion || institucion,
            anioRegistro: result.data.sepData?.anioRegistro || anioRegistro,
            verificationStatus: saveStatus as CedulaProfesionalEntry['verificationStatus'],
          },
        });
        setCedulaSaveStatus('saved');
        onRefresh();
      } else {
        setLookupStatus('manual_review');
        // Save with manual_review status even on API failure
        setCedulaSaveStatus('saving');
        await saveMXCredential(physicianId, {
          section: 'cedula_profesional',
          data: {
            cedulaNumber: trimmed,
            fullName,
            titulo,
            institucion,
            anioRegistro,
            verificationStatus: 'manual_review',
          },
        });
        setCedulaSaveStatus('saved');
        onRefresh();
      }
    } catch {
      setLookupStatus('manual_review');
      setCedulaSaveStatus('error');
    } finally {
      isFetchingRef.current = false;
    }
  }, [cedulaNumber, physicianId, fullName, titulo, institucion, anioRegistro, onRefresh]);

  const saveCedulaFields = useCallback(async () => {
    if (!cedulaNumber.trim()) return;
    setCedulaSaveStatus('saving');
    try {
      const vs = isVerified
        ? 'verified'
        : isManualReview
        ? 'manual_review'
        : (initialVerificationStatus || 'pending');
      await saveMXCredential(physicianId, {
        section: 'cedula_profesional',
        data: {
          cedulaNumber: cedulaNumber.trim(),
          fullName,
          titulo,
          institucion,
          anioRegistro,
          verificationStatus: vs as CedulaProfesionalEntry['verificationStatus'],
        },
      });
      setCedulaSaveStatus('saved');
      onRefresh();
    } catch {
      setCedulaSaveStatus('error');
    }
  }, [physicianId, cedulaNumber, fullName, titulo, institucion, anioRegistro, isVerified, isManualReview, initialVerificationStatus, onRefresh]);

  const saveRegistroEstatal = useCallback(async () => {
    if (!numeroRegistro.trim() && !issuingState && !degreeType.trim()) return;
    setRegistroSaveStatus('saving');
    try {
      await saveMXCredential(physicianId, {
        section: 'registro_estatal',
        data: {
          numeroRegistro: numeroRegistro.trim(),
          issuingState,
          degreeType: degreeType.trim(),
          registrationDate: registrationDate || undefined,
        },
      });
      setRegistroSaveStatus('saved');
      onRefresh();
    } catch {
      setRegistroSaveStatus('error');
    }
  }, [physicianId, numeroRegistro, issuingState, degreeType, registrationDate, onRefresh]);

  const renderSaveStatus = (status: SaveStatus) => {
    if (status === 'saving') {
      return <span className="font-dm-sans text-xs text-archival-grey">{t.saving}</span>;
    }
    if (status === 'saved') {
      return (
        <span className="font-dm-sans text-xs text-confirm-green flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {t.saved}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Cedula Profesional Section */}
      <div className="space-y-4">
        {/* Cedula Number Input */}
        <div>
          <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1.5">
            {t.cedulaLabel}
          </label>
          <div className="relative">
            <input
              type="text"
              value={cedulaNumber}
              onChange={e => setCedulaNumber(e.target.value)}
              onBlur={handleCedulaBlur}
              placeholder={t.cedulaPlaceholder}
              className="w-full font-dm-sans text-base border rounded-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors border-warm-gray-800/[0.15] bg-white"
            />
            {lookupStatus === 'loading' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin text-clinical-teal" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="font-dm-sans text-xs text-archival-grey">{t.lookingUp}</span>
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {renderSaveStatus(cedulaSaveStatus)}
          </div>
        </div>

        {/* Verification badge */}
        {isVerified && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-dm-sans text-xs text-confirm-green bg-confirm-green/10 px-3 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {t.verified}
            </span>
          </div>
        )}

        {/* manual_review warning (D-05: does NOT block the doctor) */}
        {isManualReview && (
          <div className="flex items-start gap-2 bg-caution-amber/10 border border-caution-amber/20 rounded-sm px-3 py-2">
            <svg className="w-4 h-4 text-caution-amber flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="font-dm-sans text-xs text-caution-amber">{t.manualReview}</p>
          </div>
        )}

        {/* Auto-populated fields (shown when verified or in manual_review — T-06-14: React JSX auto-escapes) */}
        {showAutoPopulated && (
          <div className="space-y-4 bg-linen/30 rounded-sm p-4 border border-warm-gray-800/[0.06]">
            {/* Full Name */}
            <div>
              <label className="block font-dm-sans text-xs text-archival-grey mb-1">
                {t.nameLabel}
              </label>
              {isVerified && !isManualReview ? (
                <p className="font-body text-sm text-deep-charcoal">{fullName}</p>
              ) : (
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  onBlur={saveCedulaFields}
                  className="w-full font-body text-sm border rounded-sm px-3 py-2 border-warm-gray-800/[0.15] bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
                />
              )}
            </div>

            {/* Degree */}
            <div>
              <label className="block font-dm-sans text-xs text-archival-grey mb-1">
                {t.degreeLabel}
              </label>
              {isVerified && !isManualReview ? (
                <p className="font-body text-sm text-deep-charcoal">{titulo}</p>
              ) : (
                <input
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  onBlur={saveCedulaFields}
                  className="w-full font-body text-sm border rounded-sm px-3 py-2 border-warm-gray-800/[0.15] bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
                />
              )}
            </div>

            {/* Institution */}
            <div>
              <label className="block font-dm-sans text-xs text-archival-grey mb-1">
                {t.institutionLabel}
              </label>
              <p className="font-body text-sm text-deep-charcoal">{institucion || '—'}</p>
            </div>

            {/* Year */}
            <div>
              <label className="block font-dm-sans text-xs text-archival-grey mb-1">
                {t.yearLabel}
              </label>
              <p className="font-body text-sm text-deep-charcoal">{anioRegistro || '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-warm-gray-800/[0.08]" />

      {/* Registro Estatal Section (D-01: same panel as Cedula Profesional) */}
      <div className="space-y-4">
        <h3 className="font-dm-sans text-sm font-semibold text-deep-charcoal">
          {t.registroTitle}
        </h3>

        {/* Registration Number */}
        <div>
          <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1.5">
            {t.registroNumber}
          </label>
          <input
            type="text"
            value={numeroRegistro}
            onChange={e => setNumeroRegistro(e.target.value)}
            onBlur={saveRegistroEstatal}
            className="w-full font-dm-sans text-sm border rounded-sm px-3 py-2 border-warm-gray-800/[0.15] bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
          />
        </div>

        {/* Issuing State — populated from MX_ESTADOS */}
        <div>
          <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1.5">
            {t.issuingState}
          </label>
          <select
            value={issuingState}
            onChange={e => {
              setIssuingState(e.target.value);
              // Auto-save on change for select
              setRegistroSaveStatus('saving');
              saveMXCredential(physicianId, {
                section: 'registro_estatal',
                data: {
                  numeroRegistro: numeroRegistro.trim(),
                  issuingState: e.target.value,
                  degreeType: degreeType.trim(),
                  registrationDate: registrationDate || undefined,
                },
              })
                .then(() => {
                  setRegistroSaveStatus('saved');
                  onRefresh();
                })
                .catch(() => setRegistroSaveStatus('error'));
            }}
            className="w-full font-dm-sans text-sm border rounded-sm px-3 py-2 border-warm-gray-800/[0.15] bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
          >
            <option value="">{t.selectState}</option>
            {MX_ESTADOS.map(estado => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </div>

        {/* Degree Type */}
        <div>
          <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1.5">
            {t.degreeType}
          </label>
          <input
            type="text"
            value={degreeType}
            onChange={e => setDegreeType(e.target.value)}
            onBlur={saveRegistroEstatal}
            className="w-full font-dm-sans text-sm border rounded-sm px-3 py-2 border-warm-gray-800/[0.15] bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
          />
        </div>

        {/* Registration Date (optional) */}
        <div>
          <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1.5">
            {t.registrationDate}
          </label>
          <input
            type="date"
            value={registrationDate}
            onChange={e => setRegistrationDate(e.target.value)}
            onBlur={saveRegistroEstatal}
            className="w-full font-dm-sans text-sm border rounded-sm px-3 py-2 border-warm-gray-800/[0.15] bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
          />
        </div>

        {/* Registro Estatal save status */}
        <div>{renderSaveStatus(registroSaveStatus)}</div>
      </div>
    </div>
  );
}
