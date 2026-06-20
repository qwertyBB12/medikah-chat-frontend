/**
 * TEMPORARY — Phase 21 icon-rail visual preview.
 *
 * The dashboard + homepage rails only render for a signed-in physician, and
 * netlify.app deploy previews can't run the auth round-trip. This unauthenticated
 * route renders the dashboard chrome (PortalLayout physician + rail) so the rail
 * can be eyeballed on the deploy preview before the single production deploy.
 *
 * Hard-gated: 404s on the production context (medikah.health). Remove this file
 * when Phase 21 merges. Not linked from anywhere.
 */

import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import PortalLayout from '../../components/PortalLayout';

export const getServerSideProps: GetServerSideProps = async () => {
  // Show only on non-production Netlify contexts (deploy-preview / branch-deploy).
  if (process.env.CONTEXT === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

function Card({ title }: { title: string }) {
  return (
    <div className="bg-linen-white rounded-[12px] border border-warm-gray-800/[0.06] p-6 shadow-sm">
      <h2 className="font-body font-semibold text-lg text-deep-charcoal mb-2">{title}</h2>
      <p className="font-body text-sm text-body-slate leading-relaxed">
        Placeholder content so the chrome has a body. The rail is the top-right element under review.
      </p>
    </div>
  );
}

export default function Phase21RailPreview() {
  return (
    <>
      <Head>
        <title>Phase 21 rail preview</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <PortalLayout
        portal="physician"
        onSignOut={() => undefined}
        headerTitle="Dashboard"
        activeSurface="dashboard"
        lang="en"
      >
        <div className="h-full overflow-y-auto">
          <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Profile Overview" />
              <Card title="Verification Status" />
            </div>
            <Card title="AI Diagnosis Tool" />
            <Card title="Patient Inquiries" />
          </div>
        </div>
      </PortalLayout>
    </>
  );
}
