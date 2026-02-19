/**
 * LocationEditor — Embedded section in WebsiteEditor
 *
 * Inputs for office address, city, country, phone, email, appointment URL.
 */

import { SupportedLang } from '../../../lib/i18n';

interface LocationData {
  office_address: string;
  office_city: string;
  office_country: string;
  office_phone: string;
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
    address: 'Office Address',
    addressPlaceholder: '123 Medical Center Blvd, Suite 200',
    city: 'City',
    cityPlaceholder: 'Mexico City',
    country: 'Country',
    countryPlaceholder: 'Mexico',
    phone: 'Phone',
    phonePlaceholder: '+52 55 1234 5678',
    email: 'Office Email',
    emailPlaceholder: 'doctor@clinic.com',
    appointmentUrl: 'Appointment URL',
    appointmentUrlPlaceholder: 'https://calendly.com/your-link',
  },
  es: {
    address: 'Dirección del Consultorio',
    addressPlaceholder: 'Av. Centro Médico 123, Consultorio 200',
    city: 'Ciudad',
    cityPlaceholder: 'Ciudad de México',
    country: 'País',
    countryPlaceholder: 'México',
    phone: 'Teléfono',
    phonePlaceholder: '+52 55 1234 5678',
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
      {field(t.address, 'office_address', t.addressPlaceholder)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field(t.city, 'office_city', t.cityPlaceholder)}
        {field(t.country, 'office_country', t.countryPlaceholder)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field(t.phone, 'office_phone', t.phonePlaceholder, 'tel')}
        {field(t.email, 'office_email', t.emailPlaceholder, 'email')}
      </div>
      {field(t.appointmentUrl, 'appointment_url', t.appointmentUrlPlaceholder, 'url')}
    </div>
  );
}
