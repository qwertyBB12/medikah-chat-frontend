/**
 * FAQEditor — Embedded section in WebsiteEditor
 *
 * Manages up to 8 FAQ items with question + answer each.
 */

import { SupportedLang } from '../../../lib/i18n';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQEditorProps {
  faqs: FAQ[];
  onChange: (faqs: FAQ[]) => void;
  lang: SupportedLang;
}

const content = {
  en: {
    title: 'Frequently Asked Questions',
    subtitle: 'Add common questions patients ask (max 8).',
    question: 'Question',
    answer: 'Answer',
    add: 'Add FAQ',
    remove: 'Remove',
  },
  es: {
    title: 'Preguntas Frecuentes',
    subtitle: 'Agregue preguntas comunes de sus pacientes (máx. 8).',
    question: 'Pregunta',
    answer: 'Respuesta',
    add: 'Agregar Pregunta',
    remove: 'Eliminar',
  },
};

export default function FAQEditor({ faqs, onChange, lang }: FAQEditorProps) {
  const t = content[lang];

  const handleChange = (index: number, field: keyof FAQ, value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const add = () => {
    if (faqs.length >= 8) return;
    onChange([...faqs, { question: '', answer: '' }]);
  };

  const remove = (index: number) => {
    onChange(faqs.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-dm-sans text-sm font-medium text-deep-charcoal">{t.title}</h4>
          <p className="font-dm-sans text-xs text-archival-grey">{t.subtitle}</p>
        </div>
        {faqs.length < 8 && (
          <button
            type="button"
            onClick={add}
            className="font-dm-sans text-xs font-semibold text-clinical-teal hover:text-clinical-teal/80 transition"
          >
            + {t.add}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-border-line rounded-lg p-4 bg-clinical-surface/30">
            <div className="flex items-center justify-between mb-3">
              <span className="font-dm-sans text-xs font-medium text-archival-grey">
                #{i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="font-dm-sans text-xs text-alert-garnet hover:text-alert-garnet/80 transition"
              >
                {t.remove}
              </button>
            </div>
            <input
              type="text"
              value={faq.question}
              onChange={(e) => handleChange(i, 'question', e.target.value)}
              placeholder={t.question}
              className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal mb-2"
            />
            <textarea
              value={faq.answer}
              onChange={(e) => handleChange(i, 'answer', e.target.value)}
              placeholder={t.answer}
              rows={2}
              className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal resize-y"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
