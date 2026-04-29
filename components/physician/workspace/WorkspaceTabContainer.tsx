/**
 * Phase 12 Plan 12-01: WorkspaceTabContainer
 *
 * Top-level orchestrator for the doctor's "Workspace" surface inside
 * /physicians/dashboard. Renders a 4-button sub-nav (Mailbox / Calendar /
 * Site / Settings) and conditionally mounts the matching sub-tab component.
 *
 * Per D-13: Workspace is a left-rail group with 4 sub-tabs. In this codebase,
 * DashboardContent is a vertically stacked page (no left-rail), so the
 * Workspace group is rendered as a top-level section with horizontal sub-nav.
 *
 * Hydrates initialTab from `?tab=settings` query param so deep links from
 * the wizard CompletionScreen work.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';
import MailboxTab from './MailboxTab';
import CalendarTab from './CalendarTab';
import SiteTab from './SiteTab';
import SettingsTab from './SettingsTab';

export type WorkspaceSubTab = 'mailbox' | 'calendar' | 'site' | 'settings';

const VALID_SUBTABS: Set<WorkspaceSubTab> = new Set<WorkspaceSubTab>([
  'mailbox',
  'calendar',
  'site',
  'settings',
]);

interface WorkspaceTabContainerProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
  initialTab?: WorkspaceSubTab;
  physicianFullName?: string;
}

export default function WorkspaceTabContainer({
  physicianId,
  lang,
  accessToken,
  initialTab,
  physicianFullName,
}: WorkspaceTabContainerProps) {
  const t = workspaceContent[lang];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WorkspaceSubTab>(initialTab || 'mailbox');

  // Hydrate from `?tab=` query param when router is ready
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.tab;
    const candidate = Array.isArray(q) ? q[0] : q;
    if (candidate && VALID_SUBTABS.has(candidate as WorkspaceSubTab)) {
      setActiveTab(candidate as WorkspaceSubTab);
    }
  }, [router.isReady, router.query.tab]);

  const tabs: Array<{ key: WorkspaceSubTab; label: string }> = [
    { key: 'mailbox', label: t.workspace.subtitle.mailbox },
    { key: 'calendar', label: t.workspace.subtitle.calendar },
    { key: 'site', label: t.workspace.subtitle.site },
    { key: 'settings', label: t.workspace.subtitle.settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl uppercase tracking-wide text-inst-blue mb-1">
          {t.workspace.title}
        </h2>
      </div>

      {/* Sub-nav */}
      <div className="flex flex-wrap gap-2 border-b border-warm-gray-800/[0.08] pb-2">
        {tabs.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-md font-dm-sans text-sm font-medium transition-all ${
                isActive
                  ? 'bg-clinical-teal text-white'
                  : 'bg-linen text-body-slate hover:bg-linen/70'
              }`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Active sub-tab body */}
      <div>
        {activeTab === 'mailbox' && (
          <MailboxTab physicianId={physicianId} lang={lang} accessToken={accessToken} />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab physicianId={physicianId} lang={lang} accessToken={accessToken} />
        )}
        {activeTab === 'site' && (
          <SiteTab
            physicianId={physicianId}
            lang={lang}
            accessToken={accessToken}
            physicianFullName={physicianFullName}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab physicianId={physicianId} lang={lang} accessToken={accessToken} />
        )}
      </div>
    </div>
  );
}
