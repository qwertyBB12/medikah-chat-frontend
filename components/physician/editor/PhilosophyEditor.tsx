/**
 * PhilosophyEditor — Embedded section in WebsiteEditor
 *
 * Edits practice philosophy text and up to 3 value pillars.
 */

import { SupportedLang } from '../../../lib/i18n';

interface ValuePillar {
  title: string;
  description: string;
}

interface PhilosophyEditorProps {
  practicePhilosophy: string;
  valuePillars: ValuePillar[];
  onChange: (field: 'practice_philosophy' | 'value_pillars', value: string | ValuePillar[]) => void;
  lang: SupportedLang;
}

const content = {
  en: {
    philosophyLabel: 'Practice Philosophy',
    philosophyPlaceholder: 'Describe your approach to patient care, clinical values, and what sets your practice apart...',
    pillarsTitle: 'Value Pillars',
    pillarsSubtitle: 'Up to 3 guiding principles of your practice.',
    pillarTitle: 'Title',
    pillarDescription: 'Description',
    addPillar: 'Add Pillar',
    removePillar: 'Remove',
  },
  es: {
    philosophyLabel: 'Filosofía de Práctica',
    philosophyPlaceholder: 'Describa su enfoque en la atención al paciente, valores clínicos y qué distingue su práctica...',
    pillarsTitle: 'Pilares de Valor',
    pillarsSubtitle: 'Hasta 3 principios guía de su práctica.',
    pillarTitle: 'Título',
    pillarDescription: 'Descripción',
    addPillar: 'Agregar Pilar',
    removePillar: 'Eliminar',
  },
};

export default function PhilosophyEditor({
  practicePhilosophy,
  valuePillars,
  onChange,
  lang,
}: PhilosophyEditorProps) {
  const t = content[lang];

  const handlePillarChange = (index: number, field: keyof ValuePillar, value: string) => {
    const updated = [...valuePillars];
    updated[index] = { ...updated[index], [field]: value };
    onChange('value_pillars', updated);
  };

  const addPillar = () => {
    if (valuePillars.length >= 3) return;
    onChange('value_pillars', [...valuePillars, { title: '', description: '' }]);
  };

  const removePillar = (index: number) => {
    onChange('value_pillars', valuePillars.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Practice philosophy */}
      <div>
        <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1">
          {t.philosophyLabel}
        </label>
        <textarea
          value={practicePhilosophy}
          onChange={(e) => onChange('practice_philosophy', e.target.value)}
          placeholder={t.philosophyPlaceholder}
          rows={4}
          className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal resize-y"
        />
      </div>

      {/* Value pillars */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="font-dm-sans text-sm font-medium text-deep-charcoal">{t.pillarsTitle}</h4>
            <p className="font-dm-sans text-xs text-archival-grey">{t.pillarsSubtitle}</p>
          </div>
          {valuePillars.length < 3 && (
            <button
              type="button"
              onClick={addPillar}
              className="font-dm-sans text-xs font-semibold text-clinical-teal hover:text-clinical-teal/80 transition"
            >
              + {t.addPillar}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {valuePillars.map((pillar, i) => (
            <div key={i} className="border border-border-line rounded-lg p-4 bg-clinical-surface/30">
              <div className="flex items-center justify-between mb-3">
                <span className="font-dm-sans text-xs font-medium text-archival-grey">
                  #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removePillar(i)}
                  className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 transition"
                >
                  {t.removePillar}
                </button>
              </div>
              <input
                type="text"
                value={pillar.title}
                onChange={(e) => handlePillarChange(i, 'title', e.target.value)}
                placeholder={t.pillarTitle}
                className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal mb-2"
              />
              <textarea
                value={pillar.description}
                onChange={(e) => handlePillarChange(i, 'description', e.target.value)}
                placeholder={t.pillarDescription}
                rows={2}
                className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal resize-y"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
