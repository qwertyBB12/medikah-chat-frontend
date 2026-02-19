import { useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import { Residency, Fellowship, BoardCertification } from '../../../lib/physicianClient';

interface EducationEditorProps {
  physicianId: string;
  lang: SupportedLang;
  initialMedicalSchool: string;
  initialMedicalSchoolCountry: string;
  initialGraduationYear: number | undefined;
  initialResidency: Residency[];
  initialFellowships: Fellowship[];
  initialBoardCertifications: BoardCertification[];
}

const content = {
  en: {
    title: 'Education & Training',
    subtitle: 'Update your medical education, residency, fellowships, and board certifications.',
    medSchool: 'Medical School',
    medSchoolPlaceholder: 'e.g. Harvard Medical School',
    country: 'Country',
    countryPlaceholder: 'e.g. United States',
    gradYear: 'Graduation Year',
    residency: 'Residency',
    fellowships: 'Fellowships',
    boardCerts: 'Board Certifications',
    institution: 'Institution',
    specialty: 'Specialty',
    startYear: 'Start Year',
    endYear: 'End Year',
    board: 'Board',
    certification: 'Certification',
    year: 'Year',
    add: 'Add',
    remove: 'Remove',
    save: 'Save Education',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Failed to save',
  },
  es: {
    title: 'Educación y Formación',
    subtitle: 'Actualice su educación médica, residencia, becas y certificaciones.',
    medSchool: 'Escuela de Medicina',
    medSchoolPlaceholder: 'ej. Facultad de Medicina UNAM',
    country: 'País',
    countryPlaceholder: 'ej. México',
    gradYear: 'Año de Graduación',
    residency: 'Residencia',
    fellowships: 'Becas / Fellowships',
    boardCerts: 'Certificaciones',
    institution: 'Institución',
    specialty: 'Especialidad',
    startYear: 'Año Inicio',
    endYear: 'Año Fin',
    board: 'Junta',
    certification: 'Certificación',
    year: 'Año',
    add: 'Agregar',
    remove: 'Eliminar',
    save: 'Guardar Educación',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
  },
};

const emptyResidency: Residency = { institution: '', specialty: '', startYear: 0, endYear: 0 };
const emptyFellowship: Fellowship = { institution: '', specialty: '', startYear: 0, endYear: 0 };
const emptyCert: BoardCertification = { board: '', certification: '', year: undefined };

export default function EducationEditor({
  physicianId,
  lang,
  initialMedicalSchool,
  initialMedicalSchoolCountry,
  initialGraduationYear,
  initialResidency,
  initialFellowships,
  initialBoardCertifications,
}: EducationEditorProps) {
  const t = content[lang];
  const [medicalSchool, setMedicalSchool] = useState(initialMedicalSchool);
  const [medicalSchoolCountry, setMedicalSchoolCountry] = useState(initialMedicalSchoolCountry);
  const [graduationYear, setGraduationYear] = useState(initialGraduationYear || '');
  const [residency, setResidency] = useState<Residency[]>(initialResidency);
  const [fellowships, setFellowships] = useState<Fellowship[]>(initialFellowships);
  const [boardCertifications, setBoardCertifications] = useState<BoardCertification[]>(initialBoardCertifications);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicalSchool,
          medicalSchoolCountry,
          graduationYear: graduationYear ? Number(graduationYear) : undefined,
          residency,
          fellowships,
          boardCertifications,
        }),
      });
      if (res.ok) {
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
    }
  };

  const updateResidency = (index: number, field: keyof Residency, value: string | number) => {
    setResidency((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    setSaveState('idle');
  };

  const updateFellowship = (index: number, field: keyof Fellowship, value: string | number) => {
    setFellowships((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
    setSaveState('idle');
  };

  const updateCert = (index: number, field: keyof BoardCertification, value: string | number | undefined) => {
    setBoardCertifications((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    setSaveState('idle');
  };

  return (
    <div>
      <h3 className="font-dm-sans font-semibold text-base text-deep-charcoal">{t.title}</h3>
      <p className="font-dm-sans text-sm text-body-slate mt-1 mb-3">{t.subtitle}</p>

      {/* Medical school */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="sm:col-span-1">
          <label className="block font-dm-sans text-xs font-medium text-body-slate mb-1">{t.medSchool}</label>
          <input
            type="text"
            value={medicalSchool}
            onChange={(e) => { setMedicalSchool(e.target.value); setSaveState('idle'); }}
            placeholder={t.medSchoolPlaceholder}
            className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
          />
        </div>
        <div>
          <label className="block font-dm-sans text-xs font-medium text-body-slate mb-1">{t.country}</label>
          <input
            type="text"
            value={medicalSchoolCountry}
            onChange={(e) => { setMedicalSchoolCountry(e.target.value); setSaveState('idle'); }}
            placeholder={t.countryPlaceholder}
            className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
          />
        </div>
        <div>
          <label className="block font-dm-sans text-xs font-medium text-body-slate mb-1">{t.gradYear}</label>
          <input
            type="number"
            value={graduationYear}
            onChange={(e) => { setGraduationYear(e.target.value); setSaveState('idle'); }}
            min={1950}
            max={2030}
            className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
          />
        </div>
      </div>

      {/* Residency */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="font-dm-sans text-sm font-medium text-body-slate">{t.residency}</label>
          <button
            onClick={() => { setResidency([...residency, { ...emptyResidency }]); setSaveState('idle'); }}
            className="font-dm-sans text-xs font-semibold text-clinical-teal hover:text-clinical-teal/80"
          >
            + {t.add}
          </button>
        </div>
        {residency.map((r, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
            <input
              type="text"
              value={r.institution}
              onChange={(e) => updateResidency(i, 'institution', e.target.value)}
              placeholder={t.institution}
              className="col-span-2 sm:col-span-2 border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <input
              type="text"
              value={r.specialty}
              onChange={(e) => updateResidency(i, 'specialty', e.target.value)}
              placeholder={t.specialty}
              className="border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <input
              type="number"
              value={r.startYear || ''}
              onChange={(e) => updateResidency(i, 'startYear', Number(e.target.value))}
              placeholder={t.startYear}
              className="border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <div className="flex gap-1">
              <input
                type="number"
                value={r.endYear || ''}
                onChange={(e) => updateResidency(i, 'endYear', Number(e.target.value))}
                placeholder={t.endYear}
                className="flex-1 border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
              />
              <button
                onClick={() => { setResidency(residency.filter((_, j) => j !== i)); setSaveState('idle'); }}
                className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 px-1"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fellowships */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="font-dm-sans text-sm font-medium text-body-slate">{t.fellowships}</label>
          <button
            onClick={() => { setFellowships([...fellowships, { ...emptyFellowship }]); setSaveState('idle'); }}
            className="font-dm-sans text-xs font-semibold text-clinical-teal hover:text-clinical-teal/80"
          >
            + {t.add}
          </button>
        </div>
        {fellowships.map((f, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
            <input
              type="text"
              value={f.institution}
              onChange={(e) => updateFellowship(i, 'institution', e.target.value)}
              placeholder={t.institution}
              className="col-span-2 sm:col-span-2 border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <input
              type="text"
              value={f.specialty}
              onChange={(e) => updateFellowship(i, 'specialty', e.target.value)}
              placeholder={t.specialty}
              className="border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <input
              type="number"
              value={f.startYear || ''}
              onChange={(e) => updateFellowship(i, 'startYear', Number(e.target.value))}
              placeholder={t.startYear}
              className="border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <div className="flex gap-1">
              <input
                type="number"
                value={f.endYear || ''}
                onChange={(e) => updateFellowship(i, 'endYear', Number(e.target.value))}
                placeholder={t.endYear}
                className="flex-1 border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
              />
              <button
                onClick={() => { setFellowships(fellowships.filter((_, j) => j !== i)); setSaveState('idle'); }}
                className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 px-1"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Board Certifications */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="font-dm-sans text-sm font-medium text-body-slate">{t.boardCerts}</label>
          <button
            onClick={() => { setBoardCertifications([...boardCertifications, { ...emptyCert }]); setSaveState('idle'); }}
            className="font-dm-sans text-xs font-semibold text-clinical-teal hover:text-clinical-teal/80"
          >
            + {t.add}
          </button>
        </div>
        {boardCertifications.map((c, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <input
              type="text"
              value={c.board}
              onChange={(e) => updateCert(i, 'board', e.target.value)}
              placeholder={t.board}
              className="border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <input
              type="text"
              value={c.certification}
              onChange={(e) => updateCert(i, 'certification', e.target.value)}
              placeholder={t.certification}
              className="border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <input
              type="number"
              value={c.year || ''}
              onChange={(e) => updateCert(i, 'year', e.target.value ? Number(e.target.value) : undefined)}
              placeholder={t.year}
              className="border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
            />
            <button
              onClick={() => { setBoardCertifications(boardCertifications.filter((_, j) => j !== i)); setSaveState('idle'); }}
              className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80"
            >
              {t.remove}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saveState === 'saving'}
        className={`font-dm-sans text-sm font-semibold px-5 py-2 rounded-lg transition ${
          saveState === 'saved'
            ? 'bg-confirm-green text-white'
            : saveState === 'error'
            ? 'bg-alert-garnet text-white'
            : 'bg-clinical-teal text-white hover:bg-clinical-teal/90 disabled:opacity-50'
        }`}
      >
        {saveState === 'saving'
          ? t.saving
          : saveState === 'saved'
          ? t.saved
          : saveState === 'error'
          ? t.error
          : t.save}
      </button>
    </div>
  );
}
