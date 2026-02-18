import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const ROLES = [
  { value: 'patient', label: { en: 'Patient', es: 'Paciente' } },
  { value: 'doctor', label: { en: 'Physician', es: 'M\u00e9dico' } },
  { value: 'insurer', label: { en: 'Insurer', es: 'Asegurador' } },
  { value: 'employer', label: { en: 'Employer', es: 'Empleador' } },
] as const;

type Locale = 'en' | 'es';

export default function Waitlist() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'duplicate' | 'error'>('idle');
  const router = useRouter();
  const locale = (router.locale || 'en') as Locale;

  const t = {
    eyebrow: { en: 'Early access', es: 'Acceso anticipado' },
    heading: { en: 'Request early access', es: 'Solicitar acceso anticipado' },
    nameLabel: { en: 'Name', es: 'Nombre' },
    emailLabel: { en: 'Email', es: 'Correo electr\u00f3nico' },
    roleLabel: { en: 'I am a', es: 'Soy un/a' },
    selectPlaceholder: { en: 'Select', es: 'Seleccionar' },
    submit: { en: 'Submit', es: 'Enviar' },
    sending: { en: 'Sending\u2026', es: 'Enviando\u2026' },
    duplicate: { en: 'This email is already registered.', es: 'Este correo ya est\u00e1 registrado.' },
    errorMsg: { en: 'Something went wrong. Please try again.', es: 'Algo sali\u00f3 mal. Int\u00e9ntelo de nuevo.' },
    thankYou: { en: 'Thank you. We will be in touch.', es: 'Gracias. Estaremos en contacto.' },
    orGetStarted: { en: 'Or get started now', es: 'O comience ahora' },
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role) return;

    setStatus('sending');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });

      if (res.status === 409) {
        setStatus('duplicate');
      } else if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section id="early-access" className="bg-warm-gray-800 px-6 py-24 sm:py-32">
        <div className="max-w-md mx-auto text-center space-y-4">
          <p className="font-body text-lg text-white">
            {t.thankYou[locale]}
          </p>
          <Link
            href="/chat"
            className="inline-block mt-4 px-7 py-3.5 bg-teal-500 text-white font-body font-medium tracking-wide text-sm hover:bg-teal-600 transition-all duration-200 rounded-lg"
          >
            {t.orGetStarted[locale]}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section id="early-access" className="bg-warm-gray-800 px-6 py-24 sm:py-32">
      <div className="max-w-sm mx-auto">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-[2px] bg-teal-500/60" />
          <span className="font-body text-xs font-medium uppercase tracking-[0.15em] text-teal-400">
            {t.eyebrow[locale]}
          </span>
          <div className="w-10 h-[2px] bg-teal-500/60" />
        </div>

        <h2 className="font-heading text-xl tracking-wider text-white text-center mb-10 uppercase">
          {t.heading[locale]}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="wl-name" className="font-body text-xs text-white/40 uppercase tracking-wider">
              {t.nameLabel[locale]}
            </label>
            <input
              id="wl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-body bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-teal-400/60 rounded-lg"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="wl-email" className="font-body text-xs text-white/40 uppercase tracking-wider">
              {t.emailLabel[locale]}
            </label>
            <input
              id="wl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-body bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-teal-400/60 rounded-lg"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="wl-role" className="font-body text-xs text-white/40 uppercase tracking-wider">
              {t.roleLabel[locale]}
            </label>
            <select
              id="wl-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="font-body bg-white/5 border border-white/15 px-4 py-3 text-white focus:outline-none focus:border-teal-400/60 rounded-lg appearance-none"
              required
            >
              <option value="" disabled className="text-deep-charcoal">{t.selectPlaceholder[locale]}</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} className="text-deep-charcoal">
                  {r.label[locale]}
                </option>
              ))}
            </select>
          </div>

          {status === 'duplicate' && (
            <p className="font-body text-sm text-teal-400 text-center">
              {t.duplicate[locale]}
            </p>
          )}
          {status === 'error' && (
            <p className="font-body text-sm text-alert-garnet text-center">
              {t.errorMsg[locale]}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full px-4 py-3.5 bg-warm-gray-700 text-white font-body font-medium tracking-wide text-sm border border-white/20 hover:bg-teal-500 hover:border-teal-500 transition rounded-lg disabled:opacity-50"
          >
            {status === 'sending' ? t.sending[locale] : t.submit[locale]}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/chat"
            className="font-body text-sm text-teal-400 hover:text-teal-300 transition-colors duration-200 underline underline-offset-4"
          >
            {t.orGetStarted[locale]}
          </Link>
        </div>
      </div>
    </section>
  );
}
