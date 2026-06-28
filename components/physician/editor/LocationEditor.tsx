/**
 * LocationEditor — Embedded section in WebsiteEditor
 *
 * Annotation #9 (source-of-truth split): office ADDRESS and PHONE are now
 * managed in the Credentials tab (Contact & Practice Info) and are the single
 * source of truth — the public page reads them from there. This editor keeps
 * only the booking/presentation fields that legitimately live with the website:
 * office email and appointment URL.
 */

import { SupportedLang } from '../../../lib/i18n';

interface LocationData {
  office_email: string;
  appointment_url: string;
}

interface LocationEditorProps {
  data: LocationData;
  onChange: (field: keyof LocationData, value: string) => void;
  lang: SupportedLang;
}

const content = {
  en: {
    note: 'Your office address and phone are managed in the Credentials tab, under Contact & Practice Info. They appear here on your public profile automatically.',
    email: 'Office Email',
    emailPlaceholder: 'doctor@clinic.com',
    appointmentUrl: 'Appointment URL',
    appointmentUrlPlaceholder: 'https://calendly.com/your-link',
  },
  es: {
    note: 'La dirección y el teléfono de su consultorio se gestionan en la pestaña de Credenciales, en Contacto e Información de Práctica. Aparecen aquí en su perfil público automáticamente.',
    email: 'Correo del Consultorio',
    emailPlaceholder: 'doctor@clinica.com',
    appointmentUrl: 'URL de Citas',
    appointmentUrlPlaceholder: 'https://calendly.com/tu-enlace',
  },
};

export default function LocationEditor({ data, onChange, lang }: LocationEditorProps) {
  const t = content[lang];

  const field = (
    label: string,
    key: keyof LocationData,
    placeholder: string,
    type: string = 'text',
  ) => (
    <div>
      <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1">
        {label}
      </label>
      <input
        type={type}
        value={data[key]}
        onChange={(e) => onChange(key, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="font-dm-sans text-xs text-body-slate bg-clinical-surface/40 border border-border-line rounded-lg px-3 py-2.5 leading-relaxed">
        {t.note}
      </p>
      {field(t.email, 'office_email', t.emailPlaceholder, 'email')}
      {field(t.appointmentUrl, 'appointment_url', t.appointmentUrlPlaceholder, 'url')}
    </div>
  );
}
