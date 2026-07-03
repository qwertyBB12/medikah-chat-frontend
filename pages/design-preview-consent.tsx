/**
 * Design preview for the consent-modal "Review Later" changes (PR #18).
 * Renders the REAL PhysicianConsentModal with mock props so the decline path
 * can be eyeballed on the Netlify deploy preview without an auth session.
 *
 * Query params: ?lang=en|es (default es) · ?title=Dr|Dra|none (default Dra)
 * Not served in production (Netlify CONTEXT guard).
 */
import { useRouter } from 'next/router';
import PhysicianConsentModal from '../components/PhysicianConsentModal';
import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.CONTEXT === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};

export default function DesignPreviewConsent() {
  const router = useRouter();
  const lang = router.query.lang === 'en' ? 'en' : 'es';
  const titleParam = router.query.title;
  const title =
    titleParam === 'none' ? null : titleParam === 'Dr' ? ('Dr' as const) : ('Dra' as const);

  return (
    <div className="min-h-screen bg-clinical-surface">
      <PhysicianConsentModal
        physicianId="design-preview"
        physicianName="María García Hernández"
        title={title}
        lang={lang}
        onComplete={() => console.log('[preview] onComplete')}
        onCancel={() => console.log('[preview] onCancel — Review Later')}
      />
    </div>
  );
}
