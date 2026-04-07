/**
 * ConsejoForm — Panel 3: Consejo certifications linked to specialties.
 * Includes searchable combobox using CONACEM's 47-Consejo list (plus custom entry).
 * Specialty dropdown populated from EspecialidadesForm entries (per D-10).
 * Auto-saves on blur. "+ Add another Consejo certification" for multi-entry. Bilingual EN/ES.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConsejoEntry, CedulaEspecialidadEntry } from '../../../lib/mxCredentialTypes';
import { CONACEM_CONSEJOS } from '../../../lib/mxCredentialTypes';
import {
  saveMXCredential,
  deleteMXCredential,
} from '../../../lib/mxCredentialClient';
import type { SupportedLang } from '../../../lib/i18n';

interface ConsejoFormProps {
  physicianId: string;
  lang: SupportedLang;
  consejos: ConsejoEntry[];
  especialidades: CedulaEspecialidadEntry[];
  onRefresh: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ConsejoRow extends ConsejoEntry {
  _localId: string;
  _saveStatus: SaveStatus;
  _errors: Record<string, string>;
  _comboboxOpen: boolean;
  _comboboxFilter: string;
}

const content = {
  en: {
    consejoName: 'Consejo Name',
    consejoPlaceholder: 'Search or type Consejo name...',
    specialty: 'Specialty',
    selectSpecialty: 'Select specialty',
    recertificationYear: 'Recertification Year',
    pointThreshold: 'Point threshold (if known)',
    addAnother: '+ Add another Consejo certification',
    remove: 'Remove',
    saved: 'Saved',
    saving: 'Saving...',
    error: 'Save failed',
    required: 'Required',
    noSpecialties: 'Add specialties in the Especialidades panel first',
    customEntry: 'Use custom name',
    yearPlaceholder: 'e.g. 2024',
    pointsPlaceholder: 'e.g. 350',
    noResults: 'No matching Consejos — type to use custom name',
  },
  es: {
    consejoName: 'Nombre del Consejo',
    consejoPlaceholder: 'Busque o escriba el nombre del Consejo...',
    specialty: 'Especialidad',
    selectSpecialty: 'Seleccione especialidad',
    recertificationYear: 'Anio de Recertificacion',
    pointThreshold: 'Umbral de puntos (si lo conoce)',
    addAnother: '+ Agregar otra certificacion de Consejo',
    remove: 'Eliminar',
    saved: 'Guardado',
    saving: 'Guardando...',
    error: 'Error al guardar',
    required: 'Requerido',
    noSpecialties: 'Agregue especialidades en el panel de Especialidades primero',
    customEntry: 'Usar nombre personalizado',
    yearPlaceholder: 'ej. 2024',
    pointsPlaceholder: 'ej. 350',
    noResults: 'Sin resultados — escriba para usar nombre personalizado',
  },
};

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function fromEntry(entry: ConsejoEntry): ConsejoRow {
  return {
    ...entry,
    _localId: makeLocalId(),
    _saveStatus: 'idle',
    _errors: {},
    _comboboxOpen: false,
    _comboboxFilter: entry.consejoName || '',
  };
}

function makeEmptyRow(): ConsejoRow {
  return {
    _localId: makeLocalId(),
    consejoName: '',
    specialty: '',
    recertificationYear: undefined,
    pointThreshold: undefined,
    verificationStatus: 'pending',
    _saveStatus: 'idle',
    _errors: {},
    _comboboxOpen: false,
    _comboboxFilter: '',
  };
}

export default function ConsejoForm({
  physicianId,
  lang,
  consejos,
  especialidades,
  onRefresh,
}: ConsejoFormProps) {
  const t = content[lang];
  const [rows, setRows] = useState<ConsejoRow[]>(
    consejos.length > 0 ? consejos.map(fromEntry) : []
  );
  const saveTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const comboboxCloseTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Keep rows in sync when the parent pushes new especialidades
  // (no re-init needed — specialty dropdown reads from props directly)

  const updateRow = useCallback((localId: string, patch: Partial<ConsejoRow>) => {
    setRows(prev =>
      prev.map(r => (r._localId === localId ? { ...r, ...patch } : r))
    );
  }, []);

  const triggerSave = useCallback(
    (localId: string, rowData: ConsejoRow) => {
      if (saveTimersRef.current[localId]) clearTimeout(saveTimersRef.current[localId]);
      updateRow(localId, { _saveStatus: 'saving' });

      saveTimersRef.current[localId] = setTimeout(async () => {
        const result = await saveMXCredential(physicianId, {
          section: 'consejo',
          data: {
            id: rowData.id,
            consejoName: rowData.consejoName,
            specialty: rowData.specialty,
            recertificationYear: rowData.recertificationYear,
            pointThreshold: rowData.pointThreshold,
            verificationStatus: rowData.verificationStatus,
          },
        });

        if (result.success) {
          updateRow(localId, {
            _saveStatus: 'saved',
            id: result.credentialId || rowData.id,
          });
          onRefresh();
          setTimeout(() => updateRow(localId, { _saveStatus: 'idle' }), 2000);
        } else {
          updateRow(localId, { _saveStatus: 'error' });
        }
      }, 800);
    },
    [physicianId, onRefresh, updateRow]
  );

  const handleFieldBlur = useCallback(
    (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row || !row.consejoName.trim()) return;
      triggerSave(localId, row);
    },
    [rows, triggerSave]
  );

  const handleSpecialtyChange = useCallback(
    (localId: string, specialty: string) => {
      updateRow(localId, { specialty });
      const row = rows.find(r => r._localId === localId);
      if (!row) return;
      triggerSave(localId, { ...row, specialty });
    },
    [rows, updateRow, triggerSave]
  );

  const handleDelete = useCallback(
    async (localId: string) => {
      const row = rows.find(r => r._localId === localId);
      if (!row) return;
      setRows(prev => prev.filter(r => r._localId !== localId));
      if (row.id) {
        await deleteMXCredential(physicianId, {
          section: 'consejo',
          credentialId: row.id,
        });
        onRefresh();
      }
    },
    [rows, physicianId, onRefresh]
  );

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);

  // Combobox: open dropdown on input focus/change
  const handleComboboxChange = useCallback(
    (localId: string, value: string) => {
      updateRow(localId, {
        _comboboxFilter: value,
        consejoName: value,
        _comboboxOpen: true,
      });
    },
    [updateRow]
  );

  const handleComboboxSelect = useCallback(
    (localId: string, value: string) => {
      updateRow(localId, {
        consejoName: value,
        _comboboxFilter: value,
        _comboboxOpen: false,
      });
      // Trigger save after selection
      const row = rows.find(r => r._localId === localId);
      if (row) {
        triggerSave(localId, { ...row, consejoName: value });
      }
    },
    [rows, updateRow, triggerSave]
  );

  const handleComboboxBlur = useCallback(
    (localId: string) => {
      // Delay close so click on dropdown item registers first
      comboboxCloseTimersRef.current[localId] = setTimeout(() => {
        updateRow(localId, { _comboboxOpen: false });
        handleFieldBlur(localId);
      }, 200);
    },
    [updateRow, handleFieldBlur]
  );

  const handleComboboxFocus = useCallback(
    (localId: string) => {
      // Cancel pending close if re-focused
      if (comboboxCloseTimersRef.current[localId]) {
        clearTimeout(comboboxCloseTimersRef.current[localId]);
      }
      updateRow(localId, { _comboboxOpen: true });
    },
    [updateRow]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const saveTimers = saveTimersRef.current;
    const comboTimers = comboboxCloseTimersRef.current;
    return () => {
      Object.values(saveTimers).forEach(clearTimeout);
      Object.values(comboTimers).forEach(clearTimeout);
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

  const getFilteredConsejos = (filter: string): readonly string[] => {
    if (!filter.trim()) return CONACEM_CONSEJOS;
    const lowerFilter = filter.toLowerCase();
    return CONACEM_CONSEJOS.filter(c => c.toLowerCase().includes(lowerFilter));
  };

  const specialtyOptions = especialidades
    .map(e => e.specialtyName)
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {rows.map(row => {
        const filteredConsejos = getFilteredConsejos(row._comboboxFilter);

        return (
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
              {/* Consejo Name combobox */}
              <div className="relative">
                <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                  {t.consejoName}
                </label>
                <input
                  type="text"
                  value={row._comboboxFilter}
                  onChange={e => handleComboboxChange(row._localId, e.target.value)}
                  onFocus={() => handleComboboxFocus(row._localId)}
                  onBlur={() => handleComboboxBlur(row._localId)}
                  placeholder={t.consejoPlaceholder}
                  className={`w-full font-dm-sans text-sm border rounded-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors ${
                    row._errors.consejoName
                      ? 'border-alert-garnet bg-alert-garnet/5'
                      : 'border-warm-gray-800/[0.15] bg-white'
                  }`}
                />
                {row._errors.consejoName && (
                  <p className="font-dm-sans text-xs text-alert-garnet mt-0.5">
                    {row._errors.consejoName}
                  </p>
                )}

                {/* Dropdown */}
                {row._comboboxOpen && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-archival-grey/30 rounded-sm shadow-md max-h-60 overflow-y-auto">
                    {filteredConsejos.length > 0 ? (
                      filteredConsejos.map(consejo => (
                        <button
                          key={consejo}
                          type="button"
                          onMouseDown={e => {
                            // Prevent blur from firing before click
                            e.preventDefault();
                            handleComboboxSelect(row._localId, consejo);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-clinical-surface cursor-pointer font-dm-sans text-sm text-deep-charcoal transition-colors"
                        >
                          {consejo}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 font-dm-sans text-xs text-archival-grey italic">
                        {t.noResults}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Specialty dropdown */}
              <div>
                <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                  {t.specialty}
                </label>
                {specialtyOptions.length > 0 ? (
                  <select
                    value={row.specialty}
                    onChange={e => handleSpecialtyChange(row._localId, e.target.value)}
                    className="w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors"
                  >
                    <option value="">{t.selectSpecialty}</option>
                    {specialtyOptions.map(specialty => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-dm-sans text-sm text-archival-grey italic py-2">
                    {t.noSpecialties}
                  </p>
                )}
              </div>

              {/* Two-column: Recertification Year + Point Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                    {t.recertificationYear}
                  </label>
                  <input
                    type="number"
                    min={1990}
                    max={2100}
                    value={row.recertificationYear ?? ''}
                    onChange={e => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      updateRow(row._localId, { recertificationYear: val });
                    }}
                    onBlur={() => handleFieldBlur(row._localId)}
                    placeholder={t.yearPlaceholder}
                    className="w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                    {t.pointThreshold}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={row.pointThreshold ?? ''}
                    onChange={e => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                      updateRow(row._localId, { pointThreshold: val });
                    }}
                    onBlur={() => handleFieldBlur(row._localId)}
                    placeholder={t.pointsPlaceholder}
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
        );
      })}

      <button
        onClick={addRow}
        className="font-dm-sans text-sm font-medium text-clinical-teal hover:text-clinical-teal/80 transition-colors"
      >
        {t.addAnother}
      </button>
    </div>
  );
}
