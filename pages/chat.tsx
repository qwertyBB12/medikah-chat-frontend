/**
 * Chat Page - Auth Gateway
 *
 * Unified auth gateway that routes users to their appropriate portal based on role:
 * - patient → /patients
 * - physician → /physicians/dashboard (if onboarded) or /physicians/onboard
 *
 * Supports Google and email/password authentication (Phase 18 Plan 02: decision 40 removed
 * a third social provider that was previously here).
 * Uses the Splash component for consistent dark institutional look.
 * Bilingual: EN/ES detected from router.locale.
 */

import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState, useRef } from 'react';
import Splash from '../components/Splash';
import { MAILCOW_ERROR_COPY } from '../lib/auth/mailcowErrorCopy';
import { LOGO_DARK_SRC } from '../lib/assets';

type PortalSelection = 'doctor' | 'patient' | null;

const t = {
  patientSignIn: { en: 'Patient sign in', es: 'Inicio de sesión — Paciente' },
  doctorSignIn: { en: 'Physician sign in', es: 'Inicio de sesión — Médico' },
  continueGoogle: { en: 'Continue with Google', es: 'Continuar con Google' },
  or: { en: 'or sign in with credentials', es: 'o inicie sesión con credenciales' },
  email: { en: 'Email', es: 'Correo electrónico' },
  password: { en: 'Password', es: 'Contraseña' },
  signIn: { en: 'Sign in', es: 'Iniciar sesión' },
  signingIn: { en: 'Signing in…', es: 'Iniciando sesión…' },
  errorCredentials: {
    en: 'Credentials not recognized. Please try again.',
    es: 'Credenciales no reconocidas. Intente de nuevo.',
  },
  // Phase 16 D-12 locked copy — single source of truth lives in
  // lib/auth/mailcowErrorCopy.ts. The string never reveals which side was wrong;
  // every failure outcome (bad_password, unknown_user, locked_out, infra_error)
  // surfaces this exact text.
  errorMailcow: MAILCOW_ERROR_COPY.errorMailcow,
  recoveryLink: { en: 'Account recovery', es: 'Recuperación de cuenta' },
  medikahEmailTab: {
    en: 'Sign in with Medikah email',
    es: 'Inicia sesión con correo Medikah',
  },
  medikahEmailHint: {
    en: 'Use your @medikah.health mailbox.',
    es: 'Usa tu buzón @medikah.health.',
  },
  // Phase 17 — login-time TOTP second-factor prompt (17-04 gate)
  totpHeading: { en: 'Two-step verification', es: 'Verificación en dos pasos' },
  totpHint: {
    en: 'Enter the 6-digit code from Duo Mobile (or your authenticator app).',
    es: 'Ingresa el código de 6 dígitos de Duo Mobile (o tu aplicación de autenticación).',
  },
  totpCodeLabel: { en: '6-digit code', es: 'Código de 6 dígitos' },
  totpVerify: { en: 'Verify', es: 'Verificar' },
  totpVerifying: { en: 'Verifying…', es: 'Verificando…' },
  totpError: { en: 'Invalid code. Please try again.', es: 'Código no válido. Intenta de nuevo.' },
  totpReauth: {
    en: 'Code verified. Please sign in once more to continue.',
    es: 'Código verificado. Inicia sesión una vez más para continuar.',
  },
  // Phase 18 Plan 04 — D-01: Demotion wall copy.
  // A graduated physician (workspace activated) who signs in via Google or original
  // email-password sees this threshold screen instead of the dashboard.
  // Tone is graduation, not error: "your workspace is ready."
  demotionWallHeading: {
    en: 'Your Workspace Is Ready',
    es: 'Tu espacio de trabajo está listo',
  },
  demotionWallBody: {
    en: 'Use your Medikah email and password to continue. Your @medikah.health mailbox, calendar, and dashboard are waiting.',
    es: 'Usa tu correo y contraseña de Medikah para continuar. Tu buzón @medikah.health, calendario y tablero te esperan.',
  },
  demotionWallCta: {
    en: 'Sign in with Medikah credentials',
    es: 'Iniciar sesión con credenciales Medikah',
  },
  demotionWallRecovery: {
    en: 'Forgot your Medikah password?',
    es: '¿Olvidaste tu contraseña de Medikah?',
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
  // Phase 16 — separate Mailcow physician form so the existing patient/legacy
  // Credentials path stays untouched.
  const [mailcowEmail, setMailcowEmail] = useState('');
  const [mailcowPassword, setMailcowPassword] = useState('');
  const [isMailcowSubmitting, setIsMailcowSubmitting] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [portalSelection, setPortalSelection] = useState<PortalSelection>(null);
  // Phase 17 — TOTP second-factor step (server returned a needs_totp session)
  const [totpCode, setTotpCode] = useState('');
  const [isTotpSubmitting, setIsTotpSubmitting] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  // Phase 18 Plan 04 — D-01: demotion wall state.
  // True when session.user.bootstrap_demoted=true (server set in jwt() callback).
  const [showDemotionWall, setShowDemotionWall] = useState(false);
  // Phase 18 Plan 04 — D-02: graduated-device cookie hint.
  // True when mk_physician_graduated cookie is present — reorders physician pane
  // so Medikah-password form is primary. Polish only, not an enforcement boundary.
  const [isGraduatedDevice, setIsGraduatedDevice] = useState(false);
  const demotionLoggedRef = useRef(false);

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

  // Phase 18 Plan 04 — D-02: Read the mk_physician_graduated cookie on mount.
  // Reorders the physician pane (Medikah-password primary, Google as "recover access").
  // Client-side only; cookie is set after a successful mailcow-imap login.
  useEffect(() => {
    const graduated = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith('mk_physician_graduated='));
    setIsGraduatedDevice(graduated);
  }, []);

  // Track the portal selection for redirect after session updates
  const pendingRedirectRef = useRef<PortalSelection>(null);

  // Redirect authenticated users to their portal
  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user) {
      // Phase 17 — a needs_totp session is NOT signed in: hold for the TOTP
      // prompt, never redirect (the claimless session would route to
      // onboarding as if the physician were a new user).
      if (session.user.needs_totp) {
        pendingRedirectRef.current = null;
        return;
      }

      // Phase 18 Plan 04 — D-01: Bootstrap-demotion wall.
      // A graduated physician (activation_complete=true) who signed in via Google
      // or their original email-password gets this flag from the server (set in
      // jwt() callback). We render the wall — never route to the dashboard.
      // The wall is the terminal state for this bootstrap session.
      if (session.user.bootstrap_demoted === true) {
        pendingRedirectRef.current = null;
        setShowDemotionWall(true);
        return;
      }

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

  const handleMailcowSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsMailcowSubmitting(true);
    setLoginError(null);

    pendingRedirectRef.current = 'doctor';

    const result = await signIn('mailcow-imap', {
      redirect: false,
      email: mailcowEmail,
      password: mailcowPassword,
    });
    setIsMailcowSubmitting(false);

    if (!result || result.error) {
      // D-05 — single locked string on every failure outcome
      // (bad_password, unknown_user, locked_out, infra_error). No per-outcome
      // branching in the UI.
      pendingRedirectRef.current = null;
      setLoginError(t.errorMailcow[lang]);
      return;
    }
    // Phase 18 Plan 04 — D-02: Set the graduated-device cookie after a successful
    // mailcow-imap login. On the next visit to /chat this cookie reorders the
    // physician pane (Medikah-password primary, Google as "recover access").
    // This is polish only — the wall in jwt() carries the enforcement guarantee.
    document.cookie = 'mk_physician_graduated=1; max-age=31536000; path=/; SameSite=Lax; Secure';
    // Password accepted. The session may come back needs_totp — drop the login
    // form so the TOTP step (gated on !showLoginForm) can render instead of
    // silently re-showing this form over the held session.
    setShowLoginForm(false);
  };

  const handleSocialSignIn = (provider: 'google') => {
    const callbackUrl = portalSelection === 'doctor' ? '/physicians/onboard' : '/patients';
    signIn(provider, { callbackUrl });
  };

  // Phase 17 — verify the 6-digit code server-side, then re-invoke signIn.
  // The provider consults its own login_2fa audit trail (2-minute window) and
  // returns the full claim set — the client never asserts totp_verified.
  const handleTotpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user?.physician_id) return;
    setIsTotpSubmitting(true);
    setTotpError(null);

    const verifyRes = await fetch('/api/auth/activate/totp-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ physician_id: session.user.physician_id, code: totpCode }),
    });

    if (!verifyRes.ok) {
      setIsTotpSubmitting(false);
      setTotpError(t.totpError[lang]);
      return;
    }

    // Code accepted — re-run the credential sign-in so the server can upgrade
    // the session. Requires the password still in memory; if the page was
    // reloaded mid-flow, ask for one more sign-in instead.
    if (!mailcowEmail || !mailcowPassword) {
      setIsTotpSubmitting(false);
      setPortalSelection('doctor');
      setShowLoginForm(true);
      setLoginError(t.totpReauth[lang]);
      return;
    }

    const result = await signIn('mailcow-imap', {
      redirect: false,
      email: mailcowEmail,
      password: mailcowPassword,
    });
    setIsTotpSubmitting(false);

    if (!result || result.error) {
      setTotpError(t.totpError[lang]);
      return;
    }
    // Session refresh with full claims triggers the redirect effect.
  };

  // Phase 18 Plan 04 — D-01: Bootstrap-demotion wall.
  // A graduated physician who signed in via Google or original email-password sees
  // this branded threshold screen instead of the dashboard. Tone is graduation,
  // not error: "your workspace is ready." The wall is the terminal state for this
  // bootstrap session — no redirect to /physicians/dashboard is ever issued.
  // Wall design mirrors pages/auth/activate/[token].tsx (Práctikah lockup + white card).
  if (showDemotionWall) {
    // Post audit with full IP/UA on wall mount (jwt() audit lacked request context)
    if (!demotionLoggedRef.current) {
      demotionLoggedRef.current = true;
      fetch('/api/auth/demotion-log', { method: 'POST' }).catch(() => {/* best-effort */});
    }

    return (
      <>
        <Head>
          <title>Sign in — Práctikah</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB] px-4">
          <div className="w-full max-w-md">
            {/* Práctikah lowercase wordmark lockup — mirrors activate/[token].tsx */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <Image
                src={LOGO_DARK_SRC}
                alt=""
                width={320}
                height={320}
                priority
                className="w-12 h-auto opacity-70"
              />
              <span className="font-body text-[1.5rem] font-medium tracking-[0.04em] lowercase text-inst-blue">
                práctikah
              </span>
              <p className="text-sm text-clinical-teal font-semibold uppercase tracking-wider">
                {lang === 'es' ? 'Red de Médicos' : 'Physician Network'}
              </p>
            </div>

            {/* White card */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              {/* Key icon — graduation feel */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-inst-blue mb-2">
                  {t.demotionWallHeading[lang]}
                </h2>
                <p className="font-body text-body-slate text-sm leading-relaxed">
                  {t.demotionWallBody[lang]}
                </p>
              </div>

              {/* Primary CTA — deep link to Medikah-password form */}
              <button
                type="button"
                onClick={() => {
                  setShowDemotionWall(false);
                  setPortalSelection('doctor');
                  setShowLoginForm(true);
                  setLoginError(null);
                }}
                className="font-body w-full py-3 bg-clinical-teal text-white font-semibold rounded-xl hover:bg-clinical-teal/90 transition-colors mb-3 text-sm tracking-wide"
              >
                {t.demotionWallCta[lang]}
              </button>

              {/* Secondary — forgot Medikah password */}
              <div className="text-center">
                <Link
                  href="/auth/recovery"
                  className="font-body text-xs text-body-slate/70 underline hover:text-clinical-teal transition-colors"
                >
                  {t.demotionWallRecovery[lang]}
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[11px] text-body-slate/60 mt-6 space-y-1">
              <p>&copy; {new Date().getFullYear()} Medikah Corporation</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Phase 17 — second-factor step: the server returned a needs_totp session
  // (password verified, TOTP outstanding). Render the code prompt instead of
  // redirecting. If the page was reloaded mid-flow (no password in memory),
  // showLoginForm falls through to the regular panel with the reauth message.
  if (session?.user?.needs_totp && !showLoginForm) {
    return (
      <>
        <Head>
          <title>Sign in — Medikah</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-warm-gray-900 px-4">
          <div className="font-dm-sans bg-warm-gray-900/80 border border-white/10 rounded-sm p-6 space-y-5 text-white w-full max-w-sm">
            <h3 className="text-base font-semibold tracking-wide">{t.totpHeading[lang]}</h3>
            <p className="font-body text-xs text-white/50">{t.totpHint[lang]}</p>
            <form onSubmit={handleTotpSubmit} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="totp-code" className="font-body text-xs uppercase tracking-wider text-white/50">
                  {t.totpCodeLabel[lang]}
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 tracking-[0.4em] text-center focus:outline-none focus:border-clinical-teal rounded-sm"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>
              {totpError && (
                <p className="font-dm-sans text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
                  {totpError}
                </p>
              )}
              <button
                type="submit"
                className="font-body w-full px-4 py-3 font-semibold tracking-wide text-sm bg-clinical-teal text-white border border-clinical-teal hover:bg-clinical-teal/90 transition rounded-sm disabled:opacity-50"
                disabled={isTotpSubmitting || totpCode.length !== 6}
              >
                {isTotpSubmitting ? t.totpVerifying[lang] : t.totpVerify[lang]}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // Show loading while checking auth or redirecting.
  // Exclude: TOTP-pending sessions (held for code prompt) and demoted sessions
  // (held for wall render) — both are handled above and should not show the spinner.
  if (status === 'loading' || (session && !session.user?.needs_totp && !showDemotionWall)) {
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

      {/* Phase 18 Plan 04 — D-02: On a graduated device (mk_physician_graduated cookie
          present), the Medikah-password form is primary. Google is demoted to a small
          "recover access" link. On a fresh device, normal order applies.
          Cookie is polish-only; the wall in jwt() carries the enforcement guarantee. */}

      {/* Phase 16 — Medikah-email (Mailcow IMAP) sign-in. Physician tab only.
          Shown FIRST on graduated devices (D-02), after Google on fresh devices. */}
      {portalSelection === 'doctor' && isGraduatedDevice && (
        <div className="space-y-3">
          <p className="font-body text-xs text-white/50">{t.medikahEmailHint[lang]}</p>
          <form onSubmit={handleMailcowSignIn} className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mailcow-email" className="font-body text-xs uppercase tracking-wider text-white/50">
                {t.email[lang]}
              </label>
              <input
                id="mailcow-email"
                type="email"
                value={mailcowEmail}
                onChange={(e) => setMailcowEmail(e.target.value)}
                className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-sm"
                placeholder="you@medikah.health"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mailcow-password" className="font-body text-xs uppercase tracking-wider text-white/50">
                {t.password[lang]}
              </label>
              <input
                id="mailcow-password"
                type="password"
                value={mailcowPassword}
                onChange={(e) => setMailcowPassword(e.target.value)}
                className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-sm"
                placeholder="********"
                required
              />
            </div>
            <button
              type="submit"
              className="font-body w-full px-4 py-3 font-semibold tracking-wide text-sm bg-clinical-teal text-white border border-clinical-teal hover:bg-clinical-teal/90 transition rounded-sm disabled:opacity-50"
              disabled={isMailcowSubmitting}
            >
              {isMailcowSubmitting ? t.signingIn[lang] : t.medikahEmailTab[lang]}
            </button>
            {loginError && (
              <p className="font-body text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
                {loginError}
              </p>
            )}
          </form>
          {/* Google demoted to small "recover access" link on graduated devices */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => handleSocialSignIn('google')}
              className="font-body text-xs text-white/40 underline hover:text-white/70 transition"
            >
              {t.continueGoogle[lang]}
            </button>
          </div>
        </div>
      )}

      {/* Social login buttons — shown for non-graduated devices or non-doctor portals */}
      {!(portalSelection === 'doctor' && isGraduatedDevice) && (
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
        </div>
      )}

      {/* Phase 16 — Medikah-email (Mailcow IMAP) sign-in. Physician tab only.
          Added per D-03 two-identity lifecycle. Shown in standard order on fresh devices. */}
      {portalSelection === 'doctor' && !isGraduatedDevice && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="font-body text-[11px] uppercase tracking-wider text-white/50">
              {t.medikahEmailTab[lang]}
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <p className="font-body text-xs text-white/50">{t.medikahEmailHint[lang]}</p>
          <form onSubmit={handleMailcowSignIn} className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mailcow-email" className="font-body text-xs uppercase tracking-wider text-white/50">
                {t.email[lang]}
              </label>
              <input
                id="mailcow-email"
                type="email"
                value={mailcowEmail}
                onChange={(e) => setMailcowEmail(e.target.value)}
                className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-sm"
                placeholder="you@medikah.health"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mailcow-password" className="font-body text-xs uppercase tracking-wider text-white/50">
                {t.password[lang]}
              </label>
              <input
                id="mailcow-password"
                type="password"
                value={mailcowPassword}
                onChange={(e) => setMailcowPassword(e.target.value)}
                className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-sm"
                placeholder="********"
                required
              />
            </div>
            <button
              type="submit"
              className="font-body w-full px-4 py-3 font-semibold tracking-wide text-sm bg-clinical-teal text-white border border-clinical-teal hover:bg-clinical-teal/90 transition rounded-sm disabled:opacity-50"
              disabled={isMailcowSubmitting}
            >
              {isMailcowSubmitting ? t.signingIn[lang] : t.medikahEmailTab[lang]}
            </button>
            {loginError && (
              <p className="font-body text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
                {loginError}
              </p>
            )}
          </form>
        </div>
      )}

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
          <div className="space-y-2">
            <p className="font-dm-sans text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
              {loginError}
            </p>
            {/* Phase 16 D-13 — placeholder recovery link; real flow ships in
                Phase 18 (FLOW-01, FLOW-05). */}
            <div className="text-center">
              <Link
                href="/auth/recovery"
                className="font-body text-xs text-white/60 underline hover:text-clinical-teal"
              >
                {t.recoveryLink[lang]}
              </Link>
            </div>
          </div>
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
