import { useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';

interface BioEditorProps {
  physicianId: string;
  lang: SupportedLang;
  initialBio: string;
}

const content = {
  en: {
    title: 'Professional Bio',
    subtitle: 'Tell patients about your background and approach to care.',
    placeholder: 'Describe your medical background, areas of expertise, and approach to patient care...',
    charCount: 'characters',
    save: 'Save Bio',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Failed to save',
  },
  es: {
    title: 'Biografía Profesional',
    subtitle: 'Cuénteles a los pacientes sobre su trayectoria y enfoque de atención.',
    placeholder: 'Describa su formación médica, áreas de especialización y enfoque de atención al paciente...',
    charCount: 'caracteres',
    save: 'Guardar Biografía',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
  },
};

const MAX_CHARS = 2000;

export default function BioEditor({ physicianId, lang, initialBio }: BioEditorProps) {
  const t = content[lang];
  const [bio, setBio] = useState(initialBio);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio }),
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

      <textarea
        value={bio}
        onChange={(e) => {
          if (e.target.value.length <= MAX_CHARS) {
            setBio(e.target.value);
            setSaveState('idle');
          }
        }}
        placeholder={t.placeholder}
        rows={5}
        className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal resize-y"
      />

      <div className="flex items-center justify-between mt-2">
        <span className="font-dm-sans text-xs text-archival-grey">
          {bio.length}/{MAX_CHARS} {t.charCount}
        </span>
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
    </div>
  );
}
