import { useState, useCallback } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import {
  LICENSED_COUNTRIES,
  US_STATES,
  batchedFormLabels,
} from '../../../lib/physicianOnboardingContent';
import { PhysicianLicense } from '../../../lib/physicianClient';

interface BatchedLicensingFormProps {
  lang: SupportedLang;
  onSubmit: (data: { licenses: PhysicianLicense[] }) => void;
  onCancel: () => void;
  initialData?: PhysicianLicense[];
}

export default function BatchedLicensingForm({
  lang,
  onSubmit,
  onCancel,
  initialData,
}: BatchedLicensingFormProps) {
  const labels = batchedFormLabels[lang];

  const [licenses, setLicenses] = useState<Partial<PhysicianLicense>[]>(
    initialData && initialData.length > 0
      ? initialData.map((l) => ({ ...l }))
      : [{ country: '', countryCode: '', type: '', number: '', state: '' }]
  );

  const [errors, setErrors] = useState<Record<number, string>>({});

  const addLicense = useCallback(() => {
    setLicenses((prev) => [
      ...prev,
      { country: '', countryCode: '', type: '', number: '', state: '' },
    ]);
  }, []);

  const removeLicense = useCallback((index: number) => {
    setLicenses((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  const updateLicense = useCallback(
    (index: number, field: keyof PhysicianLicense, value: string) => {
      setLicenses((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };

        // Auto-fill country name and license type when code changes
        if (field === 'countryCode') {
          const match = LICENSED_COUNTRIES.find((c) => c.code === value);
          if (match) {
            updated[index].country = match.name;
            updated[index].type = match.licenseType;
          }
        }

        return updated;
      });

      // Clear error for this license
      setErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const newErrors: Record<number, string> = {};

    licenses.forEach((lic, i) => {
      if (!lic.countryCode) {
        newErrors[i] = labels.selectCountry;
      } else if (!lic.number || lic.number.length < 3) {
        newErrors[i] = labels.enterLicenseNumber;
      } else if (lic.countryCode === 'US' && !lic.state) {
        newErrors[i] = labels.selectState;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const validLicenses: PhysicianLicense[] = licenses
      .filter((l) => l.countryCode && l.number)
      .map((l) => ({
        country: l.country || '',
        countryCode: l.countryCode || '',
        type: l.type || '',
        number: l.number || '',
        ...(l.state ? { state: l.state } : {}),
      }));

    onSubmit({ licenses: validLicenses });
  }, [licenses, onSubmit, labels]);

  return (
    <div className="bg-white border-l-4 border-clinical-teal rounded-[12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] p-6 my-4">
      <h3 className="font-mulish font-bold text-lg text-deep-charcoal mb-1">
        {labels.licensingTitle}
      </h3>
      <p className="font-mulish text-sm text-body-slate mb-4">
        {labels.licensingDescription}
      </p>

      <div className="space-y-4">
        {licenses.map((lic, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 relative"
          >
            {licenses.length > 1 && (
              <button
                type="button"
                onClick={() => removeLicense(index)}
                className="absolute top-2 right-2 text-gray-400 hover:text-alert-garnet transition-colors"
                aria-label={labels.removeLicense}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Country Dropdown */}
              <div>
                <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
                  {labels.country} <span className="text-alert-garnet">*</span>
                </label>
                <select
                  value={lic.countryCode || ''}
                  onChange={(e) =>
                    updateLicense(index, 'countryCode', e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                >
                  <option value="">{labels.selectCountry}</option>
                  {LICENSED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* State (only for USA) */}
              {lic.countryCode === 'US' && (
                <div>
                  <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
                    {labels.state} <span className="text-alert-garnet">*</span>
                  </label>
                  <select
                    value={lic.state || ''}
                    onChange={(e) =>
                      updateLicense(index, 'state', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                  >
                    <option value="">{labels.selectState}</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* License Type (auto-filled, read-only) */}
              {lic.type && (
                <div>
                  <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
                    {labels.licenseType}
                  </label>
                  <input
                    type="text"
                    value={lic.type}
                    readOnly
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 font-mulish text-sm text-body-slate bg-gray-50"
                  />
                </div>
              )}

              {/* License Number */}
              <div>
                <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
                  {labels.licenseNumber} <span className="text-alert-garnet">*</span>
                </label>
                <input
                  type="text"
                  value={lic.number || ''}
                  onChange={(e) =>
                    updateLicense(index, 'number', e.target.value)
                  }
                  placeholder={labels.enterLicenseNumber}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                />
              </div>
            </div>

            {errors[index] && (
              <p className="font-mulish text-xs text-alert-garnet mt-2">
                {errors[index]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add Another License */}
      <button
        type="button"
        onClick={addLicense}
        className="mt-3 flex items-center gap-1.5 font-mulish text-sm font-semibold text-clinical-teal hover:text-clinical-teal/80 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {labels.addAnotherLicense}
      </button>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="font-mulish text-sm text-body-slate hover:text-deep-charcoal transition-colors"
        >
          {labels.back}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-clinical-teal text-white font-mulish font-semibold text-sm rounded-lg hover:bg-clinical-teal/90 transition-colors"
        >
          {labels.continue}
        </button>
      </div>
    </div>
  );
}
