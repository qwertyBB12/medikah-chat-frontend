/**
 * Phase 12 Plan 12-01: CalendarTab
 *
 * Read-only calendar surface. Shows the doctor's CalDAV URL for subscription
 * from Apple Calendar / Google Calendar / Outlook Mobile, and an embedded
 * read-only iframe preview from SOGo.
 *
 * Full features ship in Phase 14 (CAL-01..13).
 */

import { useEffect, useState } from 'react';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';

interface CalendarTabProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
}

interface WorkspaceStatus {
  mailbox_address?: string | null;
  mailbox_local_part?: string | null;
}

export default function CalendarTab({ physicianId, lang, accessToken }: CalendarTabProps) {
  const t = workspaceContent[lang];
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [iframeError, setIframeError] = useState(false);

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

  // Derive SOGo CalDAV URL. local_part is the SOGo username.
  const localPart = status?.mailbox_local_part || 'you';
  const caldavUrl = `https://mail.medikah.health/SOGo/dav/${localPart}/Calendar/personal/`;
  const previewSrc = `https://mail.medikah.health/SOGo/so/${localPart}/Calendar/personal/view`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(caldavUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — UI just won't show "copied"
    }
  };

  return (
    <div className="space-y-6">
      {/* Card 1: CalDAV URL + copy button */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.calendar.cardTitle}
        </h2>
        <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-2 mt-4">
          {t.calendar.caldavUrl.label}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            readOnly
            value={caldavUrl}
            className="flex-1 font-dm-sans text-xs sm:text-sm text-deep-charcoal bg-linen border border-warm-gray-800/[0.12] rounded-md px-3 py-2 focus:outline-none"
          />
          <button
            type="button"
            onClick={copyUrl}
            className="bg-inst-blue text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-inst-blue/90 transition-colors whitespace-nowrap"
          >
            {copied ? t.calendar.copied : t.calendar.copyUrl}
          </button>
        </div>
      </div>

      {/* Card 2: Subscribe instructions (Apple / Google / Outlook) */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-4">
          {t.calendar.instructionsTitle}
        </h2>
        <div className="space-y-2">
          <details className="border border-warm-gray-800/[0.08] rounded-md p-3">
            <summary className="font-dm-sans text-sm font-medium text-inst-blue cursor-pointer">
              {t.calendar.subscribeApple}
            </summary>
            <p className="font-body text-sm text-body-slate mt-2 leading-relaxed">
              {t.calendar.appleSteps}
            </p>
          </details>
          <details className="border border-warm-gray-800/[0.08] rounded-md p-3">
            <summary className="font-dm-sans text-sm font-medium text-inst-blue cursor-pointer">
              {t.calendar.subscribeGoogle}
            </summary>
            <p className="font-body text-sm text-body-slate mt-2 leading-relaxed">
              {t.calendar.googleSteps}
            </p>
          </details>
          <details className="border border-warm-gray-800/[0.08] rounded-md p-3">
            <summary className="font-dm-sans text-sm font-medium text-inst-blue cursor-pointer">
              {t.calendar.subscribeOutlook}
            </summary>
            <p className="font-body text-sm text-body-slate mt-2 leading-relaxed">
              {t.calendar.outlookSteps}
            </p>
          </details>
        </div>
      </div>

      {/* Card 3: Embedded read-only iframe preview (SOGo) — Full features ship in Phase 14 (CAL-01..13). */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-3">
          {t.calendar.previewTitle}
        </h2>
        {!iframeError ? (
          <iframe
            src={previewSrc}
            className="w-full h-96 rounded-md border border-warm-gray-800/[0.08]"
            title={t.calendar.previewTitle}
            onError={() => setIframeError(true)}
          />
        ) : (
          <p className="font-body text-sm text-body-slate p-6 bg-linen rounded-md">
            {t.calendar.previewFallback}
          </p>
        )}
      </div>
    </div>
  );
}
