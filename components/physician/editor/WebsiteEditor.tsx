/**
 * WebsiteEditor Component
 *
 * Orchestrator for the physician mini-website editor.
 * Loads all website data, renders collapsible sections,
 * and saves with a single global save action.
 */

import { useCallback, useEffect, useState } from 'react';
import { SupportedLang } from '../../../lib/i18n';
import PhilosophyEditor from './PhilosophyEditor';
import ServicesEditor from './ServicesEditor';
import FAQEditor from './FAQEditor';
import LocationEditor from './LocationEditor';

interface WebsiteEditorProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken?: string | null;
}

interface WebsiteFormData {
  enabled: boolean;
  practice_philosophy: string;
  value_pillars: { title: string; description: string }[];
  services: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  office_address: string;
  office_city: string;
  office_country: string;
  office_phone: string;
  office_email: string;
  appointment_url: string;
  custom_tagline: string;
}

type NarrativeStatus = 'pending' | 'collected' | 'generated' | 'approved' | null;

interface GeneratedNarrativeData {
  narrative_status: NarrativeStatus;
  narrative_generated_at: string | null;
  generated_bio_en: string;
  generated_bio_es: string;
  generated_tagline_en: string;
  generated_tagline_es: string;
}

const EMPTY_FORM: WebsiteFormData = {
  enabled: true,
  practice_philosophy: '',
  value_pillars: [],
  services: [],
  faqs: [],
  office_address: '',
  office_city: '',
  office_country: '',
  office_phone: '',
  office_email: '',
  appointment_url: '',
  custom_tagline: '',
};

const EMPTY_GENERATED: GeneratedNarrativeData = {
  narrative_status: 'pending',
  narrative_generated_at: null,
  generated_bio_en: '',
  generated_bio_es: '',
  generated_tagline_en: '',
  generated_tagline_es: '',
};

const content = {
  en: {
    title: 'Physician Website',
    subtitle: 'Build your free mini-site to showcase your practice on your public profile.',
    enableLabel: 'Enable Website',
    enableDesc: 'When enabled, your website sections appear on your public profile page.',
    sectionPhilosophy: 'Practice Philosophy',
    sectionServices: 'Services',
    sectionFaq: 'FAQs',
    sectionLocation: 'Location & Contact',
    sectionGenerated: 'Generated Bio',
    generatedTagline: 'Generated Tagline',
    generatedBio: 'Generated Bio',
    generatedPlaceholder: 'No generated content yet.',
    statusPending: 'Complete onboarding to generate your bio.',
    statusCollected: 'Bio generation in progress.',
    statusNoGeneratedDate: 'No bio generated yet - complete the narrative questionnaire first.',
    generatedOn: 'Bio generated on',
    approvedBadge: 'Approved',
    approvePublish: 'Approve & Publish',
    rejectReanswer: 'Reject & Re-answer',
    approving: 'Approving...',
    rejecting: 'Rejecting...',
    approveSuccess: 'Bio approved and published to your profile.',
    rejectSuccess: 'Bio rejected. Questionnaire responses preserved. Update your answers and regenerate.',
    regenerateWarning: 'Regenerating will require re-approval before changes appear on your public profile.',
    regenerate: 'Regenerate',
    regenerating: 'Regenerating...',
    regenerateError: 'Failed to regenerate bio. Please try again.',
    approvalError: 'Failed to update bio approval. Please try again.',
    taglineLabel: 'Custom Tagline',
    taglinePlaceholder: 'A brief tagline for your practice (optional)',
    save: 'Save Website',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Failed to save. Please try again.',
    loading: 'Loading website data...',
  },
  es: {
    title: 'Sitio Web del Médico',
    subtitle: 'Construya su mini-sitio gratuito para mostrar su práctica en su perfil público.',
    enableLabel: 'Habilitar Sitio Web',
    enableDesc: 'Cuando está habilitado, las secciones de su sitio web aparecen en su perfil público.',
    sectionPhilosophy: 'Filosofía de Práctica',
    sectionServices: 'Servicios',
    sectionFaq: 'Preguntas Frecuentes',
    sectionLocation: 'Ubicación y Contacto',
    sectionGenerated: 'Biografía Generada',
    generatedTagline: 'Lema Generado',
    generatedBio: 'Biografía Generada',
    generatedPlaceholder: 'Aún no hay contenido generado.',
    statusPending: 'Complete el onboarding para generar su biografía.',
    statusCollected: 'La generación de la biografía está en progreso.',
    statusNoGeneratedDate: 'Aún no hay biografía generada. Complete primero el cuestionario narrativo.',
    generatedOn: 'Biografía generada el',
    approvedBadge: 'Aprobado',
    approvePublish: 'Aprobar y Publicar',
    rejectReanswer: 'Rechazar y Rehacer',
    approving: 'Aprobando...',
    rejecting: 'Rechazando...',
    approveSuccess: 'Biografía aprobada y publicada en su perfil.',
    rejectSuccess: 'Biografía rechazada. Sus respuestas del cuestionario se conservaron. Actualice sus respuestas y regenere.',
    regenerateWarning: 'Regenerar requerirá una nueva aprobación antes de que los cambios aparezcan en su perfil público.',
    regenerate: 'Regenerar',
    regenerating: 'Regenerando...',
    regenerateError: 'No se pudo regenerar la biografía. Intente de nuevo.',
    approvalError: 'No se pudo actualizar la aprobación de la biografía. Intente de nuevo.',
    taglineLabel: 'Lema Personalizado',
    taglinePlaceholder: 'Un lema breve para su práctica (opcional)',
    save: 'Guardar Sitio Web',
    saving: 'Guardando...',
    saved: 'Guardado',
    error: 'Error al guardar. Intente de nuevo.',
    loading: 'Cargando datos del sitio web...',
  },
};

export default function WebsiteEditor({ physicianId, lang, accessToken }: WebsiteEditorProps) {
  void accessToken;
  const t = content[lang];

  const [form, setForm] = useState<WebsiteFormData>(EMPTY_FORM);
  const [generatedData, setGeneratedData] = useState<GeneratedNarrativeData>(EMPTY_GENERATED);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'error'>('idle');
  const [approvalState, setApprovalState] = useState<'idle' | 'approving' | 'rejecting' | 'error'>('idle');
  const [approvalMessage, setApprovalMessage] = useState<'approve' | 'reject' | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    generated: true,
    philosophy: true,
    services: false,
    faq: false,
    location: false,
  });

  // Load existing website data
  const loadWebsiteData = useCallback(async (showLoadingSpinner = true) => {
    if (!physicianId) return;
    if (showLoadingSpinner) {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/physicians/${physicianId}/website`);
      if (res.ok) {
        const { data } = await res.json();
        if (data) {
          setForm({
            enabled: data.enabled ?? true,
            practice_philosophy: data.practice_philosophy || '',
            value_pillars: data.value_pillars || [],
            services: data.services || [],
            faqs: data.faqs || [],
            office_address: data.office_address || '',
            office_city: data.office_city || '',
            office_country: data.office_country || '',
            office_phone: data.office_phone || '',
            office_email: data.office_email || '',
            appointment_url: data.appointment_url || '',
            custom_tagline: data.custom_tagline || '',
          });

          setGeneratedData({
            narrative_status: data.narrative_status || 'pending',
            narrative_generated_at: data.narrative_generated_at || null,
            generated_bio_en: data.generated_bio_en || '',
            generated_bio_es: data.generated_bio_es || '',
            generated_tagline_en: data.generated_tagline_en || '',
            generated_tagline_es: data.generated_tagline_es || '',
          });
          return;
        }
      }

      setForm(EMPTY_FORM);
      setGeneratedData(EMPTY_GENERATED);
    } catch {
      // Use defaults
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  }, [physicianId]);

  useEffect(() => {
    if (!physicianId) return;
    loadWebsiteData();
  }, [physicianId, loadWebsiteData]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = <K extends keyof WebsiteFormData>(field: K, value: WebsiteFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveState('idle');
  };

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/website`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
      }
    } catch {
      setSaveState('error');
    }
  }, [physicianId, form]);

  const handleRegenerate = useCallback(async () => {
    if (!physicianId) return;

    setGenerationState('generating');
    setApprovalMessage(null);
    setApprovalState('idle');
    try {
      const res = await fetch(`/api/physicians/${physicianId}/generate`, {
        method: 'POST',
      });

      if (!res.ok) {
        setGenerationState('error');
        return;
      }

      await loadWebsiteData(false);
      setGenerationState('idle');
    } catch {
      setGenerationState('error');
    }
  }, [physicianId, loadWebsiteData]);

  const handleApprove = useCallback(async () => {
    if (!physicianId) return;

    setApprovalState('approving');
    setApprovalMessage(null);
    try {
      const res = await fetch(`/api/physicians/${physicianId}/approve-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      if (!res.ok) {
        setApprovalState('error');
        return;
      }

      await loadWebsiteData(false);
      setApprovalState('idle');
      setApprovalMessage('approve');
    } catch {
      setApprovalState('error');
    }
  }, [physicianId, loadWebsiteData]);

  const handleReject = useCallback(async () => {
    if (!physicianId) return;

    setApprovalState('rejecting');
    setApprovalMessage(null);
    try {
      const res = await fetch(`/api/physicians/${physicianId}/approve-bio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (!res.ok) {
        setApprovalState('error');
        return;
      }

      await loadWebsiteData(false);
      setApprovalState('idle');
      setApprovalMessage('reject');
    } catch {
      setApprovalState('error');
    }
  }, [physicianId, loadWebsiteData]);

  const selectedBio = lang === 'es' ? generatedData.generated_bio_es : generatedData.generated_bio_en;
  const selectedTagline = lang === 'es' ? generatedData.generated_tagline_es : generatedData.generated_tagline_en;
  const isGenerated = generatedData.narrative_status === 'generated';
  const isApproved = generatedData.narrative_status === 'approved';
  const canShowPreview = isGenerated || isApproved;
  const isApprovalBusy = approvalState === 'approving' || approvalState === 'rejecting';

  const generatedDate = generatedData.narrative_generated_at
    ? new Date(generatedData.narrative_generated_at)
    : null;
  const generatedDateLabel = generatedDate && !Number.isNaN(generatedDate.getTime())
    ? generatedDate.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const generationStatusMessage = (() => {
    if (generatedData.narrative_status === 'pending') return t.statusPending;
    if (generatedData.narrative_status === 'collected') return t.statusCollected;
    if ((isGenerated || isApproved) && generatedDateLabel) {
      return `${t.generatedOn} ${generatedDateLabel}`;
    }
    return t.statusNoGeneratedDate;
  })();

  if (loading) {
    return (
      <div className="bg-white rounded-[12px] border border-border-line shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <span className="font-dm-sans text-sm text-body-slate">{t.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[12px] border border-border-line shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="font-dm-sans font-semibold text-lg text-deep-charcoal">{t.title}</h2>
        <p className="font-dm-sans text-sm text-body-slate mt-1">{t.subtitle}</p>
      </div>

      {/* Enable toggle */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateField('enabled', !form.enabled)}
            className={`relative w-10 h-6 rounded-full transition ${
              form.enabled ? 'bg-clinical-teal' : 'bg-archival-grey/30'
            }`}
            aria-label="Toggle website"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                form.enabled ? 'translate-x-4' : ''
              }`}
            />
          </button>
          <div>
            <span className="font-dm-sans text-sm font-medium text-deep-charcoal">
              {t.enableLabel}
            </span>
            <p className="font-dm-sans text-xs text-archival-grey">{t.enableDesc}</p>
          </div>
        </div>
      </div>

      {/* Generated bio preview */}
      <div className="px-6 pb-4">
        <CollapsibleSection
          title={t.sectionGenerated}
          open={openSections.generated}
          onToggle={() => toggleSection('generated')}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-dm-sans text-sm text-body-slate">{generationStatusMessage}</p>
              {isApproved && (
                <span className="inline-flex items-center rounded-full bg-confirm-green/10 text-confirm-green px-2.5 py-1 text-xs font-dm-sans font-semibold">
                  {t.approvedBadge}
                </span>
              )}
            </div>

            {canShowPreview && (
              <>
                <div>
                  <p className="font-dm-sans text-xs font-semibold uppercase tracking-[0.04em] text-archival-grey mb-1.5">
                    {t.generatedTagline}
                  </p>
                  <div className="rounded-lg border border-border-line bg-clinical-surface/20 px-3 py-2 font-dm-sans text-sm text-deep-charcoal">
                    {selectedTagline || t.generatedPlaceholder}
                  </div>
                </div>

                <div>
                  <p className="font-dm-sans text-xs font-semibold uppercase tracking-[0.04em] text-archival-grey mb-1.5">
                    {t.generatedBio}
                  </p>
                  <div className="rounded-lg border border-border-line bg-clinical-surface/20 px-3 py-2 font-dm-sans text-sm text-deep-charcoal whitespace-pre-line leading-relaxed">
                    {selectedBio || t.generatedPlaceholder}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={generationState === 'generating' || isApprovalBusy}
                    className="font-dm-sans text-sm font-semibold px-4 py-2 rounded-lg bg-clinical-teal text-white hover:bg-clinical-teal/90 disabled:opacity-50 transition"
                  >
                    {generationState === 'generating' ? t.regenerating : t.regenerate}
                  </button>

                  {isGenerated && (
                    <>
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={generationState === 'generating' || isApprovalBusy}
                        className="font-dm-sans text-sm font-semibold px-4 py-2 rounded-lg bg-confirm-green text-white hover:bg-confirm-green/90 disabled:opacity-50 transition"
                      >
                        {approvalState === 'approving' ? t.approving : t.approvePublish}
                      </button>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={generationState === 'generating' || isApprovalBusy}
                        className="font-dm-sans text-sm font-semibold px-4 py-2 rounded-lg border border-alert-garnet text-alert-garnet hover:bg-alert-garnet/5 disabled:opacity-50 transition"
                      >
                        {approvalState === 'rejecting' ? t.rejecting : t.rejectReanswer}
                      </button>
                    </>
                  )}
                </div>

                {isApproved && (
                  <p className="font-dm-sans text-xs text-archival-grey">{t.regenerateWarning}</p>
                )}
              </>
            )}

            {approvalMessage === 'approve' && (
              <p className="font-dm-sans text-xs text-confirm-green">{t.approveSuccess}</p>
            )}
            {approvalMessage === 'reject' && (
              <p className="font-dm-sans text-xs text-body-slate">{t.rejectSuccess}</p>
            )}
            {generationState === 'error' && (
              <p className="font-dm-sans text-xs text-alert-garnet">{t.regenerateError}</p>
            )}
            {approvalState === 'error' && (
              <p className="font-dm-sans text-xs text-alert-garnet">{t.approvalError}</p>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Custom tagline */}
      <div className="px-6 pb-4">
        <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1">
          {t.taglineLabel}
        </label>
        <input
          type="text"
          value={form.custom_tagline}
          onChange={(e) => updateField('custom_tagline', e.target.value)}
          placeholder={t.taglinePlaceholder}
          className="w-full border border-border-line rounded-lg px-3 py-2 font-dm-sans text-sm text-deep-charcoal focus:outline-none focus:border-clinical-teal"
        />
      </div>

      {/* Collapsible sections */}
      <div className="px-6 pb-6 space-y-3">
        {/* Philosophy */}
        <CollapsibleSection
          title={t.sectionPhilosophy}
          open={openSections.philosophy}
          onToggle={() => toggleSection('philosophy')}
        >
          <PhilosophyEditor
            practicePhilosophy={form.practice_philosophy}
            valuePillars={form.value_pillars}
            onChange={(field, value) => {
              if (field === 'practice_philosophy') {
                updateField('practice_philosophy', value as string);
              } else {
                updateField('value_pillars', value as { title: string; description: string }[]);
              }
            }}
            lang={lang}
          />
        </CollapsibleSection>

        {/* Services */}
        <CollapsibleSection
          title={t.sectionServices}
          open={openSections.services}
          onToggle={() => toggleSection('services')}
        >
          <ServicesEditor
            services={form.services}
            onChange={(services) => updateField('services', services)}
            lang={lang}
          />
        </CollapsibleSection>

        {/* FAQ */}
        <CollapsibleSection
          title={t.sectionFaq}
          open={openSections.faq}
          onToggle={() => toggleSection('faq')}
        >
          <FAQEditor
            faqs={form.faqs}
            onChange={(faqs) => updateField('faqs', faqs)}
            lang={lang}
          />
        </CollapsibleSection>

        {/* Location */}
        <CollapsibleSection
          title={t.sectionLocation}
          open={openSections.location}
          onToggle={() => toggleSection('location')}
        >
          <LocationEditor
            data={{
              office_address: form.office_address,
              office_city: form.office_city,
              office_country: form.office_country,
              office_phone: form.office_phone,
              office_email: form.office_email,
              appointment_url: form.appointment_url,
            }}
            onChange={(field, value) => updateField(field, value)}
            lang={lang}
          />
        </CollapsibleSection>
      </div>

      {/* Save button */}
      <div className="px-6 pb-6">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className={`font-dm-sans text-sm font-semibold px-6 py-2.5 rounded-lg transition ${
            saveState === 'saved'
              ? 'bg-confirm-green text-white'
              : saveState === 'error'
              ? 'bg-alert-garnet text-white'
              : 'bg-clinical-teal text-white hover:bg-clinical-teal/90 disabled:opacity-50'
          }`}
        >
          {saveState === 'saving'
            ? t.saving
            : saveState === 'saved'
            ? t.saved
            : saveState === 'error'
            ? t.error
            : t.save}
        </button>
      </div>
    </div>
  );
}

/** Collapsible section wrapper */
function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border-line rounded-[12px] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-clinical-surface/30 hover:bg-clinical-surface/50 transition"
      >
        <span className="font-dm-sans text-sm font-medium text-deep-charcoal">{title}</span>
        <svg
          className={`w-4 h-4 text-archival-grey transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
