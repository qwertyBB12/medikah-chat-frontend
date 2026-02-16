/**
 * Chat Page - Auth Gateway
 *
 * Unified auth gateway that routes users to their appropriate portal based on role:
 * - patient → /patients
 * - physician → /physicians/dashboard (if onboarded) or /physicians/onboard
 *
 * Supports Google, LinkedIn, and email/password authentication.
 * Uses the Splash component for consistent dark institutional look.
 * Bilingual: EN/ES detected from router.locale.
 */

import Head from 'next/head';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState, useRef } from 'react';
import Splash from '../components/Splash';

type PortalSelection = 'doctor' | 'patient' | null;

const t = {
  patientSignIn: { en: 'Patient sign in', es: 'Inicio de sesión — Paciente' },
  doctorSignIn: { en: 'Physician sign in', es: 'Inicio de sesión — Médico' },
  continueGoogle: { en: 'Continue with Google', es: 'Continuar con Google' },
  continueLinkedIn: { en: 'Continue with LinkedIn', es: 'Continuar con LinkedIn' },
  or: { en: 'or sign in with credentials', es: 'o inicie sesión con credenciales' },
  email: { en: 'Email', es: 'Correo electrónico' },
  password: { en: 'Password', es: 'Contraseña' },
  signIn: { en: 'Sign in', es: 'Iniciar sesión' },
  signingIn: { en: 'Signing in…', es: 'Iniciando sesión…' },
  errorCredentials: {
    en: 'Credentials not recognized. Please try again.',
    es: 'Credenciales no reconocidas. Intente de nuevo.',
  },
} as const;

type Lang = 'en' | 'es';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const lang: Lang = router.locale?.startsWith('es') ? 'es' : 'en';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [portalSelection, setPortalSelection] = useState<PortalSelection>(null);

  // Check for role query param (from landing page CTAs)
  const initialRoleRef = useRef(false);
  useEffect(() => {
    if (initialRoleRef.current) return;
    initialRoleRef.current = true;
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    if (role === 'physician' || role === 'doctor') {
      setPortalSelection('doctor');
      setShowLoginForm(true);
    } else if (role === 'patient') {
      setPortalSelection('patient');
      setShowLoginForm(true);
    }
  }, []);

  // Track the portal selection for redirect after session updates
  const pendingRedirectRef = useRef<PortalSelection>(null);

  // Redirect authenticated users to their portal
  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user) {
      if (pendingRedirectRef.current) {
        const redirect = pendingRedirectRef.current === 'doctor' ? '/physicians/onboard' : '/patients';
        pendingRedirectRef.current = null;
        router.replace(redirect);
      } else {
        const role = session.user.role || 'patient';
        const redirect = role === 'physician' ? '/physicians' : `/${role}s`;
        router.replace(redirect);
      }
    }
  }, [session, status, router]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    pendingRedirectRef.current = portalSelection;

    const result = await signIn('credentials', { redirect: false, email, password });
    setIsSubmitting(false);

    if (result?.error) {
      pendingRedirectRef.current = null;
      setLoginError(t.errorCredentials[lang]);
      return;
    }
  };

  const handleSocialSignIn = (provider: 'google' | 'linkedin') => {
    const callbackUrl = portalSelection === 'doctor' ? '/physicians/onboard' : '/patients';
    signIn(provider, { callbackUrl });
  };

  // Show loading while checking auth or redirecting
  if (status === 'loading' || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-gray-900">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-white/30 rounded-full animate-typingBounce" />
          <span className="w-2 h-2 bg-white/30 rounded-full animate-typingBounce [animation-delay:0.2s]" />
          <span className="w-2 h-2 bg-white/30 rounded-full animate-typingBounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  const heading = portalSelection === 'doctor'
    ? t.doctorSignIn[lang]
    : t.patientSignIn[lang];

  const loginPanel = showLoginForm ? (
    <div className="font-dm-sans bg-warm-gray-900/80 rounded-sm p-6 space-y-5 text-white mb-8">
      <h3 className="text-base font-semibold tracking-wide">
        {heading}
      </h3>

      {/* Social login buttons */}
      <div className="space-y-2">
        {/* Google — available for both roles */}
        <button
          type="button"
          onClick={() => handleSocialSignIn('google')}
          className="font-dm-sans w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-[#3c4043] text-sm font-semibold tracking-wide rounded-sm hover:bg-white/90 transition"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t.continueGoogle[lang]}
        </button>

        {/* LinkedIn — only for physicians */}
        {portalSelection === 'doctor' && (
          <button
            type="button"
            onClick={() => handleSocialSignIn('linkedin')}
            className="font-dm-sans w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0A66C2] text-white text-sm font-semibold tracking-wide rounded-sm hover:bg-[#004182] transition"
          >
            <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            {t.continueLinkedIn[lang]}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[11px] uppercase tracking-wider text-white/40">{t.or[lang]}</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs uppercase tracking-wider text-white/50">
            {t.email[lang]}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-dm-sans border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-none"
            placeholder="email@example.com"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs uppercase tracking-wider text-white/50">
            {t.password[lang]}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="font-dm-sans border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-none"
            placeholder="********"
            required
          />
        </div>
        {loginError && (
          <p className="font-dm-sans text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
            {loginError}
          </p>
        )}
        <button
          type="submit"
          className="font-dm-sans w-full px-4 py-3 font-semibold tracking-wide text-sm bg-warm-gray-900 text-white border border-white/20 hover:bg-clinical-teal hover:border-clinical-teal transition rounded-sm disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? t.signingIn[lang] : t.signIn[lang]}
        </button>
      </form>
    </div>
  ) : null;

  return (
    <>
      <Head>
        <title>Sign in — Medikah</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Splash
        onDoctorLogin={() => {
          setPortalSelection('doctor');
          setShowLoginForm(true);
          setLoginError(null);
        }}
        onPatientLogin={() => {
          setPortalSelection('patient');
          setShowLoginForm(true);
          setLoginError(null);
        }}
        loginPanel={loginPanel}
      />
    </>
  );
}
