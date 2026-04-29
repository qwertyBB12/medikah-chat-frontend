/**
 * Phase 12 Plan 12-01: SettingsTab
 *
 * Workspace sub-tab with mailbox settings:
 *   1. Mailbox password change (inline form — same shape as MailboxTab)
 *   2. IMAP credentials accordion (host/port/username + reveal-once password)
 *   3. Auto-configure iPhone (.mobileconfig download)
 *   4. Two-factor authentication status (D-12 deferral)
 *
 * Most handlers are stubbed in this plan and ship in 12-03. This file builds
 * the UI shell and wires fetch calls; 12-03 supplies real handlers.
 */

import { useEffect, useState } from 'react';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';

interface SettingsTabProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
}

interface WorkspaceStatus {
  mailbox_address?: string | null;
  mailbox_local_part?: string | null;
  tfa_enabled?: boolean | null;
}

export default function SettingsTab({ physicianId, lang, accessToken }: SettingsTabProps) {
  const t = workspaceContent[lang];
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);

  // Reveal-once state
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealedOnce, setRevealedOnce] = useState(false);

  // Change password inline form state
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
        // Render shell while backend is unreachable
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

  const requestReveal = async () => {
    setShowRevealConfirm(false);
    try {
      // 12-03 ships the actual handler — this calls the stub and reveals once
      const res = await fetch('/api/practikah/mailbox/change-password?reveal=once', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = (await res.json()) as { revealed_password?: string };
        if (data.revealed_password) {
          setRevealedPassword(data.revealed_password);
          setRevealedOnce(true);
        }
      }
    } catch {
      // ignore
    }
  };

  const triggerMobileconfigDownload = () => {
    // GET request — 12-03 implements the actual binary stream-through
    window.location.href = '/api/practikah/mailbox/mobileconfig';
  };

  const username = status?.mailbox_address || `you@medikah.health`;
  const tfaEnabled = Boolean(status?.tfa_enabled);

  return (
    <div className="space-y-6">
      {/* Section 1: Change Password inline form */}
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

      {/* Section 2: IMAP credentials accordion */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.settings.imapCardTitle}
        </h2>
        <p className="font-body text-sm text-body-slate mb-4">{t.settings.imapCardSubtitle}</p>

        <details className="border border-warm-gray-800/[0.08] rounded-md p-3">
          <summary className="font-dm-sans text-sm font-medium text-inst-blue cursor-pointer">
            {t.settings.imapCardTitle}
          </summary>
          <dl className="mt-3 space-y-2 font-dm-sans text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-body-slate">{t.settings.imapHost}</dt>
              <dd className="text-deep-charcoal break-all">mail.medikah.health</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-body-slate">{t.settings.imapPort}</dt>
              <dd className="text-deep-charcoal">993</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-body-slate">{t.settings.smtpHost}</dt>
              <dd className="text-deep-charcoal break-all">mail.medikah.health</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-body-slate">{t.settings.smtpPort}</dt>
              <dd className="text-deep-charcoal">465</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-body-slate">{t.settings.username}</dt>
              <dd className="text-deep-charcoal break-all">{username}</dd>
            </div>
            <div className="pt-2">
              <button
                type="button"
                disabled={revealedOnce}
                onClick={() => setShowRevealConfirm(true)}
                className="bg-caution-amber/10 text-caution-amber border border-caution-amber px-3 py-1 rounded-md font-dm-sans text-xs disabled:opacity-50"
              >
                {revealedOnce ? t.settings.password.hide : t.settings.password.reveal}
              </button>
              {revealedPassword && (
                <p className="mt-2 font-dm-sans text-sm bg-caution-amber/10 border border-caution-amber rounded-md p-2 text-deep-charcoal break-all">
                  {revealedPassword}
                </p>
              )}
            </div>
          </dl>
        </details>

        {/* Reveal confirmation modal */}
        {showRevealConfirm && (
          <div
            className="fixed inset-0 bg-deep-charcoal/40 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-md p-6 max-w-md">
              <h3 className="font-body font-semibold text-lg text-deep-charcoal mb-2">
                {t.settings.revealConfirmTitle}
              </h3>
              <p className="font-body text-sm text-body-slate mb-4">
                {t.settings.revealConfirmBody}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowRevealConfirm(false)}
                  className="bg-linen text-body-slate px-4 py-2 rounded-md font-dm-sans text-sm"
                >
                  {t.settings.revealConfirmNo}
                </button>
                <button
                  type="button"
                  onClick={requestReveal}
                  className="bg-caution-amber text-white px-4 py-2 rounded-md font-dm-sans text-sm"
                >
                  {t.settings.revealConfirmYes}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Auto-configure iPhone (.mobileconfig) */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.settings.mobileconfig.button}
        </h2>
        <p className="font-body text-sm text-body-slate mb-4">
          {t.settings.mobileconfig.subtitle}
        </p>
        <button
          type="button"
          onClick={triggerMobileconfigDownload}
          className="bg-inst-blue text-white px-4 py-2 rounded-md font-dm-sans text-sm hover:bg-inst-blue/90 transition-colors"
        >
          {t.settings.mobileconfig.button}
        </button>
      </div>

      {/* Section 4: Two-factor authentication status */}
      <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
        <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-1">
          {t.settings.tfa.title}
        </h2>
        <div className="flex items-center justify-between">
          <span
            className={`font-dm-sans text-xs px-3 py-1 rounded-full ${
              tfaEnabled
                ? 'bg-confirm-green/10 text-confirm-green'
                : 'bg-archival-grey/10 text-archival-grey'
            }`}
          >
            {tfaEnabled ? t.settings.tfa.enabled : t.settings.tfa.notEnabled}
          </span>
        </div>
        <p className="font-body text-sm text-body-slate mt-2">{t.settings.tfa.deferralCopy}</p>
      </div>
    </div>
  );
}
