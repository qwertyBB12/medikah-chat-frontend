/**
 * Phase 12 Plan 12-01: MailboxTab
 *
 * Workspace sub-tab showing the doctor's Práctikah mailbox address, quota,
 * and an "Open Mailbox" CTA into webmail at mail.medikah.health.
 *
 * Also surfaces a Change Password inline action that POSTs to
 * /api/practikah/mailbox/change-password (handler ships in 12-03).
 *
 * All copy bilingual via lib/practikahWorkspaceContent.ts.
 */

import { useEffect, useState } from 'react';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent, format as fmt } from '../../../lib/practikahWorkspaceContent';

interface MailboxTabProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
}

interface WorkspaceStatus {
  mailbox_address?: string | null;
  mailbox_quota_used_gb?: number | null;
  tier?: 'free' | 'pro' | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function MailboxTab({ physicianId, lang, accessToken }: MailboxTabProps) {
  const t = workspaceContent[lang];
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);

  // Change Password inline form state
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdState, setPwdState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showForm, setShowForm] = useState(false);

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
        // Use defaults — render shell while backend is unreachable
      }
    })();
  }, [physicianId, accessToken]);

  const submitPasswordChange = async () => {
    if (newPwd.length < 12 || newPwd !== confirmPwd) {
      setPwdState('error');
      return;
    }
    setPwdState('saving');
    try {
      const res = await fetch('/api/practikah/mailbox/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }),
      });
      if (res.ok) {
        setPwdState('saved');
        setOldPwd('');
        setNewPwd('');
        setConfirmPwd('');
        setTimeout(() => {
          setPwdState('idle');
          setShowForm(false);
        }, 2000);
      } else {
        setPwdState('error');
      }
    } catch {
      setPwdState('error');
    }
  };

  const mailboxAddress = status?.mailbox_address || `you@medikah.health`;
  const quotaUsed = (status?.mailbox_quota_used_gb ?? 0).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Card 1: Mailbox address + quota + Open Mailbox CTA */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.mailbox.cardTitle}
        </h2>
        <p className="font-body text-sm text-body-slate mb-6">{t.mailbox.cardSubtitle}</p>

        <div className="mb-4">
          <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-1">
            {t.mailbox.address.label}
          </p>
          <p className="font-dm-sans text-2xl text-deep-charcoal break-all">{mailboxAddress}</p>
        </div>

        {/* Quota indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-body text-xs text-archival-grey">
              {fmt(t.mailbox.quotaUsed, { used: quotaUsed })}
            </span>
          </div>
          <div className="h-2 bg-linen rounded-full overflow-hidden">
            <div
              className="h-full bg-clinical-teal rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, ((status?.mailbox_quota_used_gb ?? 0) / 10) * 100)}%`,
              }}
            />
          </div>
        </div>

        <a
          href="https://mail.medikah.health"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-clinical-teal text-white px-6 py-3 rounded-md font-dm-sans font-medium hover:bg-clinical-teal/90 transition-colors"
        >
          {t.mailbox.openButton}
        </a>
        <span className="ml-2 text-xs text-archival-grey">
          {/* anchor for API_URL — not user-visible */}
          {API_URL ? '' : ''}
        </span>
      </div>

      {/* Card 2: Change Password inline action */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.mailbox.changePasswordCardTitle}
        </h2>
        <p className="font-body text-sm text-body-slate mb-4">
          {t.mailbox.changePasswordCardSubtitle}
        </p>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-inst-blue text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-inst-blue/90 transition-colors"
          >
            {t.mailbox.changePassword}
          </button>
        )}

        {showForm && (
          <div className="space-y-3">
            <div>
              <label className="block font-dm-sans text-xs text-body-slate mb-1">
                {t.mailbox.oldPasswordLabel}
              </label>
              <input
                type="password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                className="w-full border border-warm-gray-800/[0.12] rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block font-dm-sans text-xs text-body-slate mb-1">
                {t.mailbox.newPasswordLabel}
              </label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                minLength={12}
                className="w-full border border-warm-gray-800/[0.12] rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block font-dm-sans text-xs text-body-slate mb-1">
                {t.mailbox.confirmPasswordLabel}
              </label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                minLength={12}
                className="w-full border border-warm-gray-800/[0.12] rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={submitPasswordChange}
                disabled={pwdState === 'saving'}
                className="bg-clinical-teal text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-clinical-teal/90 disabled:opacity-50 transition-colors"
              >
                {pwdState === 'saving' ? t.mailbox.saving : t.mailbox.submit}
              </button>
              {pwdState === 'saved' && (
                <span className="font-body text-sm text-confirm-green">{t.mailbox.saved}</span>
              )}
              {pwdState === 'error' && (
                <span className="font-body text-sm text-alert-garnet">{t.mailbox.error}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
