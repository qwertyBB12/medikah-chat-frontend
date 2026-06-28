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
import { PATIENT_PORTAL_OPEN } from '../lib/featureFlags';
import { checkPassword } from '../lib/passwordPolicy';

type PortalSelection = 'doctor' | 'patient' | null;

const t = {
  patientSignIn: { en: 'Patient sign in', es: 'Inicio de sesión — Paciente' },
  doctorSignIn: { en: 'Physician sign in', es: 'Inicio de sesión — Médico' },
  continueGoogle: { en: 'Continue with Google', es: 'Continuar con Google' },
  or: { en: 'or sign in with credentials', es: 'o inicie sesión con credenciales' },
  email: { en: 'Email', es: 'Correo electrónico' },
  password: { en: 'Password', es: 'Contraseña' },
  signIn: { en: 'Sign in', es: 'Iniciar sesión' },
  // --- New-physician account creation (Option A — email/password entry, no Google) ---
  newPhysicianTab: { en: 'New physician', es: 'Médico nuevo' },
  returningTab: { en: 'Returning', es: 'Ya registrado' },
  createAccountHint: {
    en: 'Start with any email — your @medikah.health mailbox is created after we verify your credentials.',
    es: 'Comience con cualquier correo — su buzón @medikah.health se crea tras verificar sus credenciales.',
  },
  confirmPassword: { en: 'Confirm password', es: 'Confirme la contraseña' },
  passwordHint: {
    en: 'At least 12 characters, mixing 3 of: lowercase, uppercase, number, symbol.',
    es: 'Al menos 12 caracteres, combinando 3 de: minúscula, mayúscula, número, símbolo.',
  },
  createAccountCta: { en: 'Create account & continue', es: 'Crear cuenta y continuar' },
  creatingAccount: { en: 'Creating your account…', es: 'Creando su cuenta…' },
  passwordsDontMatch: { en: 'Passwords do not match.', es: 'Las contraseñas no coinciden.' },
  passwordTooShort: {
    en: 'Password must be at least 12 characters.',
    es: 'La contraseña debe tener al menos 12 caracteres.',
  },
  passwordNeedsMix: {
    en: 'Password must mix at least 3 of: lowercase, uppercase, number, symbol.',
    es: 'La contraseña debe combinar al menos 3 de: minúscula, mayúscula, número, símbolo.',
  },
  signupExists: {
    en: 'An account with this email already exists. Switch to “Returning” to sign in.',
    es: 'Ya existe una cuenta con este correo. Cambie a "Ya registrado" para iniciar sesión.',
  },
  signupGenericError: {
    en: 'Could not create your account. Please try again.',
    es: 'No se pudo crear su cuenta. Inténtelo de nuevo.',
  },
  returningHint: {
    en: 'Already have an account? Sign in below.',
    es: '¿Ya tiene una cuenta? Inicie sesión abajo.',
  },
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
  // Inline guard against Chrome autofilling a saved Gmail/contact address into
  // the IMAP-login box (locked out Hector + Dr. Aguirre 2026-06-28). The mailbox
  // login MUST be the @medikah.health address; a wrong domain is rejected by
  // IMAP and would otherwise surface only as a confusing generic failure.
  errorNotMedikahEmail: {
    en: 'Use your @medikah.health mailbox address, e.g. you@medikah.health',
    es: 'Usa tu dirección @medikah.health, ej. tu@medikah.health',
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
  totpError: { en: 'That code didn’t match — check your authenticator app.', es: 'Ese código no coincide — revisa tu app de autenticación.' },
  // Decision 42b / D-16 — distinct copy for a temporary lockout (429) vs a wrong
  // code (422). Tells the physician to wait rather than re-key a code that will
  // keep failing, and interpolates a live MM:SS countdown ({time}) of the
  // server-derived remaining wait so the screen reads as "wait", not "broken".
  totpLockout: {
    en: 'Too many attempts — try again in {time}.',
    es: 'Demasiados intentos — vuelve a intentar en {time}.',
  },
  // Decision 42c — shown while the second-factor handoff completes, so the screen
  // reads as progress instead of a silent second sign-in.
  totpCompleting: {
    en: 'Verified. Finishing sign-in…',
    es: 'Verificado. Completando inicio de sesión…',
  },
  totpReauth: {
    en: 'Code verified — enter your password once to finish.',
    es: 'Código verificado — ingresa tu contraseña una vez para terminar.',
  },
  // D-17 — submit label on the focused in-context password re-entry. Reads as
  // "finish", never "sign in", so the screen feels like continuation.
  totpReauthSubmit: { en: 'Finish sign-in', es: 'Completar inicio de sesión' },
  totpReauthFinishing: { en: 'Finishing…', es: 'Completando…' },
  // D-17 — continuation banner after a fresh re-enrollment (?reenrolled=1). The
  // copy is a static bilingual string gated on the flag, never the param value
  // (T-18-08-03 — the param is treated as a boolean only, never interpolated).
  reenrolledBanner: {
    en: 'Authenticator set up — sign in to finish.',
    es: 'Autenticador configurado — inicia sesión para terminar.',
  },
  // Phase 18 CARRY-18-B — lost-authenticator affordance on the TOTP sign-in step.
  lostAuthenticator: { en: 'I lost my authenticator', es: 'Perdí mi autenticador' },
  lostAuthFiling: { en: 'Filing request…', es: 'Enviando solicitud…' },
  lostAuthFiled: {
    en: 'Request filed. Once an administrator approves it, return here and choose “Set up a new authenticator” to finish.',
    es: 'Solicitud enviada. Cuando un administrador la apruebe, vuelve aquí y elige «Configurar un nuevo autenticador» para terminar.',
  },
  // Phase 18 CARRY-18-A — link into the isolated re-enrollment flow (opens only
  // after an admin has approved the reset and cleared the old 2FA factor).
  reenrollLink: { en: 'Set up a new authenticator', es: 'Configurar un nuevo autenticador' },
  // Phase 18 CARRY-18-A — surfaced under a failed physician sign-in so a doctor
  // whose 2FA was just reset (login now correctly returns no session) still has a
  // path back in. The /auth/reenroll page self-gates on the post-reset state.
  reenrollPrompt: {
    en: 'Authenticator reset? Set up a new one',
    es: '¿Restablecieron tu autenticador? Configura uno nuevo',
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

// D-16 — render a remaining-seconds value as MM:SS for the lockout countdown.
function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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
  // Decision 42b / D-16 — when the verify endpoint returns 429, we hold the
  // server-derived remaining wait here and tick it down so the lockout shows a
  // live MM:SS countdown and the verify button re-enables at zero. null = not
  // locked out (a 422 wrong-code state, which shows totpError instead).
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  // Decision 42c — true while the post-verify second-factor handoff runs.
  const [isTotpCompleting, setIsTotpCompleting] = useState(false);
  // D-17 — when the code verified but the password is no longer in memory (page
  // reloaded mid-flow), we show a focused single-field password re-entry IN the
  // TOTP step rather than bouncing to the full role-selection panel. The screen
  // keeps reading as "finishing", not "starting over".
  const [needsReauth, setNeedsReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [isReauthSubmitting, setIsReauthSubmitting] = useState(false);
  // D-17 — true when the doctor just completed re-enrollment and was redirected
  // back to /chat with ?reenrolled=1. Drives a one-line continuation banner so
  // the doctor understands they are finishing, not repeating.
  const [showReenrolledBanner, setShowReenrolledBanner] = useState(false);
  // Phase 18 CARRY-18-B — lost-authenticator self-file state.
  const [isFilingLostAuth, setIsFilingLostAuth] = useState(false);
  const [lostAuthFiled, setLostAuthFiled] = useState(false);
  // Phase 18 Plan 04 — D-01: demotion wall state.
  // True when session.user.bootstrap_demoted=true (server set in jwt() callback).
  const [showDemotionWall, setShowDemotionWall] = useState(false);
  // Phase 18 Plan 04 — D-02: graduated-device cookie hint.
  // True when mk_physician_graduated cookie is present — reorders physician pane
  // so Medikah-password form is primary. Polish only, not an enforcement boundary.
  const [isGraduatedDevice, setIsGraduatedDevice] = useState(false);
  const demotionLoggedRef = useRef(false);

  // Doctor pane sub-mode (Option A): 'new' opens the account-creation form,
  // 'returning' shows the sign-in forms. Defaults to 'new' so a brand-new
  // physician — who previously had NO entry path — sees account creation first.
  const [doctorMode, setDoctorMode] = useState<'new' | 'returning'>('new');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Check for role query param (from landing page CTAs)
  const initialRoleRef = useRef(false);
  useEffect(() => {
    if (initialRoleRef.current) return;
    initialRoleRef.current = true;
    const urlParams = new URLSearchParams(window.location.search);
    const role = urlParams.get('role');
    // D-17 — a doctor returning from a completed re-enrollment carries ?reenrolled=1.
    // Treat it strictly as a boolean flag (T-18-08-03): open the physician sign-in
    // form and show the continuation banner so the screen reads as "finishing".
    const reenrolled = urlParams.get('reenrolled') === '1';
    if (reenrolled) {
      setShowReenrolledBanner(true);
      setPortalSelection('doctor');
      setShowLoginForm(true);
      return;
    }
    if (role === 'physician' || role === 'doctor') {
      setPortalSelection('doctor');
      setShowLoginForm(true);
    } else if (role === 'patient' && PATIENT_PORTAL_OPEN) {
      // Physicians-only phase: ignore ?role=patient deep-links.
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
    // A graduated device almost certainly belongs to a returning doctor — open the
    // sign-in side by default rather than the new-account form.
    if (graduated) setDoctorMode('returning');
  }, []);

  // Decision 42b / D-16 — tick the lockout countdown down once per second while a
  // lockout is in effect; clear it (re-enabling the verify button) at zero. The
  // interval is the only timer; editing the code also clears the lockout (below).
  useEffect(() => {
    if (lockoutSeconds === null) return;
    if (lockoutSeconds <= 0) {
      setLockoutSeconds(null);
      setTotpError(null);
      return;
    }
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

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
        const selection = pendingRedirectRef.current;
        pendingRedirectRef.current = null;
        let redirect: string;
        if (session.user.role === 'physician') {
          // A resolved physician is never sent to a patient surface, even if
          // they picked the patient pane at the gateway.
          redirect = '/physicians';
        } else if (selection === 'doctor') {
          redirect = '/physicians/onboard';
        } else {
          redirect = PATIENT_PORTAL_OPEN ? '/patients' : '/patients-coming-soon';
        }
        router.replace(redirect);
      } else {
        const role = session.user.role || 'patient';
        let redirect: string;
        if (role === 'physician') redirect = '/physicians';
        else if (role === 'patient' && !PATIENT_PORTAL_OPEN) redirect = '/patients-coming-soon';
        else redirect = `/${role}s`;
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

  // Option A — create a brand-new physician's entry account (email/password), then
  // sign them straight in so the redirect effect routes them to /physicians/onboard.
  const handlePhysicianSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupError(null);

    if (signupPassword !== signupConfirm) {
      setSignupError(t.passwordsDontMatch[lang]);
      return;
    }
    const pw = checkPassword(signupPassword);
    if (!pw.valid) {
      setSignupError(pw.reason === 'too_short' ? t.passwordTooShort[lang] : t.passwordNeedsMix[lang]);
      return;
    }

    setIsSigningUp(true);
    try {
      // Retry transient 5xx (cold-start / network blip to Supabase) so a new doctor
      // never sees a one-off failure on their first signup. 4xx (409 exists, 422
      // weak password) are definitive — never retried.
      let resp: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        resp = await fetch('/api/auth/physician-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: signupEmail, password: signupPassword }),
        });
        if (resp.status < 500) break; // success or definitive client error
        if (attempt < 2) await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }

      if (!resp || !resp.ok) {
        const body = (await (resp?.json().catch(() => ({})) ?? Promise.resolve({}))) as { error?: string };
        setSignupError(resp?.status === 409 ? t.signupExists[lang] : body.error || t.signupGenericError[lang]);
        setIsSigningUp(false);
        return;
      }

      // Account created — sign in via credentials; the redirect effect sends them
      // to /physicians/onboard once the session lands.
      pendingRedirectRef.current = 'doctor';
      const result = await signIn('credentials', {
        redirect: false,
        email: signupEmail,
        password: signupPassword,
      });
      if (result?.error) {
        pendingRedirectRef.current = null;
        setSignupError(t.signupGenericError[lang]);
        setIsSigningUp(false);
      }
      // On success, leave isSigningUp true — the redirect effect navigates away.
    } catch {
      setSignupError(t.signupGenericError[lang]);
      setIsSigningUp(false);
    }
  };

  const handleMailcowSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);

    // Inline domain guard — flag a non-@medikah.health address BEFORE calling
    // signIn(). Chrome autofills a saved Gmail/contact email into this box; IMAP
    // rejects it and the generic failure copy hides the real cause. Catch it here.
    if (!mailcowEmail.trim().toLowerCase().endsWith('@medikah.health')) {
      setLoginError(t.errorNotMedikahEmail[lang]);
      return;
    }

    setIsMailcowSubmitting(true);

    pendingRedirectRef.current = 'doctor';

    let result: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      result = await signIn('mailcow-imap', {
        redirect: false,
        email: mailcowEmail,
        password: mailcowPassword,
      });
    } catch {
      // signIn() rejects (rather than resolving with { error }) when the callback
      // request itself fails — e.g. the function 504s and NextAuth tries to
      // res.json() an HTML timeout body. Without this catch the spinner would
      // spin forever. Surface the same locked error as any other failure.
      result = undefined;
    } finally {
      setIsMailcowSubmitting(false);
    }

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
    // Return to /chat (not a hardcoded /patients) so the redirect effect routes
    // by the resolved/self-healed role. A direct /patients callback would hit
    // the role-agnostic PATIENT_PORTAL_OPEN flag-wall even for a physician.
    const callbackUrl = portalSelection === 'doctor' ? '/physicians/onboard' : '/chat';
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
      // Decision 42b / D-16 — a 429 is a temporary lockout, not a wrong code. A
      // wrong code (422) tells the doctor to check their app; a lockout (429)
      // starts a live MM:SS countdown of the server-derived remaining wait and
      // re-enables the button at zero. Read retry_after_seconds, then fall back
      // to the Retry-After header, then to 300 (the 5-min window) if absent.
      if (verifyRes.status === 429) {
        let seconds = 300;
        try {
          const body = (await verifyRes.json()) as { retry_after_seconds?: number };
          if (typeof body.retry_after_seconds === 'number' && body.retry_after_seconds > 0) {
            seconds = body.retry_after_seconds;
          } else {
            const header = Number(verifyRes.headers.get('Retry-After'));
            if (Number.isFinite(header) && header > 0) seconds = header;
          }
        } catch {
          const header = Number(verifyRes.headers.get('Retry-After'));
          if (Number.isFinite(header) && header > 0) seconds = header;
        }
        setLockoutSeconds(seconds);
        setTotpError(null);
      } else {
        setLockoutSeconds(null);
        setTotpError(t.totpError[lang]);
      }
      return;
    }

    // Code accepted — re-run the credential sign-in so the server can upgrade the
    // session. Requires the password still in memory; if the page was reloaded
    // mid-flow we no longer hold it. D-17 — instead of bouncing to the full
    // role-selection panel (which reads as "starting over"), stay on the TOTP
    // step and reveal a single focused password field in-context. The screen
    // still reads as "finishing".
    if (!mailcowPassword) {
      setIsTotpSubmitting(false);
      setNeedsReauth(true);
      return;
    }

    // Decision 42c — surface the handoff as progress ("Finishing sign-in…")
    // rather than a silent second sign-in.
    setIsTotpCompleting(true);
    const result = await signIn('mailcow-imap', {
      redirect: false,
      email: mailcowEmail,
      password: mailcowPassword,
    });
    setIsTotpSubmitting(false);
    setIsTotpCompleting(false);

    if (!result || result.error) {
      setTotpError(t.totpError[lang]);
      return;
    }
    // Session refresh with full claims triggers the redirect effect.
  };

  // D-17 — focused in-context password re-entry after a mid-flow reload. The
  // code already verified; we only need the password (the email is recovered
  // from the held needs_totp session's mailbox_email claim, or the value the
  // doctor typed). On submit we re-invoke signIn directly — no role reset, no
  // return to the full panel — so the flow reads as "finishing", not "starting
  // over". Auth invariant unchanged: this still routes through the provider,
  // which returns the full claim set for the now-verified second factor.
  const handleReauthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reauthEmail = mailcowEmail || session?.user?.mailbox_email || '';
    if (!reauthEmail || !reauthPassword) return;
    setIsReauthSubmitting(true);
    setIsTotpCompleting(true);
    const result = await signIn('mailcow-imap', {
      redirect: false,
      email: reauthEmail,
      password: reauthPassword,
    });
    setIsReauthSubmitting(false);
    setIsTotpCompleting(false);
    if (!result || result.error) {
      setTotpError(t.totpError[lang]);
      return;
    }
    // Full-claim session refresh triggers the redirect effect.
    setNeedsReauth(false);
    setReauthPassword('');
  };

  // Phase 18 CARRY-18-B — self-file a lost-authenticator request from the TOTP
  // step. The needs_totp session proves the first factor (password) was already
  // cleared, which is exactly D-06's precondition. The endpoint is non-enumerating
  // and returns a neutral { filed: true } on every path.
  const handleLostAuthenticator = async () => {
    setIsFilingLostAuth(true);
    try {
      await fetch('/api/auth/recovery/lost-2fa-request', { method: 'POST' });
    } catch {
      // Non-enumerating: show the same neutral confirmation even on network error.
    } finally {
      setIsFilingLostAuth(false);
      setLostAuthFiled(true);
    }
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
            {/* D-17 — after a mid-flow reload the code is verified but the password
                is no longer in memory. Show a single focused password field in
                this same step (no bounce to the full panel); the screen keeps
                reading as "finishing", not "starting over". */}
            {needsReauth ? (
              <div className="space-y-4">
                <p className="font-body text-sm text-confirm-green bg-confirm-green/10 border border-confirm-green/20 px-3 py-2 text-center rounded-sm">
                  {t.totpReauth[lang]}
                </p>
                <form onSubmit={handleReauthSubmit} className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reauth-password" className="font-body text-xs uppercase tracking-wider text-white/50">
                      {t.password[lang]}
                    </label>
                    <input
                      id="reauth-password"
                      type="password"
                      autoComplete="current-password"
                      value={reauthPassword}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-sm"
                      placeholder="********"
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
                    disabled={isReauthSubmitting || reauthPassword.length === 0}
                  >
                    {isReauthSubmitting || isTotpCompleting
                      ? t.totpReauthFinishing[lang]
                      : t.totpReauthSubmit[lang]}
                  </button>
                </form>
              </div>
            ) : (
            <>
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
                  onChange={(e) => {
                    setTotpCode(e.target.value.replace(/\D/g, ''));
                    // D-16 — editing the code clears any lockout countdown so the
                    // doctor isn't stuck staring at a stale timer once they retry.
                    if (lockoutSeconds !== null) setLockoutSeconds(null);
                    if (totpError) setTotpError(null);
                  }}
                  className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 tracking-[0.4em] text-center focus:outline-none focus:border-clinical-teal rounded-sm"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>
              {/* D-16 — DISTINCT states: a lockout (429) shows a live MM:SS
                  countdown of the remaining wait; a wrong code (422) shows the
                  "check your authenticator app" copy. Both on brand (alert-garnet). */}
              {lockoutSeconds !== null ? (
                <p className="font-dm-sans text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
                  {t.totpLockout[lang].replace('{time}', formatCountdown(lockoutSeconds))}
                </p>
              ) : totpError ? (
                <p className="font-dm-sans text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
                  {totpError}
                </p>
              ) : null}
              <button
                type="submit"
                className="font-body w-full px-4 py-3 font-semibold tracking-wide text-sm bg-clinical-teal text-white border border-clinical-teal hover:bg-clinical-teal/90 transition rounded-sm disabled:opacity-50"
                disabled={isTotpSubmitting || totpCode.length !== 6 || lockoutSeconds !== null}
              >
                {isTotpCompleting
                  ? t.totpCompleting[lang]
                  : isTotpSubmitting
                    ? t.totpVerifying[lang]
                    : t.totpVerify[lang]}
              </button>
            </form>
            </>
            )}

            {/* Phase 18 CARRY-18-B — lost-authenticator affordance. */}
            <div className="pt-1 border-t border-white/10 text-center">
              {lostAuthFiled ? (
                <div className="space-y-2 pt-3">
                  <p className="font-body text-xs text-white/60 leading-relaxed">
                    {t.lostAuthFiled[lang]}
                  </p>
                  <Link
                    href="/auth/reenroll"
                    className="font-body inline-block text-xs text-clinical-teal underline hover:text-clinical-teal/80"
                  >
                    {t.reenrollLink[lang]}
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLostAuthenticator}
                  disabled={isFilingLostAuth}
                  className="font-body pt-3 text-xs text-white/40 underline hover:text-white/70 transition disabled:opacity-50"
                >
                  {isFilingLostAuth ? t.lostAuthFiling[lang] : t.lostAuthenticator[lang]}
                </button>
              )}
            </div>
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
      {/* D-17 — continuation banner after a fresh re-enrollment (?reenrolled=1).
          Reads as "finish signing in", not a blank restart. Purely informational
          (T-18-08-04): the real gate is the IMAP password + the new TOTP on this
          next login; the banner grants no access. */}
      {showReenrolledBanner && (
        <p className="font-body text-sm text-confirm-green bg-confirm-green/10 border border-confirm-green/20 px-3 py-2 text-center rounded-sm">
          {t.reenrolledBanner[lang]}
        </p>
      )}
      <h3 className="text-base font-semibold tracking-wide">
        {heading}
      </h3>

      {/* Option A — physician new/returning toggle. A brand-new doctor had NO entry
          path before (Google is unconfigured, the credentials box only signs in
          existing accounts). 'new' creates the entry account; 'returning' signs in. */}
      {portalSelection === 'doctor' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setDoctorMode('new'); setLoginError(null); setSignupError(null); }}
            className={`font-body text-sm font-semibold py-2.5 rounded-sm border transition ${
              doctorMode === 'new'
                ? 'bg-clinical-teal text-white border-clinical-teal'
                : 'bg-transparent text-white/60 border-white/20 hover:text-white'
            }`}
          >
            {t.newPhysicianTab[lang]}
          </button>
          <button
            type="button"
            onClick={() => { setDoctorMode('returning'); setLoginError(null); setSignupError(null); }}
            className={`font-body text-sm font-semibold py-2.5 rounded-sm border transition ${
              doctorMode === 'returning'
                ? 'bg-clinical-teal text-white border-clinical-teal'
                : 'bg-transparent text-white/60 border-white/20 hover:text-white'
            }`}
          >
            {t.returningTab[lang]}
          </button>
        </div>
      )}

      {/* NEW PHYSICIAN — create the entry account (email/password), then sign in. */}
      {portalSelection === 'doctor' && doctorMode === 'new' && (
        <div className="space-y-3">
          <p className="font-body text-xs text-white/50">{t.createAccountHint[lang]}</p>
          <form onSubmit={handlePhysicianSignup} className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-email" className="font-body text-xs uppercase tracking-wider text-white/50">
                {t.email[lang]}
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-sm"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password" className="font-body text-xs uppercase tracking-wider text-white/50">
                {t.password[lang]}
              </label>
              <input
                id="signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-sm"
                placeholder="********"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-confirm" className="font-body text-xs uppercase tracking-wider text-white/50">
                {t.confirmPassword[lang]}
              </label>
              <input
                id="signup-confirm"
                type="password"
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                className="font-body border border-white/20 bg-warm-gray-900/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-sm"
                placeholder="********"
                autoComplete="new-password"
                required
              />
            </div>
            <p className="font-body text-[11px] text-white/40">{t.passwordHint[lang]}</p>
            {signupError && (
              <p className="font-body text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
                {signupError}
              </p>
            )}
            <button
              type="submit"
              className="font-body w-full px-4 py-3 font-semibold tracking-wide text-sm bg-clinical-teal text-white border border-clinical-teal hover:bg-clinical-teal/90 transition rounded-sm disabled:opacity-50"
              disabled={isSigningUp}
            >
              {isSigningUp ? t.creatingAccount[lang] : t.createAccountCta[lang]}
            </button>
          </form>
        </div>
      )}

      {/* Phase 18 Plan 04 — D-02: On a graduated device (mk_physician_graduated cookie
          present), the Medikah-password form is primary. Google is demoted to a small
          "recover access" link. On a fresh device, normal order applies.
          Cookie is polish-only; the wall in jwt() carries the enforcement guarantee. */}

      {/* Phase 16 — Medikah-email (Mailcow IMAP) sign-in. Physician tab only.
          Shown FIRST on graduated devices (D-02), after Google on fresh devices. */}
      {portalSelection === 'doctor' && isGraduatedDevice && doctorMode === 'returning' && (
        <div className="space-y-3">
          <p className="font-body text-xs text-white/50">{t.medikahEmailHint[lang]}</p>
          <form onSubmit={handleMailcowSignIn} className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mailcow-email" className="font-body text-xs uppercase tracking-wider text-white/50">
                {t.email[lang]}
              </label>
              <input
                id="mailcow-email"
                name="mailcow-mailbox"
                type="email"
                autoComplete="off"
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
              <>
                <p className="font-body text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
                  {loginError}
                </p>
                {/* Phase 18 CARRY-18-A — re-enroll path for a post-reset doctor. */}
                <div className="text-center pt-2">
                  <Link
                    href="/auth/reenroll"
                    className="font-body text-xs text-white/40 underline hover:text-clinical-teal transition"
                  >
                    {t.reenrollPrompt[lang]}
                  </Link>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Social login (Google) — PATIENTS ONLY. Google OAuth is not configured for
          physicians, so showing it on the doctor pane dead-ends. Doctors use the
          new-account form (above) or the returning sign-in forms (below). */}
      {portalSelection === 'patient' && (
        <div className="space-y-2">
          {/* Google — patient portal only */}
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
      {portalSelection === 'doctor' && !isGraduatedDevice && doctorMode === 'returning' && (
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
                name="mailcow-mailbox"
                type="email"
                autoComplete="off"
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
              <>
                <p className="font-body text-sm text-alert-garnet bg-alert-garnet/10 border border-alert-garnet/20 px-3 py-2 text-center rounded-sm">
                  {loginError}
                </p>
                {/* Phase 18 CARRY-18-A — re-enroll path for a post-reset doctor. */}
                <div className="text-center pt-2">
                  <Link
                    href="/auth/reenroll"
                    className="font-body text-xs text-white/40 underline hover:text-clinical-teal transition"
                  >
                    {t.reenrollPrompt[lang]}
                  </Link>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Divider + email/password sign-in — patients, and RETURNING doctors only.
          Hidden in the doctor 'new' mode (the account-creation form replaces it). */}
      {(portalSelection === 'patient' || (portalSelection === 'doctor' && doctorMode === 'returning')) && (
      <>
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
      </>
      )}
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
        onPatientLogin={PATIENT_PORTAL_OPEN ? () => {
          setPortalSelection('patient');
          setShowLoginForm(true);
          setLoginError(null);
        } : undefined}
        loginPanel={loginPanel}
      />
    </>
  );
}
