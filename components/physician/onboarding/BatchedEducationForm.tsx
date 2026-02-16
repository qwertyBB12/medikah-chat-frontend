import { useState, useCallback } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import {
  LICENSED_COUNTRIES,
  batchedFormLabels,
} from '../../../lib/physicianOnboardingContent';
import { Residency, Fellowship } from '../../../lib/physicianClient';

interface BatchedEducationFormProps {
  lang: SupportedLang;
  onSubmit: (data: {
    medicalSchool: string;
    medicalSchoolCountry: string;
    graduationYear: number;
    honors: string[];
    residency: Residency[];
    fellowships: Fellowship[];
  }) => void;
  onCancel: () => void;
  primarySpecialty?: string;
  initialData?: {
    medicalSchool?: string;
    medicalSchoolCountry?: string;
    graduationYear?: number;
    honors?: string[];
    residency?: Residency[];
    fellowships?: Fellowship[];
  };
}

export default function BatchedEducationForm({
  lang,
  onSubmit,
  onCancel,
  primarySpecialty,
  initialData,
}: BatchedEducationFormProps) {
  const labels = batchedFormLabels[lang];

  // Medical school fields
  const [medicalSchool, setMedicalSchool] = useState(
    initialData?.medicalSchool || ''
  );
  const [medicalSchoolCountry, setMedicalSchoolCountry] = useState(
    initialData?.medicalSchoolCountry || ''
  );
  const [graduationYear, setGraduationYear] = useState(
    initialData?.graduationYear?.toString() || ''
  );
  const [honorsText, setHonorsText] = useState(
    initialData?.honors?.join(', ') || ''
  );

  // Residency
  const [residencies, setResidencies] = useState<Partial<Residency>[]>(
    initialData?.residency && initialData.residency.length > 0
      ? initialData.residency.map((r) => ({ ...r }))
      : [{ institution: '', specialty: primarySpecialty || '', startYear: 0, endYear: 0 }]
  );

  // Fellowships
  const [fellowships, setFellowships] = useState<Partial<Fellowship>[]>(
    initialData?.fellowships && initialData.fellowships.length > 0
      ? initialData.fellowships.map((f) => ({ ...f }))
      : []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Residency handlers
  const addResidency = useCallback(() => {
    setResidencies((prev) => [
      ...prev,
      { institution: '', specialty: primarySpecialty || '', startYear: 0, endYear: 0 },
    ]);
  }, [primarySpecialty]);

  const removeResidency = useCallback((index: number) => {
    setResidencies((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateResidency = useCallback(
    (index: number, field: keyof Residency, value: string | number) => {
      setResidencies((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  // Fellowship handlers
  const addFellowship = useCallback(() => {
    setFellowships((prev) => [
      ...prev,
      { institution: '', specialty: '', startYear: 0, endYear: 0 },
    ]);
  }, []);

  const removeFellowship = useCallback((index: number) => {
    setFellowships((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateFellowship = useCallback(
    (index: number, field: keyof Fellowship, value: string | number) => {
      setFellowships((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!medicalSchool.trim()) {
      newErrors.medicalSchool = labels.enterMedicalSchool;
    }
    if (!medicalSchoolCountry.trim()) {
      newErrors.medicalSchoolCountry = labels.selectCountry;
    }
    const yearNum = parseInt(graduationYear, 10);
    if (!graduationYear || isNaN(yearNum) || yearNum < 1950 || yearNum > new Date().getFullYear()) {
      newErrors.graduationYear = labels.enterValidYear;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const honors = honorsText
      .split(/[,;]+/)
      .map((h) => h.trim())
      .filter(Boolean);

    const validResidencies: Residency[] = residencies
      .filter((r) => r.institution)
      .map((r) => ({
        institution: r.institution || '',
        specialty: r.specialty || primarySpecialty || '',
        startYear: Number(r.startYear) || 0,
        endYear: Number(r.endYear) || 0,
      }));

    const validFellowships: Fellowship[] = fellowships
      .filter((f) => f.institution)
      .map((f) => ({
        institution: f.institution || '',
        specialty: f.specialty || '',
        startYear: Number(f.startYear) || 0,
        endYear: Number(f.endYear) || 0,
      }));

    onSubmit({
      medicalSchool: medicalSchool.trim(),
      medicalSchoolCountry: medicalSchoolCountry.trim(),
      graduationYear: yearNum,
      honors,
      residency: validResidencies,
      fellowships: validFellowships,
    });
  }, [
    medicalSchool, medicalSchoolCountry, graduationYear, honorsText,
    residencies, fellowships, primarySpecialty, onSubmit, labels,
  ]);

  return (
    <div className="bg-white border-l-4 border-clinical-teal rounded-[12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] p-6 my-4">
      <h3 className="font-mulish font-bold text-lg text-deep-charcoal mb-1">
        {labels.educationTitle}
      </h3>
      <p className="font-mulish text-sm text-body-slate mb-4">
        {labels.educationDescription}
      </p>

      {/* Medical School Section */}
      <div className="mb-5">
        <p className="font-mulish text-sm font-semibold text-deep-charcoal mb-3">
          {labels.medicalSchoolSection}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block font-mulish text-sm text-body-slate mb-1">
              {labels.medicalSchoolName} <span className="text-alert-garnet">*</span>
            </label>
            <input
              type="text"
              value={medicalSchool}
              onChange={(e) => {
                setMedicalSchool(e.target.value);
                setErrors((prev) => ({ ...prev, medicalSchool: '' }));
              }}
              placeholder={labels.enterMedicalSchool}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
            />
            {errors.medicalSchool && (
              <p className="font-mulish text-xs text-alert-garnet mt-1">
                {errors.medicalSchool}
              </p>
            )}
          </div>

          <div>
            <label className="block font-mulish text-sm text-body-slate mb-1">
              {labels.country} <span className="text-alert-garnet">*</span>
            </label>
            <select
              value={medicalSchoolCountry}
              onChange={(e) => {
                setMedicalSchoolCountry(e.target.value);
                setErrors((prev) => ({ ...prev, medicalSchoolCountry: '' }));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
            >
              <option value="">{labels.selectCountry}</option>
              {LICENSED_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.medicalSchoolCountry && (
              <p className="font-mulish text-xs text-alert-garnet mt-1">
                {errors.medicalSchoolCountry}
              </p>
            )}
          </div>

          <div>
            <label className="block font-mulish text-sm text-body-slate mb-1">
              {labels.graduationYear} <span className="text-alert-garnet">*</span>
            </label>
            <input
              type="number"
              value={graduationYear}
              onChange={(e) => {
                setGraduationYear(e.target.value);
                setErrors((prev) => ({ ...prev, graduationYear: '' }));
              }}
              placeholder="2010"
              min="1950"
              max={new Date().getFullYear()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
            />
            {errors.graduationYear && (
              <p className="font-mulish text-xs text-alert-garnet mt-1">
                {errors.graduationYear}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block font-mulish text-sm text-body-slate mb-1">
              {labels.honors} <span className="text-body-slate font-normal">{labels.optional}</span>
            </label>
            <input
              type="text"
              value={honorsText}
              onChange={(e) => setHonorsText(e.target.value)}
              placeholder={labels.honorsPlaceholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
            />
          </div>
        </div>
      </div>

      {/* Residency Section */}
      <div className="mb-5">
        <p className="font-mulish text-sm font-semibold text-deep-charcoal mb-3">
          {labels.residencySection}
        </p>
        <div className="space-y-3">
          {residencies.map((res, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-start border border-gray-200 rounded-lg p-3"
            >
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={res.institution || ''}
                  onChange={(e) => updateResidency(index, 'institution', e.target.value)}
                  placeholder={labels.institutionName}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={res.startYear || ''}
                  onChange={(e) => updateResidency(index, 'startYear', e.target.value)}
                  placeholder={labels.startYear}
                  min="1950"
                  max={new Date().getFullYear()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                />
                <input
                  type="number"
                  value={res.endYear || ''}
                  onChange={(e) => updateResidency(index, 'endYear', e.target.value)}
                  placeholder={labels.endYear}
                  min="1950"
                  max={new Date().getFullYear() + 5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                />
              </div>
              <div className="flex items-center">
                {residencies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeResidency(index)}
                    className="text-gray-400 hover:text-alert-garnet transition-colors p-2"
                    aria-label={labels.remove}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addResidency}
          className="mt-2 flex items-center gap-1.5 font-mulish text-sm font-semibold text-clinical-teal hover:text-clinical-teal/80 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {labels.addResidency}
        </button>
      </div>

      {/* Fellowships Section */}
      <div className="mb-4">
        <p className="font-mulish text-sm font-semibold text-deep-charcoal mb-3">
          {labels.fellowshipsSection} <span className="text-body-slate font-normal">{labels.optional}</span>
        </p>
        <div className="space-y-3">
          {fellowships.map((fel, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-start border border-gray-200 rounded-lg p-3"
            >
              <input
                type="text"
                value={fel.institution || ''}
                onChange={(e) => updateFellowship(index, 'institution', e.target.value)}
                placeholder={labels.institutionName}
                className="border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
              />
              <input
                type="text"
                value={fel.specialty || ''}
                onChange={(e) => updateFellowship(index, 'specialty', e.target.value)}
                placeholder={labels.specialtyField}
                className="border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={fel.startYear || ''}
                  onChange={(e) => updateFellowship(index, 'startYear', e.target.value)}
                  placeholder={labels.startYear}
                  min="1950"
                  max={new Date().getFullYear()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                />
                <input
                  type="number"
                  value={fel.endYear || ''}
                  onChange={(e) => updateFellowship(index, 'endYear', e.target.value)}
                  placeholder={labels.endYear}
                  min="1950"
                  max={new Date().getFullYear() + 5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                />
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => removeFellowship(index)}
                  className="text-gray-400 hover:text-alert-garnet transition-colors p-2"
                  aria-label={labels.remove}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addFellowship}
          className="mt-2 flex items-center gap-1.5 font-mulish text-sm font-semibold text-clinical-teal hover:text-clinical-teal/80 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {labels.addFellowship}
        </button>
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
