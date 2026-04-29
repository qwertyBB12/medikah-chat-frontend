/**
 * Phase 12 Plan 12-01: CompletionScreen
 *
 * Wizard final step — celebratory screen shown after successful provisioning.
 * Renders:
 *   - Celebratory headline + personalized welcome
 *   - Once-only password reveal card (T-12-01-03: localStorage-gated)
 *   - 3 CTA cards: Open Mailbox / View Profile / Try Pro Preview
 *   - IMAP credentials accordion (deep link to Settings tab)
 *
 * Per T-12-01-03: password reveal is gated by localStorage key
 * `praktikah_password_revealed_{physicianId}`. User can see it once.
 * Subsequent reveals require a password rotation via 12-03.
 *
 * All copy from practikahWorkspaceContent.ts. Brand-only colors and radii.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';
import { format as fmt } from '../../../../lib/practikahWorkspaceContent';

interface CompletionScreenProps {
  lang: SupportedLang;
  physicianId: string;
  mailboxAddress: string;
  mailboxPassword: string;
  slug: string;
  firstName: string;
}

export default function CompletionScreen({
  lang,
  physicianId,
  mailboxAddress,
  mailboxPassword,
  slug,
  firstName,
}: CompletionScreenProps) {
  const t = workspaceContent[lang];

  const REVEAL_KEY = `praktikah_password_revealed_${physicianId}`;

  const [alreadyRevealed, setAlreadyRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tryProLoading, setTryProLoading] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(REVEAL_KEY) === 'true') {
        setAlreadyRevealed(true);
      }
    } catch {
      // localStorage unavailable (SSR or private-mode restriction) — allow reveal
    }
  }, [REVEAL_KEY]);

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(mailboxPassword);
      setCopied(true);
      // Mark revealed in localStorage after first copy
      try {
        localStorage.setItem(REVEAL_KEY, 'true');
        setAlreadyRevealed(true);
      } catch {
        // ignore
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleTryProPreview = async () => {
    setTryProLoading(true);
    try {
      // D-19 one-click claim: stub fetch to theme/get — 12-05 implements the editor
      await fetch('/api/practikah/theme/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout_variant: 'classic',
          accent_color: '#2C7A8C',
          font_weight: 'regular',
        }),
      });
    } catch {
      // ignore — theme endpoint ships in 12-05
    } finally {
      setTryProLoading(false);
      window.open(`https://${slug}.medikah.health`, '_blank', 'noopener,noreferrer');
    }
  };

  const siteUrl = `https://${slug}.medikah.health`;

  return (
    <div className="space-y-6">
      {/* Celebratory headline */}
      <div className="text-center py-8">
        <h1 className="font-heading text-5xl uppercase tracking-wide text-inst-blue mb-3">
          {lang === 'es' ? '¡Estás en Práctikah!' : "You're on Práctikah!"}
        </h1>
        <p className="font-body text-xl text-body-slate">
          {fmt(t.wizard.completion.subhead, { firstName })}
        </p>
      </div>

      {/* Once-only password reveal card — T-12-01-03 */}
      {!alreadyRevealed && (
        <div className="bg-caution-amber/10 border border-caution-amber rounded-md p-4">
          <p className="font-dm-sans text-xs uppercase tracking-wide text-caution-amber mb-2">
            {t.wizard.completion.passwordReveal}
          </p>
          <p className="font-dm-sans text-lg text-deep-charcoal break-all mb-3 select-all">
            {mailboxPassword}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyPassword}
              className="bg-caution-amber text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-caution-amber/90 transition-colors"
            >
              {copied ? t.wizard.completion.copied : t.wizard.completion.copyPassword}
            </button>
            <p className="font-body text-xs text-caution-amber">
              {t.wizard.completion.passwordWarning}
            </p>
          </div>
        </div>
      )}

      {/* 3 CTA cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CTA 1: Open Mailbox */}
        <a
          href="https://mail.medikah.health"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-start p-5 bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] shadow-sm hover:border-clinical-teal/30 hover:shadow-md transition-all group"
        >
          {/* Mail icon */}
          <div className="w-10 h-10 rounded-md bg-clinical-teal/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-clinical-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h3 className="font-dm-sans font-semibold text-deep-charcoal mb-1 group-hover:text-clinical-teal transition-colors">
            {t.wizard.completion.openMailbox}
          </h3>
          <p className="font-body text-xs text-body-slate">
            {t.wizard.completion.openMailboxDesc}
          </p>
        </a>

        {/* CTA 2: View Your Profile */}
        <Link
          href={`/dr/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-start p-5 bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] shadow-sm hover:border-clinical-teal/30 hover:shadow-md transition-all group"
        >
          {/* Person icon */}
          <div className="w-10 h-10 rounded-md bg-inst-blue/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-inst-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <h3 className="font-dm-sans font-semibold text-deep-charcoal mb-1 group-hover:text-inst-blue transition-colors">
            {t.wizard.completion.viewProfile}
          </h3>
          <p className="font-body text-xs text-body-slate">
            {t.wizard.completion.viewProfileDesc}
          </p>
        </Link>

        {/* CTA 3: Try Pro Preview */}
        <button
          type="button"
          onClick={handleTryProPreview}
          disabled={tryProLoading}
          className="flex flex-col items-start p-5 bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] shadow-sm hover:border-clinical-teal/30 hover:shadow-md transition-all group disabled:opacity-60 text-left"
        >
          {/* Globe icon */}
          <div className="w-10 h-10 rounded-md bg-confirm-green/10 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-confirm-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h3 className="font-dm-sans font-semibold text-deep-charcoal mb-1 group-hover:text-confirm-green transition-colors">
            {t.wizard.completion.tryProPreview}
          </h3>
          <p className="font-body text-xs text-body-slate">
            {t.wizard.completion.tryProPreviewDesc}
          </p>
        </button>
      </div>

      {/* IMAP credentials accordion */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-4">
        <details>
          <summary className="font-dm-sans text-sm font-medium text-inst-blue cursor-pointer">
            {t.wizard.completion.imapAccordionTitle}
          </summary>
          <dl className="mt-3 space-y-2 font-dm-sans text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-body-slate">IMAP</dt>
              <dd className="text-deep-charcoal">mail.medikah.health:993</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-body-slate">SMTP</dt>
              <dd className="text-deep-charcoal">mail.medikah.health:465</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-body-slate">{lang === 'es' ? 'Usuario' : 'Username'}</dt>
              <dd className="text-deep-charcoal break-all">{mailboxAddress}</dd>
            </div>
          </dl>
          <Link
            href="/physicians/dashboard?tab=workspace"
            className="mt-3 inline-block font-dm-sans text-xs text-clinical-teal hover:text-clinical-teal/80 underline"
          >
            {t.wizard.completion.goToSettings}
          </Link>
        </details>
      </div>

      {/* Footer: site URL preview */}
      <p className="font-body text-xs text-archival-grey text-center pb-4">
        {lang === 'es' ? 'Tu sitio preview:' : 'Your preview site:'}{' '}
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-clinical-teal hover:text-clinical-teal/80"
        >
          {siteUrl}
        </a>
      </p>
    </div>
  );
}
