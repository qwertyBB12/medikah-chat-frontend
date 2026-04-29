/**
 * Phase 12 Plan 12-01: SiteTab (SHELL ONLY)
 *
 * Workspace sub-tab for the doctor's Try Pro preview at <slug>.medikah.health.
 *
 * Full implementation in 12-04 (subdomain routing) / 12-05 (theming editor) /
 * 12-06 (SEO + contact form) / 12-07 (upgrade CTA polish). This plan ships the
 * shell only: live iframe preview, action buttons, on/off toggle.
 */

import { useEffect, useState } from 'react';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';
import { nameToSlug } from '../../../lib/slug';

interface SiteTabProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
  physicianFullName?: string;
}

interface WorkspaceStatus {
  full_name?: string | null;
  website_enabled?: boolean | null;
  theme_claimed?: boolean | null;
}

export default function SiteTab({ physicianId, lang, accessToken, physicianFullName }: SiteTabProps) {
  const t = workspaceContent[lang];
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [cachebust, setCachebust] = useState<number>(() => Date.now());

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
          setEnabled(Boolean(data.website_enabled));
        }
      } catch {
        // Render shell while backend is unreachable
      }
    })();
  }, [physicianId, accessToken]);

  const fullName = status?.full_name || physicianFullName || '';
  const slug = fullName ? nameToSlug(fullName) : 'you';
  const siteUrl = `https://${slug}.medikah.health`;
  const previewUrl = `${siteUrl}?cachebust=${cachebust}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const toggleEnabled = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      // 12-05/12-07 will wire actual physician_website endpoint
      await fetch(`/api/physicians/${physicianId}/website`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      setCachebust(Date.now());
    } catch {
      // revert on error
      setEnabled(!next);
    }
  };

  // If theme not claimed yet, show claim CTA
  if (status && !status.theme_claimed) {
    return (
      <div className="space-y-6">
        <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
          <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
            {t.site.notClaimedTitle}
          </h2>
          <p className="font-body text-sm text-body-slate mb-4">{t.site.notClaimedBody}</p>
          <button
            type="button"
            className="bg-clinical-teal text-white px-6 py-3 rounded-md font-dm-sans font-medium hover:bg-clinical-teal/90 transition-colors"
            // 12-05 will wire to the theming editor / claim flow
          >
            {t.site.claimButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card: Site preview + actions */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
              {t.site.cardTitle}
            </h2>
            <p className="font-body text-sm text-body-slate">{t.site.cardSubtitle}</p>
          </div>
          <span
            className={`font-dm-sans text-xs px-3 py-1 rounded-full ${
              enabled ? 'bg-confirm-green/10 text-confirm-green' : 'bg-archival-grey/10 text-archival-grey'
            }`}
          >
            {enabled ? t.site.toggleEnabled : t.site.toggleDisabled}
          </span>
        </div>

        <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-2">
          {t.site.previewLabel}
        </p>
        <iframe
          src={previewUrl}
          className="w-full h-[600px] rounded-md border border-warm-gray-800/[0.08]"
          title={t.site.previewLabel}
        />

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            // TODO: 12-05 will wire to ThemingEditor
            className="bg-clinical-teal text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-clinical-teal/90 transition-colors"
          >
            {t.site.editTheme}
          </button>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-inst-blue text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-inst-blue/90 transition-colors"
          >
            {t.site.openInNewTab}
          </a>
          <button
            type="button"
            onClick={copyShareLink}
            className="bg-linen text-body-slate px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-linen/80 transition-colors"
          >
            {copied ? t.calendar.copied : t.site.copyShareLink}
          </button>
          <button
            type="button"
            onClick={toggleEnabled}
            className="bg-linen text-body-slate px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-linen/80 transition-colors"
          >
            {enabled ? t.site.toggleDisabled : t.site.toggleEnabled}
          </button>
        </div>
      </div>
    </div>
  );
}
