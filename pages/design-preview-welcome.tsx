/**
 * Design preview for the dashboard welcome card (PR #19).
 * Renders the REAL DashboardWelcomeCard in both locales with mock props so it
 * can be eyeballed on the Netlify deploy preview without an auth session.
 * Not served in production (Netlify CONTEXT guard).
 */
import DashboardWelcomeCard from '../components/physician/DashboardWelcomeCard';
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.CONTEXT === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

export default function DesignPreviewWelcome() {
  return (
    <div className="min-h-screen bg-clinical-surface px-4 sm:px-6 py-10 space-y-8 max-w-5xl mx-auto">
      <p className="font-body text-sm text-archival-grey">
        Preview — Español (dismiss ✕ persists per physician via localStorage; reload to
        confirm it stays hidden, clear site data to reset)
      </p>
      <DashboardWelcomeCard
        physicianId="design-preview-es"
        lang="es"
        onGoToTab={(tab) => console.log('[preview] goToTab:', tab)}
      />
      <p className="font-body text-sm text-archival-grey">Preview — English</p>
      <DashboardWelcomeCard
        physicianId="design-preview-en"
        lang="en"
        onGoToTab={(tab) => console.log('[preview] goToTab:', tab)}
      />
    </div>
  );
}
