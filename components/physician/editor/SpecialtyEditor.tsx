import { useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';

interface SpecialtyEditorProps {
  physicianId: string;
  lang: SupportedLang;
  initialPrimarySpecialty: string;
  initialSubSpecialties: string[];
}

const content = {
  en: {
    title: 'Specialties',
    subtitle: 'Update your primary specialty and sub-specialties.',
    primary: 'Primary Specialty',
    primaryPlaceholder: 'e.g. Internal Medicine',
    sub: 'Sub-specialties',
    subPlaceholder: 'Add a sub-specialty and press Enter',
    save: 'Save Specialties',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Failed to save',
  },
  es: {
    title: 'Especialidades',
    subtitle: 'Actualice su especialidad principal y subespecialidades.',
    primary: 'Especialidad Principal',
    primaryPlaceholder: 'ej. Medicina Interna',
    sub: 'Subespecialidades',
    subPlaceholder: 'Agregue una subespecialidad y presione Enter',
    save: 'Guardar Especialidades',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
  },
};

export default function SpecialtyEditor({
  physicianId,
  lang,
  initialPrimarySpecialty,
  initialSubSpecialties,
}: SpecialtyEditorProps) {
  const t = content[lang];
  const [primarySpecialty, setPrimarySpecialty] = useState(initialPrimarySpecialty);
  const [subSpecialties, setSubSpecialties] = useState<string[]>(initialSubSpecialties);
  const [subInput, setSubInput] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleAddSub = () => {
    const trimmed = subInput.trim();
    if (trimmed && !subSpecialties.includes(trimmed)) {
      setSubSpecialties([...subSpecialties, trimmed]);
      setSubInput('');
      setSaveState('idle');
    }
  };

  const handleRemoveSub = (index: number) => {
    setSubSpecialties(subSpecialties.filter((_, i) => i !== index));
    setSaveState('idle');
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primarySpecialty, subSpecialties }),
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

  return (
    <div>
      <h3 className="font-dm-sans font-semibold text-base text-deep-charcoal">{t.title}</h3>
      <p className="font-dm-sans text-sm text-body-slate mt-1 mb-3">{t.subtitle}</p>

      {/* Primary specialty */}
      <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">
        {t.primary}
      </label>
      <input
        type="text"
        value={primarySpecialty}
        onChange={(e) => {
          setPrimarySpecialty(e.target.value);
          setSaveState('idle');
        }}
        placeholder={t.primaryPlaceholder}
        className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal mb-4"
      />

      {/* Sub-specialties */}
      <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">
        {t.sub}
      </label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={subInput}
          onChange={(e) => setSubInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddSub();
            }
          }}
          placeholder={t.subPlaceholder}
          className="flex-1 border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
        />
      </div>
      {subSpecialties.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {subSpecialties.map((sub, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-clinical-teal/10 text-clinical-teal font-dm-sans text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {sub}
              <button
                onClick={() => handleRemoveSub(i)}
                className="text-clinical-teal/60 hover:text-clinical-teal ml-0.5"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

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
