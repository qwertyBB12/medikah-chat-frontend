/**
 * ServicesEditor — Embedded section in WebsiteEditor
 *
 * Manages up to 6 services with title + description each.
 */

import { SupportedLang } from '../../../lib/i18n';

interface Service {
  title: string;
  description: string;
}

interface ServicesEditorProps {
  services: Service[];
  onChange: (services: Service[]) => void;
  lang: SupportedLang;
}

const content = {
  en: {
    title: 'Services',
    subtitle: 'List the services you offer (max 6).',
    serviceTitle: 'Service name',
    serviceDescription: 'Brief description',
    add: 'Add Service',
    remove: 'Remove',
  },
  es: {
    title: 'Servicios',
    subtitle: 'Liste los servicios que ofrece (máx. 6).',
    serviceTitle: 'Nombre del servicio',
    serviceDescription: 'Descripción breve',
    add: 'Agregar Servicio',
    remove: 'Eliminar',
  },
};

export default function ServicesEditor({ services, onChange, lang }: ServicesEditorProps) {
  const t = content[lang];

  const handleChange = (index: number, field: keyof Service, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const add = () => {
    if (services.length >= 6) return;
    onChange([...services, { title: '', description: '' }]);
  };

  const remove = (index: number) => {
    onChange(services.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-dm-sans text-sm font-medium text-deep-charcoal">{t.title}</h4>
          <p className="font-dm-sans text-xs text-archival-grey">{t.subtitle}</p>
        </div>
        {services.length < 6 && (
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
        {services.map((service, i) => (
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
              value={service.title}
              onChange={(e) => handleChange(i, 'title', e.target.value)}
              placeholder={t.serviceTitle}
              className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal mb-2"
            />
            <textarea
              value={service.description}
              onChange={(e) => handleChange(i, 'description', e.target.value)}
              placeholder={t.serviceDescription}
              rows={2}
              className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal resize-y"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
