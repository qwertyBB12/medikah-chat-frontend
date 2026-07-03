/**
 * First-visit orientation card for a not-yet-verified doctor (journey-audit
 * P2). The dashboard already states the status; this card answers the three
 * questions a brand-new doctor actually has — what is happening, what can I
 * do meanwhile, and what arrives when verification completes — so the
 * pending window reads as progress, not silence.
 *
 * Shown only while verification_status !== 'verified'. Dismissible;
 * dismissal is remembered per physician in localStorage.
 */
import { useCallback, useEffect, useState } from 'react';

interface DashboardWelcomeCardProps {
  physicianId: string | null;
  lang: 'en' | 'es';
  onGoToTab: (tab: 'credentials' | 'availability' | 'profile') => void;
}

const copy = {
  en: {
    heading: 'Welcome to Medikah',
    sub: 'Here is what happens next — and what you can do today.',
    dismiss: 'Dismiss',
    steps: [
      {
        title: 'Verification in progress (2–5 business days)',
        body: 'Our team reviews your credentials manually. Nothing else is needed from you.',
      },
      {
        title: 'In the meantime',
        body: 'Complete your credentials, set your availability, and get your public profile ready.',
      },
      {
        title: 'Once verified',
        body: 'You receive your @medikah.health activation email and your profile goes live for patients.',
      },
    ],
    actions: {
      credentials: 'Complete credentials',
      availability: 'Set availability',
      profile: 'Prepare public profile',
    },
  },
  es: {
    heading: 'Le damos la bienvenida a Medikah',
    sub: 'Esto es lo que sigue — y lo que puede hacer hoy.',
    dismiss: 'Cerrar',
    steps: [
      {
        title: 'Verificación en curso (2 a 5 días hábiles)',
        body: 'Nuestro equipo revisa sus credenciales manualmente. No necesita hacer nada más.',
      },
      {
        title: 'Mientras tanto',
        body: 'Complete sus credenciales, configure su disponibilidad y prepare su perfil público.',
      },
      {
        title: 'Al ser verificado',
        body: 'Recibirá su correo de activación @medikah.health y su perfil se publicará para pacientes.',
      },
    ],
    actions: {
      credentials: 'Completar credenciales',
      availability: 'Configurar disponibilidad',
      profile: 'Preparar perfil público',
    },
  },
} as const;

function dismissKey(physicianId: string | null): string {
  return `medikah_dash_welcome_dismissed_${physicianId ?? 'anon'}`;
}

export default function DashboardWelcomeCard({
  physicianId,
  lang,
  onGoToTab,
}: DashboardWelcomeCardProps) {
  const t = copy[lang];
  // Start hidden until localStorage is read — avoids a flash for doctors who
  // already dismissed it (SSR-safe: localStorage only exists client-side).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(dismissKey(physicianId)) !== '1');
    } catch {
      setVisible(true);
    }
  }, [physicianId]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(dismissKey(physicianId), '1');
    } catch {
      // Private mode etc. — card simply reappears next visit.
    }
  }, [physicianId]);

  if (!visible) return null;

  return (
    <div className="bg-linen rounded-md border border-warm-gray-800/[0.06] p-6 shadow-sm relative">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t.dismiss}
        className="absolute top-4 right-4 font-body text-xs text-archival-grey hover:text-body-slate transition"
      >
        ✕
      </button>

      <h2 className="font-body font-semibold text-lg text-inst-blue pr-8">{t.heading}</h2>
      <p className="font-body text-sm text-body-slate mt-1 mb-5">{t.sub}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {t.steps.map((step, i) => (
          <div key={step.title} className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-clinical-teal text-white font-body text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="font-body text-sm font-semibold text-deep-charcoal leading-snug">
                {step.title}
              </p>
              <p className="font-body text-xs text-body-slate leading-relaxed mt-1">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        {(
          [
            { tab: 'credentials', label: t.actions.credentials },
            { tab: 'availability', label: t.actions.availability },
            { tab: 'profile', label: t.actions.profile },
          ] as const
        ).map(({ tab, label }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onGoToTab(tab)}
            className="font-body text-xs font-medium px-4 py-2 rounded-md bg-white text-clinical-teal border border-clinical-teal/30 hover:bg-clinical-teal/10 transition"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
