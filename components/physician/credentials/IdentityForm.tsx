/**
 * IdentityForm — Panel 4 of the MX credential accordion.
 * CURP text field with format validation + INE front/back upload drop zones.
 *
 * T-06-12: Client-side file type validation + 5MB size check before upload.
 * T-06-13: Never display storage URLs client-side — only boolean uploaded/not-uploaded status.
 * D-06, D-07: INE front and back upload via drop zones with drag-and-drop.
 */

import { useState, useCallback } from 'react';
import { CURP_REGEX } from '../../../lib/mxCredentialTypes';
import { saveCURP, uploadDocument, deleteDocument } from '../../../lib/mxCredentialClient';
import type { SupportedLang } from '../../../lib/i18n';
import DocumentDropZone, { type DropZoneStatus } from './DocumentDropZone';

interface IdentityFormProps {
  physicianId: string;
  lang: SupportedLang;
  identity: {
    curp?: string;
    ineFrontUploaded: boolean;
    ineBackUploaded: boolean;
  };
  onRefresh: () => void;
}

const content = {
  en: {
    curpLabel: 'CURP',
    curpPlaceholder: 'Enter your 18-character CURP',
    curpInvalid: 'Invalid CURP format',
    curpSaved: 'CURP saved',
    ineFront: 'INE - Front',
    ineBack: 'INE - Back',
    dragDrop: 'Drag and drop or click to upload',
    acceptedTypes: 'JPG, PNG, or PDF (max 5MB)',
    uploading: 'Uploading...',
    uploaded: 'Uploaded',
    replace: 'Replace',
    delete: 'Delete',
    invalidType: 'Only JPG, PNG, or PDF files are accepted.',
    fileTooLarge: 'File exceeds 5MB limit.',
    uploadError: 'Upload failed. Please try again.',
    deleteError: 'Delete failed. Please try again.',
    saving: 'Saving...',
  },
  es: {
    curpLabel: 'CURP',
    curpPlaceholder: 'Ingrese su CURP de 18 caracteres',
    curpInvalid: 'Formato de CURP invalido',
    curpSaved: 'CURP guardado',
    ineFront: 'INE - Frente',
    ineBack: 'INE - Reverso',
    dragDrop: 'Arrastre y suelte o haga clic para subir',
    acceptedTypes: 'JPG, PNG o PDF (max 5MB)',
    uploading: 'Subiendo...',
    uploaded: 'Subido',
    replace: 'Reemplazar',
    delete: 'Eliminar',
    invalidType: 'Solo se aceptan archivos JPG, PNG o PDF.',
    fileTooLarge: 'El archivo supera el limite de 5MB.',
    uploadError: 'Error al subir. Por favor intente de nuevo.',
    deleteError: 'Error al eliminar. Por favor intente de nuevo.',
    saving: 'Guardando...',
  },
};


export default function IdentityForm({
  physicianId,
  lang,
  identity,
  onRefresh,
}: IdentityFormProps) {
  const t = content[lang];

  // CURP state
  const [curp, setCurp] = useState(identity.curp || '');
  const [curpError, setCurpError] = useState('');
  const [curpSaveStatus, setCurpSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // INE upload state
  const [ineFrontStatus, setIneFrontStatus] = useState<DropZoneStatus>(
    identity.ineFrontUploaded ? 'uploaded' : 'empty'
  );
  const [ineBackStatus, setIneBackStatus] = useState<DropZoneStatus>(
    identity.ineBackUploaded ? 'uploaded' : 'empty'
  );
  const [ineFrontDocId, setIneFrontDocId] = useState<string | undefined>();
  const [ineBackDocId, setIneBackDocId] = useState<string | undefined>();
  const [ineFrontError, setIneFrontError] = useState('');
  const [ineBackError, setIneBackError] = useState('');

  const handleCurpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-uppercase
    setCurp(e.target.value.toUpperCase());
    setCurpError('');
    setCurpSaveStatus('idle');
  };

  const handleCurpBlur = useCallback(async () => {
    if (!curp) return;
    // Validate against CURP_REGEX
    if (!CURP_REGEX.test(curp)) {
      setCurpError(t.curpInvalid);
      return;
    }
    setCurpError('');
    setCurpSaveStatus('saving');
    try {
      const result = await saveCURP(physicianId, curp);
      if (result.success) {
        setCurpSaveStatus('saved');
        onRefresh();
      } else {
        setCurpSaveStatus('error');
      }
    } catch {
      setCurpSaveStatus('error');
    }
  }, [curp, physicianId, onRefresh, t.curpInvalid]);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleIneFrontFile = useCallback(async (file: File) => {
    setIneFrontStatus('uploading');
    setIneFrontError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadDocument(physicianId, {
        dataUrl,
        documentType: 'ine_front',
        fileName: file.name,
      });
      if (result.success) {
        setIneFrontStatus('uploaded');
        setIneFrontDocId(result.documentId);
        onRefresh();
      } else {
        setIneFrontStatus('error');
        setIneFrontError(t.uploadError);
      }
    } catch {
      setIneFrontStatus('error');
      setIneFrontError(t.uploadError);
    }
  }, [physicianId, onRefresh, t.uploadError]);

  const handleIneBackFile = useCallback(async (file: File) => {
    setIneBackStatus('uploading');
    setIneBackError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadDocument(physicianId, {
        dataUrl,
        documentType: 'ine_back',
        fileName: file.name,
      });
      if (result.success) {
        setIneBackStatus('uploaded');
        setIneBackDocId(result.documentId);
        onRefresh();
      } else {
        setIneBackStatus('error');
        setIneBackError(t.uploadError);
      }
    } catch {
      setIneBackStatus('error');
      setIneBackError(t.uploadError);
    }
  }, [physicianId, onRefresh, t.uploadError]);

  const handleDeleteIneFront = useCallback(async () => {
    if (!ineFrontDocId) {
      setIneFrontStatus('empty');
      return;
    }
    setIneFrontError('');
    try {
      const result = await deleteDocument(physicianId, ineFrontDocId);
      if (result.success) {
        setIneFrontStatus('empty');
        setIneFrontDocId(undefined);
        onRefresh();
      } else {
        setIneFrontError(t.deleteError);
      }
    } catch {
      setIneFrontError(t.deleteError);
    }
  }, [physicianId, ineFrontDocId, onRefresh, t.deleteError]);

  const handleDeleteIneBack = useCallback(async () => {
    if (!ineBackDocId) {
      setIneBackStatus('empty');
      return;
    }
    setIneBackError('');
    try {
      const result = await deleteDocument(physicianId, ineBackDocId);
      if (result.success) {
        setIneBackStatus('empty');
        setIneBackDocId(undefined);
        onRefresh();
      } else {
        setIneBackError(t.deleteError);
      }
    } catch {
      setIneBackError(t.deleteError);
    }
  }, [physicianId, ineBackDocId, onRefresh, t.deleteError]);

  const ACCEPTED_TYPES = 'image/jpeg,image/png,application/pdf';
  const MAX_SIZE_MB = 5; // T-06-12: 5MB limit = 5 * 1024 * 1024

  return (
    <div className="space-y-6">
      {/* CURP Section */}
      <div>
        <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1.5">
          {t.curpLabel}
        </label>
        <input
          type="text"
          value={curp}
          onChange={handleCurpChange}
          onBlur={handleCurpBlur}
          placeholder={t.curpPlaceholder}
          maxLength={18}
          className={`w-full font-dm-sans text-base tracking-widest border rounded-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
            curpError
              ? 'border-alert-garnet bg-alert-garnet/5'
              : 'border-warm-gray-800/[0.15] bg-white'
          }`}
        />
        {curpError && (
          <p className="font-dm-sans text-xs text-alert-garnet mt-1">{curpError}</p>
        )}
        <div className="mt-1">
          {curpSaveStatus === 'saving' && (
            <span className="font-dm-sans text-xs text-archival-grey">{t.saving}</span>
          )}
          {curpSaveStatus === 'saved' && (
            <span className="font-dm-sans text-xs text-confirm-green flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {t.curpSaved}
            </span>
          )}
        </div>
      </div>

      {/* INE Upload Section — T-06-13: Only boolean status, never storage URLs */}
      <div>
        <p className="font-dm-sans text-sm font-medium text-deep-charcoal mb-3">
          INE
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* INE Front */}
          <DocumentDropZone
            label={t.ineFront}
            onFile={handleIneFrontFile}
            onDelete={handleDeleteIneFront}
            status={ineFrontStatus}
            errorMessage={ineFrontError}
            lang={lang}
            acceptTypes={ACCEPTED_TYPES}
            maxSizeMB={MAX_SIZE_MB}
          />

          {/* INE Back */}
          <DocumentDropZone
            label={t.ineBack}
            onFile={handleIneBackFile}
            onDelete={handleDeleteIneBack}
            status={ineBackStatus}
            errorMessage={ineBackError}
            lang={lang}
            acceptTypes={ACCEPTED_TYPES}
            maxSizeMB={MAX_SIZE_MB}
          />
        </div>
      </div>
    </div>
  );
}
