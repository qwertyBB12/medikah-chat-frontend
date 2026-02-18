import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import { LOGO_SRC } from '../lib/assets';

interface SplashProps {
  onDoctorLogin?: () => void;
  onPatientLogin?: () => void;
  loginPanel?: ReactNode;
}

export default function Splash({
  onDoctorLogin,
  onPatientLogin,
  loginPanel,
}: SplashProps) {
  const portals = [
    { label: 'Patient', onClick: onPatientLogin },
    { label: 'Doctor', onClick: onDoctorLogin },
  ];

  return (
    <div
      className="relative min-h-screen flex flex-col justify-center px-6 py-16"
      style={{
        background: 'linear-gradient(180deg, #1B2A41 0%, #0D1520 100%)',
      }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <Image
            src={LOGO_SRC}
            alt=""
            width={320}
            height={320}
            priority
            className="w-14 h-auto sm:w-16 opacity-80"
          />
          <span className="font-body text-[1.5rem] sm:text-[1.75rem] font-medium tracking-[0.04em] lowercase text-white">
            medikah
          </span>
          <p className="font-body text-sm text-cream-400/60 leading-relaxed max-w-xs">
            Credentialed access only. Sign in with your authorized account.
          </p>
        </div>

        <div className="w-full space-y-1">
          {portals.map((portal) => (
            <button
              key={portal.label}
              type="button"
              onClick={portal.onClick}
              className="font-body w-full py-3.5 text-center text-base font-medium tracking-wide text-white/80 border-b border-white/10 transition hover:text-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 rounded-sm"
            >
              {portal.label}
            </button>
          ))}
        </div>

        {loginPanel && <div className="w-full text-left">{loginPanel}</div>}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 font-body text-[11px] text-cream-500/40">
          <span>&copy; {new Date().getFullYear()} Medikah Corporation</span>
          <span className="hidden sm:inline">&middot;</span>
          <div className="flex items-center gap-2">
            <Link href="/privacy" className="hover:text-cream-500/70 transition-colors">Privacy Policy</Link>
            <span>&middot;</span>
            <Link href="/terms" className="hover:text-cream-500/70 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
