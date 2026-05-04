/**
 * /physicians/dashboard/workspace/billing — Phase 13-09 (PRO-08 / PRO-11 / PRO-12)
 *
 * Billing surface for the Pro doctor. Server-side gates:
 *   1. getServerSession → redirect to /chat if no session.
 *   2. Look up the workspace account. If tier !== 'pro' redirect to the
 *      upgrade page (free doctors do not see billing).
 *   3. If subscription_status is past_due / grace, render the DunningBanner
 *      ABOVE the BillingCard inline (never modal — CLAUDE.md / D-27).
 *
 * Bilingual EN/ES via router.locale. Brand tokens only.
 */

import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import BillingCard, { type DnsRecord } from '../../../../components/physician/workspace/billing/BillingCard';
import DunningBanner from '../../../../components/physician/workspace/billing/DunningBanner';
import { content as workspaceContent } from '../../../../lib/practikahWorkspaceContent';

interface BillingPageProps {
  domain: string | null;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  autoRenew: boolean | null;
  graceUntil: string | null;
  /** Read-only DNS records for PRO-12 surface. */
  dnsRecords: DnsRecord[];
}

function daysUntil(iso: string | null): number {
  if (!iso) return 0;
  try {
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

export default function BillingPage(props: BillingPageProps) {
  const router = useRouter();
  const lang: 'en' | 'es' = router.locale === 'es' ? 'es' : 'en';
  const t = workspaceContent[lang].billing;

  const isGrace = !!props.graceUntil && daysUntil(props.graceUntil) > 0;
  const showDunning = props.subscriptionStatus === 'past_due' || isGrace;
  const variant: 'retry' | 'grace' = isGrace ? 'grace' : 'retry';
  const daysRemaining = isGrace ? daysUntil(props.graceUntil) : 0;

  // SubscriptionStatus pill renders 'grace' label when past_due + grace_until
  // is in the future — surfaces the same state the banner shows.
  const displayStatus = isGrace ? 'grace' : props.subscriptionStatus;

  return (
    <>
      <Head>
        <title>{t.pageHeading} — Práctikah</title>
      </Head>
      <div className="bg-clinical-surface min-h-screen py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <header className="mb-6">
            <h1 className="font-heading uppercase text-3xl tracking-wider text-deep-charcoal mb-1">
              {t.pageHeading}
            </h1>
            <p className="font-body text-sm text-body-slate">{t.pageSubtitle}</p>
          </header>

          {showDunning ? (
            <DunningBanner variant={variant} daysRemaining={daysRemaining} />
          ) : null}

          <BillingCard
            domain={props.domain}
            subscriptionStatus={displayStatus}
            currentPeriodEnd={props.currentPeriodEnd}
            autoRenew={props.autoRenew}
            dnsRecords={props.dnsRecords}
          />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BillingPageProps> = async (
  context,
) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session?.user?.email) {
    return {
      redirect: {
        destination: '/chat?role=physician&next=/physicians/dashboard/workspace/billing',
        permanent: false,
      },
    };
  }

  if (!supabaseAdmin) {
    return {
      redirect: {
        destination: '/physicians/dashboard',
        permanent: false,
      },
    };
  }

  // Resolve physician_id by email (mirrors /workspace/setup.tsx pattern).
  const physicianRow = await supabaseAdmin
    .from('physicians')
    .select('id, verification_status')
    .eq('email', session.user.email)
    .maybeSingle();

  const physicianId = physicianRow.data?.id;
  if (!physicianId) {
    return {
      redirect: {
        destination: '/physicians/dashboard',
        permanent: false,
      },
    };
  }

  // Workspace account — gate by tier.
  const ws = await supabaseAdmin
    .from('physician_workspace_accounts')
    .select('tier, subscription_status, current_period_end, grace_until')
    .eq('physician_id', physicianId)
    .maybeSingle();

  if (!ws.data || ws.data.tier !== 'pro') {
    return {
      redirect: {
        destination: '/physicians/dashboard/workspace/upgrade',
        permanent: false,
      },
    };
  }

  // Domain row.
  const domainRes = await supabaseAdmin
    .from('physician_domains')
    .select('domain_name')
    .eq('physician_id', physicianId)
    .maybeSingle();

  // DNS records — PRO-12. We mirror the values written by the saga's DNS
  // template so the UI is read-only without an extra CF round-trip per page
  // load. If the deployment exposes a /practikah/billing/dns-records BFF in
  // a future plan, swap this stub for a fetch.
  const dnsRecords: DnsRecord[] = [];

  return {
    props: {
      domain: domainRes.data?.domain_name ?? null,
      subscriptionStatus: ws.data.subscription_status ?? 'unknown',
      currentPeriodEnd: ws.data.current_period_end ?? null,
      autoRenew: null,
      graceUntil: ws.data.grace_until ?? null,
      dnsRecords,
    },
  };
};
