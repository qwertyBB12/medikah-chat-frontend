/**
 * Phase 12 Plan 12-01: OnboardingWizard
 *
 * 3-step wizard state machine for Práctikah workspace onboarding:
 *   'title' → 'local-part' → 'password' → 'completing' → 'completed'
 *
 * On PasswordStep submit, calls /api/practikah/wizard/complete (BFF → FastAPI saga).
 * On 200, transitions to 'completed' and renders CompletionScreen.
 * On error, surfaces inline alert and returns to 'password' step.
 *
 * Per plan: NO forwardRef or useImperativeHandle (simpler than PhysicianOnboardingAgent).
 * All copy from practikahWorkspaceContent.ts. Brand-only colors and radii.
 */

import { useState } from 'react';
import type { SupportedLang } from '../../../../lib/i18n';
import { content as workspaceContent, format as fmt } from '../../../../lib/practikahWorkspaceContent';
import TitlePicker from './TitlePicker';
import LocalPartPicker from './LocalPartPicker';
import PasswordStep from './PasswordStep';
import CompletionScreen from './CompletionScreen';

export type WizardStep = 'title' | 'local-part' | 'password' | 'completing' | 'completed';

interface OnboardingWizardProps {
  physicianId: string;
  lang: SupportedLang;
  accessToken: string | null;
  physicianFullName: string;
  physicianFirstName: string;
  physicianMiddleName?: string;
  physicianLastName: string;
  physicianMaternalLastName?: string;
  slug: string;
}

interface CompletionData {
  mailboxAddress: string;
  mailboxPassword: string;
  slug: string;
}

const STEP_NUMBER: Record<WizardStep, number> = {
  'title': 1,
  'local-part': 2,
  'password': 3,
  'completing': 3,
  'completed': 3,
};

export default function OnboardingWizard({
  physicianId,
  lang,
  accessToken,
  physicianFullName: _physicianFullName,
  physicianFirstName,
  physicianMiddleName,
  physicianLastName,
  physicianMaternalLastName,
  slug,
}: OnboardingWizardProps) {
  const t = workspaceContent[lang];

  const [step, setStep] = useState<WizardStep>('title');
  const [title, setTitle] = useState<'Dr' | 'Dra' | null>(null);
  const [localPart, setLocalPart] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTitleSubmit = (chosenTitle: 'Dr' | 'Dra') => {
    setTitle(chosenTitle);
    // Best-effort: persist title to FastAPI (fire-and-forget; errors don't block wizard)
    if (accessToken) {
      fetch('/api/practikah/wizard/title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title: chosenTitle }),
      }).catch(() => {
        // non-blocking — local state already has the value
      });
    }
    setStep('local-part');
  };

  const handleLocalPartSubmit = (chosenLocalPart: string) => {
    setLocalPart(chosenLocalPart);
    setStep('password');
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!title || !localPart) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setStep('completing');

    try {
      const res = await fetch('/api/practikah/wizard/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          title,
          mailbox_local_part: localPart,
          mailbox_password: password,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          success: boolean;
          mailbox_address?: string;
          slug?: string;
        };
        setCompletionData({
          mailboxAddress: data.mailbox_address || `${localPart}@medikah.health`,
          mailboxPassword: password,
          slug: data.slug || slug,
        });
        setStep('completed');
      } else {
        // Return to password step with error
        setStep('password');
        setSubmitError(t.wizard.password.submitError);
      }
    } catch {
      setStep('password');
      setSubmitError(t.wizard.password.submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepNumber = STEP_NUMBER[step];

  return (
    <div className="w-full">
      {/* Progress indicator */}
      {step !== 'completed' && (
        <div className="mb-6">
          {/* Step counter text */}
          <p className="font-dm-sans text-xs uppercase tracking-wide text-archival-grey mb-2">
            {fmt(t.wizard.progress, { n: String(currentStepNumber) })}
          </p>
          {/* 3-segment progress bar */}
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  n <= currentStepNumber ? 'bg-clinical-teal' : 'bg-linen'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step: Title picker */}
      {step === 'title' && (
        <TitlePicker lang={lang} onSubmit={handleTitleSubmit} />
      )}

      {/* Step: Local-part picker */}
      {(step === 'local-part') && title && (
        <LocalPartPicker
          lang={lang}
          title={title}
          firstName={physicianFirstName}
          middleName={physicianMiddleName}
          lastName={physicianLastName}
          maternalLastName={physicianMaternalLastName}
          accessToken={accessToken}
          onSubmit={handleLocalPartSubmit}
        />
      )}

      {/* Step: Password (also shown during 'completing' to preserve layout while awaiting) */}
      {(step === 'password' || step === 'completing') && (
        <PasswordStep
          lang={lang}
          onSubmit={handlePasswordSubmit}
          isSubmitting={isSubmitting || step === 'completing'}
          submitError={submitError}
        />
      )}

      {/* Step: Completion screen */}
      {step === 'completed' && completionData && (
        <CompletionScreen
          lang={lang}
          physicianId={physicianId}
          mailboxAddress={completionData.mailboxAddress}
          mailboxPassword={completionData.mailboxPassword}
          slug={completionData.slug}
          firstName={physicianFirstName}
        />
      )}
    </div>
  );
}
