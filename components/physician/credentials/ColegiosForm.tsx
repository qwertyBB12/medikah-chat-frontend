/**
 * ColegiosForm — Panel 5: Optional colegio / professional society memberships.
 * Simple multi-entry form: name, membership number, year joined.
 * Auto-saves on blur. Fully optional — informational only. Bilingual EN/ES.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ColegioEntry } from '../../../lib/mxCredentialTypes';
import {
  saveMXCredential,
  deleteMXCredential,
} from '../../../lib/mxCredentialClient';
import type { SupportedLang } from '../../../lib/i18n';

interface ColegiosFormProps {
  physicianId: string;
  lang: SupportedLang;
  colegios: ColegioEntry[];
  onRefresh: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ColegioRow extends ColegioEntry {
  _localId: string;
  _saveStatus: SaveStatus;
  _errors: Record<string, string>;
}

const content = {
  en: {
    colegioName: 'Colegio / Professional Society',
    colegioPlaceholder: 'e.g., COMEGO, FEMECOG',
    membershipNumber: 'Membership Number',
    membershipPlaceholder: 'Optional',
    joinedYear: 'Year Joined',
    yearPlaceholder: 'e.g. 2015',
    addAnother: '+ Add another membership',
    remove: 'Remove',
    saved: 'Saved',
    saving: 'Saving...',
    error: 'Save failed',
    required: 'Required',
    note: 'Colegio memberships are optional and informational.',
  },
  es: {
    colegioName: 'Colegio / Sociedad Profesional',
    colegioPlaceholder: 'ej., COMEGO, FEMECOG',
    membershipNumber: 'Numero de Membresia',
    membershipPlaceholder: 'Opcional',
    joinedYear: 'Anio de Ingreso',
    yearPlaceholder: 'ej. 2015',
    addAnother: '+ Agregar otra membresia',
    remove: 'Eliminar',
    saved: 'Guardado',
    saving: 'Guardando...',
    error: 'Error al guardar',
    required: 'Requerido',
    note: 'Las membresias de colegios son opcionales e informativas.',
  },
};

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fromEntry(entry: ColegioEntry): ColegioRow {
  return {
    ...entry,
    _localId: makeLocalId(),
    _saveStatus: 'idle',
    _errors: {},
  };
}

function makeEmptyRow(): ColegioRow {
  return {
    _localId: makeLocalId(),
    colegioName: '',
    membershipNumber: '',
    joinedYear: undefined,
    _saveStatus: 'idle',
    _errors: {},
  };
}

export default function ColegiosForm({
  physicianId,
  lang,
  colegios,
  onRefresh,
}: ColegiosFormProps) {
  const t = content[lang];
  const [rows, setRows] = useState<ColegioRow[]>(
    colegios.length > 0 ? colegios.map(fromEntry) : []
  );
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const updateRow = useCallback((localId: string, patch: Partial<ColegioRow>) => {
    setRows(prev =>
      prev.map(r => (r._localId === localId ? { ...r, ...patch } : r))
    );
  }, []);

  const handleFieldBlur = useCallback(
    (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row) return;

      // Validate: colegioName is the only required field
      const errors: Record<string, string> = {};
      if (!row.colegioName.trim()) errors.colegioName = t.required;

      updateRow(localId, { _errors: errors });
      if (Object.keys(errors).length > 0) return;

      if (saveTimersRef.current[localId]) clearTimeout(saveTimersRef.current[localId]);
      updateRow(localId, { _saveStatus: 'saving' });

      saveTimersRef.current[localId] = setTimeout(async () => {
        const currentRow = rows.find(r => r._localId === localId);
        if (!currentRow) return;

        const result = await saveMXCredential(physicianId, {
          section: 'colegio',
          data: {
            id: currentRow.id,
            colegioName: currentRow.colegioName,
            membershipNumber: currentRow.membershipNumber || undefined,
            joinedYear: currentRow.joinedYear,
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

  const handleDelete = useCallback(
    async (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row) return;
      setRows(prev => prev.filter(r => r._localId !== localId));
      if (row.id) {
        await deleteMXCredential(physicianId, {
          section: 'colegio',
          credentialId: row.id,
        });
        onRefresh();
      }
    },
    [rows, physicianId, onRefresh]
  );

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);

  // Cleanup on unmount
  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const renderSaveStatus = (status: SaveStatus) => {
    if (status === 'saving')
      return <span className="font-dm-sans text-xs text-archival-grey">{t.saving}</span>;
    if (status === 'saved')
      return <span className="font-dm-sans text-xs text-confirm-green">{t.saved}</span>;
    if (status === 'error')
      return <span className="font-dm-sans text-xs text-alert-garnet">{t.error}</span>;
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Informational note */}
      <p className="font-body text-sm text-body-slate italic">{t.note}</p>

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
            {/* Colegio Name */}
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.colegioName}
              </label>
              <input
                type="text"
                value={row.colegioName}
                onChange={e => updateRow(row._localId, { colegioName: e.target.value })}
                onBlur={() => handleFieldBlur(row._localId)}
                placeholder={t.colegioPlaceholder}
                className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                  row._errors.colegioName
                    ? 'border-alert-garnet bg-alert-garnet/5'
                    : 'border-warm-gray-800/[0.15] bg-white'
                }`}
              />
              {row._errors.colegioName && (
                <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">
                  {row._errors.colegioName}
                </p>
              )}
            </div>

            {/* Membership Number + Year Joined */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                  {t.membershipNumber}
                </label>
                <input
                  type="text"
                  value={row.membershipNumber || ''}
                  onChange={e =>
                    updateRow(row._localId, { membershipNumber: e.target.value || undefined })
                  }
                  onBlur={() => handleFieldBlur(row._localId)}
                  placeholder={t.membershipPlaceholder}
                  className="w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors"
                />
              </div>

              <div>
                <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                  {t.joinedYear}
                </label>
                <input
                  type="number"
                  min={1950}
                  max={2100}
                  value={row.joinedYear ?? ''}
                  onChange={e => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                    updateRow(row._localId, { joinedYear: val });
                  }}
                  onBlur={() => handleFieldBlur(row._localId)}
                  placeholder={t.yearPlaceholder}
                  className="w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors"
                />
              </div>
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
