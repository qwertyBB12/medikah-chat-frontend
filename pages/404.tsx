import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { LOGO_APP_ICON_SVG } from '../lib/assets';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Page Not Found — Medikah</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFB] text-deep-charcoal px-6">
        <Image
          src={LOGO_APP_ICON_SVG}
          alt="Medikah"
          width={64}
          height={64}
          className="w-16 h-16 rounded-[14px] mb-6"
        />
        <h1 className="text-inst-blue font-extrabold text-[48px] leading-none mb-2">404</h1>
        <p className="text-body-slate text-lg font-semibold mb-1">Page not found</p>
        <p className="text-archival-grey text-sm mb-8 text-center max-w-md">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-inst-blue text-white font-bold text-sm tracking-wide px-6 py-3 rounded-[10px] hover:bg-clinical-teal transition"
        >
          Back to Home
        </Link>
      </div>
    </>
  );
}
