import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface ProfileLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  jsonLd?: Record<string, unknown>;
}

export default function ProfileLayout({ children, title, description, jsonLd }: ProfileLayoutProps) {
  const router = useRouter();
  const isEs = router.locale === 'es';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </Head>

      <header className="bg-white border-b border-border-line">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-inst-blue font-bold text-xl tracking-tight">
            Medikah
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-body-slate">
            <Link href="/" className="hover:text-clinical-teal transition-colors">
              {isEs ? 'Inicio' : 'Home'}
            </Link>
            <Link href="/physicians" className="hover:text-clinical-teal transition-colors">
              {isEs ? 'Para Médicos' : 'For Physicians'}
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-white border-t border-border-line">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-archival-grey">
          <p>&copy; {new Date().getFullYear()} Medikah Corporation. {isEs ? 'Todos los derechos reservados.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-clinical-teal transition-colors">
              {isEs ? 'Política de Privacidad' : 'Privacy Policy'}
            </Link>
            <Link href="/terms" className="hover:text-clinical-teal transition-colors">
              {isEs ? 'Términos de Servicio' : 'Terms of Service'}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
