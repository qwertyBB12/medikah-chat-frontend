/**
 * Physician Consent Modal
 *
 * Displays the physician network agreement that doctors must accept
 * at the end of their onboarding process before joining the network.
 */

import { useState, useRef, useEffect } from 'react';
import { SupportedLang } from '../lib/i18n';
import {
  physicianConsentSections,
  physicianConsentUICopy,
  PHYSICIAN_CONSENT_VERSION,
} from '../lib/physicianConsentContent';

export interface PhysicianConsentData {
  physicianId: string;
  language: string;
  sections: Record<string, boolean>;
  recordingConsent: boolean | null;
  signedAt: string;
  formVersion: string;
}

interface PhysicianConsentModalProps {
  physicianId: string;
  physicianName: string;
  lang: SupportedLang;
  onComplete: (consentData: PhysicianConsentData) => void;
  onCancel?: () => void;
}

export default function PhysicianConsentModal({
  physicianId,
  physicianName,
  lang: initialLang,
  onComplete,
  onCancel,
}: PhysicianConsentModalProps) {
  const [lang, setLang] = useState<SupportedLang>(initialLang);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sections = physicianConsentSections[lang];
  const copy = physicianConsentUICopy[lang];

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

    // Build consent data
    const sectionConsents: Record<string, boolean> = {};
    sections.forEach((s) => {
      sectionConsents[s.sectionId] = true;
    });

    const consentData: PhysicianConsentData = {
      physicianId,
      language: lang,
      sections: sectionConsents,
      recordingConsent,
      signedAt: new Date().toISOString(),
      formVersion: PHYSICIAN_CONSENT_VERSION,
    };

    onComplete(consentData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[16px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-line flex items-center justify-between shrink-0 bg-gradient-to-r from-inst-blue to-[#243447]">
          <div>
            <h2 className="font-dm-serif text-white text-xl leading-tight">
              {copy.modalTitle}
            </h2>
            <p className="font-dm-sans text-white/70 text-sm mt-1">
              {lang === 'en' ? `Dr. ${physicianName}` : `Dr. ${physicianName}`}
            </p>
          </div>
          <button
            onClick={() => {
              setLang(lang === 'en' ? 'es' : 'en');
              setAgreed(false);
            }}
            className="font-dm-sans shrink-0 text-xs font-semibold tracking-wide px-3 py-1.5 border border-white/30 rounded-[8px] text-white/80 hover:text-white hover:border-white/50 transition"
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
        </div>

        {/* Important notice */}
        <div className="px-6 py-3 shrink-0">
          <p className="font-dm-sans text-xs text-body-slate leading-relaxed bg-clinical-surface border border-border-line rounded-[8px] px-4 py-3">
            {copy.importantNotice}
          </p>
        </div>

        {/* Scrollable document */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {sections.map((section) => (
            <div key={section.sectionId} className="border-b border-border-line/50 pb-6 last:border-0">
              <h3 className="font-dm-serif text-inst-blue text-base mb-1">
                {section.title}
              </h3>
              <p className="font-dm-sans text-body-slate font-medium text-xs mb-2">
                {section.summary}
              </p>
              <pre className="font-dm-sans text-archival-grey text-sm leading-relaxed whitespace-pre-wrap">
                {section.body}
              </pre>
            </div>
          ))}

          {/* Scroll prompt if user hasn't scrolled to bottom */}
          {!hasScrolledToBottom && (
            <p className="font-dm-sans text-center text-xs text-archival-grey animate-pulse py-2">
              {lang === 'en'
                ? '↓ Scroll to read all sections'
                : '↓ Desplácese para leer todas las secciones'}
            </p>
          )}
        </div>

        {/* Footer with recording consent + checkbox + CTA */}
        <div className="px-6 py-4 border-t border-border-line shrink-0 space-y-3 bg-[#FAFAFB]">
          {/* Recording consent */}
          <div className="bg-white border border-border-line rounded-[8px] px-4 py-3">
            <p className="font-dm-sans text-xs text-inst-blue font-semibold mb-2">
              {lang === 'en'
                ? 'Consultation Recording Consent (Section 9)'
                : 'Consentimiento de Grabación (Sección 9)'}
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="physicianRecordingConsent"
                  checked={recordingConsent === true}
                  onChange={() => setRecordingConsent(true)}
                  className="w-4 h-4 accent-clinical-teal"
                />
                <span className="font-dm-sans text-sm text-body-slate font-medium">
                  {copy.recordingYes}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="physicianRecordingConsent"
                  checked={recordingConsent === false}
                  onChange={() => setRecordingConsent(false)}
                  className="w-4 h-4 accent-clinical-teal"
                />
                <span className="font-dm-sans text-sm text-body-slate font-medium">
                  {copy.recordingNo}
                </span>
              </label>
            </div>
          </div>

          {/* Agreement checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={() => setAgreed(!agreed)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-clinical-teal rounded"
            />
            <span className="font-dm-sans text-sm text-deep-charcoal font-medium leading-snug">
              {copy.checkboxLabel}
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="font-dm-sans flex-1 py-3.5 rounded-[12px] font-semibold text-sm tracking-wide border border-border-line text-body-slate hover:text-inst-blue hover:border-inst-blue transition-all duration-200"
              >
                {lang === 'en' ? 'Go Back' : 'Regresar'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`font-dm-sans flex-1 py-3.5 rounded-[12px] font-semibold text-sm tracking-wide transition-all duration-200 ${
                canSubmit
                  ? 'bg-clinical-teal text-white hover:bg-clinical-teal-dark cursor-pointer'
                  : 'bg-clinical-teal text-white opacity-40 cursor-not-allowed'
              }`}
            >
              {submitting
                ? lang === 'en'
                  ? 'Completing...'
                  : 'Completando...'
                : copy.agreeButton}
            </button>
          </div>

          <p className="font-dm-sans text-center text-[10px] text-archival-grey tracking-wide">
            {lang === 'en'
              ? `Agreement v${PHYSICIAN_CONSENT_VERSION} · Your consent is recorded`
              : `Acuerdo v${PHYSICIAN_CONSENT_VERSION} · Su consentimiento queda registrado`}
          </p>
        </div>
      </div>
    </div>
  );
}
