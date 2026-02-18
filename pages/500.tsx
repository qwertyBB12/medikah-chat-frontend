import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { LOGO_APP_ICON_SVG } from '../lib/assets';

export default function Custom500() {
  return (
    <>
      <Head>
        <title>Server Error — Medikah</title>
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
        <h1 className="text-inst-blue font-extrabold text-[48px] leading-none mb-2">500</h1>
        <p className="text-body-slate text-lg font-semibold mb-1">Something went wrong</p>
        <p className="text-archival-grey text-sm mb-8 text-center max-w-md">
          We encountered an unexpected error. Our team has been notified and is working to fix it.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-block bg-deep-charcoal text-white font-bold text-sm tracking-wide px-6 py-3 rounded-[10px] hover:bg-body-slate transition"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-block bg-inst-blue text-white font-bold text-sm tracking-wide px-6 py-3 rounded-[10px] hover:bg-clinical-teal transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
