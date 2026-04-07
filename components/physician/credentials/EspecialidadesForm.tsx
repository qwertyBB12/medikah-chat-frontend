/**
 * EspecialidadesForm — Panel 2: Multi-row specialty entries with SEP lookup + inline diploma uploads.
 * Each row: specialty name, institution, completion date, cedula number (SEP lookup on blur),
 * SEP-returned data display, diploma front/back drop zones.
 * Auto-saves on blur. "+ Add another specialty" for multi-entry. Bilingual EN/ES.
 */

import { useState, useCallback, useRef } from 'react';
import type { CedulaEspecialidadEntry } from '../../../lib/mxCredentialTypes';
import {
  saveMXCredential,
  deleteMXCredential,
  triggerSEPLookup,
  uploadDocument,
} from '../../../lib/mxCredentialClient';
import type { SupportedLang } from '../../../lib/i18n';

interface EspecialidadesFormProps {
  physicianId: string;
  lang: SupportedLang;
  especialidades: CedulaEspecialidadEntry[];
  onRefresh: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type LookupStatus = 'idle' | 'loading' | 'done' | 'failed';

interface EspecialidadRow extends CedulaEspecialidadEntry {
  _localId: string;
  _saveStatus: SaveStatus;
  _lookupStatus: LookupStatus;
  _lookupData?: { fullName?: string; titulo?: string; institucion?: string };
  _diplomaFrontUploading: boolean;
  _diplomaBackUploading: boolean;
  _errors: Record<string, string>;
}

const content = {
  en: {
    specialtyName: 'Specialty Name',
    institution: 'Institution',
    completionDate: 'Completion Date',
    cedulaNumber: 'Cedula de Especialidad Number',
    cedulaPlaceholder: 'Enter cedula number',
    lookingUp: 'Verifying with SEP...',
    verified: 'Verified',
    manualReview: 'Pending manual review',
    diplomaFront: 'Diploma - Front',
    diplomaBack: 'Diploma - Back (with cedula seal)',
    addAnother: '+ Add another specialty',
    remove: 'Remove',
    dragDrop: 'Drag and drop or click to upload',
    acceptedTypes: 'JPG, PNG, or PDF (max 5MB)',
    uploading: 'Uploading...',
    uploaded: 'Uploaded',
    replace: 'Replace',
    delete: 'Delete',
    saved: 'Saved',
    saving: 'Saving...',
    error: 'Save failed',
    required: 'Required',
    specialtyPlaceholder: 'e.g. Cardiologia, Ginecologia',
    institutionPlaceholder: 'e.g. UNAM, IMSS, IPN',
    sepVerified: 'SEP Verified',
    sepManualReview: 'Manual Review',
    sepFailed: 'Verification failed',
    sepName: 'Name on file',
    sepTitle: 'Degree title',
    sepInstitution: 'Issuing institution',
  },
  es: {
    specialtyName: 'Nombre de Especialidad',
    institution: 'Institucion',
    completionDate: 'Fecha de Terminacion',
    cedulaNumber: 'Numero de Cedula de Especialidad',
    cedulaPlaceholder: 'Ingrese numero de cedula',
    lookingUp: 'Verificando con la SEP...',
    verified: 'Verificado',
    manualReview: 'Pendiente de revision manual',
    diplomaFront: 'Diploma - Frente',
    diplomaBack: 'Diploma - Reverso (con sello de cedula)',
    addAnother: '+ Agregar otra especialidad',
    remove: 'Eliminar',
    dragDrop: 'Arrastre y suelte o haga clic para subir',
    acceptedTypes: 'JPG, PNG o PDF (max 5MB)',
    uploading: 'Subiendo...',
    uploaded: 'Subido',
    replace: 'Reemplazar',
    delete: 'Eliminar',
    saved: 'Guardado',
    saving: 'Guardando...',
    error: 'Error al guardar',
    required: 'Requerido',
    specialtyPlaceholder: 'ej. Cardiologia, Ginecologia',
    institutionPlaceholder: 'ej. UNAM, IMSS, IPN',
    sepVerified: 'Verificado por SEP',
    sepManualReview: 'Revision Manual',
    sepFailed: 'Verificacion fallida',
    sepName: 'Nombre en registro',
    sepTitle: 'Titulo academico',
    sepInstitution: 'Institucion emisora',
  },
};

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fromEntry(entry: CedulaEspecialidadEntry): EspecialidadRow {
  return {
    ...entry,
    _localId: makeLocalId(),
    _saveStatus: 'idle',
    _lookupStatus: 'idle',
    _diplomaFrontUploading: false,
    _diplomaBackUploading: false,
    _errors: {},
  };
}

function makeEmptyRow(): EspecialidadRow {
  return {
    _localId: makeLocalId(),
    specialtyName: '',
    institution: '',
    completionDate: '',
    cedulaNumber: '',
    verificationStatus: 'pending',
    diplomaFrontUploaded: false,
    diplomaBackUploaded: false,
    _saveStatus: 'idle',
    _lookupStatus: 'idle',
    _diplomaFrontUploading: false,
    _diplomaBackUploading: false,
    _errors: {},
  };
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function EspecialidadesForm({
  physicianId,
  lang,
  especialidades,
  onRefresh,
}: EspecialidadesFormProps) {
  const t = content[lang];
  const [rows, setRows] = useState<EspecialidadRow[]>(
    especialidades.length > 0 ? especialidades.map(fromEntry) : [makeEmptyRow()]
  );
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lookupRowRef = useRef<string | null>(null);

  const updateRow = useCallback((localId: string, patch: Partial<EspecialidadRow>) => {
    setRows(prev =>
      prev.map(r => (r._localId === localId ? { ...r, ...patch } : r))
    );
  }, []);

  const handleFieldBlur = useCallback(
    (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row) return;

      // Validate required fields
      const errors: Record<string, string> = {};
      if (!row.specialtyName.trim()) errors.specialtyName = t.required;
      if (!row.institution.trim()) errors.institution = t.required;

      updateRow(localId, { _errors: errors });
      if (Object.keys(errors).length > 0) return;

      if (saveTimersRef.current[localId]) clearTimeout(saveTimersRef.current[localId]);
      updateRow(localId, { _saveStatus: 'saving' });

      saveTimersRef.current[localId] = setTimeout(async () => {
        const currentRow = rows.find(r => r._localId === localId);
        if (!currentRow) return;

        const result = await saveMXCredential(physicianId, {
          section: 'cedula_especialidad',
          data: {
            id: currentRow.id,
            specialtyName: currentRow.specialtyName,
            institution: currentRow.institution,
            completionDate: currentRow.completionDate || undefined,
            cedulaNumber: currentRow.cedulaNumber,
            verificationStatus: currentRow.verificationStatus,
          },
        });

        if (result.success) {
          updateRow(localId, {
            _saveStatus: 'saved',
            id: result.credentialId || currentRow.id,
          });
          onRefresh();
          setTimeout(() => updateRow(localId, { _saveStatus: 'idle' }), 2000);
        } else {
          updateRow(localId, { _saveStatus: 'error' });
        }
      }, 800);
    },
    [rows, physicianId, onRefresh, updateRow, t.required]
  );

  const handleCedulaBlur = useCallback(
    async (localId: string) => {
      // First, trigger the regular field save
      handleFieldBlur(localId);

      const row = rows.find(r => r._localId === localId);
      if (!row || !row.cedulaNumber.trim()) return;

      // Only one SEP lookup at a time
      if (lookupRowRef.current !== null) return;

      lookupRowRef.current = localId;
      updateRow(localId, { _lookupStatus: 'loading' });

      try {
        const result = await triggerSEPLookup(
          physicianId,
          row.cedulaNumber,
          'cedula_especialidad'
        );

        if (result.success && result.data) {
          const status = result.data.verificationStatus as CedulaEspecialidadEntry['verificationStatus'];
          const lookupData = result.data.sepData
            ? {
                fullName: result.data.sepData.fullName,
                titulo: result.data.sepData.titulo,
                institucion: result.data.sepData.institucion,
              }
            : undefined;

          updateRow(localId, {
            _lookupStatus: 'done',
            verificationStatus: status || 'manual_review',
            _lookupData: lookupData,
          });
        } else {
          updateRow(localId, {
            _lookupStatus: 'failed',
            verificationStatus: 'manual_review',
          });
        }
      } catch {
        updateRow(localId, {
          _lookupStatus: 'failed',
          verificationStatus: 'manual_review',
        });
      } finally {
        lookupRowRef.current = null;
      }
    },
    [rows, physicianId, updateRow, handleFieldBlur]
  );

  const handleDiplomaUpload = useCallback(
    async (
      localId: string,
      file: File,
      side: 'diploma_front' | 'diploma_back'
    ) => {
      if (!ACCEPTED_TYPES.includes(file.type)) return;
      if (file.size > MAX_FILE_SIZE) return;

      const uploadingKey = side === 'diploma_front' ? '_diplomaFrontUploading' : '_diplomaBackUploading';
      updateRow(localId, { [uploadingKey]: true });

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          updateRow(localId, { [uploadingKey]: false });
          return;
        }

        const row = rows.find(r => r._localId === localId);
        const result = await uploadDocument(physicianId, {
          dataUrl,
          documentType: side,
          relatedCredentialId: row?.id,
          fileName: file.name,
        });

        if (result.success) {
          const uploadedKey =
            side === 'diploma_front' ? 'diplomaFrontUploaded' : 'diplomaBackUploaded';
          updateRow(localId, {
            [uploadingKey]: false,
            [uploadedKey]: true,
          });
          onRefresh();
        } else {
          updateRow(localId, { [uploadingKey]: false });
        }
      };
      reader.readAsDataURL(file);
    },
    [rows, physicianId, updateRow, onRefresh]
  );

  const handleDrop = useCallback(
    (
      localId: string,
      side: 'diploma_front' | 'diploma_back',
      e: React.DragEvent<HTMLDivElement>
    ) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleDiplomaUpload(localId, file, side);
    },
    [handleDiplomaUpload]
  );

  const handleFileInputChange = useCallback(
    (
      localId: string,
      side: 'diploma_front' | 'diploma_back',
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = e.target.files?.[0];
      if (file) handleDiplomaUpload(localId, file, side);
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [handleDiplomaUpload]
  );

  const handleDelete = useCallback(
    async (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row) return;
      setRows(prev => prev.filter(r => r._localId !== localId));
      if (row.id) {
        await deleteMXCredential(physicianId, {
          section: 'cedula_especialidad',
          credentialId: row.id,
        });
        onRefresh();
      }
    },
    [rows, physicianId, onRefresh]
  );

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);

  const renderSaveStatus = (status: SaveStatus) => {
    if (status === 'saving')
      return <span className="font-dm-sans text-xs text-archival-grey">{t.saving}</span>;
    if (status === 'saved')
      return <span className="font-dm-sans text-xs text-confirm-green">{t.saved}</span>;
    if (status === 'error')
      return <span className="font-dm-sans text-xs text-alert-garnet">{t.error}</span>;
    return null;
  };

  const renderLookupStatus = (row: EspecialidadRow) => {
    if (row._lookupStatus === 'loading') {
      return (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-3 h-3 border-2 border-clinical-teal border-t-transparent rounded-full animate-spin" />
          <span className="font-dm-sans text-xs text-archival-grey">{t.lookingUp}</span>
        </div>
      );
    }
    if (row._lookupStatus === 'done' && row.verificationStatus === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-confirm-green/10 text-confirm-green font-dm-sans text-xs font-medium mt-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {t.sepVerified}
        </span>
      );
    }
    if (
      row._lookupStatus === 'done' &&
      (row.verificationStatus === 'manual_review' || row.verificationStatus === 'failed')
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-caution-amber/10 text-caution-amber font-dm-sans text-xs font-medium mt-1">
          {t.sepManualReview}
        </span>
      );
    }
    return null;
  };

  const renderDropZone = (
    row: EspecialidadRow,
    side: 'diploma_front' | 'diploma_back'
  ) => {
    const isUploading =
      side === 'diploma_front' ? row._diplomaFrontUploading : row._diplomaBackUploading;
    const isUploaded =
      side === 'diploma_front' ? row.diplomaFrontUploaded : row.diplomaBackUploaded;
    const label = side === 'diploma_front' ? t.diplomaFront : t.diplomaBack;
    const inputId = `diploma-${side}-${row._localId}`;

    return (
      <div>
        <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
          {label}
        </label>
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(row._localId, side, e)}
          onClick={() => !isUploading && document.getElementById(inputId)?.click()}
          className={`relative border-2 border-dashed rounded-sm p-4 text-center cursor-pointer transition-colors ${
            isUploaded
              ? 'border-confirm-green/40 bg-confirm-green/5'
              : 'border-warm-gray-800/[0.15] bg-clinical-surface hover:border-clinical-teal/40'
          }`}
        >
          <input
            id={inputId}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={e => handleFileInputChange(row._localId, side, e)}
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-5 h-5 border-2 border-clinical-teal border-t-transparent rounded-full animate-spin" />
              <span className="font-dm-sans text-xs text-archival-grey">{t.uploading}</span>
            </div>
          ) : isUploaded ? (
            <div className="flex flex-col items-center gap-1">
              <svg className="w-5 h-5 text-confirm-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-dm-sans text-xs text-confirm-green font-medium">{t.uploaded}</span>
              <span className="font-dm-sans text-xs text-archival-grey">{t.replace}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6 text-archival-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="font-dm-sans text-xs text-archival-grey">{t.dragDrop}</span>
              <span className="font-dm-sans text-xs text-archival-grey/70">{t.acceptedTypes}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div
          key={row._localId}
          className="bg-clinical-surface rounded-sm p-4 mb-3 relative"
        >
          {/* Remove button */}
          <button
            onClick={() => handleDelete(row._localId)}
            className="absolute top-3 right-3 font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 transition-colors"
          >
            {t.remove}
          </button>

          <div className="space-y-3 pr-16">
            {/* Specialty Name */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.specialtyName} <span className="text-alert-garnet">*</span>
              </label>
              <input
                type="text"
                value={row.specialtyName}
                onChange={e => updateRow(row._localId, { specialtyName: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                placeholder={t.specialtyPlaceholder}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.specialtyName
                    ? 'border-alert-garnet bg-alert-garnet/5'
                    : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.specialtyName && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{row._errors.specialtyName}</p>
              )}
            </div>

            {/* Institution */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.institution} <span className="text-alert-garnet">*</span>
              </label>
              <input
                type="text"
                value={row.institution}
                onChange={e => updateRow(row._localId, { institution: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                placeholder={t.institutionPlaceholder}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.institution
                    ? 'border-alert-garnet bg-alert-garnet/5'
                    : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.institution && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{row._errors.institution}</p>
              )}
            </div>

            {/* Completion Date */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.completionDate}
              </label>
              <input
                type="date"
                value={row.completionDate || ''}
                onChange={e =>
                  updateRow(row._localId, { completionDate: e.target.value || undefined })
                }
                onBlur={() => handleFieldBlur(row._localId)}
                className="w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors"
              />
            </div>

            {/* Cedula de Especialidad Number */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.cedulaNumber}
              </label>
              <input
                type="text"
                value={row.cedulaNumber}
                onChange={e => updateRow(row._localId, { cedulaNumber: e.target.value })}
                onBlur={() => handleCedulaBlur(row._localId)}
                placeholder={t.cedulaPlaceholder}
                className="w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors"
              />
              {renderLookupStatus(row)}
            </div>

            {/* SEP lookup data display */}
            {row._lookupData && row._lookupStatus === 'done' && (
              <div className="rounded-sm border border-confirm-green/20 bg-confirm-green/5 p-3 space-y-1.5">
                {row._lookupData.fullName && (
                  <div>
                    <span className="font-dm-sans text-xs text-archival-grey">{t.sepName}: </span>
                    <span className="font-dm-sans text-xs text-deep-charcoal font-medium">
                      {row._lookupData.fullName}
                    </span>
                  </div>
                )}
                {row._lookupData.titulo && (
                  <div>
                    <span className="font-dm-sans text-xs text-archival-grey">{t.sepTitle}: </span>
                    <span className="font-dm-sans text-xs text-deep-charcoal font-medium">
                      {row._lookupData.titulo}
                    </span>
                  </div>
                )}
                {row._lookupData.institucion && (
                  <div>
                    <span className="font-dm-sans text-xs text-archival-grey">{t.sepInstitution}: </span>
                    <span className="font-dm-sans text-xs text-deep-charcoal font-medium">
                      {row._lookupData.institucion}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Diploma upload zones - 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderDropZone(row, 'diploma_front')}
              {renderDropZone(row, 'diploma_back')}
            </div>
          </div>

          {/* Save status */}
          <div className="flex justify-end mt-2">
            {renderSaveStatus(row._saveStatus)}
          </div>
        </div>
      ))}

      <button
        onClick={addRow}
        className="font-dm-sans text-sm font-medium text-clinical-teal hover:text-clinical-teal/80 transition-colors"
      >
        {t.addAnother}
      </button>
    </div>
  );
}
