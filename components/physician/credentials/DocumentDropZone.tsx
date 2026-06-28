/**
 * DocumentDropZone — shared upload drop zone for credential documents.
 *
 * Extracted from IdentityForm (MX INE) so the US State ID / Driver License panel
 * reuses the exact same proven upload UX. Client-side type + 5MB size validation
 * before dispatch (T-06-12). Never renders storage URLs — only boolean status (T-06-13).
 */
import { useState, useRef } from 'react';
import type { SupportedLang } from '../../../lib/i18n';

export type DropZoneStatus = 'empty' | 'uploading' | 'uploaded' | 'error';

const content = {
  en: {
    dragDrop: 'Drag and drop or click to upload',
    acceptedTypes: 'JPG, PNG, or PDF (max 5MB)',
    uploading: 'Uploading...',
    uploaded: 'Uploaded',
    replace: 'Replace',
    delete: 'Delete',
    invalidType: 'Only JPG, PNG, or PDF files are accepted.',
    fileTooLarge: 'File exceeds 5MB limit.',
  },
  es: {
    dragDrop: 'Arrastre y suelte o haga clic para subir',
    acceptedTypes: 'JPG, PNG o PDF (max 5MB)',
    uploading: 'Subiendo...',
    uploaded: 'Subido',
    replace: 'Reemplazar',
    delete: 'Eliminar',
    invalidType: 'Solo se aceptan archivos JPG, PNG o PDF.',
    fileTooLarge: 'El archivo supera el limite de 5MB.',
  },
};

interface DocumentDropZoneProps {
  label: string;
  onFile: (file: File) => void;
  onDelete: () => void;
  status: DropZoneStatus;
  errorMessage?: string;
  lang: SupportedLang;
  acceptTypes: string;
  maxSizeMB: number;
}

export default function DocumentDropZone({
  label,
  onFile,
  onDelete,
  status,
  errorMessage,
  lang,
  acceptTypes,
  maxSizeMB,
}: DocumentDropZoneProps) {
  const t = content[lang];
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndDispatch = (file: File) => {
    setFileError('');
    const acceptedMimeTypes = acceptTypes.split(',').map((s) => s.trim());
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
