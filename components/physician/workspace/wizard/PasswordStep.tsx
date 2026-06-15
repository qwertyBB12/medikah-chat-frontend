/**
 * Phase 12 Plan 12-01: PasswordStep
 *
 * Wizard Step 3 — Doctor sets their mailbox password (min 12 chars).
 * Includes 4-bar strength meter and inline "why separate password" explanation.
 *
 * Per FREE-04 / ProvisionRequest.mailbox_password = Field(min_length=12).
 * T-12-01-04: password is NEVER logged (no console.log of value).
 *
 * All copy from practikahWorkspaceContent.ts. Brand-only colors and radii.
 */

import { useState } from 'react';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';
import { checkPassword } from '../../../../lib/passwordPolicy';

interface PasswordStepProps {
  lang: SupportedLang;
  onSubmit: (password: string) => void;
  isSubmitting: boolean;
  submitError?: string | null;
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

export default function PasswordStep({
  lang,
  onSubmit,
  isSubmitting,
  submitError,
}: PasswordStepProps) {
  const t = workspaceContent[lang];

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const strength = computeStrength(password);

  const strengthLabel = [
    t.wizard.password.strengthWeak,   // 0
    t.wizard.password.strengthWeak,   // 1
    t.wizard.password.strengthFair,   // 2
    t.wizard.password.strengthGood,   // 3
    t.wizard.password.strengthStrong, // 4
  ][strength];

  const handleSubmit = () => {
    const pwCheck = checkPassword(password);
    if (pwCheck.reason === 'too_short') {
      setValidationError(t.wizard.password.tooShort);
      return;
    }
    if (pwCheck.reason === 'needs_mix') {
      setValidationError(t.wizard.password.needsMix);
      return;
    }
    if (password !== confirm) {
      setValidationError(t.wizard.password.mismatch);
      return;
    }
    setValidationError(null);
    onSubmit(password);
  };

  const error = submitError || validationError;

  return (
    <div className="bg-white border-l-4 border-clinical-teal rounded-[12px] shadow-[0_1px_3px_rgba(27,42,65,0.06),0_8px_24px_rgba(27,42,65,0.04)] p-6 my-4">
      <h3 className="font-body font-bold text-lg text-deep-charcoal mb-1">
        {t.wizard.password.title}
      </h3>
      <p className="font-body text-sm text-body-slate mb-6">
        {t.wizard.password.subtitle}
      </p>

      {/* Why separate password explanation */}
      <div className="bg-linen rounded-md p-4 mb-6">
        <p className="font-body text-sm text-body-slate leading-relaxed">
          {t.wizard.password.whyExplain}
        </p>
      </div>

      {/* Password input */}
      <div className="mb-4">
        <label className="block font-dm-sans text-xs text-body-slate mb-1">
          {t.wizard.password.label}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={12}
          autoComplete="new-password"
          className="w-full border border-warm-gray-800/[0.12] rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
        />
      </div>

      {/* Strength meter */}
      {password.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-dm-sans text-xs text-archival-grey">
              {t.wizard.password.strengthMeter}
            </span>
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
      <div className="mb-6">
        <label className="block font-dm-sans text-xs text-body-slate mb-1">
          {t.wizard.password.confirmLabel}
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={12}
          autoComplete="new-password"
          className="w-full border border-warm-gray-800/[0.12] rounded-md px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-clinical-teal/40"
        />
      </div>

      {error && (
        <p className="font-body text-sm text-alert-garnet mb-4">{error}</p>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit}
        className="w-full bg-inst-blue text-white py-3 rounded-md font-dm-sans font-medium text-sm hover:bg-inst-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? t.wizard.password.submitting : t.wizard.password.submit}
      </button>
    </div>
  );
}
