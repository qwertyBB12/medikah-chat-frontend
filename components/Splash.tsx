import Image from 'next/image';
import { ReactNode } from 'react';
import { LOGO_SRC, WORDMARK_SRC } from '../lib/assets';

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
    <div className="relative min-h-screen flex flex-col justify-center px-6 py-16 bg-inst-blue">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-12 text-center">
        <div className="flex flex-col items-center gap-5">
          <Image
            src={LOGO_SRC}
            alt="Medikah"
            width={320}
            height={320}
            priority
            className="w-16 h-auto sm:w-20"
          />
          <Image
            src={WORDMARK_SRC}
            alt="Medikah"
            width={480}
            height={180}
            className="w-36 h-auto sm:w-44"
          />
          <p className="font-dm-sans text-sm text-white/60 leading-relaxed max-w-xs">
            Credentialed access only. Sign in with your authorized account.
          </p>
        </div>

        <div className="w-full space-y-1">
          {portals.map((portal) => (
            <button
              key={portal.label}
              type="button"
              onClick={portal.onClick}
              className="font-dm-sans w-full py-3.5 text-center text-base font-semibold tracking-wide text-white/80 border-b border-white/10 transition hover:text-white hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinical-teal"
            >
              {portal.label}
            </button>
          ))}
        </div>

        {loginPanel && <div className="w-full text-left">{loginPanel}</div>}
      </div>
    </div>
  );
}
