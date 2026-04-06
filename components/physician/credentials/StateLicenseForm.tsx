/**
 * StateLicenseForm — Multi-entry state medical license form.
 * Auto-saves on blur with 800ms debounce. Primary toggle is radio-style (one per physician).
 */

import { useState, useCallback, useRef } from 'react';
import type { USLicenseEntry } from '../../../lib/credentialTypes';
import { saveCredential, deleteCredential } from '../../../lib/credentialClient';
import type { SupportedLang } from '../../../lib/i18n';

interface StateLicenseFormProps {
  physicianId: string;
  licenses: USLicenseEntry[];
  onSave: () => void;
  lang: SupportedLang;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY','AS','GU','MP','PR','VI',
];

const content = {
  en: {
    addLicense: '+ Add another license',
    state: 'State',
    licenseNumber: 'License Number',
    expirationDate: 'Expiration Date',
    primary: 'Primary',
    primaryLabel: 'Set as primary',
    delete: 'Remove',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Save failed',
    required: 'Required',
    noLicenses: 'No licenses added yet.',
    statePlaceholder: 'Select state',
    licensePlaceholder: 'e.g. A1234567',
  },
  es: {
    addLicense: '+ Agregar otra licencia',
    state: 'Estado',
    licenseNumber: 'Numero de licencia',
    expirationDate: 'Fecha de vencimiento',
    primary: 'Principal',
    primaryLabel: 'Establecer como principal',
    delete: 'Eliminar',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
    required: 'Requerido',
    noLicenses: 'No se han agregado licencias.',
    statePlaceholder: 'Seleccionar estado',
    licensePlaceholder: 'ej. A1234567',
  },
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface LicenseRow extends USLicenseEntry {
  _localId: string;
  _saveStatus: SaveStatus;
  _errors: Partial<Record<keyof USLicenseEntry, boolean>>;
}

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fromEntry(entry: USLicenseEntry): LicenseRow {
  return { ...entry, _localId: makeLocalId(), _saveStatus: 'idle', _errors: {} };
}

function makeEmptyRow(): LicenseRow {
  return {
    _localId: makeLocalId(),
    state: '',
    licenseNumber: '',
    expirationDate: '',
    isPrimary: false,
    verificationStatus: 'pending',
    _saveStatus: 'idle',
    _errors: {},
  };
}

export default function StateLicenseForm({
  physicianId,
  licenses,
  onSave,
  lang,
}: StateLicenseFormProps) {
  const t = content[lang];
  const [rows, setRows] = useState<LicenseRow[]>(
    licenses.length > 0 ? licenses.map(fromEntry) : []
  );
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const updateRow = useCallback((localId: string, patch: Partial<LicenseRow>) => {
    setRows(prev =>
      prev.map(r => (r._localId === localId ? { ...r, ...patch } : r))
    );
  }, []);

  const validateRow = (row: LicenseRow): Partial<Record<keyof USLicenseEntry, boolean>> => {
    return {
      state: !row.state,
      licenseNumber: !row.licenseNumber,
      expirationDate: !row.expirationDate,
    };
  };

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
          section: 'state_license',
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

  const handlePrimaryToggle = useCallback(
    (localId: string) => {
      setRows(prev =>
        prev.map(r => ({ ...r, isPrimary: r._localId === localId }))
      );
      // Auto-save the toggled row
      const row = rows.find(r => r._localId === localId);
      if (!row) return;
      const errors = validateRow(row);
      if (Object.values(errors).some(Boolean)) return;

      if (saveTimersRef.current[localId]) clearTimeout(saveTimersRef.current[localId]);
      saveTimersRef.current[localId] = setTimeout(async () => {
        const { _localId, _saveStatus, _errors, ...entry } = { ...row, isPrimary: true };
        void _localId; void _saveStatus; void _errors;
        const result = await saveCredential(physicianId, {
          section: 'state_license',
          data: entry,
        });
        if (result.success) {
          onSave();
        }
      }, 800);
    },
    [rows, physicianId, onSave]
  );

  const handleDelete = useCallback(
    async (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row) return;
      setRows(prev => prev.filter(r => r._localId !== localId));
      if (row.id) {
        await deleteCredential(physicianId, {
          section: 'state_license',
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* State dropdown */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.state}
              </label>
              <select
                value={row.state}
                onChange={e => updateRow(row._localId, { state: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.state ? 'border-alert-garnet' : 'border-warm-gray-800/[0.15]'
                }`}
              >
                <option value="">{t.statePlaceholder}</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {row._errors.state && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>

            {/* License number */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.licenseNumber}
              </label>
              <input
                type="text"
                value={row.licenseNumber}
                onChange={e => updateRow(row._localId, { licenseNumber: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                placeholder={t.licensePlaceholder}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.licenseNumber ? 'border-alert-garnet bg-alert-garnet/5' : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.licenseNumber && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>

            {/* Expiration date */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.expirationDate}
              </label>
              <input
                type="date"
                value={row.expirationDate}
                onChange={e => updateRow(row._localId, { expirationDate: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.expirationDate ? 'border-alert-garnet bg-alert-garnet/5' : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.expirationDate && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">{t.required}</p>
              )}
            </div>
          </div>

          {/* Row actions */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name={`primary-license-${physicianId}`}
                checked={row.isPrimary}
                onChange={() => handlePrimaryToggle(row._localId)}
                className="accent-clinical-teal w-4 h-4"
              />
              <span className="font-dm-sans text-sm text-body-slate">{t.primaryLabel}</span>
            </label>
            <div className="flex items-center gap-3">
              {renderSaveStatus(row._saveStatus)}
              <button
                onClick={() => handleDelete(row._localId)}
                className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addRow}
        className="font-dm-sans text-sm font-medium text-clinical-teal hover:text-clinical-teal/80 transition-colors"
      >
        {t.addLicense}
      </button>
    </div>
  );
}
