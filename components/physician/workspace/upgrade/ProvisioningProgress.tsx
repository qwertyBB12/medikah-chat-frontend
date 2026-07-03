/**
 * ProvisioningProgress — Phase 13-07 (D-16, 3-minute live UX)
 *
 * Vercel-deploy-style stepped checklist consumer of the Server-Sent Events
 * stream at /api/practikah/upgrade/status?run_id=…
 *
 * Renders one of four states:
 *   1. in_progress           — animated checkmark cascade (default)
 *   2. completed             — green confirmation + "Visit my new site" CTA
 *   3. partial_finish_later  — warm bilingual finish-later message (D-15)
 *   4. failed_pre_por        — pre-POR failure (Stripe refunded)
 *
 * Per CLAUDE.md (frontend):
 *   - Brand tokens only; zero hex codes.
 *   - Bilingual via router.locale.
 *   - Mulish (font-body), Oswald (font-heading), DM Sans (font-dm-sans),
 *     DM Serif (font-dm-serif) per typography override.
 *
 * EventSource auto-reconnects on transient network blips by spec.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';

// Locked saga step order — mirrors PRO_SAGA_STEPS in
// medikah-chat-api/services/practikah/pro_saga.py (Phase 13-06).
const STEP_ORDER = [
  'pro.charge_confirmed',
  'pro.register_domain',
  'pro.write_dns',
  'pro.provision_mailcow_domain',
  'pro.provision_pro_mailbox',
  'pro.attach_saas_hostname',
  'pro.migrate_theme',
  'pro.verify_live',
] as const;

type SagaStep = (typeof STEP_ORDER)[number];
type StepStatus = 'pending' | 'running' | 'succeeded' | 'failed';
type RunOutcome =
  | 'in_progress'
  | 'completed'
  | 'failed_pre_por'
  | 'partial_finish_later';

interface SseMessage {
  event: string;
  step?: string;
  ts?: string;
  domain?: string | null;
  detail?: unknown;
}

export interface ProvisioningProgressProps {
  runId: string;
}

export default function ProvisioningProgress({
  runId,
}: ProvisioningProgressProps) {
  const router = useRouter();
  const lang: 'en' | 'es' = router.locale === 'es' ? 'es' : 'en';
  const t = workspaceContent[lang].upgrade.wizard.provisioning;

  const [stepStatuses, setStepStatuses] = useState<Record<SagaStep, StepStatus>>(
    () =>
      STEP_ORDER.reduce(
        (acc, s) => ({ ...acc, [s]: 'pending' as StepStatus }),
        {} as Record<SagaStep, StepStatus>,
      ),
  );
  const [outcome, setOutcome] = useState<RunOutcome>('in_progress');
  const [domain, setDomain] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    const es = new EventSource(
      `/api/practikah/upgrade/status?run_id=${encodeURIComponent(runId)}`,
    );

    es.onmessage = (e: MessageEvent<string>) => {
      let msg: SseMessage;
      try {
        msg = JSON.parse(e.data) as SseMessage;
      } catch {
        return;
      }

      // Step transitions — only update the cascade for known steps.
      if (typeof msg.step === 'string' && STEP_ORDER.includes(msg.step as SagaStep)) {
        const step = msg.step as SagaStep;
        if (msg.event === 'step.requested') {
          setStepStatuses((prev) => ({ ...prev, [step]: 'running' }));
        } else if (msg.event === 'step.succeeded') {
          setStepStatuses((prev) => ({ ...prev, [step]: 'succeeded' }));
        } else if (msg.event === 'step.failed') {
          setStepStatuses((prev) => ({ ...prev, [step]: 'failed' }));
        }
        // step.rollback_* events are ignored in the UI by design — the
        // terminal run.* event is the source of truth for final state.
      }

      // Terminal run events — close the stream.
      if (msg.event === 'run.succeeded') {
        setOutcome('completed');
        setDomain(msg.domain ?? null);
        es.close();
      } else if (msg.event === 'run.failed') {
        setOutcome('failed_pre_por');
        es.close();
      } else if (msg.event === 'run.partial_finish_later') {
        setOutcome('partial_finish_later');
        es.close();
      } else if (msg.event === 'run.timeout' || msg.event === 'run.not_found') {
        // Treat ambiguous terminations as finish-later — doctor's domain is
        // safe and the email + dashboard will reflect the real terminal
        // state once the saga reconciles.
        setOutcome('partial_finish_later');
        es.close();
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on transient network blips per the
      // HTML5 spec; only manual close on real errors. Leave the connection
      // open so the doctor doesn't lose the live UX on a Wi-Fi hiccup.
    };

    return () => {
      es.close();
    };
  }, [runId]);

  // -------------------------------------------------------------------------
  // Terminal renderings
  // -------------------------------------------------------------------------

  if (outcome === 'completed') {
    const visitHref = domain ? `https://${domain}` : '#';
    return (
      <div
        className="bg-confirm-green/10 rounded-md p-6 max-w-2xl mx-auto"
        data-testid="provisioning-completed"
      >
        <h2 className="font-heading uppercase text-2xl tracking-wider text-inst-blue mb-3">
          {t.completedHeadline}
        </h2>
        {domain ? (
          <p className="font-body text-sm text-body-slate mb-4">{domain}</p>
        ) : null}
        <a
          href={visitHref}
          className="inline-block bg-clinical-teal text-white font-dm-sans font-medium px-6 py-3 rounded-md hover:bg-clinical-teal/90"
          data-testid="provisioning-completed-cta"
        >
          {t.completedCta}
        </a>
      </div>
    );
  }

  if (outcome === 'partial_finish_later') {
    return (
      <div
        className="bg-caution-amber/20 border border-caution-amber rounded-md p-6 max-w-2xl mx-auto"
        data-testid="provisioning-finish-later"
      >
        <h2 className="font-heading uppercase text-2xl tracking-wider text-deep-charcoal mb-3">
          {t.finishLaterHeadline}
        </h2>
        <p className="font-body text-sm text-body-slate leading-relaxed">
          {t.finishLaterBody}
        </p>
      </div>
    );
  }

  if (outcome === 'failed_pre_por') {
    return (
      <div
        className="bg-alert-garnet/10 rounded-md p-6 max-w-2xl mx-auto"
        data-testid="provisioning-failed-pre-por"
      >
        <h2 className="font-heading uppercase text-2xl tracking-wider text-alert-garnet mb-3">
          {t.failedPreporHeadline}
        </h2>
        <p className="font-body text-sm text-body-slate">
          {t.failedPreporBody}
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // In-progress stepped checklist
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-2xl mx-auto" data-testid="provisioning-in-progress">
      <h2 className="font-heading uppercase text-2xl tracking-wider text-inst-blue mb-2">
        {t.headline}
      </h2>
      <p className="font-body text-sm text-body-slate mb-6">{t.subhead}</p>
      <ol className="space-y-3" role="list">
        {STEP_ORDER.map((step) => {
          const status = stepStatuses[step];
          const label = t.steps[step];
          // Use semantic glyphs (not emojis) — these read in any locale.
          const icon =
            status === 'succeeded'
              ? '✓'
              : status === 'running'
                ? '…'
                : status === 'failed'
                  ? '×'
                  : '○';
          const iconColor =
            status === 'succeeded'
              ? 'text-confirm-green'
              : status === 'running'
                ? 'text-clinical-teal'
                : status === 'failed'
                  ? 'text-alert-garnet'
                  : 'text-archival-grey';
          const labelColor =
            status === 'pending' ? 'text-archival-grey' : 'text-deep-charcoal';
          return (
            <li
              key={step}
              className="flex items-center gap-3 font-body"
              data-testid={`step-${step}`}
              data-status={status}
            >
              <span
                className={`${iconColor} font-dm-sans font-bold w-6 inline-flex justify-center`}
                aria-hidden="true"
              >
                {icon}
              </span>
              <span className={labelColor}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
