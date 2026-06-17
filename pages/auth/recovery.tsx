/**
 * /auth/recovery — Physician workspace password recovery (Phase 18, AUTH-07, FLOW-05)
 *
 * Replaces the Phase-16 placeholder (D-13) with a real two-channel recovery flow.
 *
 * Flow:
 *   chooser → (a) magic-link → link-sent  (neutral confirmation)
 *          → (b) Google re-auth → verifying → password → complete → /chat
 *   ?token=... on load → verifying → password → complete → /chat
 *
 * Security contract (D-03 / D-04 / D-05):
 *   - Magic-link channel: POSTs email to request-link, shows neutral message on
 *     ANY response (non-enumeration — D-05). Link is always sent to the email
 *     on file; we never reveal whether a record exists.
 *   - Google re-auth: NextAuth Google sign-in, then POST to google-verify which
 *     enforces exact email match against physicians.email on file (D-05).
 *   - Password set: enforces ≥12-char + ≥3-of-4 character class policy (SC2).
 *     After success the doctor signs in at /chat with the new password and
 *     must still pass the TOTP gate (D-04 — 2FA is NOT re-enrolled here).
 *   - Raw token is NEVER passed to analytics or console.
 *
 * Design: mirrors pages/auth/activate/[token].tsx shell verbatim — same
 * Práctikah lockup, white card, footer, brand colors, radii.
 * Typography: font-body (Mulish) for labels/buttons, font-heading (Oswald) for display.
 * Colors: inst-blue, clinical-teal, body-slate.
 * Radii: rounded-lg (24px), rounded-xl (32px) per tailwind.config.js.
 * Bilingual: all strings in EN/ES via router.locale.
 */

import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { LOGO_DARK_SRC } from '../../lib/assets';
import { checkPassword } from '../../lib/passwordPolicy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecoveryStatus =
  | 'chooser'     // initial channel selection
  | 'link-sent'   // magic link dispatched — neutral message (non-enumeration)
  | 'verifying'   // token being validated (magic-link landed or Google callback)
  | 'password'    // set-new-password step
  | 'complete'    // password set — redirect pending
  | 'error';      // generic error state

// ---------------------------------------------------------------------------
// Bilingual copy
// ---------------------------------------------------------------------------

const COPY = {
  en: {
    pageTitle: 'Account Recovery — Práctikah',
    tagline: 'Physician Network',
    // Chooser step
    heading: 'Recover Your Workspace Access',
    sub: 'Choose how to verify your identity:',
    channelMagicLink: 'Send magic link to my recovery email',
    channelGoogle: 'Verify with Google',
    emailLabel: 'Your recovery email address',
    emailPlaceholder: 'doctor@example.com',
    channelOr: 'or',
    // Link-sent step
    linkSentHeading: 'Check Your Inbox',
    linkSentSub:
      'If an account is on file for that email, a recovery link is on its way. Check your inbox — the link is valid for 30 minutes.',
    linkSentNote:
      'No email? Check your spam folder or try again in a moment.',
    backToChooser: 'Try a different method',
    // Verifying step
    verifying: 'Verifying your link...',
    // Password step
    passwordHeading: 'Set a New Medikah Password',
    passwordSub:
      'At least 12 characters, mixing at least 3 of: lowercase, uppercase, number, symbol.',
    passwordLabel: 'New password',
    passwordPlaceholder: 'At least 12 characters, with a mix',
    passwordSubmit: 'Set Password',
    passwordLengthError: 'Password must be at least 12 characters.',
    passwordMixError: 'Use at least 3 of: lowercase, uppercase, number, symbol.',
    // Complete step
    completeHeading: 'Password Updated',
    completeSub:
      'Your Medikah workspace password has been reset. Your two-factor authentication is unchanged.',
    completeCta: 'Sign in to Práctikah',
    // Error step
    errorHeading: 'Recovery Link Invalid',
    errorSub: 'This link is not valid, has expired, or has already been used.',
    errorCta: 'Go to Sign In',
    // Generic
    loading: 'Please wait...',
    genericError: 'Something went wrong. Please try again.',
    // Footer note
    signInLink: 'Back to sign in',
  },
  es: {
    pageTitle: 'Recuperación de Cuenta — Práctikah',
    tagline: 'Red de Médicos',
    // Chooser step
    heading: 'Recupera el Acceso a Tu Espacio',
    sub: 'Elige cómo verificar tu identidad:',
    channelMagicLink: 'Enviar enlace mágico a mi correo de recuperación',
    channelGoogle: 'Verificar con Google',
    emailLabel: 'Tu correo electrónico de recuperación',
    emailPlaceholder: 'doctor@ejemplo.com',
    channelOr: 'o',
    // Link-sent step
    linkSentHeading: 'Revisa Tu Bandeja de Entrada',
    linkSentSub:
      'Si existe una cuenta con ese correo, un enlace de recuperación está en camino. El enlace es válido por 30 minutos.',
    linkSentNote:
      '¿No llega el correo? Revisa tu carpeta de spam o intenta de nuevo en un momento.',
    backToChooser: 'Probar otro método',
    // Verifying step
    verifying: 'Verificando tu enlace...',
    // Password step
    passwordHeading: 'Establece una Nueva Contraseña de Medikah',
    passwordSub:
      'Al menos 12 caracteres, combinando al menos 3 de: minúscula, mayúscula, número, símbolo.',
    passwordLabel: 'Nueva contraseña',
    passwordPlaceholder: 'Al menos 12 caracteres, combinados',
    passwordSubmit: 'Establecer contraseña',
    passwordLengthError: 'La contraseña debe tener al menos 12 caracteres.',
    passwordMixError: 'Usa al menos 3 de: minúscula, mayúscula, número, símbolo.',
    // Complete step
    completeHeading: 'Contraseña Actualizada',
    completeSub:
      'Tu contraseña del espacio de trabajo Medikah ha sido restablecida. Tu autenticación de dos factores no ha cambiado.',
    completeCta: 'Iniciar sesión en Práctikah',
    // Error step
    errorHeading: 'Enlace de Recuperación Inválido',
    errorSub: 'Este enlace no es válido, ha expirado o ya fue utilizado.',
    errorCta: 'Ir al Inicio de Sesión',
    // Generic
    loading: 'Por favor espera...',
    genericError: 'Algo salió mal. Por favor intenta de nuevo.',
    // Footer note
    signInLink: 'Volver al inicio de sesión',
  },
} as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function RecoveryPage() {
  const router = useRouter();
  const isEs = router.locale === 'es';
  const t = isEs ? COPY.es : COPY.en;

  const [status, setStatus] = useState<RecoveryStatus>('chooser');
  const [error, setError] = useState<string | null>(null);

  // Chooser step
  const [email, setEmail] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Password step — holds the recovery token (from URL param or Google verify)
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Mount: check for ?token= in URL (magic-link has landed)
  // Also check for ?google_recovery=1 (Google re-auth has returned)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!router.isReady) return;

    const { token, google_recovery } = router.query as {
      token?: string;
      google_recovery?: string;
    };

    if (token && typeof token === 'string') {
      // Magic-link token in URL — verify it server-side
      setStatus('verifying');
      setRecoveryToken(token);
      verifyMagicLinkToken(token);
    } else if (google_recovery === '1') {
      // Google re-auth has returned — call google-verify to exchange session for token
      setStatus('verifying');
      exchangeGoogleSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query]);

  // -------------------------------------------------------------------------
  // Verify magic-link token (advance to password form)
  // The server enforces consumed_at + expiry at set-password time.
  // We advance to 'password' immediately so the doctor can submit the form;
  // the API will return 410 if the token is expired/consumed on submit.
  // -------------------------------------------------------------------------

  const verifyMagicLinkToken = (_token: string) => {
    // Token present and structurally non-empty — advance to password step.
    // Server-side validation (signature + consumed_at + expiry) happens on form submit.
    setStatus('password');
  };

  // -------------------------------------------------------------------------
  // Exchange Google session for recovery token
  // -------------------------------------------------------------------------

  const exchangeGoogleSession = async () => {
    try {
      const res = await fetch('/api/auth/recovery/google-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = (await res.json()) as { token?: string };
        if (data.token) {
          setRecoveryToken(data.token);
          setStatus('password');
        } else {
          setStatus('error');
        }
      } else {
        setStatus('error');
        setError(t.genericError);
      }
    } catch {
      setStatus('error');
      setError(t.genericError);
    }
  };

  // -------------------------------------------------------------------------
  // Magic-link channel: send link to recovery email
  // -------------------------------------------------------------------------

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLinkLoading(true);

    try {
      // D-05: always show neutral "link-sent" message regardless of response
      await fetch('/api/auth/recovery/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Show the neutral link-sent message on ANY response (non-enumeration)
      setStatus('link-sent');
    } catch {
      // Even on network error show the neutral link-sent message
      setStatus('link-sent');
    } finally {
      setLinkLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Google re-auth channel: redirect to Google then return with ?google_recovery=1
  // -------------------------------------------------------------------------

  const handleGoogleVerify = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      // Use NextAuth signIn with Google, callbackUrl returns to this page with marker
      const baseUrl = window.location.origin;
      await signIn('google', {
        callbackUrl: `${baseUrl}/auth/recovery?google_recovery=1`,
      });
      // signIn navigates away; state here is moot
    } catch {
      setGoogleLoading(false);
      setError(t.genericError);
    }
  };

  // -------------------------------------------------------------------------
  // Password step submit
  // -------------------------------------------------------------------------

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side password policy check (SC2 — instant feedback)
    const pwCheck = checkPassword(password);
    if (pwCheck.reason === 'too_short') {
      setError(t.passwordLengthError);
      return;
    }
    if (pwCheck.reason === 'needs_mix') {
      setError(t.passwordMixError);
      return;
    }

    if (!recoveryToken) {
      setError(t.genericError);
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/recovery/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recoveryToken, password }),
      });

      if (res.ok) {
        setStatus('complete');
        // Direct to /chat after a brief pause — TOTP gate still fires on sign-in (D-04)
        setTimeout(() => {
          void router.push('/chat');
        }, 3000);
      } else if (res.status === 422) {
        const body = (await res.json().catch(() => ({}))) as { reason?: string };
        setError(body.reason === 'needs_mix' ? t.passwordMixError : t.passwordLengthError);
      } else if (res.status === 410) {
        setStatus('error');
        setError(t.errorSub);
      } else {
        setError(t.genericError);
      }
    } catch {
      setError(t.genericError);
    } finally {
      setPasswordLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      <Head>
        <title>{t.pageTitle}</title>
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
              {t.tagline}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">

            {/* chooser — two-channel selection */}
            {status === 'chooser' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-inst-blue mb-2">{t.heading}</h2>
                  <p className="text-body-slate text-sm">{t.sub}</p>
                </div>

                {/* Magic-link channel */}
                <form onSubmit={handleRequestLink} className="space-y-3 mb-4">
                  <div>
                    <label htmlFor="recovery-email" className="block text-sm font-medium text-inst-blue mb-1">
                      {t.emailLabel}
                    </label>
                    <input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent outline-none transition-all"
                      placeholder={t.emailPlaceholder}
                      required
                      autoComplete="email"
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={linkLoading}
                    className="w-full py-3 bg-clinical-teal text-white font-semibold rounded-lg hover:bg-clinical-teal/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {linkLoading ? t.loading : t.channelMagicLink}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative flex items-center my-5">
                  <div className="flex-grow border-t border-gray-100" />
                  <span className="mx-3 text-xs text-body-slate/50 uppercase tracking-wider">{t.channelOr}</span>
                  <div className="flex-grow border-t border-gray-100" />
                </div>

                {/* Google re-auth channel */}
                <button
                  onClick={handleGoogleVerify}
                  disabled={googleLoading}
                  className="w-full py-3 border border-gray-200 bg-white text-inst-blue font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {googleLoading ? (
                    <span>{t.loading}</span>
                  ) : (
                    <>
                      {/* Google G icon */}
                      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>{t.channelGoogle}</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* link-sent — neutral confirmation (D-05 non-enumeration) */}
            {status === 'link-sent' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0L9.75 14.5" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">{t.linkSentHeading}</h2>
                <p className="text-body-slate text-sm mb-4">{t.linkSentSub}</p>
                <p className="text-xs text-body-slate/60 mb-6">{t.linkSentNote}</p>
                <button
                  onClick={() => {
                    setStatus('chooser');
                    setError(null);
                  }}
                  className="text-clinical-teal text-sm font-semibold hover:underline"
                >
                  {t.backToChooser}
                </button>
              </div>
            )}

            {/* verifying — brief loading state */}
            {status === 'verifying' && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2 text-body-slate mb-4">
                  <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse [animation-delay:0.4s]" />
                </div>
                <p className="text-body-slate">{t.verifying}</p>
              </div>
            )}

            {/* password — set new Medikah password (reuses activate password-set UX) */}
            {status === 'password' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-inst-blue mb-2">{t.passwordHeading}</h2>
                  <p className="text-body-slate text-sm">{t.passwordSub}</p>
                </div>

                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-inst-blue mb-1">
                      {t.passwordLabel}
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent outline-none transition-all"
                      placeholder={t.passwordPlaceholder}
                      minLength={12}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full py-3 bg-clinical-teal text-white font-semibold rounded-lg hover:bg-clinical-teal/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? t.loading : t.passwordSubmit}
                  </button>
                </form>
              </>
            )}

            {/* complete — password updated, direct to /chat for TOTP-gated sign-in (D-04) */}
            {status === 'complete' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">{t.completeHeading}</h2>
                <p className="text-body-slate mb-6">{t.completeSub}</p>
                <button
                  onClick={() => void router.push('/chat')}
                  className="w-full py-3 bg-inst-blue text-white font-semibold rounded-lg hover:bg-inst-blue/90 transition-colors"
                >
                  {t.completeCta}
                </button>
              </div>
            )}

            {/* error — generic; does not reveal which condition failed */}
            {status === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">{t.errorHeading}</h2>
                <p className="text-body-slate mb-6">{error ?? t.errorSub}</p>
                <button
                  onClick={() => void router.push('/chat')}
                  className="px-6 py-3 bg-inst-blue text-white font-semibold rounded-lg hover:bg-inst-blue/90 transition-colors"
                >
                  {t.errorCta}
                </button>
              </div>
            )}

          </div>

          {/* Footer — mirrors activate/[token].tsx exactly */}
          <div className="text-center text-[11px] text-body-slate/60 mt-6 space-y-1">
            <p>&copy; {new Date().getFullYear()} Medikah Corporation</p>
            <p>
              <Link href="/privacy" className="hover:text-body-slate transition">Privacy Policy</Link>
              <span className="mx-1.5">·</span>
              <Link href="/terms" className="hover:text-body-slate transition">Terms of Service</Link>
              <span className="mx-1.5">·</span>
              <Link href="/chat" className="hover:text-body-slate transition">{t.signInLink}</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
