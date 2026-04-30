/**
 * TryProContactForm.tsx
 *
 * WEB-15: Contact form for Try Pro sites at <slug>.medikah.health.
 *
 * Posts to /api/physicians/${physicianId}/inquiries — NOT to Práctikah mailbox.
 * This preserves the HIPAA boundary per D-15 in PROJECT.md.
 *
 * Security:
 *  - T-12-06-04: Honeypot input (name="website") silently 200s if filled by bots.
 *  - T-12-06-05: source: 'try-pro-preview' included for audit traceability.
 *  - T-12-06-06: No dangerouslySetInnerHTML — React auto-escapes all rendered values.
 *                Subject + message length capped (120 + 800 chars) to limit XSS surface.
 *  - Non-PHI disclaimer banner — prominent, NOT hidden. Rendered above submit button.
 *
 * Phase 14 carry-forward: CAPTCHA + PHI scanner on form submission (PHI-01..04).
 */

import { useState, type FormEvent } from 'react';
import { content, type WorkspaceLang } from '../../../../lib/practikahWorkspaceContent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  physicianId: string;
  isEs: boolean;
  accentColor: string;
}

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** T-12-06-04 Honeypot field — should always be empty for real humans */
  website: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TryProContactForm({ physicianId, isEs, accentColor }: Props) {
  const lang: WorkspaceLang = isEs ? 'es' : 'en';
  const t = content[lang].tryProContact;

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',  // honeypot — must stay empty
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // ── Validation ─────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) newErrors.name = t.required.name;
    if (!form.email.trim()) {
      newErrors.email = t.required.email;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = t.required.emailInvalid;
    }
    if (!form.subject.trim()) {
      newErrors.subject = t.required.subject;
    } else if (form.subject.trim().length > t.maxLength.subject) {
      newErrors.subject = `${t.maxLength.subject} chars max`;
    }
    if (!form.message.trim()) {
      newErrors.message = t.required.message;
    } else if (form.message.trim().length > t.maxLength.message) {
      newErrors.message = `${t.maxLength.message} chars max`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    // T-12-06-04: Honeypot check — silently 200 if bot filled the hidden field.
    // We do NOT post to the server in this case, preserving the silent behavior.
    if (form.website.length > 0) {
      setSubmitted(true);
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/physicians/${physicianId}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          source: 'try-pro-preview',
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setForm({ name: '', email: '', subject: '', message: '', website: '' });
      } else {
        const data = await res.json().catch(() => ({}));
        setServerError(data?.error || t.error);
      }
    } catch {
      setServerError(t.error);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Input helper ───────────────────────────────────────────────────────

  function inputClass(field: keyof FormState) {
    const base =
      'w-full px-4 py-3 font-dm-sans text-sm text-deep-charcoal bg-white border rounded-md outline-none transition-all duration-200 focus:ring-2 focus:ring-offset-1';
    return errors[field]
      ? `${base} border-alert-garnet focus:ring-alert-garnet/30`
      : `${base} border-deep-charcoal/20 focus:border-[var(--accent-color)] focus:ring-[var(--accent-color)]/20`;
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <section id="contact" className="py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-heading text-3xl uppercase tracking-wider text-deep-charcoal mb-2">
          {t.title}
        </h2>
        <p className="font-body text-body-slate mb-8">
          {t.subtitle}
        </p>

        {/* Non-PHI disclaimer banner — T-12-06-05: prominent, not hidden */}
        <div className="border-l-4 border-caution-amber rounded-md p-4 mb-6 bg-caution-amber/10">
          <p className="font-body text-sm text-deep-charcoal">{t.disclaimer}</p>
        </div>

        {/* Success toast */}
        {submitted && (
          <div className="rounded-md p-4 mb-6 border border-confirm-green bg-confirm-green/10">
            <p className="font-body text-sm text-confirm-green font-medium">{t.success}</p>
          </div>
        )}

        {/* Server error toast */}
        {serverError && (
          <div className="rounded-md p-4 mb-6 border border-alert-garnet bg-alert-garnet/10">
            <p className="font-body text-sm text-alert-garnet">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/*
           * T-12-06-04 Honeypot — bots fill this; humans don't see it.
           * tabIndex={-1} removes it from keyboard navigation.
           * autoComplete="off" prevents browser autofill.
           * aria-hidden hides from screen readers.
           */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {/* Name */}
          <div>
            <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1">
              {t.name}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={80}
              className={inputClass('name')}
            />
            {errors.name && (
              <p className="mt-1 font-dm-sans text-xs text-alert-garnet">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1">
              {t.email}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={254}
              className={inputClass('email')}
            />
            {errors.email && (
              <p className="mt-1 font-dm-sans text-xs text-alert-garnet">{errors.email}</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1">
              {t.subject}
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              maxLength={t.maxLength.subject}
              className={inputClass('subject')}
            />
            {errors.subject && (
              <p className="mt-1 font-dm-sans text-xs text-alert-garnet">{errors.subject}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="block font-dm-sans text-sm font-medium text-deep-charcoal mb-1">
              {t.message}
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={t.maxLength.message}
              rows={5}
              className={`${inputClass('message')} resize-none`}
            />
            <p className="mt-1 font-dm-sans text-xs text-body-slate/60 text-right">
              {form.message.length}/{t.maxLength.message}
            </p>
            {errors.message && (
              <p className="mt-1 font-dm-sans text-xs text-alert-garnet">{errors.message}</p>
            )}
          </div>

          {/* Submit — theme accent color via inline style */}
          <button
            type="submit"
            disabled={submitting || submitted}
            style={{ backgroundColor: accentColor }}
            className="w-full px-6 py-3 rounded-md text-white font-dm-sans font-medium text-sm uppercase tracking-wide disabled:opacity-50 transition-opacity hover:opacity-90"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </form>
      </div>
    </section>
  );
}
