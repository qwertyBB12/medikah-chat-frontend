/**
 * USIdentityForm — Panel of the US credential accordion (Aguirre credentialing change 4).
 *
 * US equivalent of the MX IdentityForm (CURP + INE). Captures an issuing state +
 * State ID / Driver License number, plus optional front/back image uploads. Gives
 * the US workflow an identity-verification item comparable to INE/CURP.
 *
 * Scalars auto-save on blur via usIdentityClient; uploads reuse the shared
 * DocumentDropZone + the /documents endpoint (us_id_front / us_id_back).
 */
import { useState, useCallback } from 'react';
import { US_STATES } from '../../../lib/geoData';
import { saveUSIdentityField } from '../../../lib/usIdentityClient';
import { uploadDocument, deleteDocument } from '../../../lib/mxCredentialClient';
import type { USIdentity } from '../../../lib/usIdentityTypes';
import type { SupportedLang } from '../../../lib/i18n';
import DocumentDropZone, { type DropZoneStatus } from './DocumentDropZone';

interface USIdentityFormProps {
  physicianId: string;
  lang: SupportedLang;
  identity: USIdentity;
  onRefresh: () => void;
}

const content = {
  en: {
    intro: 'Provide one U.S. state-issued ID. This mirrors the INE/CURP identity step for Mexico physicians.',
    issuingState: 'Issuing State',
    selectState: 'Select a state',
    idNumber: 'State ID / Driver License Number',
    idNumberPlaceholder: 'e.g. your license number',
    uploadLabel: 'State ID / Driver License (optional)',
    idFront: 'ID — Front',
    idBack: 'ID — Back',
    saving: 'Saving...',
    saved: 'Saved',
    saveError: 'Could not save. Please try again.',
    uploadError: 'Upload failed. Please try again.',
    deleteError: 'Delete failed. Please try again.',
  },
  es: {
    intro: 'Proporcione una identificación estatal de EE.UU. Equivale al paso de identidad INE/CURP para médicos de México.',
    issuingState: 'Estado emisor',
    selectState: 'Seleccione un estado',
    idNumber: 'Número de identificación estatal / licencia de conducir',
    idNumberPlaceholder: 'ej. su número de licencia',
    uploadLabel: 'Identificación estatal / licencia de conducir (opcional)',
    idFront: 'ID — Frente',
    idBack: 'ID — Reverso',
    saving: 'Guardando...',
    saved: 'Guardado',
    saveError: 'No se pudo guardar. Intente de nuevo.',
    uploadError: 'Error al subir. Por favor intente de nuevo.',
    deleteError: 'Error al eliminar. Por favor intente de nuevo.',
  },
};

const ACCEPTED_TYPES = 'image/jpeg,image/png,application/pdf';
const MAX_SIZE_MB = 5;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function USIdentityForm({
  physicianId,
  lang,
  identity,
  onRefresh,
}: USIdentityFormProps) {
  const t = content[lang];

  const [issuingState, setIssuingState] = useState(identity.issuingState || '');
  const [idNumber, setIdNumber] = useState(identity.idNumber || '');
  const [stateStatus, setStateStatus] = useState<SaveStatus>('idle');
  const [numberStatus, setNumberStatus] = useState<SaveStatus>('idle');

  const [frontStatus, setFrontStatus] = useState<DropZoneStatus>(
    identity.idFrontUploaded ? 'uploaded' : 'empty'
  );
  const [backStatus, setBackStatus] = useState<DropZoneStatus>(
    identity.idBackUploaded ? 'uploaded' : 'empty'
  );
  const [frontDocId, setFrontDocId] = useState<string | undefined>();
  const [backDocId, setBackDocId] = useState<string | undefined>();
  const [frontError, setFrontError] = useState('');
  const [backError, setBackError] = useState('');

  const saveField = useCallback(
    async (
      field: 'issuingState' | 'idNumber',
      value: string,
      setStatus: (s: SaveStatus) => void
    ) => {
      setStatus('saving');
      const result = await saveUSIdentityField(physicianId, { field, value });
      if (result.success) {
        setStatus('saved');
        onRefresh();
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
      }
    },
    [physicianId, onRefresh]
  );

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUpload = useCallback(
    async (
      file: File,
      documentType: 'us_id_front' | 'us_id_back',
      setStatus: (s: DropZoneStatus) => void,
      setDocId: (id: string | undefined) => void,
      setError: (m: string) => void
    ) => {
      setStatus('uploading');
      setError('');
      try {
        const dataUrl = await fileToDataUrl(file);
        const result = await uploadDocument(physicianId, {
          dataUrl,
          documentType,
          fileName: file.name,
        });
        if (result.success) {
          setStatus('uploaded');
          setDocId(result.documentId);
          onRefresh();
        } else {
          setStatus('error');
          setError(t.uploadError);
        }
      } catch {
        setStatus('error');
        setError(t.uploadError);
      }
    },
    [physicianId, onRefresh, t.uploadError]
  );

  const handleDelete = useCallback(
    async (
      docId: string | undefined,
      setStatus: (s: DropZoneStatus) => void,
      setDocId: (id: string | undefined) => void,
      setError: (m: string) => void
    ) => {
      if (!docId) {
        setStatus('empty');
        return;
      }
      setError('');
      try {
        const result = await deleteDocument(physicianId, docId);
        if (result.success) {
          setStatus('empty');
          setDocId(undefined);
          onRefresh();
        } else {
          setError(t.deleteError);
        }
      } catch {
        setError(t.deleteError);
      }
    },
    [physicianId, onRefresh, t.deleteError]
  );

  const inputCls =
    'w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors';
  const labelCls = 'block font-dm-sans text-xs font-medium text-archival-grey mb-1';

  const renderStatus = (s: SaveStatus) => {
    if (s === 'saving') return <span className="font-dm-sans text-xs text-archival-grey">{t.saving}</span>;
    if (s === 'saved') return <span className="font-dm-sans text-xs text-confirm-green">{t.saved}</span>;
    if (s === 'error') return <span className="font-dm-sans text-xs text-alert-garnet">{t.saveError}</span>;
    return null;
  };

  return (
    <div className="space-y-5">
      <p className="font-dm-sans text-xs text-archival-grey">{t.intro}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>{t.issuingState}</label>
          <select
            value={issuingState}
            onChange={(e) => {
              setIssuingState(e.target.value);
              void saveField('issuingState', e.target.value, setStateStatus);
            }}
            className={inputCls}
          >
            <option value="">{t.selectState}</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="mt-1">{renderStatus(stateStatus)}</div>
        </div>

        <div>
          <label className={labelCls}>{t.idNumber}</label>
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            onBlur={(e) => {
              if (e.target.value !== (identity.idNumber || '')) {
                void saveField('idNumber', e.target.value, setNumberStatus);
              }
            }}
            placeholder={t.idNumberPlaceholder}
            className={inputCls}
          />
          <div className="mt-1">{renderStatus(numberStatus)}</div>
        </div>
      </div>

      <div>
        <p className="font-dm-sans text-sm font-medium text-deep-charcoal mb-3">{t.uploadLabel}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DocumentDropZone
            label={t.idFront}
            onFile={(file) => handleUpload(file, 'us_id_front', setFrontStatus, setFrontDocId, setFrontError)}
            onDelete={() => handleDelete(frontDocId, setFrontStatus, setFrontDocId, setFrontError)}
            status={frontStatus}
            errorMessage={frontError}
            lang={lang}
            acceptTypes={ACCEPTED_TYPES}
            maxSizeMB={MAX_SIZE_MB}
          />
          <DocumentDropZone
            label={t.idBack}
            onFile={(file) => handleUpload(file, 'us_id_back', setBackStatus, setBackDocId, setBackError)}
            onDelete={() => handleDelete(backDocId, setBackStatus, setBackDocId, setBackError)}
            status={backStatus}
            errorMessage={backError}
            lang={lang}
            acceptTypes={ACCEPTED_TYPES}
            maxSizeMB={MAX_SIZE_MB}
          />
        </div>
      </div>
    </div>
  );
}
