/**
 * /auth/activate/[token] — Physician Workspace Activation Page
 *
 * Multi-step activation flow (AUTH-02 / AUTH-06):
 *   verifying → password → totp → complete → redirect to /physicians/dashboard
 *   (or) expired → self-service resend link (D-02)
 *   (or) error → generic error state
 *
 * Design: mirrors pages/physicians/setup.tsx shell verbatim (D-03: no new chrome).
 * Uses Práctikah lowercase wordmark on the linen-like background (brand-surface routing).
 * Typography: font-body (Mulish) for labels/buttons, font-heading (Oswald) for display.
 * Colors: inst-blue, clinical-teal, body-slate per design system.
 * Radii: rounded-lg (24px), rounded-xl (32px) per tailwind.config.js.
 *
 * Bilingual: all user-facing strings in EN/ES via router.locale.
 *
 * Security notes:
 *   - Raw token is NEVER passed to analytics or console.
 *   - On 'complete': router.push('/physicians/dashboard') — canonical-login enforcement
 *     is in 17-04 (mailcowImapProvider TOTP gate).
 */

import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { LOGO_DARK_SRC } from '../../../lib/assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActivationStatus =
  | 'verifying'
  | 'password'
  | 'totp'
  | 'complete'
  | 'error'
  | 'expired';

// ---------------------------------------------------------------------------
// Bilingual copy
// ---------------------------------------------------------------------------

const COPY = {
  en: {
    pageTitle: 'Set Up Your Workspace — Práctikah',
    tagline: 'Physician Network',
    verifying: 'Verifying your link...',
    // Password step
    passwordHeading: 'Create Your Password',
    passwordSub: 'Your Práctikah workspace password must be at least 12 characters.',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 12 characters',
    passwordSubmit: 'Continue',
    passwordLengthError: 'Password must be at least 12 characters.',
    // TOTP step
    totpHeading: 'Set Up Two-Factor Authentication',
    totpSub: 'Scan the QR code with your authenticator app, then enter the 6-digit code.',
    totpRecommendation: 'We recommend Duo Mobile. Authy and Google Authenticator also work.',
    totpCodeLabel: '6-Digit Code',
    totpCodePlaceholder: '000000',
    totpSubmit: 'Verify Code',
    totpInvalidError: 'Code not accepted. Please try again.',
    // Complete step
    completeHeading: 'Workspace Active',
    completeSub: 'Redirecting to your dashboard...',
    // Expired step
    expiredHeading: 'Link Expired',
    expiredSub: 'This activation link has expired.',
    resendButton: 'Send me a new link',
    resendSent: 'If your account is verified, a new link is on its way.',
    // Error step
    errorHeading: 'Link Invalid',
    errorSub: 'This link is not valid or has already been used.',
    errorCta: 'Go to Sign In',
    // Generic
    loading: 'Please wait...',
    genericError: 'Something went wrong. Please try again.',
  },
  es: {
    pageTitle: 'Configura Tu Espacio de Trabajo — Práctikah',
    tagline: 'Red de Médicos',
    verifying: 'Verificando tu enlace...',
    // Password step
    passwordHeading: 'Crea Tu Contraseña',
    passwordSub: 'Tu contraseña de Práctikah debe tener al menos 12 caracteres.',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Al menos 12 caracteres',
    passwordSubmit: 'Continuar',
    passwordLengthError: 'La contraseña debe tener al menos 12 caracteres.',
    // TOTP step
    totpHeading: 'Configura la Autenticación de Dos Factores',
    totpSub: 'Escanea el código QR con tu app de autenticación y luego ingresa el código de 6 dígitos.',
    totpRecommendation: 'Recomendamos Duo Mobile. Authy y Google Authenticator también funcionan.',
    totpCodeLabel: 'Código de 6 Dígitos',
    totpCodePlaceholder: '000000',
    totpSubmit: 'Verificar Código',
    totpInvalidError: 'Código no aceptado. Por favor intenta de nuevo.',
    // Complete step
    completeHeading: 'Espacio de Trabajo Activo',
    completeSub: 'Redirigiendo a tu tablero...',
    // Expired step
    expiredHeading: 'Enlace Expirado',
    expiredSub: 'Este enlace de activación ha expirado.',
    resendButton: 'Envíame un nuevo enlace',
    resendSent: 'Si tu cuenta está verificada, un nuevo enlace está en camino.',
    // Error step
    errorHeading: 'Enlace Inválido',
    errorSub: 'Este enlace no es válido o ya fue utilizado.',
    errorCta: 'Ir al Inicio de Sesión',
    // Generic
    loading: 'Por favor espera...',
    genericError: 'Algo salió mal. Por favor intenta de nuevo.',
  },
} as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ActivatePage() {
  const router = useRouter();
  const { token } = router.query as { token?: string };
  const isEs = router.locale === 'es';
  const t = isEs ? COPY.es : COPY.en;

  const [status, setStatus] = useState<ActivationStatus>('verifying');
  const [error, setError] = useState<string | null>(null);

  // Password step
  const [password, setPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // TOTP step
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);

  // Expired step
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // -------------------------------------------------------------------------
  // Mount: verify token
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!token) return; // router not ready yet

    (async () => {
      try {
        // Token is the [token] path param — NEVER log it
        const res = await fetch('/api/auth/activate/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          setStatus('password');
        } else if (res.status === 410) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    })();
  }, [token]);

  // -------------------------------------------------------------------------
  // Password step submit
  // -------------------------------------------------------------------------

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError(t.passwordLengthError);
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/activate/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        // Advance to TOTP step — on entry, fetch QR code
        await fetchTotpSetup();
      } else if (res.status === 422) {
        setError(t.passwordLengthError);
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
  // TOTP step: fetch QR code from server
  // -------------------------------------------------------------------------

  const fetchTotpSetup = async () => {
    try {
      const res = await fetch('/api/auth/activate/totp-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = (await res.json()) as { qrCodeDataUrl: string };
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setStatus('totp');
      } else {
        setError(t.genericError);
      }
    } catch {
      setError(t.genericError);
    }
  };

  // -------------------------------------------------------------------------
  // TOTP step submit
  // -------------------------------------------------------------------------

  const handleTotpEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTotpLoading(true);

    try {
      const res = await fetch('/api/auth/activate/totp-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, code: totpCode }),
      });

      if (res.ok) {
        setStatus('complete');
        // Redirect to dashboard — canonical login via Mailcow + TOTP now enforced (17-04)
        setTimeout(() => {
          router.push('/physicians/dashboard');
        }, 1500);
      } else if (res.status === 422) {
        setError(t.totpInvalidError);
        setTotpCode('');
      } else {
        setError(t.genericError);
      }
    } catch {
      setError(t.genericError);
    } finally {
      setTotpLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Expired step: self-service resend (D-02)
  // -------------------------------------------------------------------------

  const handleResend = async () => {
    setResendLoading(true);
    try {
      // POST the (expired) token to send-link — rate-limited, non-enumerating
      await fetch('/api/auth/activate/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      // Always show neutral message regardless of response (non-enumeration)
      setResendSent(true);
    } catch {
      setResendSent(true); // Neutral message even on network error
    } finally {
      setResendLoading(false);
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
          {/* Práctikah lowercase wordmark lockup — mirrors setup.tsx shell */}
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

            {/* verifying */}
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

            {/* password */}
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
                    <label htmlFor="password" className="block text-sm font-medium text-inst-blue mb-1">
                      {t.passwordLabel}
                    </label>
                    <input
                      id="password"
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

            {/* totp */}
            {status === 'totp' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-inst-blue mb-2">{t.totpHeading}</h2>
                  <p className="text-body-slate text-sm mb-2">{t.totpSub}</p>
                  <p className="text-xs text-body-slate/70">{t.totpRecommendation}</p>
                </div>

                {/* QR Code */}
                {qrCodeDataUrl && (
                  <div className="flex justify-center mb-6">
                    <div className="p-3 bg-white border border-gray-100 rounded-lg inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCodeDataUrl}
                        alt="TOTP QR Code"
                        width={200}
                        height={200}
                        className="block"
                      />
                    </div>
                  </div>
                )}

                <form onSubmit={handleTotpEnroll} className="space-y-4">
                  <div>
                    <label htmlFor="totp-code" className="block text-sm font-medium text-inst-blue mb-1">
                      {t.totpCodeLabel}
                    </label>
                    <input
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent outline-none transition-all text-center text-lg tracking-widest font-mono"
                      placeholder={t.totpCodePlaceholder}
                      autoComplete="one-time-code"
                      required
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={totpLoading || totpCode.length < 6}
                    className="w-full py-3 bg-clinical-teal text-white font-semibold rounded-lg hover:bg-clinical-teal/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {totpLoading ? t.loading : t.totpSubmit}
                  </button>
                </form>
              </>
            )}

            {/* complete */}
            {status === 'complete' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">{t.completeHeading}</h2>
                <p className="text-body-slate">{t.completeSub}</p>
              </div>
            )}

            {/* expired */}
            {status === 'expired' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">{t.expiredHeading}</h2>
                <p className="text-body-slate mb-6">{t.expiredSub}</p>

                {resendSent ? (
                  <p className="text-sm text-body-slate bg-gray-50 rounded-lg p-4">
                    {t.resendSent}
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="px-6 py-3 bg-clinical-teal text-white font-semibold rounded-lg hover:bg-clinical-teal/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? t.loading : t.resendButton}
                  </button>
                )}
              </div>
            )}

            {/* error */}
            {status === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">{t.errorHeading}</h2>
                <p className="text-body-slate mb-6">{error || t.errorSub}</p>
                <button
                  onClick={() => router.push('/chat')}
                  className="px-6 py-3 bg-inst-blue text-white font-semibold rounded-lg hover:bg-inst-blue/90 transition-colors"
                >
                  {t.errorCta}
                </button>
              </div>
            )}

          </div>

          {/* Footer — mirrors setup.tsx exactly */}
          <div className="text-center text-[11px] text-body-slate/60 mt-6 space-y-1">
            <p>&copy; {new Date().getFullYear()} Medikah Corporation</p>
            <p>
              <Link href="/privacy" className="hover:text-body-slate transition">Privacy Policy</Link>
              <span className="mx-1.5">·</span>
              <Link href="/terms" className="hover:text-body-slate transition">Terms of Service</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
