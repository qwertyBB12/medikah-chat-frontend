import { useState, useCallback, useEffect } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import {
  AMERICAS_TIMEZONES,
  DAYS_OF_WEEK,
  CONSULTATION_LANGUAGES,
  TIMEZONES_BY_COUNTRY,
  batchedFormLabels,
} from '../../../lib/physicianOnboardingContent';

interface BatchedPresenceFormProps {
  lang: SupportedLang;
  onSubmit: (data: {
    currentInstitutions: string[];
    websiteUrl?: string;
    twitterUrl?: string;
    researchgateUrl?: string;
    academiaEduUrl?: string;
    availableDays: string[];
    availableHoursStart: string;
    availableHoursEnd: string;
    timezone: string;
    languages: string[];
  }) => void;
  onCancel: () => void;
  licensedCountryCodes?: string[];
  initialData?: {
    currentInstitutions?: string[];
    websiteUrl?: string;
    twitterUrl?: string;
    researchgateUrl?: string;
    academiaEduUrl?: string;
    availableDays?: string[];
    availableHoursStart?: string;
    availableHoursEnd?: string;
    timezone?: string;
    languages?: string[];
  };
}

export default function BatchedPresenceForm({
  lang,
  onSubmit,
  onCancel,
  licensedCountryCodes,
  initialData,
}: BatchedPresenceFormProps) {
  const labels = batchedFormLabels[lang];

  // Practice info
  const [institutions, setInstitutions] = useState(
    initialData?.currentInstitutions?.join(', ') || ''
  );
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl || '');
  const [twitterUrl, setTwitterUrl] = useState(initialData?.twitterUrl || '');
  const [researchgateUrl, setResearchgateUrl] = useState(initialData?.researchgateUrl || '');
  const [academiaEduUrl, setAcademiaEduUrl] = useState(initialData?.academiaEduUrl || '');

  // Availability
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set(initialData?.availableDays || ['monday', 'wednesday', 'friday'])
  );
  const [hoursStart, setHoursStart] = useState(
    initialData?.availableHoursStart?.slice(0, 5) || '09:00'
  );
  const [hoursEnd, setHoursEnd] = useState(
    initialData?.availableHoursEnd?.slice(0, 5) || '17:00'
  );
  const [timezone, setTimezone] = useState(initialData?.timezone || '');
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(
    new Set(initialData?.languages || ['es', 'en'])
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect timezone
  useEffect(() => {
    if (!timezone) {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detected);
      } catch {
        setTimezone('America/Mexico_City');
      }
    }
  }, [timezone]);

  // Get relevant timezones based on licensed countries
  const relevantTimezones = (() => {
    const tzs: { value: string; label: string }[] = [];
    if (licensedCountryCodes) {
      licensedCountryCodes.forEach((code) => {
        const countryTzs = TIMEZONES_BY_COUNTRY[code];
        if (countryTzs) {
          countryTzs.forEach((tz) => {
            if (!tzs.some((t) => t.value === tz.value)) {
              tzs.push(tz);
            }
          });
        }
      });
    }
    if (tzs.length === 0) {
      return AMERICAS_TIMEZONES;
    }
    // Also include any from AMERICAS_TIMEZONES not already present
    AMERICAS_TIMEZONES.forEach((tz) => {
      if (!tzs.some((t) => t.value === tz.value)) {
        tzs.push(tz);
      }
    });
    return tzs;
  })();

  const toggleDay = useCallback((day: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }, []);

  const toggleLanguage = useCallback((code: string) => {
    setSelectedLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (selectedDays.size === 0) {
      newErrors.days = labels.selectAtLeastOneDay;
    }
    if (selectedLanguages.size === 0) {
      newErrors.languages = labels.selectAtLeastOneLanguage;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const institutionList = institutions
      .split(/[,;]+/)
      .map((i) => i.trim())
      .filter(Boolean);

    onSubmit({
      currentInstitutions: institutionList,
      websiteUrl: websiteUrl.trim() || undefined,
      twitterUrl: twitterUrl.trim() || undefined,
      researchgateUrl: researchgateUrl.trim() || undefined,
      academiaEduUrl: academiaEduUrl.trim() || undefined,
      availableDays: Array.from(selectedDays),
      availableHoursStart: `${hoursStart}:00`,
      availableHoursEnd: `${hoursEnd}:00`,
      timezone,
      languages: Array.from(selectedLanguages),
    });
  }, [
    institutions, websiteUrl, twitterUrl, researchgateUrl, academiaEduUrl,
    selectedDays, hoursStart, hoursEnd, timezone, selectedLanguages,
    onSubmit, labels,
  ]);

  return (
    <div className="bg-white border-l-4 border-clinical-teal rounded-[12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] p-6 my-4">
      <h3 className="font-mulish font-bold text-lg text-deep-charcoal mb-1">
        {labels.presenceTitle}
      </h3>
      <p className="font-mulish text-sm text-body-slate mb-4">
        {labels.presenceDescription}
      </p>

      {/* Current Practice */}
      <div className="mb-5">
        <p className="font-mulish text-sm font-semibold text-deep-charcoal mb-3">
          {labels.currentPractice}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-mulish text-sm text-body-slate mb-1">
              {labels.institutions}
            </label>
            <input
              type="text"
              value={institutions}
              onChange={(e) => setInstitutions(e.target.value)}
              placeholder={labels.institutionsPlaceholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mulish text-sm text-body-slate mb-1">
                {labels.website} <span className="text-body-slate">{labels.optional}</span>
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
              />
            </div>
            <div>
              <label className="block font-mulish text-sm text-body-slate mb-1">
                Twitter/X <span className="text-body-slate">{labels.optional}</span>
              </label>
              <input
                type="url"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://x.com/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
              />
            </div>
            <div>
              <label className="block font-mulish text-sm text-body-slate mb-1">
                ResearchGate <span className="text-body-slate">{labels.optional}</span>
              </label>
              <input
                type="url"
                value={researchgateUrl}
                onChange={(e) => setResearchgateUrl(e.target.value)}
                placeholder="https://researchgate.net/profile/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
              />
            </div>
            <div>
              <label className="block font-mulish text-sm text-body-slate mb-1">
                Academia.edu <span className="text-body-slate">{labels.optional}</span>
              </label>
              <input
                type="url"
                value={academiaEduUrl}
                onChange={(e) => setAcademiaEduUrl(e.target.value)}
                placeholder="https://academia.edu/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Availability Section */}
      <div className="mb-5">
        <p className="font-mulish text-sm font-semibold text-deep-charcoal mb-3">
          {labels.availabilitySection}
        </p>

        {/* Days of week */}
        <div className="mb-3">
          <label className="block font-mulish text-sm text-body-slate mb-2">
            {labels.availableDays} <span className="text-alert-garnet">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDays.has(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-1.5 rounded-full font-mulish text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-clinical-teal text-white'
                      : 'bg-gray-100 text-body-slate hover:bg-gray-200'
                  }`}
                >
                  {day[lang]}
                </button>
              );
            })}
          </div>
          {errors.days && (
            <p className="font-mulish text-xs text-alert-garnet mt-1">
              {errors.days}
            </p>
          )}
        </div>

        {/* Hours */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block font-mulish text-sm text-body-slate mb-1">
              {labels.startTime}
            </label>
            <input
              type="time"
              value={hoursStart}
              onChange={(e) => setHoursStart(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
            />
          </div>
          <div>
            <label className="block font-mulish text-sm text-body-slate mb-1">
              {labels.endTime}
            </label>
            <input
              type="time"
              value={hoursEnd}
              onChange={(e) => setHoursEnd(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
            />
          </div>
        </div>

        {/* Timezone */}
        <div className="mb-3">
          <label className="block font-mulish text-sm text-body-slate mb-1">
            {labels.timezone}
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
          >
            {relevantTimezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Languages */}
      <div className="mb-4">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-2">
          {labels.consultationLanguages} <span className="text-alert-garnet">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CONSULTATION_LANGUAGES.map((language) => {
            const isSelected = selectedLanguages.has(language.code);
            return (
              <button
                key={language.code}
                type="button"
                onClick={() => toggleLanguage(language.code)}
                className={`px-3 py-1.5 rounded-full font-mulish text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-clinical-teal text-white'
                    : 'bg-gray-100 text-body-slate hover:bg-gray-200'
                }`}
              >
                {language[lang]}
              </button>
            );
          })}
        </div>
        {errors.languages && (
          <p className="font-mulish text-xs text-alert-garnet mt-1">
            {errors.languages}
          </p>
        )}
      </div>

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
