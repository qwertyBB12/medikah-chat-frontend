/**
 * Phase 12 Plan 12-03: MailboxPasswordForm
 *
 * Reusable password-change form for MailboxTab and SettingsTab.
 *
 * Modes:
 *   'rotate' (default) — three inputs: current + new + confirm
 *   'first-set'         — two inputs: new + confirm (no current; used post-provisioning)
 *
 * Submits POST /api/practikah/mailbox/change-password with:
 *   { current_password, new_password }
 *
 * Security:
 *   - Password inputs are never logged (T-12-03-02).
 *   - Client-side length >= 12 enforced before submit.
 *   - Confirm mismatch checked before submit.
 *
 * All copy bilingual via lib/practikahWorkspaceContent.ts.
 * Brand colors + radii per CLAUDE.md (inst-blue, clinical-teal, rounded-md/lg).
 * Fonts: DM Sans for labels, Mulish (font-body) for help text.
 */

import { useState } from 'react';
import type { SupportedLang } from '../../../lib/i18n';
import { content as workspaceContent } from '../../../lib/practikahWorkspaceContent';

export interface MailboxPasswordFormProps {
  lang: SupportedLang;
  /** Called when the server confirms success. Use to trigger parent state changes. */
  onSuccess?: () => void;
  /** 'rotate' (default) requires current password; 'first-set' skips it. */
  mode?: 'rotate' | 'first-set';
}

/** Returns 0..4 strength score based on 4 heuristic rules. */
function computeStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 12) score++;
  if (/\d/.test(pwd)) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  return score;
}

const STRENGTH_COLORS: Record<number, string> = {
  0: 'bg-archival-grey',
  1: 'bg-alert-garnet',
  2: 'bg-caution-amber',
  3: 'bg-info-blue',
  4: 'bg-confirm-green',
};

export default function MailboxPasswordForm({
  lang,
  onSuccess,
  mode = 'rotate',
}: MailboxPasswordFormProps) {
  const t = workspaceContent[lang];
  const pf = t.settings.passwordForm;

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const strength = computeStrength(newPwd);

  const strengthLabel = [
    pf.strengthWeak,   // 0
    pf.strengthWeak,   // 1
    pf.strengthFair,   // 2
    pf.strengthGood,   // 3
    pf.strengthStrong, // 4
  ][strength];

  const handleSubmit = async () => {
    // Client-side validation
    if (newPwd.length < 12) {
      setErrorMsg(pf.errorWeak);
      setFormState('error');
      return;
    }
    if (newPwd !== confirmPwd) {
      setErrorMsg(pf.errorMismatch);
      setFormState('error');
      return;
    }

    setFormState('submitting');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/practikah/mailbox/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: mode === 'rotate' ? currentPwd : '',
          new_password: newPwd,
        }),
      });

      if (res.ok) {
        setFormState('success');
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        onSuccess?.();
        // Auto-reset success state after 3 seconds
        setTimeout(() => setFormState('idle'), 3000);
      } else {
        let detail = pf.error;
        try {
          const body = (await res.json()) as { detail?: string; error?: string };
          if (body.detail || body.error) {
            detail = body.detail ?? body.error ?? pf.error;
          }
        } catch {
          // ignore parse failure
        }
        setErrorMsg(detail);
        setFormState('error');
      }
    } catch {
      setErrorMsg(pf.error);
      setFormState('error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Current password (rotate mode only) */}
      {mode === 'rotate' && (
        <div>
          <label className="block font-dm-sans text-xs text-body-slate mb-1">
            {pf.currentLabel}
          </label>
          <input
            type="password"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            autoComplete="current-password"
            disabled={formState === 'submitting'}
            className="w-full border border-warm-gray-800/[0.12] rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 disabled:opacity-50"
          />
        </div>
      )}

      {/* New password */}
      <div>
        <label className="block font-dm-sans text-xs text-body-slate mb-1">
          {pf.newLabel}
        </label>
        <input
          type="password"
          value={newPwd}
          onChange={(e) => {
            setNewPwd(e.target.value);
            if (formState === 'error') setFormState('idle');
          }}
          autoComplete="new-password"
          minLength={12}
          disabled={formState === 'submitting'}
          className="w-full border border-warm-gray-800/[0.12] rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 disabled:opacity-50"
        />
      </div>

      {/* Strength meter */}
      {newPwd.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-dm-sans text-xs text-archival-grey">{pf.strengthMeter}</span>
            <span
              className={`font-dm-sans text-xs ${
                strength <= 1
                  ? 'text-alert-garnet'
                  : strength === 2
                  ? 'text-caution-amber'
                  : strength === 3
                  ? 'text-info-blue'
                  : 'text-confirm-green'
              }`}
            >
              {strengthLabel}
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  bar <= strength ? STRENGTH_COLORS[strength] : 'bg-linen'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirm password */}
      <div>
        <label className="block font-dm-sans text-xs text-body-slate mb-1">
          {pf.confirmLabel}
        </label>
        <input
          type="password"
          value={confirmPwd}
          onChange={(e) => {
            setConfirmPwd(e.target.value);
            if (formState === 'error') setFormState('idle');
          }}
          autoComplete="new-password"
          minLength={12}
          disabled={formState === 'submitting'}
          className="w-full border border-warm-gray-800/[0.12] rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-clinical-teal/40 disabled:opacity-50"
        />
      </div>

      {/* Success / error feedback */}
      {formState === 'success' && (
        <div className="bg-confirm-green/10 border border-confirm-green rounded-md p-3">
          <p className="font-body text-sm text-confirm-green">{pf.success}</p>
        </div>
      )}
      {formState === 'error' && errorMsg && (
        <div className="bg-alert-garnet/10 border border-alert-garnet rounded-md p-3">
          <p className="font-body text-sm text-alert-garnet">{errorMsg}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={formState === 'submitting'}
        className="bg-clinical-teal text-white px-4 py-2 rounded-md font-dm-sans text-sm font-medium hover:bg-clinical-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {formState === 'submitting' ? pf.submitting : pf.submit}
      </button>
    </div>
  );
}
