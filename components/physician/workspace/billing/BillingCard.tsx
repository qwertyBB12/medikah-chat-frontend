/**
 * BillingCard — Phase 13-09 (PRO-08 / PRO-11 / PRO-12)
 *
 * Workspace billing surface. Composed of:
 *   1. Header: SubscriptionStatus pill + custom domain.
 *   2. Manage billing button → opens Stripe Customer Portal via
 *      /api/practikah/billing/portal-link BFF (T-12-07-06 — relative path).
 *   3. DNS records (PRO-12 read-only): rendered from a `dnsRecords` prop
 *      that the page fetches server-side. Self-service editor deferred to
 *      v1.3 per the deferred backlog.
 *   4. Transfer-out section (PRO-11): button + confirm dialog. POSTs to
 *      /api/practikah/billing/transfer-out and surfaces the EPP code on
 *      success with copy-to-clipboard.
 *
 * Bilingual EN/ES, brand tokens only. Inline only — no Modal / Dialog /
 * fixed-overlay components per CLAUDE.md.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';
import SubscriptionStatus from './SubscriptionStatus';

export interface DnsRecord {
  type: string; // 'A' | 'CNAME' | 'MX' | 'TXT' | 'SRV'
  name: string;
  value: string;
  ttl?: number | null;
  priority?: number | null;
}

export interface BillingCardProps {
  domain: string | null;
  subscriptionStatus: string;
  currentPeriodEnd?: string | null;
  autoRenew?: boolean | null;
  /** Read-only DNS records (PRO-12). Empty array hides the section. */
  dnsRecords?: DnsRecord[];
}

export default function BillingCard({
  domain,
  subscriptionStatus,
  currentPeriodEnd,
  autoRenew,
  dnsRecords = [],
}: BillingCardProps) {
  const router = useRouter();
  const lang: 'en' | 'es' = router.locale === 'es' ? 'es' : 'en';
  const t = workspaceContent[lang].billing;

  const [openingPortal, setOpeningPortal] = useState(false);
  const [transferState, setTransferState] = useState<
    | { status: 'idle' }
    | { status: 'confirm' }
    | { status: 'pending' }
    | { status: 'success'; eppCode: string; domain: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' });
  const [eppCopied, setEppCopied] = useState(false);

  async function openPortal(): Promise<void> {
    if (openingPortal) return;
    setOpeningPortal(true);
    try {
      const r = await fetch('/api/practikah/billing/portal-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await r.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      console.error('[BillingCard] portal-link returned no url', data);
    } catch (err) {
      console.error('[BillingCard] portal-link fetch failed', err);
    } finally {
      setOpeningPortal(false);
    }
  }

  async function confirmTransferOut(): Promise<void> {
    setTransferState({ status: 'pending' });
    try {
      const r = await fetch('/api/practikah/billing/transfer-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await r.json();
      if (r.ok && data?.epp_code) {
        setTransferState({
          status: 'success',
          eppCode: data.epp_code,
          domain: data.domain || domain || '',
        });
        return;
      }
      setTransferState({
        status: 'error',
        message: data?.detail || data?.error || t.transferOutErrorGeneric,
      });
    } catch (err) {
      console.error('[BillingCard] transfer-out fetch failed', err);
      setTransferState({ status: 'error', message: t.transferOutErrorGeneric });
    }
  }

  async function copyEpp(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setEppCopied(true);
      setTimeout(() => setEppCopied(false), 2000);
    } catch (err) {
      console.error('[BillingCard] clipboard write failed', err);
    }
  }

  return (
    <div
      className="bg-white rounded-md shadow-sm p-6 mb-6"
      data-testid="billing-card"
    >
      {/* 1. Header: status + domain */}
      <div className="flex flex-col gap-2 mb-4">
        <SubscriptionStatus
          subscriptionStatus={subscriptionStatus}
          currentPeriodEnd={currentPeriodEnd}
          autoRenew={autoRenew}
        />
        {domain ? (
          <p className="font-body text-sm text-body-slate">
            <span className="text-archival-grey">{t.domainLabel}: </span>
            <span className="text-deep-charcoal font-medium">{domain}</span>
          </p>
        ) : null}
      </div>

      {/* 2. Manage billing CTA → Stripe Customer Portal */}
      <div className="mb-6">
        <button
          type="button"
          onClick={openPortal}
          disabled={openingPortal}
          className="bg-clinical-teal hover:bg-clinical-teal/90 text-white font-dm-sans font-medium px-5 py-2 rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {t.manageBillingCta}
        </button>
      </div>

      {/* 3. DNS records (PRO-12 read-only) */}
      {dnsRecords.length > 0 ? (
        <div className="border-t border-clinical-surface pt-4 mb-6">
          <h3 className="font-heading uppercase text-sm tracking-wider text-deep-charcoal mb-2">
            {t.dnsRecordsHeading}
          </h3>
          <p className="font-body text-xs text-body-slate mb-3 max-w-xl">
            {t.dnsRecordsHelp}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="text-archival-grey uppercase tracking-wider">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Value</th>
                  <th className="py-2 pr-4">TTL</th>
                </tr>
              </thead>
              <tbody>
                {dnsRecords.map((r, i) => (
                  <tr key={`${r.type}-${r.name}-${i}`} className="border-t border-clinical-surface">
                    <td className="py-2 pr-4 text-deep-charcoal font-medium">{r.type}</td>
                    <td className="py-2 pr-4 text-body-slate font-mono">{r.name}</td>
                    <td className="py-2 pr-4 text-body-slate font-mono break-all">{r.value}</td>
                    <td className="py-2 pr-4 text-archival-grey">{r.ttl ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* 4. Transfer-out (PRO-11) */}
      {domain ? (
        <div className="border-t border-clinical-surface pt-4">
          <h3 className="font-heading uppercase text-sm tracking-wider text-deep-charcoal mb-2">
            {t.transferOutHeading}
          </h3>
          <p className="font-body text-sm text-body-slate mb-3 max-w-xl">
            {t.transferOutBody}
          </p>

          {transferState.status === 'idle' ? (
            <button
              type="button"
              onClick={() => setTransferState({ status: 'confirm' })}
              className="bg-white border border-inst-blue text-inst-blue hover:bg-inst-blue hover:text-white font-dm-sans font-medium px-5 py-2 rounded-md text-sm transition-colors"
            >
              {t.transferOutCta}
            </button>
          ) : null}

          {transferState.status === 'confirm' ? (
            <div className="bg-linen p-4 rounded-md max-w-xl">
              <p className="font-body text-sm text-deep-charcoal mb-3">
                {t.transferOutConfirm}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmTransferOut}
                  className="bg-inst-blue hover:bg-inst-blue/90 text-white font-dm-sans font-medium px-5 py-2 rounded-md text-sm transition-colors"
                >
                  {t.transferOutCta}
                </button>
                <button
                  type="button"
                  onClick={() => setTransferState({ status: 'idle' })}
                  className="text-body-slate hover:text-deep-charcoal font-dm-sans text-sm transition-colors"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : null}

          {transferState.status === 'pending' ? (
            <p className="font-body text-sm text-body-slate">
              {lang === 'es' ? 'Generando código…' : 'Generating code…'}
            </p>
          ) : null}

          {transferState.status === 'success' ? (
            <div className="bg-confirm-green/10 border border-confirm-green/40 rounded-md p-4 max-w-xl">
              <p className="font-body text-sm text-deep-charcoal mb-3">
                {t.transferOutSuccess}
              </p>
              <div className="bg-white rounded-md p-3 mb-3">
                <p className="font-body text-xs text-archival-grey uppercase tracking-wider mb-1">
                  {t.eppLabel}
                </p>
                <p className="font-mono text-base text-deep-charcoal break-all">
                  {transferState.eppCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyEpp(transferState.eppCode)}
                className="bg-inst-blue hover:bg-inst-blue/90 text-white font-dm-sans font-medium px-4 py-2 rounded-md text-sm transition-colors"
              >
                {eppCopied ? t.eppCopiedLabel : t.eppCopyCta}
              </button>
            </div>
          ) : null}

          {transferState.status === 'error' ? (
            <div className="bg-alert-garnet/10 border border-alert-garnet/40 rounded-md p-4 max-w-xl">
              <p className="font-body text-sm text-deep-charcoal">
                {transferState.message}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
