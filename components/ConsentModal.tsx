import { useState, useCallback } from 'react';
import { SupportedLang } from '../lib/i18n';
import {
  consentSections,
  consentUICopy,
  CONSENT_FORM_VERSION,
} from '../lib/consentContent';
import { saveConsentRecord, ConsentFormData } from '../lib/consent';

interface ConsentModalProps {
  userId: string;
  lang: SupportedLang;
  onComplete: () => void;
}

export default function ConsentModal({ userId, lang: initialLang, onComplete }: ConsentModalProps) {
  const [lang, setLang] = useState<SupportedLang>(initialLang);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [recordingConsent, setRecordingConsent] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = consentSections[lang];
  const copy = consentUICopy[lang];

  const totalRequired = sections.length;
  const checkedCount = sections.filter((s) => checked[s.checkboxId]).length;
  const recordingSectionDone = recordingConsent !== null;
  const allChecked = checkedCount === totalRequired && recordingSectionDone;

  const toggleSection = useCallback((idx: number) => {
    setExpandedSection((prev) => (prev === idx ? null : idx));
  }, []);

  const toggleCheck = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSubmit = async () => {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    setError(null);

    const formData: ConsentFormData = {
      userId,
      language: lang,
      checkboxes: { ...checked, _form_version: true },
      recordingConsent,
    };

    const result = await saveConsentRecord(formData);

    if (!result.success) {
      setError(result.error ?? 'Failed to save consent. Please try again.');
      setSubmitting(false);
      return;
    }

    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[16px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-line flex items-center justify-between shrink-0">
          <h2 className="text-inst-blue font-bold text-lg leading-tight pr-4">
            {copy.modalTitle}
          </h2>
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="shrink-0 text-xs font-semibold tracking-wide px-3 py-1.5 border border-border-line rounded-[8px] text-body-slate hover:text-inst-blue hover:border-clinical-teal transition"
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <p className="text-xs text-archival-grey mb-1.5 font-semibold tracking-wide">
            {copy.progressLabel(checkedCount, totalRequired)}
          </p>
          <div className="w-full h-2 bg-clinical-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-clinical-teal rounded-full transition-all duration-300"
              style={{ width: `${(checkedCount / totalRequired) * 100}%` }}
            />
          </div>
        </div>

        {/* Important notice */}
        <div className="px-6 py-3 shrink-0">
          <p className="text-xs text-body-slate leading-relaxed bg-clinical-surface border border-border-line rounded-[8px] px-4 py-3">
            {copy.importantNotice}
          </p>
        </div>

        {/* Scrollable accordion sections */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2">
          {sections.map((section, idx) => {
            const isExpanded = expandedSection === idx;
            const isChecked = !!checked[section.checkboxId];

            return (
              <div
                key={section.checkboxId}
                className="border border-border-line rounded-[12px] overflow-hidden"
              >
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleSection(idx)}
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-clinical-surface/50 transition"
                >
                  <span className="mt-0.5 shrink-0">
                    {isExpanded ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-inst-blue">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-archival-grey">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-inst-blue font-bold text-sm leading-snug">
                      {section.title}
                    </p>
                    <p className="text-body-slate font-semibold text-xs mt-0.5 leading-relaxed">
                      {section.summary}
                    </p>
                  </div>
                  {isChecked && (
                    <span className="shrink-0 mt-0.5 text-clinical-teal">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M4 9l3.5 3.5L14 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border-line">
                    <pre className="text-archival-grey text-sm leading-relaxed whitespace-pre-wrap font-sans mt-3 mb-4">
                      {section.body}
                    </pre>

                    {/* Recording consent radios for section 14 */}
                    {section.hasRecordingConsent && (
                      <div className="mb-4 space-y-2 pl-1">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="recordingConsent"
                            checked={recordingConsent === true}
                            onChange={() => setRecordingConsent(true)}
                            className="w-4 h-4 accent-clinical-teal"
                          />
                          <span className="text-sm text-body-slate font-semibold">
                            {copy.recordingYes}
                          </span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="recordingConsent"
                            checked={recordingConsent === false}
                            onChange={() => setRecordingConsent(false)}
                            className="w-4 h-4 accent-clinical-teal"
                          />
                          <span className="text-sm text-body-slate font-semibold">
                            {copy.recordingNo}
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Checkbox */}
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(section.checkboxId)}
                        className="mt-0.5 w-5 h-5 shrink-0 accent-clinical-teal rounded"
                      />
                      <span className="text-sm text-deep-charcoal font-semibold leading-snug">
                        {lang === 'en'
                          ? 'I have read and understand this section'
                          : 'He leído y comprendo esta sección'}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with CTA */}
        <div className="px-6 py-4 border-t border-border-line shrink-0">
          {error && (
            <p className="text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 rounded-[8px] mb-3 text-center">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allChecked || submitting}
            className={`w-full py-3.5 rounded-[12px] font-bold text-sm tracking-wide transition-all duration-200 ${
              allChecked && !submitting
                ? 'bg-inst-blue text-white hover:bg-clinical-teal cursor-pointer'
                : 'bg-inst-blue text-white opacity-40 cursor-not-allowed'
            }`}
          >
            {submitting
              ? lang === 'en' ? 'Saving…' : 'Guardando…'
              : copy.agreeButton}
          </button>
          <p className="text-center text-[10px] text-archival-grey mt-2 tracking-wide">
            {lang === 'en'
              ? `Form version ${CONSENT_FORM_VERSION} · Your consent is recorded immutably`
              : `Versión del formulario ${CONSENT_FORM_VERSION} · Su consentimiento se registra de forma inmutable`}
          </p>
        </div>
      </div>
    </div>
  );
}
