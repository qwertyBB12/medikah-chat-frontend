/**
 * EducationSection — canonical education capture (Phase B2).
 *
 * Gives medical school / residency / fellowship a home in Credentials so the
 * Public Profile can become a visibility layer (derive-at-read). Self-contained
 * accordion (ContactInfoSection idiom) with per-row autosave (SpecialtiesSection
 * idiom). Reads/writes the canonical physician_education store via educationClient.
 *
 * Board certifications are NOT here — they live on specialty rows
 * (physician_specialties, Phase B1). Verification is NOT set here; it comes from
 * an admin (spec §5). Each row shows its current verification badge.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { PhysicianEducation, EducationKind } from '../../lib/educationTypes';
import { getEducation, saveEducation, deleteEducation } from '../../lib/educationClient';
import CompletionBadge from './credentials/CompletionBadge';
import type { CompletionStatus } from './credentials/CompletionBadge';
import type { SupportedLang } from '../../lib/i18n';

interface EducationSectionProps {
  physicianId: string;
  lang: SupportedLang;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EduRow extends PhysicianEducation {
  _localId: string;
  _saveStatus: SaveStatus;
}

const content = {
  en: {
    sectionTitle: 'Education & Training',
    subtitle: 'Medical school, residency, and fellowships. Board certifications live with your specialties.',
    medSchool: 'Medical School',
    medSchoolPlaceholder: 'e.g. Harvard Medical School',
    country: 'Country',
    countryPlaceholder: 'e.g. United States',
    gradYear: 'Graduation year',
    residency: 'Residency',
    fellowships: 'Fellowships / Subspecialties',
    institution: 'Institution',
    specialty: 'Specialty',
    startYear: 'Start year',
    endYear: 'End year',
    addResidency: '+ Add residency',
    addFellowship: '+ Add fellowship / subspecialty',
    remove: 'Remove',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Save failed',
    loading: 'Loading education...',
    loadError: 'Could not load education. Please refresh.',
    verified: 'Verified',
    manualReview: 'Pending review',
    pending: 'Not yet verified',
    complete: 'Complete',
    inProgress: 'In progress',
    notStarted: 'Not started',
  },
  es: {
    sectionTitle: 'Educacion y Formacion',
    subtitle: 'Escuela de medicina, residencia y becas. Las certificaciones de consejo van con sus especialidades.',
    medSchool: 'Escuela de Medicina',
    medSchoolPlaceholder: 'ej. Facultad de Medicina UNAM',
    country: 'Pais',
    countryPlaceholder: 'ej. Mexico',
    gradYear: 'Ano de graduacion',
    residency: 'Residencia',
    fellowships: 'Fellowships / Subespecialidades',
    institution: 'Institucion',
    specialty: 'Especialidad',
    startYear: 'Ano inicio',
    endYear: 'Ano fin',
    addResidency: '+ Agregar residencia',
    addFellowship: '+ Agregar fellowship / subespecialidad',
    remove: 'Eliminar',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
    loading: 'Cargando educacion...',
    loadError: 'No se pudo cargar la educacion. Por favor recargue.',
    verified: 'Verificado',
    manualReview: 'Revision pendiente',
    pending: 'Sin verificar',
    complete: 'Completo',
    inProgress: 'En progreso',
    notStarted: 'No iniciado',
  },
};

function makeLocalId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function toRow(e: PhysicianEducation): EduRow {
  return { ...e, _localId: makeLocalId(), _saveStatus: 'idle' };
}

function emptyRow(kind: EducationKind): EduRow {
  return {
    _localId: makeLocalId(),
    kind,
    institution: '',
    verificationStatus: 'pending',
    _saveStatus: 'idle',
  };
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-archival-grey transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function EducationSection({ physicianId, lang }: EducationSectionProps) {
  const t = content[lang];
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [medSchool, setMedSchool] = useState<EduRow>(emptyRow('medical_school'));
  const [residencies, setResidencies] = useState<EduRow[]>([]);
  const [fellowships, setFellowships] = useState<EduRow[]>([]);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load canonical education on mount.
  useEffect(() => {
    let active = true;
    setLoading(true);
    getEducation(physicianId).then((result) => {
      if (!active) return;
      setLoading(false);
      if (result.success && result.data) {
        const rows = result.data.education;
        const school = rows.find((e) => e.kind === 'medical_school');
        setMedSchool(school ? toRow(school) : emptyRow('medical_school'));
        setResidencies(rows.filter((e) => e.kind === 'residency').map(toRow));
        setFellowships(rows.filter((e) => e.kind === 'fellowship').map(toRow));
      } else {
        setLoadError(true);
      }
    });
    return () => {
      active = false;
    };
  }, [physicianId]);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const persist = useCallback(
    (row: EduRow, apply: (patch: Partial<EduRow>) => void) => {
      if (!row.institution.trim()) return;
      if (saveTimers.current[row._localId]) clearTimeout(saveTimers.current[row._localId]);
      apply({ _saveStatus: 'saving' });
      saveTimers.current[row._localId] = setTimeout(async () => {
        const result = await saveEducation(physicianId, {
          education: {
            id: row.id,
            kind: row.kind,
            institution: row.institution.trim(),
            country: row.country,
            specialty: row.specialty,
            startYear: row.startYear,
            endYear: row.endYear,
            verificationStatus: row.verificationStatus,
            verificationSource: row.verificationSource ?? null,
          },
        });
        if (result.success) {
          apply({ _saveStatus: 'saved', id: result.credentialId || row.id });
          setTimeout(() => apply({ _saveStatus: 'idle' }), 2000);
        } else {
          apply({ _saveStatus: 'error' });
        }
      }, 800);
    },
    [physicianId]
  );

  const patchMed = useCallback(
    (patch: Partial<EduRow>) => setMedSchool((p) => ({ ...p, ...patch })),
    []
  );
  const patchList = useCallback(
    (
      setList: React.Dispatch<React.SetStateAction<EduRow[]>>,
      localId: string,
      patch: Partial<EduRow>
    ) => setList((prev) => prev.map((r) => (r._localId === localId ? { ...r, ...patch } : r))),
    []
  );

  const removeFromList = useCallback(
    async (
      list: EduRow[],
      setList: React.Dispatch<React.SetStateAction<EduRow[]>>,
      localId: string
    ) => {
      const row = list.find((r) => r._localId === localId);
      if (!row) return;
      setList((prev) => prev.filter((r) => r._localId !== localId));
      if (row.id) await deleteEducation(physicianId, row.id);
    },
    [physicianId]
  );

  const completion: CompletionStatus = medSchool.institution.trim()
    ? 'complete'
    : residencies.length > 0 || fellowships.length > 0
    ? 'in_progress'
    : 'empty';
  const badgeLabel =
    completion === 'complete' ? t.complete : completion === 'in_progress' ? t.inProgress : t.notStarted;

  const inputCls =
    'w-full font-dm-sans text-sm border border-warm-gray-800/[0.15] rounded-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 transition-colors';
  const labelCls = 'block font-dm-sans text-xs font-medium text-archival-grey mb-1';

  const renderSaveStatus = (status: SaveStatus) => {
    if (status === 'saving')
      return <span className="font-dm-sans text-xs text-archival-grey">{t.saving}</span>;
    if (status === 'saved')
      return <span className="font-dm-sans text-xs text-confirm-green">{t.saved}</span>;
    if (status === 'error')
      return <span className="font-dm-sans text-xs text-alert-garnet">{t.error}</span>;
    return null;
  };

  const renderVerification = (e: EduRow) => {
    if (!e.institution.trim()) return null;
    const map = {
      verified: { label: t.verified, cls: 'text-confirm-green' },
      manual_review: { label: t.manualReview, cls: 'text-caution-amber' },
      pending: { label: t.pending, cls: 'text-archival-grey' },
    } as const;
    const v = map[e.verificationStatus];
    return <span className={`font-dm-sans text-xs ${v.cls}`}>{v.label}</span>;
  };

  // Residency / fellowship row (institution + specialty + start/end year).
  const renderListRow = (
    row: EduRow,
    apply: (patch: Partial<EduRow>) => void,
    onRemove: () => void
  ) => (
    <div className="bg-clinical-surface rounded-sm p-4 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-3 right-3 font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 transition-colors"
      >
        {t.remove}
      </button>
      <div className="space-y-3 pr-16">
        <div>
          <label className={labelCls}>{t.institution}</label>
          <input
            type="text"
            value={row.institution}
            onChange={(e) => apply({ institution: e.target.value })}
            onBlur={() => persist({ ...row }, apply)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>{t.specialty}</label>
          <input
            type="text"
            value={row.specialty ?? ''}
            onChange={(e) => apply({ specialty: e.target.value })}
            onBlur={() => persist({ ...row }, apply)}
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{t.startYear}</label>
            <input
              type="number"
              min={1950}
              max={2100}
              value={row.startYear ?? ''}
              onChange={(e) =>
                apply({ startYear: e.target.value ? parseInt(e.target.value, 10) : undefined })
              }
              onBlur={() => persist({ ...row }, apply)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t.endYear}</label>
            <input
              type="number"
              min={1950}
              max={2100}
              value={row.endYear ?? ''}
              onChange={(e) =>
                apply({ endYear: e.target.value ? parseInt(e.target.value, 10) : undefined })
              }
              onBlur={() => persist({ ...row }, apply)}
              className={inputCls}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        {renderVerification(row)}
        {renderSaveStatus(row._saveStatus)}
      </div>
    </div>
  );

  const renderList = (
    label: string,
    list: EduRow[],
    setList: React.Dispatch<React.SetStateAction<EduRow[]>>,
    kind: EducationKind,
    addLabel: string
  ) => (
    <div>
      <label className="block font-dm-sans text-xs font-semibold text-deep-charcoal mb-2">{label}</label>
      <div className="space-y-3">
        {list.map((row) => (
          <div key={row._localId}>
            {renderListRow(
              row,
              (patch) => patchList(setList, row._localId, patch),
              () => removeFromList(list, setList, row._localId)
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setList((prev) => [...prev, emptyRow(kind)])}
        className="mt-3 font-dm-sans text-sm font-medium text-clinical-teal hover:text-clinical-teal/80 transition-colors"
      >
        {addLabel}
      </button>
    </div>
  );

  return (
    <div id="education-section" className="border border-warm-gray-800/[0.06] rounded-md overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-linen-white hover:bg-linen-light transition-colors min-h-[44px]"
        aria-expanded={open}
        aria-controls="education-panel"
      >
        <div className="flex items-center gap-3">
          <span className="font-dm-sans text-sm font-semibold text-deep-charcoal">{t.sectionTitle}</span>
          <CompletionBadge status={completion} label={badgeLabel} />
        </div>
        <Chevron open={open} />
      </button>

      {open && (
        <div id="education-panel" className="px-4 pb-5 pt-3 bg-white">
          {loading && <p className="font-dm-sans text-sm text-archival-grey">{t.loading}</p>}
          {loadError && <p className="font-dm-sans text-sm text-alert-garnet">{t.loadError}</p>}
          {!loading && !loadError && (
            <div className="space-y-5">
              <p className="font-dm-sans text-xs text-archival-grey">{t.subtitle}</p>

              {/* Medical school (single) */}
              <div>
                <label className="block font-dm-sans text-xs font-semibold text-deep-charcoal mb-2">
                  {t.medSchool}
                </label>
                <div className="bg-clinical-surface rounded-sm p-4">
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>{t.institution}</label>
                      <input
                        type="text"
                        value={medSchool.institution}
                        onChange={(e) => patchMed({ institution: e.target.value })}
                        onBlur={() => persist({ ...medSchool }, patchMed)}
                        placeholder={t.medSchoolPlaceholder}
                        className={inputCls}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>{t.country}</label>
                        <input
                          type="text"
                          value={medSchool.country ?? ''}
                          onChange={(e) => patchMed({ country: e.target.value })}
                          onBlur={() => persist({ ...medSchool }, patchMed)}
                          placeholder={t.countryPlaceholder}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>{t.gradYear}</label>
                        <input
                          type="number"
                          min={1950}
                          max={2100}
                          value={medSchool.endYear ?? ''}
                          onChange={(e) =>
                            patchMed({ endYear: e.target.value ? parseInt(e.target.value, 10) : undefined })
                          }
                          onBlur={() => persist({ ...medSchool }, patchMed)}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    {renderVerification(medSchool)}
                    {renderSaveStatus(medSchool._saveStatus)}
                  </div>
                </div>
              </div>

              {/* Residencies */}
              {renderList(t.residency, residencies, setResidencies, 'residency', t.addResidency)}

              {/* Fellowships */}
              {renderList(t.fellowships, fellowships, setFellowships, 'fellowship', t.addFellowship)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
