/**
 * Phase 12 Plan 12-03: SettingsTab (fully implemented)
 *
 * Workspace Settings sub-tab with 4 sections:
 *   1. Mailbox password change — uses <MailboxPasswordForm mode="rotate" />
 *   2. IMAP credentials accordion — fetches /api/practikah/mailbox/imap-credentials;
 *      each field has a copy-to-clipboard button with 2-sec "Copied!" feedback.
 *   3. Auto-configure iPhone — anchor download to /api/practikah/mailbox/mobileconfig
 *   4. Two-factor authentication status — static per D-12 deferral; SOGo handles 2FA.
 *
 * All copy bilingual via lib/practikahWorkspaceContent.ts.
 * Brand colors + radii per CLAUDE.md.
 */

import { useEffect, useRef, useState } from 'react';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';
import MailboxPasswordForm from './MailboxPasswordForm';
import UpgradeCTABanner from './UpgradeCTABanner';
import type { EngagementCounters } from '../../../lib/practikahEngagementHeuristic';

interface SettingsTabProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
}

interface ImapCredentials {
  host: string;
  imap_port: number;
  smtp_port: number;
  smtp_starttls_port: number;
  username: string;
  protocol_imap: string;
  protocol_smtp: string;
}

interface WorkspaceStatus {
  tfa_enabled?: boolean | null;
  engagement_counters?: EngagementCounters;
}

/** Per-field clipboard copy with 2-second feedback. */
function CopyButton({ value, copyLabel, copiedLabel }: { value: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: silently ignore clipboard failure
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 font-dm-sans text-xs text-clinical-teal hover:text-clinical-teal/80 transition-colors shrink-0"
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}

export default function SettingsTab({ physicianId, lang, accessToken }: SettingsTabProps) {
  const t = workspaceContent[lang];

  // IMAP credentials state
  const [imapCreds, setImapCreds] = useState<ImapCredentials | null>(null);
  const [imapLoading, setImapLoading] = useState(false);
  const [imapError, setImapError] = useState(false);
  const [imapOpen, setImapOpen] = useState(false);

  // Workspace status for 2FA indicator + engagement counters
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);

  // Upgrade CTA banner dismiss state
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!physicianId || !accessToken) return;
    (async () => {
      try {
        const res = await fetch('/api/practikah/workspace-status', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = (await res.json()) as WorkspaceStatus;
          setStatus(data);
        }
      } catch {
        // Render shell while backend is unreachable
      }
    })();
  }, [physicianId, accessToken]);

  /** Lazy-load IMAP credentials when the accordion is opened. */
  const handleImapToggle = async (open: boolean) => {
    setImapOpen(open);
    if (!open || imapCreds || imapLoading) return;
    setImapLoading(true);
    setImapError(false);
    try {
      const res = await fetch('/api/practikah/mailbox/imap-credentials');
      if (res.ok) {
        const data = (await res.json()) as ImapCredentials;
        setImapCreds(data);
      } else {
        setImapError(true);
      }
    } catch {
      setImapError(true);
    } finally {
      setImapLoading(false);
    }
  };

  const tfaEnabled = Boolean(status?.tfa_enabled);

  return (
    <div className="space-y-6">
      {/* Section 1: Mailbox password change */}
      <div className="bg-white rounded-md border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.mailbox.changePasswordCardTitle}
        </h2>
        <p className="font-body text-sm text-body-slate mb-5">
          {t.mailbox.changePasswordCardSubtitle}
        </p>
        <MailboxPasswordForm lang={lang} mode="rotate" />
      </div>

      {/* Section 2: IMAP credentials accordion */}
      <div className="bg-white rounded-md border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.settings.imap.title}
        </h2>
        <p className="font-body text-sm text-body-slate mb-4">
          {t.settings.imap.helpText}
        </p>

        <details
          className="border border-warm-gray-800/[0.08] rounded-md"
          onToggle={(e) => handleImapToggle((e.target as HTMLDetailsElement).open)}
        >
          <summary className="px-4 py-3 font-dm-sans text-sm font-medium text-inst-blue cursor-pointer select-none">
            {t.settings.imapCardTitle}
          </summary>

          <div className="px-4 pb-4">
            {imapLoading && (
              <p className="font-body text-sm text-archival-grey mt-3">Loading...</p>
            )}
            {imapError && (
              <p className="font-body text-sm text-alert-garnet mt-3">
                {t.settings.mobileconfig.subtitle}
              </p>
            )}
            {imapCreds && (
              <dl className="mt-3 space-y-2 font-dm-sans text-sm">
                {/* Host */}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body-slate">{t.settings.imap.host}</dt>
                  <dd className="flex items-center text-deep-charcoal break-all">
                    <code className="font-mono">{imapCreds.host}</code>
                    <CopyButton
                      value={imapCreds.host}
                      copyLabel={t.settings.imap.copy}
                      copiedLabel={t.settings.imap.copied}
                    />
                  </dd>
                </div>
                {/* IMAP port */}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body-slate">{t.settings.imap.imapPort}</dt>
                  <dd className="flex items-center text-deep-charcoal">
                    <code className="font-mono">{imapCreds.imap_port}</code>
                    <CopyButton
                      value={String(imapCreds.imap_port)}
                      copyLabel={t.settings.imap.copy}
                      copiedLabel={t.settings.imap.copied}
                    />
                  </dd>
                </div>
                {/* SMTP port SSL */}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body-slate">{t.settings.imap.smtpPort}</dt>
                  <dd className="flex items-center text-deep-charcoal">
                    <code className="font-mono">{imapCreds.smtp_port}</code>
                    <CopyButton
                      value={String(imapCreds.smtp_port)}
                      copyLabel={t.settings.imap.copy}
                      copiedLabel={t.settings.imap.copied}
                    />
                  </dd>
                </div>
                {/* SMTP port STARTTLS */}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body-slate">{t.settings.imap.smtpStarttls}</dt>
                  <dd className="flex items-center text-deep-charcoal">
                    <code className="font-mono">{imapCreds.smtp_starttls_port}</code>
                    <CopyButton
                      value={String(imapCreds.smtp_starttls_port)}
                      copyLabel={t.settings.imap.copy}
                      copiedLabel={t.settings.imap.copied}
                    />
                  </dd>
                </div>
                {/* Username */}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body-slate">{t.settings.imap.username}</dt>
                  <dd className="flex items-center text-deep-charcoal break-all">
                    <code className="font-mono">{imapCreds.username}</code>
                    <CopyButton
                      value={imapCreds.username}
                      copyLabel={t.settings.imap.copy}
                      copiedLabel={t.settings.imap.copied}
                    />
                  </dd>
                </div>
                {/* Security protocol */}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-body-slate">{t.settings.imap.protocol}</dt>
                  <dd className="text-deep-charcoal">{imapCreds.protocol_imap}</dd>
                </div>
              </dl>
            )}
          </div>
        </details>
      </div>

      {/* Section 3: Auto-configure iPhone */}
      <div className="bg-white rounded-md border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.settings.mobileconfigCard.title}
        </h2>
        <p className="font-body text-sm text-body-slate mb-4">
          {t.settings.mobileconfigCard.description}
        </p>
        {/* Anchor download — browser triggers file download natively (T-12-03-04) */}
        <a
          href="/api/practikah/mailbox/mobileconfig"
          download="practikah.mobileconfig"
          className="inline-block bg-inst-blue text-white px-4 py-2 rounded-md font-dm-sans text-sm font-medium hover:bg-inst-blue/90 transition-colors"
        >
          {t.settings.mobileconfigCard.button}
        </a>
      </div>

      {/* Section 4: Two-factor authentication status */}
      <div className="bg-white rounded-md border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-2">
          {t.settings.tfaCard.title}
        </h2>
        <div className="flex items-center gap-3 mb-3">
          <span
            className={`font-dm-sans text-xs px-3 py-1 rounded-full ${
              tfaEnabled
                ? 'bg-confirm-green/10 text-confirm-green'
                : 'bg-archival-grey/10 text-archival-grey'
            }`}
          >
            {tfaEnabled ? t.settings.tfa.enabled : t.settings.tfaCard.notEnrolled}
          </span>
        </div>
        <p className="font-body text-sm text-body-slate mb-3">
          {t.settings.tfaCard.promptOnLogin}
        </p>
        <a
          href="https://mail.medikah.health"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-dm-sans text-sm text-clinical-teal hover:text-clinical-teal/80 transition-colors"
        >
          {t.settings.tfaCard.openMailboxPrompt} →
        </a>
      </div>

      {/* Engagement-gated upgrade CTA banner (D-20 / WSPC-07) — at bottom of Settings tab */}
      {!bannerDismissed && (
        <UpgradeCTABanner
          lang={lang}
          counters={status?.engagement_counters ?? null}
          placement="settings-tab"
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
    </div>
  );
}
