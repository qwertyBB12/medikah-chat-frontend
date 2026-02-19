import { useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';

interface PracticeEditorProps {
  physicianId: string;
  lang: SupportedLang;
  initialInstitutions: string[];
  initialLanguages: string[];
  initialWebsiteUrl: string;
  initialLinkedinUrl: string;
}

const content = {
  en: {
    title: 'Practice & Presence',
    subtitle: 'Update your current institutions, languages, and web presence.',
    institutions: 'Current Institutions',
    institutionPlaceholder: 'Add an institution and press Enter',
    languages: 'Languages Spoken',
    languagePlaceholder: 'Add a language and press Enter',
    website: 'Website URL',
    websitePlaceholder: 'https://...',
    linkedin: 'LinkedIn URL',
    linkedinPlaceholder: 'https://linkedin.com/in/...',
    save: 'Save Practice Info',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Failed to save',
  },
  es: {
    title: 'Práctica y Presencia',
    subtitle: 'Actualice sus instituciones actuales, idiomas y presencia web.',
    institutions: 'Instituciones Actuales',
    institutionPlaceholder: 'Agregue una institución y presione Enter',
    languages: 'Idiomas',
    languagePlaceholder: 'Agregue un idioma y presione Enter',
    website: 'Sitio Web',
    websitePlaceholder: 'https://...',
    linkedin: 'LinkedIn',
    linkedinPlaceholder: 'https://linkedin.com/in/...',
    save: 'Guardar Práctica',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
  },
};

function TagInput({
  tags,
  setTags,
  placeholder,
  onDirty,
}: {
  tags: string[];
  setTags: (tags: string[]) => void;
  placeholder: string;
  onDirty: () => void;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setInput('');
      onDirty();
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
        />
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-clinical-teal/10 text-clinical-teal font-dm-sans text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {tag}
              <button
                onClick={() => {
                  setTags(tags.filter((_, j) => j !== i));
                  onDirty();
                }}
                className="text-clinical-teal/60 hover:text-clinical-teal ml-0.5"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PracticeEditor({
  physicianId,
  lang,
  initialInstitutions,
  initialLanguages,
  initialWebsiteUrl,
  initialLinkedinUrl,
}: PracticeEditorProps) {
  const t = content[lang];
  const [institutions, setInstitutions] = useState<string[]>(initialInstitutions);
  const [languages, setLanguages] = useState<string[]>(initialLanguages);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentInstitutions: institutions,
          languages,
          websiteUrl,
          linkedinUrl,
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

  return (
    <div>
      <h3 className="font-dm-sans font-semibold text-base text-deep-charcoal">{t.title}</h3>
      <p className="font-dm-sans text-sm text-body-slate mt-1 mb-3">{t.subtitle}</p>

      {/* Institutions */}
      <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">{t.institutions}</label>
      <div className="mb-4">
        <TagInput
          tags={institutions}
          setTags={setInstitutions}
          placeholder={t.institutionPlaceholder}
          onDirty={() => setSaveState('idle')}
        />
      </div>

      {/* Languages */}
      <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">{t.languages}</label>
      <div className="mb-4">
        <TagInput
          tags={languages}
          setTags={setLanguages}
          placeholder={t.languagePlaceholder}
          onDirty={() => setSaveState('idle')}
        />
      </div>

      {/* Website URL */}
      <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">{t.website}</label>
      <input
        type="url"
        value={websiteUrl}
        onChange={(e) => { setWebsiteUrl(e.target.value); setSaveState('idle'); }}
        placeholder={t.websitePlaceholder}
        className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal mb-4"
      />

      {/* LinkedIn URL */}
      <label className="block font-dm-sans text-sm font-medium text-body-slate mb-1">{t.linkedin}</label>
      <input
        type="url"
        value={linkedinUrl}
        onChange={(e) => { setLinkedinUrl(e.target.value); setSaveState('idle'); }}
        placeholder={t.linkedinPlaceholder}
        className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal mb-4"
      />

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
