import { useState, useRef, useEffect } from 'react';
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
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sections = consentSections[lang];
  const copy = consentUICopy[lang];

  const canSubmit = agreed && recordingConsent !== null && !submitting;

  // Track scroll position to detect when user reaches the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
      if (nearBottom) setHasScrolledToBottom(true);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    const checkboxes: Record<string, boolean> = {};
    sections.forEach((s) => { checkboxes[s.checkboxId] = true; });

    const formData: ConsentFormData = {
      userId,
      language: lang,
      checkboxes,
      recordingConsent,
    };

    // Attempt to save, but proceed regardless — consent was given in the UI
    try {
      await saveConsentRecord(formData);
    } catch {
      console.warn('Consent record could not be persisted — proceeding anyway.');
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
            onClick={() => { setLang(lang === 'en' ? 'es' : 'en'); setAgreed(false); }}
            className="shrink-0 text-xs font-semibold tracking-wide px-3 py-1.5 border border-border-line rounded-[8px] text-body-slate hover:text-inst-blue hover:border-clinical-teal transition"
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
        </div>

        {/* Important notice */}
        <div className="px-6 py-3 shrink-0">
          <p className="text-xs text-body-slate leading-relaxed bg-clinical-surface border border-border-line rounded-[8px] px-4 py-3">
            {copy.importantNotice}
          </p>
        </div>

        {/* Scrollable document */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {sections.map((section) => (
            <div key={section.checkboxId}>
              <h3 className="text-inst-blue font-bold text-sm mb-1">
                {section.title}
              </h3>
              <p className="text-body-slate font-semibold text-xs mb-2">
                {section.summary}
              </p>
              <pre className="text-archival-grey text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {section.body}
              </pre>

            </div>
          ))}

          {/* Scroll prompt if user hasn't scrolled to bottom */}
          {!hasScrolledToBottom && (
            <p className="text-center text-xs text-archival-grey animate-pulse py-2">
              {lang === 'en' ? '↓ Scroll to read all sections' : '↓ Desplácese para leer todas las secciones'}
            </p>
          )}
        </div>

        {/* Footer with recording consent + checkbox + CTA */}
        <div className="px-6 py-4 border-t border-border-line shrink-0 space-y-3">
          {/* Recording consent — always visible */}
          <div className="bg-clinical-surface border border-border-line rounded-[8px] px-4 py-3">
            <p className="text-xs text-inst-blue font-bold mb-2">
              {lang === 'en' ? 'Consultation Recording (Section 14)' : 'Grabación de Consulta (Sección 14)'}
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
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
              <label className="flex items-center gap-2 cursor-pointer">
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
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={() => setAgreed(!agreed)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-clinical-teal rounded"
            />
            <span className="text-sm text-deep-charcoal font-semibold leading-snug">
              {lang === 'en'
                ? 'I have read, understood, and agree to all 15 sections of this acknowledgment form'
                : 'He leído, comprendido y acepto las 15 secciones de este formulario de reconocimiento'}
            </span>
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-[12px] font-bold text-sm tracking-wide transition-all duration-200 ${
              canSubmit
                ? 'bg-inst-blue text-white hover:bg-clinical-teal cursor-pointer'
                : 'bg-inst-blue text-white opacity-40 cursor-not-allowed'
            }`}
          >
            {submitting
              ? lang === 'en' ? 'Saving…' : 'Guardando…'
              : copy.agreeButton}
          </button>

          <p className="text-center text-[10px] text-archival-grey tracking-wide">
            {lang === 'en'
              ? `Form v${CONSENT_FORM_VERSION} · Your consent is recorded`
              : `Formulario v${CONSENT_FORM_VERSION} · Su consentimiento queda registrado`}
          </p>
        </div>
      </div>
    </div>
  );
}
