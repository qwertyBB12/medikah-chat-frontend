/**
 * Chat Page - Login Hub
 *
 * Unified login page that routes users to their appropriate portal based on role:
 * - patient → /patients
 * - physician → /physicians
 * - insurer → /insurers
 * - employer → /employers
 */

import Head from 'next/head';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useState } from 'react';
import Splash from '../components/Splash';
import { getPortalRedirect } from '../lib/portalAuth';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [portalSelection, setPortalSelection] = useState<'doctor' | 'patient' | null>(null);

  // Redirect authenticated users to their portal
  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user) {
      const role = session.user.role || 'patient';
      const redirect = getPortalRedirect(role);
      router.replace(redirect);
    }
  }, [session, status, router]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    const result = await signIn('credentials', { redirect: false, email, password });
    setIsSubmitting(false);

    if (result?.error) {
      setLoginError('Credentials not recognized. Please try again.');
      return;
    }

    // Redirect based on portal selection (which button was clicked)
    // This handles the case where the user isn't in the physicians table yet
    if (portalSelection === 'doctor') {
      router.replace('/physicians');
    } else {
      router.replace('/patients');
    }
  };

  // Show loading while checking auth or redirecting
  if (status === 'loading' || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-inst-blue">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-white/30 rounded-full animate-typingBounce" />
          <span className="w-2 h-2 bg-white/30 rounded-full animate-typingBounce [animation-delay:0.2s]" />
          <span className="w-2 h-2 bg-white/30 rounded-full animate-typingBounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  const loginPanel = showLoginForm ? (
    <div className="font-dm-sans bg-inst-blue/80 rounded-sm p-6 space-y-5 text-white">
      <h3 className="text-base font-semibold tracking-wide">
        {portalSelection === 'patient' ? 'Patient sign in' : 'Doctor sign in'}
      </h3>
      <form onSubmit={handleSignIn} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs uppercase tracking-wider text-white/50">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-dm-sans border border-white/20 bg-inst-blue/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-none"
            placeholder="Email address"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs uppercase tracking-wider text-white/50">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="font-dm-sans border border-white/20 bg-inst-blue/50 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-clinical-teal rounded-none"
            placeholder="Password"
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
          className="font-dm-sans w-full px-4 py-3 font-semibold tracking-wide text-sm bg-inst-blue text-white border border-white/20 hover:bg-clinical-teal hover:border-clinical-teal transition rounded-sm disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in\u2026' : 'Sign in'}
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
