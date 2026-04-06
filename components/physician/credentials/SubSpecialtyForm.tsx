/**
 * SubSpecialtyForm — Multi-entry sub-specialty and fellowship form.
 * Auto-saves on blur with 800ms debounce.
 */

import { useState, useCallback, useRef } from 'react';
import type { USSubSpecialtyEntry } from '../../../lib/credentialTypes';
import { saveCredential, deleteCredential } from '../../../lib/credentialClient';
import type { SupportedLang } from '../../../lib/i18n';

interface SubSpecialtyFormProps {
  physicianId: string;
  entries: USSubSpecialtyEntry[];
  onSave: () => void;
  lang: SupportedLang;
}

const content = {
  en: {
    addEntry: '+ Add sub-specialty or fellowship',
    type: 'Type',
    subSpecialty: 'Sub-specialty',
    fellowship: 'Fellowship',
    name: 'Name',
    certifyingBody: 'Certifying Body / Institution',
    completionDate: 'Completion Date',
    expirationDate: 'Expiration Date (optional)',
    delete: 'Remove',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Save failed',
    required: 'Required',
    namePlaceholder: 'e.g. Interventional Cardiology',
    bodyPlaceholder: 'e.g. Cleveland Clinic, ABIM',
  },
  es: {
    addEntry: '+ Agregar sub-especialidad o beca',
    type: 'Tipo',
    subSpecialty: 'Sub-especialidad',
    fellowship: 'Beca',
    name: 'Nombre',
    certifyingBody: 'Organismo certificador / Institucion',
    completionDate: 'Fecha de finalizacion',
    expirationDate: 'Fecha de vencimiento (opcional)',
    delete: 'Eliminar',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
    required: 'Requerido',
    namePlaceholder: 'ej. Cardiologia Intervencionista',
    bodyPlaceholder: 'ej. Cleveland Clinic, ABIM',
  },
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SubSpecRow extends USSubSpecialtyEntry {
  _localId: string;
  _saveStatus: SaveStatus;
  _errors: Partial<Record<keyof USSubSpecialtyEntry, boolean>>;
}

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fromEntry(entry: USSubSpecialtyEntry): SubSpecRow {
  return { ...entry, _localId: makeLocalId(), _saveStatus: 'idle', _errors: {} };
}

function makeEmptyRow(): SubSpecRow {
  return {
    _localId: makeLocalId(),
    type: 'sub_specialty',
    name: '',
    certifyingBodyOrInstitution: '',
    completionDate: '',
    expirationDate: '',
    verificationStatus: 'pending',
    _saveStatus: 'idle',
    _errors: {},
  };
}

export default function SubSpecialtyForm({
  physicianId,
  entries,
  onSave,
  lang,
}: SubSpecialtyFormProps) {
  const t = content[lang];
  const [rows, setRows] = useState<SubSpecRow[]>(
    entries.length > 0 ? entries.map(fromEntry) : []
  );
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const updateRow = useCallback((localId: string, patch: Partial<SubSpecRow>) => {
    setRows(prev =>
      prev.map(r => (r._localId === localId ? { ...r, ...patch } : r))
    );
  }, []);

  const validateRow = (row: SubSpecRow): Partial<Record<keyof USSubSpecialtyEntry, boolean>> => ({
    type: !row.type,
    name: !row.name,
    certifyingBodyOrInstitution: !row.certifyingBodyOrInstitution,
    completionDate: !row.completionDate,
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
          section: 'sub_specialty',
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
          section: 'sub_specialty',
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
          {/* Type toggle */}
          <div>
            <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1.5">
              {t.type}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  updateRow(row._localId, { type: 'sub_specialty' });
                  handleFieldBlur(row._localId);
                }}
                className={`font-dm-sans text-sm px-4 py-1.5 rounded-sm border transition-colors ${
                  row.type === 'sub_specialty'
                    ? 'bg-inst-blue text-white border-inst-blue'
                    : 'bg-white text-body-slate border-warm-gray-800/[0.15] hover:border-clinical-teal'
                }`}
              >
                {t.subSpecialty}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateRow(row._localId, { type: 'fellowship' });
                  handleFieldBlur(row._localId);
                }}
                className={`font-dm-sans text-sm px-4 py-1.5 rounded-sm border transition-colors ${
                  row.type === 'fellowship'
                    ? 'bg-inst-blue text-white border-inst-blue'
                    : 'bg-white text-body-slate border-warm-gray-800/[0.15] hover:border-clinical-teal'
                }`}
              >
                {t.fellowship}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.name}
              </label>
              <input
                type="text"
                value={row.name}
                onChange={e => updateRow(row._localId, { name: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                placeholder={t.namePlaceholder}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.name ? 'border-alert-garnet bg-alert-garnet/5' : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.name && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>

            {/* Certifying body */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.certifyingBody}
              </label>
              <input
                type="text"
                value={row.certifyingBodyOrInstitution}
                onChange={e => updateRow(row._localId, { certifyingBodyOrInstitution: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                placeholder={t.bodyPlaceholder}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.certifyingBodyOrInstitution ? 'border-alert-garnet bg-alert-garnet/5' : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.certifyingBodyOrInstitution && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>

            {/* Completion date */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.completionDate}
              </label>
              <input
                type="date"
                value={row.completionDate}
                onChange={e => updateRow(row._localId, { completionDate: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.completionDate ? 'border-alert-garnet bg-alert-garnet/5' : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.completionDate && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>

            {/* Expiration date (optional) */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.expirationDate}
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
        {t.addEntry}
      </button>
    </div>
  );
}
