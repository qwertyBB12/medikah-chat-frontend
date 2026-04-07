/**
 * ContactInfoSection — Accordion panel for contact and practice address info.
 * Auto-saves on blur, shows CompletionBadge in header.
 * DASH-05: Contact info management in the dashboard credentialing section.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ContactInfo } from '../../lib/contactTypes';
import { getContactCompletionStatus } from '../../lib/contactTypes';
import { getContactInfo, saveContactField } from '../../lib/contactClient';
import CompletionBadge from './credentials/CompletionBadge';
import type { SupportedLang } from '../../lib/i18n';

interface ContactInfoSectionProps {
  physicianId: string;
  lang: SupportedLang;
  onContactChange?: (contact: Partial<ContactInfo>) => void;
}

// Bilingual content
const content = {
  en: {
    sectionTitle: 'Contact & Practice Info',
    subtitle: 'Used for correspondence and scheduling.',
    phoneNumber: 'Phone Number',
    phonePlaceholder: '+1 (555) 000-0000',
    faxNumber: 'Fax',
    mailingAddress: 'Mailing Address',
    practiceAddress: 'Practice Address',
    sameAsMailing: 'Same as mailing address',
    addressLine1: 'Address Line 1',
    city: 'City',
    stateProvince: 'State / Province',
    postalCode: 'Postal Code',
    country: 'Country',
    saving: 'Saving...',
    saveError: 'Could not save. Please try again.',
    loading: 'Loading contact info...',
    loadError: 'Could not load contact info. Please refresh.',
    complete: 'Complete',
    inProgress: 'In progress',
    notStarted: 'Not started',
  },
  es: {
    sectionTitle: 'Informacion de Contacto y Consultorio',
    subtitle: 'Utilizada para correspondencia y programacion.',
    phoneNumber: 'Numero de Telefono',
    phonePlaceholder: '+52 (55) 0000-0000',
    faxNumber: 'Fax',
    mailingAddress: 'Direccion Postal',
    practiceAddress: 'Direccion del Consultorio',
    sameAsMailing: 'Igual que la direccion postal',
    addressLine1: 'Linea de Direccion 1',
    city: 'Ciudad',
    stateProvince: 'Estado / Provincia',
    postalCode: 'Codigo Postal',
    country: 'Pais',
    saving: 'Guardando...',
    saveError: 'No se pudo guardar. Intentelo de nuevo.',
    loading: 'Cargando informacion de contacto...',
    loadError: 'No se pudo cargar la informacion. Por favor recargue.',
    complete: 'Completo',
    inProgress: 'En progreso',
    notStarted: 'No iniciado',
  },
};

interface ChevronProps {
  open: boolean;
}

function Chevron({ open }: ChevronProps) {
  return (
    <svg
      className={`w-4 h-4 text-archival-grey transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// Inline spinner for per-field save state
function Spinner() {
  return (
    <svg
      className="w-4 h-4 text-archival-grey animate-spin inline-block"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function ContactInfoSection({
  physicianId,
  lang,
  onContactChange,
}: ContactInfoSectionProps) {
  const t = content[lang];
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<Partial<ContactInfo>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [savingFields, setSavingFields] = useState<Set<keyof ContactInfo>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ContactInfo, string>>>({});
  const [sameAsMailing, setSameAsMailing] = useState(false);

  // Load contact info on mount
  useEffect(() => {
    setLoading(true);
    getContactInfo(physicianId).then((result) => {
      setLoading(false);
      if (result.success && result.data) {
        setContact(result.data);
        // Detect if practice address matches mailing address
        const d = result.data;
        if (
          d.practiceAddressLine1 &&
          d.practiceAddressLine1 === d.mailingAddressLine1 &&
          d.practiceAddressCity === d.mailingAddressCity &&
          d.practiceAddressState === d.mailingAddressState &&
          d.practiceAddressPostalCode === d.mailingAddressPostalCode &&
          d.practiceAddressCountry === d.mailingAddressCountry
        ) {
          setSameAsMailing(true);
        }
      } else {
        setLoadError(true);
      }
    });
  }, [physicianId]);

  const handleBlur = useCallback(
    async (field: keyof ContactInfo, value: string) => {
      // Don't save if value unchanged
      if (contact[field] === value) return;

      setSavingFields((prev) => new Set(prev).add(field));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

      const result = await saveContactField(physicianId, { field, value });

      setSavingFields((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });

      if (!result.success) {
        setFieldErrors((prev) => ({ ...prev, [field]: t.saveError }));
      } else {
        const updatedContact = { ...contact, [field]: value };
        setContact(updatedContact);
        onContactChange?.(updatedContact);
      }
    },
    [contact, physicianId, t.saveError, onContactChange]
  );

  // Handle "Same as mailing address" checkbox
  const handleSameAsMailing = useCallback(
    async (checked: boolean) => {
      setSameAsMailing(checked);
      if (checked) {
        // Copy mailing values to practice fields and save each
        const fieldsToSync: Array<[keyof ContactInfo, keyof ContactInfo]> = [
          ['mailingAddressLine1', 'practiceAddressLine1'],
          ['mailingAddressCity', 'practiceAddressCity'],
          ['mailingAddressState', 'practiceAddressState'],
          ['mailingAddressPostalCode', 'practiceAddressPostalCode'],
          ['mailingAddressCountry', 'practiceAddressCountry'],
        ];
        const updatedContact = { ...contact };
        for (const [mailingField, practiceField] of fieldsToSync) {
          const value = contact[mailingField] || '';
          updatedContact[practiceField] = value;
          await saveContactField(physicianId, { field: practiceField, value });
        }
        setContact(updatedContact);
        onContactChange?.(updatedContact);
      }
    },
    [contact, physicianId, onContactChange]
  );

  const completionStatus = getContactCompletionStatus(contact);
  const badgeLabel =
    completionStatus === 'complete'
      ? t.complete
      : completionStatus === 'in_progress'
      ? t.inProgress
      : t.notStarted;

  // Helper: render a text input with auto-save on blur
  const renderField = (
    field: keyof ContactInfo,
    label: string,
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>
  ) => {
    const fieldId = `contact-${field}`;
    const isSaving = savingFields.has(field);
    const error = fieldErrors[field];
    const disabled = sameAsMailing && field.startsWith('practiceAddress');

    return (
      <div key={field}>
        <label htmlFor={fieldId} className="block font-dm-sans text-xs font-bold text-deep-charcoal mb-1">
          {label}
        </label>
        <div className="relative">
          <input
            id={fieldId}
            defaultValue={contact[field] || ''}
            disabled={disabled}
            onBlur={(e) => handleBlur(field, e.target.value)}
            className={`w-full bg-linen-light rounded-sm p-3 font-dm-sans text-sm text-deep-charcoal border border-transparent focus:outline-none focus:border-clinical-teal transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            {...inputProps}
          />
          {isSaving && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner />
            </span>
          )}
        </div>
        {error && (
          <p className="font-dm-sans text-xs text-alert-garnet mt-1">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div id="contact-info-section" className="border border-warm-gray-800/[0.06] rounded-md overflow-hidden">
      {/* Accordion header — min 44px touch target per UI-SPEC */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-linen-white hover:bg-linen-light transition-colors min-h-[44px]"
        aria-expanded={open}
        aria-controls="contact-info-panel"
      >
        <div className="flex items-center gap-3">
          <span className="font-dm-sans text-sm font-semibold text-deep-charcoal">
            {t.sectionTitle}
          </span>
          <CompletionBadge status={completionStatus} label={badgeLabel} />
        </div>
        <Chevron open={open} />
      </button>

      {/* Accordion panel */}
      {open && (
        <div id="contact-info-panel" className="px-4 pb-5 pt-3 bg-white">
          {loading && (
            <p className="font-dm-sans text-sm text-archival-grey">{t.loading}</p>
          )}
          {loadError && (
            <p className="font-dm-sans text-sm text-alert-garnet">{t.loadError}</p>
          )}
          {!loading && !loadError && (
            <div className="space-y-5">
              <p className="font-dm-sans text-xs text-archival-grey">{t.subtitle}</p>

              {/* Phone Number */}
              {renderField('phoneNumber', t.phoneNumber, {
                type: 'tel' as const,
                placeholder: t.phonePlaceholder,
              })}

              {/* Mailing Address */}
              <div>
                <p className="font-dm-sans text-xs font-bold text-deep-charcoal mb-2 uppercase tracking-wide">
                  {t.mailingAddress}
                </p>
                <div className="space-y-3">
                  {renderField('mailingAddressLine1', t.addressLine1)}
                  {renderField('mailingAddressCity', t.city)}
                  {renderField('mailingAddressState', t.stateProvince)}
                  {renderField('mailingAddressPostalCode', t.postalCode)}
                  {renderField('mailingAddressCountry', t.country)}
                </div>
              </div>

              {/* Practice Address */}
              <div>
                <p className="font-dm-sans text-xs font-bold text-deep-charcoal mb-2 uppercase tracking-wide">
                  {t.practiceAddress}
                </p>
                {/* Same as mailing checkbox */}
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsMailing}
                    onChange={(e) => handleSameAsMailing(e.target.checked)}
                    className="w-4 h-4 accent-clinical-teal"
                  />
                  <span className="font-dm-sans text-xs text-body-slate">{t.sameAsMailing}</span>
                </label>
                <div className="space-y-3">
                  {renderField('practiceAddressLine1', t.addressLine1)}
                  {renderField('practiceAddressCity', t.city)}
                  {renderField('practiceAddressState', t.stateProvince)}
                  {renderField('practiceAddressPostalCode', t.postalCode)}
                  {renderField('practiceAddressCountry', t.country)}
                </div>
              </div>

              {/* Fax */}
              {renderField('faxNumber', t.faxNumber, {
                type: 'tel',
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
