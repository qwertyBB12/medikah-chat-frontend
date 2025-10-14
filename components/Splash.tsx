import Image from 'next/image';
import { ReactNode } from 'react';
import { ThemeKey } from '../lib/theme';
import { LOGO_SRC, WORDMARK_SRC } from '../lib/assets';

interface SplashProps {
  onDoctorLogin?: () => void;
  onInsuranceEmployers?: () => void;
  onPatientLogin?: () => void;
  onAdminAccess?: () => void;
  loginPanel?: ReactNode;
  onToggleTheme: () => void;
  theme: ThemeKey;
}

export default function Splash({
  onDoctorLogin,
  onInsuranceEmployers,
  onPatientLogin,
  onAdminAccess,
  loginPanel,
  onToggleTheme,
  theme
}: SplashProps) {
  const portals = [
    {
      label: 'Doctor',
      helper: 'Colaboremos con el equipo de cuidado.',
      onClick: onDoctorLogin
    },
    {
      label: 'Insurance',
      helper: 'Construyamos beneficios con calidez.',
      onClick: onInsuranceEmployers
    },
    {
      label: 'Patient',
      helper: 'Cuéntanos qué sientes, vamos paso a paso.',
      onClick: onPatientLogin
    },
    {
      label: 'Admin',
      helper: 'Coordina cada detalle con calma.',
      onClick: onAdminAccess
    }
  ];

  const isOcean = theme === 'ocean';
  const outerBackground = isOcean ? 'bg-[#1a7c8b]' : 'bg-[#b38382]';
  const toggleButtonClass = isOcean
    ? 'border border-white/40 text-white hover:bg-white/10'
    : 'border border-white/60 text-white hover:bg-white/10';
  const portalButtonClass = isOcean
    ? 'border-b border-white/40 text-white hover:text-white/95 focus-visible:outline-white/60'
    : 'border-b border-white/60 text-white hover:text-white/90 focus-visible:outline-white/60';
  const helperTextClass = 'text-white/80';
  const headlineTextClass = 'text-white';
  const copyTextClass = 'text-white/85';
  const toggleLabel = isOcean ? 'switch to warm mode' : 'switch to ocean mode';

  return (
    <div className={`relative min-h-screen flex flex-col justify-center px-6 py-12 ${outerBackground}`}>
      <div className="absolute top-6 right-6">
        <button
          onClick={onToggleTheme}
          className={`px-4 py-2 text-xs font-heading lowercase transition rounded-none ${toggleButtonClass}`}
        >
          {toggleLabel}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <Image src={LOGO_SRC} alt="Medikah emblem" width={320} height={320} priority className="w-16 h-auto sm:w-20" />
          <Image src={WORDMARK_SRC} alt="Medikah wordmark" width={480} height={180} className="w-40 h-auto sm:w-48" />
          <p className={`text-base leading-relaxed max-w-lg ${copyTextClass}`}>
            Hola, estás en buenas manos. Escoge cómo quieres ingresar y seguimos contigo con paciencia, atención y respeto.
          </p>
        </div>

        <div className="w-full space-y-2">
          {portals.map((portal) => (
            <button
              key={portal.label}
              type="button"
              onClick={portal.onClick}
              className={`w-full py-3 text-left sm:text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${portalButtonClass}`}
            >
              <span className={`block text-lg font-heading lowercase ${headlineTextClass}`}>{portal.label}</span>
              <span className={`block text-xs mt-1 ${helperTextClass}`}>{portal.helper}</span>
            </button>
          ))}
        </div>

        {loginPanel && <div className="w-full text-left">{loginPanel}</div>}
      </div>
    </div>
  );
}
