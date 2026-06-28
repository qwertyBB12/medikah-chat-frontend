/**
 * SpecialtiesSection — unified specialty list (Phase B1, Dr. Aguirre annotation 3).
 *
 * Replaces the separate "Board Certifications" + "Sub-specialties" accordions.
 * One primary specialty row + N subspecialty rows. Each row carries a
 * "Board certified" checkbox; when checked it reveals exactly Certifying board +
 * Expiration year — nothing else. Reads/writes the canonical physician_specialties
 * store via specialtyClient. Country-scoped via the `country` prop. Auto-saves on
 * blur (800ms debounce), mirroring the sibling credential forms.
 *
 * Verification is NOT set here — it comes from the NPI/SEP lookups or an admin.
 * Each row shows its current verification badge.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { PhysicianSpecialty } from '../../../lib/specialtyTypes';
import { saveSpecialty, deleteSpecialty } from '../../../lib/specialtyClient';
import type { SupportedLang } from '../../../lib/i18n';

interface SpecialtiesSectionProps {
  physicianId: string;
  lang: SupportedLang;
  country: 'US' | 'MX';
  specialties: PhysicianSpecialty[];
  onRefresh: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SpecRow extends PhysicianSpecialty {
  _localId: string;
  _saveStatus: SaveStatus;
}

const content = {
  en: {
    primaryLabel: 'Primary Specialty',
    primaryPlaceholder: 'e.g. Internal Medicine',
    subLabel: 'Subspecialties',
    subPlaceholder: 'e.g. Interventional Cardiology',
    boardCertified: 'Board certified',
    certifyingBoard: 'Certifying board',
    boardPlaceholder: 'e.g. ABIM',
    expirationYear: 'Expiration year',
    yearPlaceholder: 'e.g. 2030',
    addSub: '+ Add subspecialty',
    remove: 'Remove',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Save failed',
    verified: 'Verified',
    manualReview: 'Pending review',
    pending: 'Not yet verified',
  },
  es: {
    primaryLabel: 'Especialidad Principal',
    primaryPlaceholder: 'ej. Medicina Interna',
    subLabel: 'Subespecialidades',
    subPlaceholder: 'ej. Cardiología Intervencionista',
    boardCertified: 'Certificado por consejo/junta',
    certifyingBoard: 'Junta certificadora',
    boardPlaceholder: 'ej. ABIM',
    expirationYear: 'Año de vencimiento',
    yearPlaceholder: 'ej. 2030',
    addSub: '+ Agregar subespecialidad',
    remove: 'Eliminar',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
    verified: 'Verificado',
    manualReview: 'Revisión pendiente',
    pending: 'Sin verificar',
  },
};

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toRow(s: PhysicianSpecialty): SpecRow {
  return { ...s, _localId: makeLocalId(), _saveStatus: 'idle' };
}

function emptyRow(country: 'US' | 'MX', role: PhysicianSpecialty['role']): SpecRow {
  return {
    _localId: makeLocalId(),
    country,
    name: '',
    role,
    boardCertified: false,
    verificationStatus: 'pending',
    _saveStatus: 'idle',
  };
}

export default function SpecialtiesSection({
  physicianId,
  lang,
  country,
  specialties,
  onRefresh,
}: SpecialtiesSectionProps) {
  const t = content[lang];

  const initialPrimary =
    specialties.find((s) => s.role === 'primary' && s.country === country);
  const initialSubs = specialties.filter(
    (s) => s.role === 'subspecialty' && s.country === country
  );

  const [primary, setPrimary] = useState<SpecRow>(
    initialPrimary ? toRow(initialPrimary) : emptyRow(country, 'primary')
  );
  const [subs, setSubs] = useState<SpecRow[]>(initialSubs.map(toRow));
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = saveTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const persist = useCallback(
    (row: SpecRow, apply: (patch: Partial<SpecRow>) => void) => {
      if (!row.name.trim()) return;
      if (saveTimers.current[row._localId]) clearTimeout(saveTimers.current[row._localId]);
      apply({ _saveStatus: 'saving' });
      saveTimers.current[row._localId] = setTimeout(async () => {
        const result = await saveSpecialty(physicianId, {
          specialty: {
            id: row.id,
            country: row.country,
            name: row.name.trim(),
            role: row.role,
            boardCertified: row.boardCertified,
            certifyingBoard: row.certifyingBoard,
            expirationYear: row.expirationYear,
            verificationStatus: row.verificationStatus,
            verificationSource: row.verificationSource ?? null,
          },
        });
        if (result.success) {
          apply({ _saveStatus: 'saved', id: result.credentialId || row.id });
          onRefresh();
          setTimeout(() => apply({ _saveStatus: 'idle' }), 2000);
        } else {
          apply({ _saveStatus: 'error' });
        }
      }, 800);
    },
    [physicianId, onRefresh]
  );

  const patchPrimary = useCallback(
    (patch: Partial<SpecRow>) => setPrimary((p) => ({ ...p, ...patch })),
    []
  );
  const patchSub = useCallback(
    (localId: string, patch: Partial<SpecRow>) =>
      setSubs((prev) => prev.map((r) => (r._localId === localId ? { ...r, ...patch } : r))),
    []
  );

  const addSub = () => setSubs((prev) => [...prev, emptyRow(country, 'subspecialty')]);

  const removeSub = useCallback(
    async (localId: string) => {
      const row = subs.find((r) => r._localId === localId);
      if (!row) return;
      setSubs((prev) => prev.filter((r) => r._localId !== localId));
      if (row.id) {
        await deleteSpecialty(physicianId, row.id);
        onRefresh();
      }
    },
    [subs, physicianId, onRefresh]
  );

  const renderSaveStatus = (status: SaveStatus) => {
    if (status === 'saving')
      return <span className="font-dm-sans text-xs text-archival-grey">{t.saving}</span>;
    if (status === 'saved')
      return <span className="font-dm-sans text-xs text-confirm-green">{t.saved}</span>;
    if (status === 'error')
      return <span className="font-dm-sans text-xs text-alert-garnet">{t.error}</span>;
    return null;
  };

  const renderVerification = (s: PhysicianSpecialty) => {
    if (!s.name.trim()) return null;
    const map = {
      verified: { label: t.verified, cls: 'text-confirm-green' },
      manual_review: { label: t.manualReview, cls: 'text-caution-amber' },
      pending: { label: t.pending, cls: 'text-archival-grey' },
    } as const;
    const v = map[s.verificationStatus];
    return <span className={`font-dm-sans text-xs ${v.cls}`}>{v.label}</span>;
  };

  const inputCls =
    'w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors';

  const renderRow = (
    row: SpecRow,
    apply: (patch: Partial<SpecRow>) => void,
    opts: { placeholder: string; onRemove?: () => void }
  ) => (
    <div className="bg-clinical-surface rounded-sm p-4 relative">
      {opts.onRemove && (
        <button
          type="button"
          onClick={opts.onRemove}
          className="absolute top-3 right-3 font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 transition-colors"
        >
          {t.remove}
        </button>
      )}
      <div className="space-y-3 pr-16">
        <input
          type="text"
          value={row.name}
          onChange={(e) => apply({ name: e.target.value })}
          onBlur={() => persist({ ...row, ...{} }, apply)}
          placeholder={opts.placeholder}
          className={inputCls}
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={row.boardCertified}
            onChange={(e) => {
              const boardCertified = e.target.checked;
              apply({ boardCertified });
              persist({ ...row, boardCertified }, apply);
            }}
            className="accent-clinical-teal"
          />
          <span className="font-dm-sans text-sm text-deep-charcoal">{t.boardCertified}</span>
        </label>

        {row.boardCertified && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.certifyingBoard}
              </label>
              <input
                type="text"
                value={row.certifyingBoard ?? ''}
                onChange={(e) => apply({ certifyingBoard: e.target.value })}
                onBlur={() => persist({ ...row }, apply)}
                placeholder={t.boardPlaceholder}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-dm-sans text-xs font-medium text-archival-grey mb-1">
                {t.expirationYear}
              </label>
              <input
                type="number"
                min={1990}
                max={2100}
                value={row.expirationYear ?? ''}
                onChange={(e) =>
                  apply({
                    expirationYear: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                onBlur={() => persist({ ...row }, apply)}
                placeholder={t.yearPlaceholder}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center mt-2">
        {renderVerification(row)}
        {renderSaveStatus(row._saveStatus)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-dm-sans text-xs font-semibold text-deep-charcoal mb-2">
          {t.primaryLabel}
        </label>
        {renderRow(primary, patchPrimary, { placeholder: t.primaryPlaceholder })}
      </div>

      <div>
        <label className="block font-dm-sans text-xs font-semibold text-deep-charcoal mb-2">
          {t.subLabel}
        </label>
        <div className="space-y-3">
          {subs.map((row) =>
            <div key={row._localId}>
              {renderRow(row, (patch) => patchSub(row._localId, patch), {
                placeholder: t.subPlaceholder,
                onRemove: () => removeSub(row._localId),
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={addSub}
          className="mt-3 font-dm-sans text-sm font-medium text-clinical-teal hover:text-clinical-teal/80 transition-colors"
        >
          {t.addSub}
        </button>
      </div>
    </div>
  );
}
