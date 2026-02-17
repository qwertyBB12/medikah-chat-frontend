import { useState, useCallback } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import {
  MEDICAL_SPECIALTIES,
  batchedFormLabels,
} from '../../../lib/physicianOnboardingContent';
import { BoardCertification } from '../../../lib/physicianClient';

interface BatchedSpecialtyFormProps {
  lang: SupportedLang;
  onSubmit: (data: {
    primarySpecialty: string;
    subSpecialties: string[];
    boardCertifications: BoardCertification[];
  }) => void;
  onCancel: () => void;
  initialData?: {
    primarySpecialty?: string;
    subSpecialties?: string[];
    boardCertifications?: BoardCertification[];
  };
}

export default function BatchedSpecialtyForm({
  lang,
  onSubmit,
  onCancel,
  initialData,
}: BatchedSpecialtyFormProps) {
  const labels = batchedFormLabels[lang];

  const [primarySpecialty, setPrimarySpecialty] = useState(
    initialData?.primarySpecialty || ''
  );
  const [selectedSubSpecialties, setSelectedSubSpecialties] = useState<
    Set<string>
  >(new Set(initialData?.subSpecialties || []));
  const [certifications, setCertifications] = useState<
    Partial<BoardCertification>[]
  >(
    initialData?.boardCertifications && initialData.boardCertifications.length > 0
      ? initialData.boardCertifications.map((c) => ({ ...c }))
      : []
  );
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [error, setError] = useState('');

  const toggleSubSpecialty = useCallback((specialty: string) => {
    setSelectedSubSpecialties((prev) => {
      const next = new Set(prev);
      if (next.has(specialty)) {
        next.delete(specialty);
      } else {
        next.add(specialty);
      }
      return next;
    });
  }, []);

  const addCustomSpecialty = useCallback(() => {
    const trimmed = customSpecialty.trim();
    if (trimmed && !selectedSubSpecialties.has(trimmed)) {
      setSelectedSubSpecialties((prev) => new Set([...Array.from(prev), trimmed]));
      setCustomSpecialty('');
    }
  }, [customSpecialty, selectedSubSpecialties]);

  const addCertification = useCallback(() => {
    setCertifications((prev) => [...prev, { board: '', certification: '' }]);
  }, []);

  const removeCertification = useCallback((index: number) => {
    setCertifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCertification = useCallback(
    (index: number, field: keyof BoardCertification, value: string | number) => {
      setCertifications((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const primary = primarySpecialty.trim();
    if (!primary) {
      setError(labels.selectPrimarySpecialty);
      return;
    }

    // Remove primary from sub-specialties if present
    const subs = Array.from(selectedSubSpecialties).filter(
      (s) => s !== primary
    );

    const validCerts: BoardCertification[] = certifications
      .filter((c) => c.board && c.certification)
      .map((c) => ({
        board: c.board || '',
        certification: c.certification || '',
        ...(c.year ? { year: Number(c.year) } : {}),
      }));

    onSubmit({
      primarySpecialty: primary,
      subSpecialties: subs,
      boardCertifications: validCerts,
    });
  }, [primarySpecialty, selectedSubSpecialties, certifications, onSubmit, labels]);

  return (
    <div className="bg-white border-l-4 border-clinical-teal rounded-[12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] p-6 my-4">
      <h3 className="font-mulish font-bold text-lg text-deep-charcoal mb-1">
        {labels.specialtyTitle}
      </h3>
      <p className="font-mulish text-sm text-body-slate mb-4">
        {labels.specialtyDescription}
      </p>

      {/* Primary Specialty Dropdown */}
      <div className="mb-4">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-1">
          {labels.primarySpecialty} <span className="text-alert-garnet">*</span>
        </label>
        <select
          value={primarySpecialty}
          onChange={(e) => {
            setPrimarySpecialty(e.target.value);
            setError('');
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
        >
          <option value="">{labels.selectPrimarySpecialty}</option>
          {MEDICAL_SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {error && (
          <p className="font-mulish text-xs text-alert-garnet mt-1">{error}</p>
        )}
      </div>

      {/* Sub-specialties Multi-Select Grid */}
      <div className="mb-4">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-2">
          {labels.subSpecialties} <span className="text-body-slate font-normal">{labels.optional}</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {MEDICAL_SPECIALTIES.filter((s) => s !== primarySpecialty).map(
            (specialty) => {
              const isSelected = selectedSubSpecialties.has(specialty);
              return (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => toggleSubSpecialty(specialty)}
                  className={`px-3 py-1.5 rounded-full font-mulish text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-clinical-teal text-white'
                      : 'bg-gray-100 text-body-slate hover:bg-gray-200'
                  }`}
                >
                  {specialty}
                </button>
              );
            }
          )}
        </div>
        {/* Custom specialty input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customSpecialty}
            onChange={(e) => setCustomSpecialty(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomSpecialty()}
            placeholder={labels.addCustomSpecialty}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
          />
          <button
            type="button"
            onClick={addCustomSpecialty}
            className="px-3 py-1.5 bg-gray-100 text-body-slate font-mulish text-sm rounded-lg hover:bg-gray-200 transition-colors"
          >
            {labels.add}
          </button>
        </div>
      </div>

      {/* Board Certifications */}
      <div className="mb-4">
        <label className="block font-mulish text-sm font-semibold text-deep-charcoal mb-2">
          {labels.boardCertifications} <span className="text-body-slate font-normal">{labels.optional}</span>
        </label>
        <div className="space-y-3">
          {certifications.map((cert, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start"
            >
              <input
                type="text"
                value={cert.board || ''}
                onChange={(e) =>
                  updateCertification(index, 'board', e.target.value)
                }
                placeholder={labels.certifyingBoard}
                className="border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
              />
              <input
                type="text"
                value={cert.certification || ''}
                onChange={(e) =>
                  updateCertification(index, 'certification', e.target.value)
                }
                placeholder={labels.certificationName}
                className="border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cert.year || ''}
                  onChange={(e) =>
                    updateCertification(index, 'year', e.target.value)
                  }
                  placeholder={labels.year}
                  min="1950"
                  max={new Date().getFullYear()}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 font-mulish text-sm text-deep-charcoal focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 focus:border-clinical-teal"
                />
                <button
                  type="button"
                  onClick={() => removeCertification(index)}
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
          onClick={addCertification}
          className="mt-2 flex items-center gap-1.5 font-mulish text-sm font-semibold text-clinical-teal hover:text-clinical-teal/80 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {labels.addCertification}
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
