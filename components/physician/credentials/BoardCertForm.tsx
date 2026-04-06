/**
 * BoardCertForm — Multi-entry board certification form.
 * Auto-saves on blur with 800ms debounce.
 */

import { useState, useCallback, useRef } from 'react';
import type { USBoardCertEntry } from '../../../lib/credentialTypes';
import { saveCredential, deleteCredential } from '../../../lib/credentialClient';
import type { SupportedLang } from '../../../lib/i18n';

interface BoardCertFormProps {
  physicianId: string;
  certifications: USBoardCertEntry[];
  onSave: () => void;
  lang: SupportedLang;
}

const content = {
  en: {
    addCert: '+ Add certification',
    certifyingBoard: 'Certifying Board',
    specialty: 'Specialty',
    certificationDate: 'Certification Date',
    expirationDate: 'Expiration Date',
    expirationOptional: 'Expiration Date (optional)',
    delete: 'Remove',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Save failed',
    required: 'Required',
    boardPlaceholder: 'e.g. ABIM, ABP, ABS',
    specialtyPlaceholder: 'e.g. Internal Medicine',
  },
  es: {
    addCert: '+ Agregar certificacion',
    certifyingBoard: 'Junta certificadora',
    specialty: 'Especialidad',
    certificationDate: 'Fecha de certificacion',
    expirationDate: 'Fecha de vencimiento',
    expirationOptional: 'Fecha de vencimiento (opcional)',
    delete: 'Eliminar',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
    required: 'Requerido',
    boardPlaceholder: 'ej. ABIM, ABP, ABS',
    specialtyPlaceholder: 'ej. Medicina Interna',
  },
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface CertRow extends USBoardCertEntry {
  _localId: string;
  _saveStatus: SaveStatus;
  _errors: Partial<Record<keyof USBoardCertEntry, boolean>>;
}

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fromEntry(entry: USBoardCertEntry): CertRow {
  return { ...entry, _localId: makeLocalId(), _saveStatus: 'idle', _errors: {} };
}

function makeEmptyRow(): CertRow {
  return {
    _localId: makeLocalId(),
    certifyingBoard: '',
    specialty: '',
    certificationDate: '',
    expirationDate: '',
    verificationStatus: 'pending',
    _saveStatus: 'idle',
    _errors: {},
  };
}

export default function BoardCertForm({
  physicianId,
  certifications,
  onSave,
  lang,
}: BoardCertFormProps) {
  const t = content[lang];
  const [rows, setRows] = useState<CertRow[]>(
    certifications.length > 0 ? certifications.map(fromEntry) : []
  );
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const updateRow = useCallback((localId: string, patch: Partial<CertRow>) => {
    setRows(prev =>
      prev.map(r => (r._localId === localId ? { ...r, ...patch } : r))
    );
  }, []);

  const validateRow = (row: CertRow): Partial<Record<keyof USBoardCertEntry, boolean>> => ({
    certifyingBoard: !row.certifyingBoard,
    specialty: !row.specialty,
    certificationDate: !row.certificationDate,
  });

  const handleFieldBlur = useCallback(
    (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row) return;

      const errors = validateRow(row);
      const hasErrors = Object.values(errors).some(Boolean);
      updateRow(localId, { _errors: errors });
      if (hasErrors) return;

      if (saveTimersRef.current[localId]) clearTimeout(saveTimersRef.current[localId]);
      updateRow(localId, { _saveStatus: 'saving' });

      saveTimersRef.current[localId] = setTimeout(async () => {
        const { _localId, _saveStatus, _errors, ...entry } = row;
        void _localId; void _saveStatus; void _errors;
        const result = await saveCredential(physicianId, {
          section: 'board_cert',
          data: entry,
        });
        if (result.success) {
          updateRow(localId, {
            _saveStatus: 'saved',
            id: result.credentialId || row.id,
          });
          onSave();
          setTimeout(() => updateRow(localId, { _saveStatus: 'idle' }), 2000);
        } else {
          updateRow(localId, { _saveStatus: 'error' });
        }
      }, 800);
    },
    [rows, physicianId, onSave, updateRow]
  );

  const handleDelete = useCallback(
    async (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row) return;
      setRows(prev => prev.filter(r => r._localId !== localId));
      if (row.id) {
        await deleteCredential(physicianId, {
          section: 'board_cert',
          credentialId: row.id,
        });
        onSave();
      }
    },
    [rows, physicianId, onSave]
  );

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);

  const renderSaveStatus = (status: SaveStatus) => {
    if (status === 'saving') return <span className="font-dm-sans text-xs text-archival-grey">{t.saving}</span>;
    if (status === 'saved') return <span className="font-dm-sans text-xs text-confirm-green">{t.saved}</span>;
    if (status === 'error') return <span className="font-dm-sans text-xs text-alert-garnet">{t.error}</span>;
    return null;
  };

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div
          key={row._localId}
          className="border border-warm-gray-800/[0.06] rounded-sm p-4 space-y-3 bg-white"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Certifying board */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.certifyingBoard}
              </label>
              <input
                type="text"
                value={row.certifyingBoard}
                onChange={e => updateRow(row._localId, { certifyingBoard: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                placeholder={t.boardPlaceholder}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.certifyingBoard ? 'border-alert-garnet bg-alert-garnet/5' : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.certifyingBoard && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>

            {/* Specialty */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.specialty}
              </label>
              <input
                type="text"
                value={row.specialty}
                onChange={e => updateRow(row._localId, { specialty: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                placeholder={t.specialtyPlaceholder}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.specialty ? 'border-alert-garnet bg-alert-garnet/5' : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.specialty && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>

            {/* Certification date */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.certificationDate}
              </label>
              <input
                type="date"
                value={row.certificationDate}
                onChange={e => updateRow(row._localId, { certificationDate: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.certificationDate ? 'border-alert-garnet bg-alert-garnet/5' : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.certificationDate && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>

            {/* Expiration date (optional) */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.expirationOptional}
              </label>
              <input
                type="date"
                value={row.expirationDate || ''}
                onChange={e => updateRow(row._localId, { expirationDate: e.target.value || undefined })}
                onBlur={() => handleFieldBlur(row._localId)}
                className="w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors"
              />
            </div>
          </div>

          {/* Row actions */}
          <div className="flex items-center justify-end gap-3">
            {renderSaveStatus(row._saveStatus)}
            <button
              onClick={() => handleDelete(row._localId)}
              className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 transition-colors"
            >
              {t.delete}
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addRow}
        className="font-dm-sans text-sm font-medium text-clinical-teal hover:text-clinical-teal/80 transition-colors"
      >
        {t.addCert}
      </button>
    </div>
  );
}
