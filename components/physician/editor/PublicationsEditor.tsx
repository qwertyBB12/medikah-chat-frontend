import { useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import { Publication } from '../../../lib/physicianClient';

interface PublicationsEditorProps {
  physicianId: string;
  lang: SupportedLang;
  initialPublications: Publication[];
}

const content = {
  en: {
    title: 'Publications',
    subtitle: 'Manage your published research and articles.',
    titleField: 'Title',
    journal: 'Journal',
    year: 'Year',
    url: 'URL',
    add: 'Add Publication',
    remove: 'Remove',
    noPublications: 'No publications added yet.',
    save: 'Save Publications',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Failed to save',
  },
  es: {
    title: 'Publicaciones',
    subtitle: 'Administre sus investigaciones y artículos publicados.',
    titleField: 'Título',
    journal: 'Revista',
    year: 'Año',
    url: 'URL',
    add: 'Agregar Publicación',
    remove: 'Eliminar',
    noPublications: 'Sin publicaciones registradas.',
    save: 'Guardar Publicaciones',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar',
  },
};

const emptyPublication: Publication = { title: '', journal: '', year: undefined, url: '' };

export default function PublicationsEditor({
  physicianId,
  lang,
  initialPublications,
}: PublicationsEditorProps) {
  const t = content[lang];
  const [publications, setPublications] = useState<Publication[]>(initialPublications);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const updatePub = (index: number, field: keyof Publication, value: string | number | undefined) => {
    setPublications((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    setSaveState('idle');
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publications }),
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
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-dm-sans font-semibold text-base text-deep-charcoal">{t.title}</h3>
        <button
          onClick={() => { setPublications([...publications, { ...emptyPublication }]); setSaveState('idle'); }}
          className="font-dm-sans text-xs font-semibold text-clinical-teal hover:text-clinical-teal/80"
        >
          + {t.add}
        </button>
      </div>
      <p className="font-dm-sans text-sm text-body-slate mb-3">{t.subtitle}</p>

      {publications.length === 0 ? (
        <p className="font-dm-sans text-sm text-archival-grey mb-4">{t.noPublications}</p>
      ) : (
        <div className="space-y-3 mb-4">
          {publications.map((pub, i) => (
            <div key={i} className="border border-border-line rounded-lg p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  value={pub.title}
                  onChange={(e) => updatePub(i, 'title', e.target.value)}
                  placeholder={t.titleField}
                  className="sm:col-span-2 border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
                />
                <input
                  type="text"
                  value={pub.journal || ''}
                  onChange={(e) => updatePub(i, 'journal', e.target.value)}
                  placeholder={t.journal}
                  className="border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={pub.year || ''}
                    onChange={(e) => updatePub(i, 'year', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={t.year}
                    className="w-24 border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
                  />
                  <input
                    type="url"
                    value={pub.url || ''}
                    onChange={(e) => updatePub(i, 'url', e.target.value)}
                    placeholder={t.url}
                    className="flex-1 border border-border-line rounded-lg px-2 py-1.5 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
                  />
                </div>
              </div>
              <button
                onClick={() => { setPublications(publications.filter((_, j) => j !== i)); setSaveState('idle'); }}
                className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80"
              >
                {t.remove}
              </button>
            </div>
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
