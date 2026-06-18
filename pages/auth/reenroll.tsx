/**
 * /auth/reenroll — Isolated TOTP Re-Enrollment Page
 *
 * Phase 18 CARRY-18-A / D-12 — the doctor-facing surface that closes the
 * lost-authenticator loop. After an admin approves a lost-2FA reset (which set
 * totp_enrolled=false on a still activation_complete=true account), the doctor
 * lands here to enroll a FRESH authenticator. This is the ONLY re-enrollment
 * path — mailcowImapProvider fails closed post-reset (no password-only session,
 * D-12 invariant), so this page is the doctor's exit from the limbo state.
 *
 * Self-gating two-step flow driven entirely by the existing isolated API:
 *   credentials → qr → confirm → done   (or) error
 *   - credentials: email + Mailcow password → POST /api/auth/reenroll/start
 *   - qr/confirm:  6-digit code           → POST /api/auth/reenroll/confirm
 *
 * Eligibility is enforced server-side (start/confirm return 403 not_eligible
 * unless activation_complete=true AND totp_enrolled=false). The page never
 * reveals account state beyond "an administrator must approve your reset first".
 *
 * Design: mirrors pages/auth/activate/[token].tsx shell verbatim (FAFAFB bg,
 * Práctikah lowercase wordmark lockup, white rounded-xl card, footer, noindex).
 * Typography: font-body (Mulish) labels/buttons; clinical-teal CTA;
 * alert-garnet errors; caution-amber warnings.
 *
 * Bilingual: all user-facing strings in EN/ES via router.locale.
 *
 * Security notes:
 *   - email/password are kept in component state across steps (confirm
 *     re-probes them) and are NEVER logged.
 */

import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { LOGO_DARK_SRC } from '../../lib/assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReenrollStep = 'credentials' | 'qr' | 'confirm' | 'done' | 'error';

// ---------------------------------------------------------------------------
// Bilingual copy
// ---------------------------------------------------------------------------

const COPY = {
  en: {
    pageTitle: 'Set Up a New Authenticator — Práctikah',
    tagline: 'Physician Network',
    // Credentials step
    credHeading: 'Set Up a New Authenticator',
    credSub: 'Your two-factor reset was approved. Sign in with your Práctikah email and password to enroll a fresh authenticator.',
    emailLabel: 'Práctikah Email',
    emailPlaceholder: 'you@medikah.health',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Your Práctikah password',
    credSubmit: 'Continue',
    // QR / confirm step
    qrHeading: 'Scan the New QR Code',
    qrSub: 'Scan the QR code with your authenticator app, then enter the 6-digit code.',
    qrRecommendation: 'We recommend Duo Mobile. Authy and Google Authenticator also work.',
    codeLabel: '6-Digit Code',
    codePlaceholder: '000000',
    codeSubmit: 'Verify & Finish',
    // Done step
    doneHeading: 'New Authenticator Active',
    doneSub: 'Redirecting you to sign in...',
    // Errors / states
    invalidCredentials: 'Email or password not recognized. Please check and try again.',
    notEligible: 'This page isn’t active for your account yet. An administrator must approve your reset request first. Once approved, return here to enroll a new authenticator.',
    lockedOut: 'Too many attempts. Please wait a few minutes and try again.',
    codeInvalid: 'Code not accepted. Please try again.',
    genericError: 'Something went wrong. Please try again.',
    // Generic
    loading: 'Please wait...',
    errorHeading: 'Re-Enrollment Unavailable',
    errorCta: 'Go to Sign In',
  },
  es: {
    pageTitle: 'Configura un Nuevo Autenticador — Práctikah',
    tagline: 'Red de Médicos',
    // Credentials step
    credHeading: 'Configura un Nuevo Autenticador',
    credSub: 'Tu restablecimiento de dos factores fue aprobado. Inicia sesión con tu correo y contraseña de Práctikah para registrar un nuevo autenticador.',
    emailLabel: 'Correo de Práctikah',
    emailPlaceholder: 'tu@medikah.health',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Tu contraseña de Práctikah',
    credSubmit: 'Continuar',
    // QR / confirm step
    qrHeading: 'Escanea el Nuevo Código QR',
    qrSub: 'Escanea el código QR con tu app de autenticación y luego ingresa el código de 6 dígitos.',
    qrRecommendation: 'Recomendamos Duo Mobile. Authy y Google Authenticator también funcionan.',
    codeLabel: 'Código de 6 Dígitos',
    codePlaceholder: '000000',
    codeSubmit: 'Verificar y Finalizar',
    // Done step
    doneHeading: 'Nuevo Autenticador Activo',
    doneSub: 'Redirigiéndote al inicio de sesión...',
    // Errors / states
    invalidCredentials: 'Correo o contraseña no reconocidos. Verifica e intenta de nuevo.',
    notEligible: 'Esta página aún no está activa para tu cuenta. Un administrador debe aprobar tu solicitud de restablecimiento primero. Una vez aprobada, regresa aquí para registrar un nuevo autenticador.',
    lockedOut: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
    codeInvalid: 'Código no aceptado. Por favor intenta de nuevo.',
    genericError: 'Algo salió mal. Por favor intenta de nuevo.',
    // Generic
    loading: 'Por favor espera...',
    errorHeading: 'Reinscripción No Disponible',
    errorCta: 'Ir al Inicio de Sesión',
  },
} as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ReenrollPage() {
  const router = useRouter();
  const isEs = router.locale === 'es';
  const t = isEs ? COPY.es : COPY.en;

  const [step, setStep] = useState<ReenrollStep>('credentials');
  const [error, setError] = useState<string | null>(null);

  // Credentials — kept in state across steps (confirm re-probes them). Never logged.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  // QR / confirm
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Step 1: credentials → POST /api/auth/reenroll/start
  // -------------------------------------------------------------------------

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCredLoading(true);
    try {
      const res = await fetch('/api/auth/reenroll/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = (await res.json()) as { qrCodeDataUrl: string };
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setStep('qr');
      } else if (res.status === 403) {
        // not_eligible — neutral, never reveals account state beyond approval-pending
        setError(t.notEligible);
      } else if (res.status === 401) {
        setError(t.invalidCredentials);
      } else if (res.status === 429) {
        setError(t.lockedOut);
      } else {
        setError(t.genericError);
      }
    } catch {
      setError(t.genericError);
    } finally {
      setCredLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step 2: 6-digit code → POST /api/auth/reenroll/confirm
  // -------------------------------------------------------------------------

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmLoading(true);
    try {
      const res = await fetch('/api/auth/reenroll/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      });

      if (res.ok) {
        setStep('done');
        setTimeout(() => {
          router.push('/chat');
        }, 1500);
      } else if (res.status === 422) {
        setError(t.codeInvalid);
        setCode('');
      } else if (res.status === 400) {
        // setup_required — the candidate secret is gone; re-fetch start.
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === 'setup_required') {
          setCode('');
          await refetchStart();
        } else {
          setError(t.genericError);
        }
      } else if (res.status === 401) {
        setError(t.invalidCredentials);
      } else if (res.status === 403) {
        setError(t.notEligible);
      } else if (res.status === 429) {
        setError(t.lockedOut);
      } else {
        setError(t.genericError);
      }
    } catch {
      setError(t.genericError);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Re-run start (on setup_required) to mint a fresh candidate QR, stay on step qr.
  const refetchStart = async () => {
    try {
      const res = await fetch('/api/auth/reenroll/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = (await res.json()) as { qrCodeDataUrl: string };
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setStep('qr');
      } else {
        setError(t.genericError);
      }
    } catch {
      setError(t.genericError);
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

            {/* credentials */}
            {step === 'credentials' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-inst-blue mb-2">{t.credHeading}</h2>
                  <p className="text-body-slate text-sm">{t.credSub}</p>
                </div>

                <form onSubmit={handleStart} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-inst-blue mb-1">
                      {t.emailLabel}
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent outline-none transition-all"
                      placeholder={t.emailPlaceholder}
                      autoComplete="username"
                      required
                    />
                  </div>
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
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  {error && <p className="text-alert-garnet text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={credLoading || !email || !password}
                    className="w-full py-3 bg-clinical-teal text-white font-semibold rounded-lg hover:bg-clinical-teal/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {credLoading ? t.loading : t.credSubmit}
                  </button>
                </form>
              </>
            )}

            {/* qr / confirm */}
            {(step === 'qr' || step === 'confirm') && (
              <>
                {/* D-15 remove-old-entry warning + qualified-label copy added in 18-08 */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-inst-blue mb-2">{t.qrHeading}</h2>
                  <p className="text-body-slate text-sm mb-2">{t.qrSub}</p>
                  <p className="text-xs text-body-slate/70">{t.qrRecommendation}</p>
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

                <form onSubmit={handleConfirm} className="space-y-4">
                  <div>
                    <label htmlFor="totp-code" className="block text-sm font-medium text-inst-blue mb-1">
                      {t.codeLabel}
                    </label>
                    <input
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent outline-none transition-all text-center text-lg tracking-widest font-mono"
                      placeholder={t.codePlaceholder}
                      autoComplete="one-time-code"
                      required
                    />
                  </div>

                  {error && <p className="text-alert-garnet text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={confirmLoading || code.length < 6}
                    className="w-full py-3 bg-clinical-teal text-white font-semibold rounded-lg hover:bg-clinical-teal/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {confirmLoading ? t.loading : t.codeSubmit}
                  </button>
                </form>
              </>
            )}

            {/* done */}
            {step === 'done' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">{t.doneHeading}</h2>
                <p className="text-body-slate">{t.doneSub}</p>
              </div>
            )}

            {/* error */}
            {step === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">{t.errorHeading}</h2>
                <p className="text-body-slate mb-6">{error || t.genericError}</p>
                <button
                  onClick={() => router.push('/chat')}
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
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
