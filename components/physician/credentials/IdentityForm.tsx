/**
 * IdentityForm — Panel 4 of the MX credential accordion.
 * CURP text field with format validation + INE front/back upload drop zones.
 *
 * T-06-12: Client-side file type validation + 5MB size check before upload.
 * T-06-13: Never display storage URLs client-side — only boolean uploaded/not-uploaded status.
 * D-06, D-07: INE front and back upload via drop zones with drag-and-drop.
 */

import { useState, useCallback, useRef } from 'react';
import { CURP_REGEX } from '../../../lib/mxCredentialTypes';
import { saveCURP, uploadDocument, deleteDocument } from '../../../lib/mxCredentialClient';
import type { SupportedLang } from '../../../lib/i18n';

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

type DropZoneStatus = 'empty' | 'uploading' | 'uploaded' | 'error';

interface DropZoneProps {
  label: string;
  onFile: (file: File) => void;
  onDelete: () => void;
  status: DropZoneStatus;
  errorMessage?: string;
  lang: SupportedLang;
  acceptTypes: string;
  maxSizeMB: number;
}

function DropZone({
  label,
  onFile,
  onDelete,
  status,
  errorMessage,
  lang,
  acceptTypes,
  maxSizeMB,
}: DropZoneProps) {
  const t = content[lang];
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndDispatch = (file: File) => {
    setFileError('');
    const acceptedMimeTypes = acceptTypes.split(',').map(s => s.trim());
    if (!acceptedMimeTypes.includes(file.type)) {
      setFileError(t.invalidType);
      return;
    }
    // T-06-12: 5MB size check
    if (file.size > maxSizeMB * 1024 * 1024) {
      setFileError(t.fileTooLarge);
      return;
    }
    onFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndDispatch(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndDispatch(file);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  };

  if (status === 'uploaded') {
    return (
      <div className="flex flex-col items-center justify-center border-2 border-confirm-green/30 bg-confirm-green/5 rounded-sm p-4 h-32 gap-2">
        <svg className="w-6 h-6 text-confirm-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className="font-dm-sans text-xs text-confirm-green font-medium">{label}: {t.uploaded}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClick}
            className="font-dm-sans text-xs text-clinical-teal border border-clinical-teal rounded-sm px-2 py-0.5 hover:bg-clinical-teal/10 transition-colors"
          >
            {t.replace}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="font-dm-sans text-xs text-alert-garnet border border-alert-garnet rounded-sm px-2 py-0.5 hover:bg-alert-garnet/10 transition-colors"
          >
            {t.delete}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  if (status === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center border-2 border-dashed border-clinical-teal/30 bg-clinical-teal/5 rounded-sm p-4 h-32 gap-2">
        <svg className="w-5 h-5 animate-spin text-clinical-teal" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="font-dm-sans text-xs text-clinical-teal">{t.uploading}</p>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-sm p-4 h-32 cursor-pointer transition-colors gap-2 ${
          isDragOver
            ? 'border-clinical-teal bg-clinical-teal/10'
            : status === 'error'
            ? 'border-alert-garnet/40 bg-alert-garnet/5'
            : 'border-archival-grey/40 bg-white hover:border-clinical-teal/40 hover:bg-clinical-teal/5'
        }`}
      >
        {/* Upload icon */}
        <svg className="w-6 h-6 text-archival-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="font-dm-sans text-xs text-deep-charcoal text-center">{label}</p>
        <p className="font-dm-sans text-xs text-archival-grey text-center">{t.dragDrop}</p>
        <p className="font-dm-sans text-xs text-archival-grey/70 text-center">{t.acceptedTypes}</p>
      </div>

      {/* File error */}
      {(fileError || errorMessage) && (
        <p className="font-dm-sans text-xs text-alert-garnet mt-1">{fileError || errorMessage}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}

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
          <DropZone
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
          <DropZone
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
