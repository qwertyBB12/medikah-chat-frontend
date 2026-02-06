/**
 * Physician Account Setup Page
 *
 * Handles the magic link callback and lets physicians set their password.
 * After setting password, redirects to login.
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { supabase } from '../../lib/supabase';

export default function PhysicianSetup() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'setting' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  // Check for Supabase session on mount
  useEffect(() => {
    if (!supabase) {
      setError('Authentication not configured');
      setStatus('error');
      return;
    }

    // Supabase will automatically handle the magic link tokens in the URL
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Invalid or expired link. Please request a new one.');
        setStatus('error');
        return;
      }

      if (session?.user) {
        setEmail(session.user.email || null);
        setStatus('ready');
      } else {
        // No session - might need to wait for URL hash processing
        // Listen for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            setEmail(newSession.user.email || null);
            setStatus('ready');
          }
        });

        // Timeout if no session appears
        setTimeout(() => {
          if (status === 'loading') {
            setError('Invalid or expired link. Please request a new one.');
            setStatus('error');
          }
        }, 5000);

        return () => subscription.unsubscribe();
      }
    });
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!supabase) {
      setError('Authentication not configured');
      return;
    }

    setStatus('setting');
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError(updateError.message);
        setStatus('ready');
        return;
      }

      setStatus('success');

      // Sign out of Supabase session
      await supabase.auth.signOut();

      // Auto-login via NextAuth after a brief delay
      setTimeout(async () => {
        if (email) {
          const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
          });

          if (result?.ok) {
            router.push('/physicians/dashboard?welcome=true');
          } else {
            // If auto-login fails, redirect to login page
            router.push('/chat?physician=true');
          }
        } else {
          router.push('/chat?physician=true');
        }
      }, 1500);
    } catch (err) {
      console.error('Setup error:', err);
      setError('Failed to set password. Please try again.');
      setStatus('ready');
    }
  };

  return (
    <>
      <Head>
        <title>Set Up Your Account — Medikah</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFB] px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-inst-blue tracking-tight">medikah</h1>
            <p className="text-sm text-clinical-teal font-semibold uppercase tracking-wider mt-1">
              Physician Network
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {status === 'loading' && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2 text-body-slate">
                  <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-inst-blue/30 rounded-full animate-pulse [animation-delay:0.4s]" />
                </div>
                <p className="mt-4 text-body-slate">Verifying your link...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">Link Invalid</h2>
                <p className="text-body-slate mb-6">{error}</p>
                <button
                  onClick={() => router.push('/chat')}
                  className="px-6 py-3 bg-inst-blue text-white font-semibold rounded-lg hover:bg-inst-blue/90 transition-colors"
                >
                  Go to Login
                </button>
              </div>
            )}

            {status === 'ready' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clinical-teal/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-clinical-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-inst-blue mb-2">Set Your Password</h2>
                  <p className="text-body-slate text-sm">
                    Create a password to access your Medikah dashboard
                  </p>
                  {email && (
                    <p className="text-xs text-body-slate/70 mt-2">{email}</p>
                  )}
                </div>

                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-inst-blue mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent outline-none transition-all"
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-inst-blue mb-1">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-clinical-teal focus:border-transparent outline-none transition-all"
                      placeholder="Confirm your password"
                      minLength={8}
                      required
                    />
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-clinical-teal text-white font-semibold rounded-lg hover:bg-clinical-teal/90 transition-colors"
                  >
                    Create Password & Sign In
                  </button>
                </form>
              </>
            )}

            {status === 'setting' && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2 text-body-slate">
                  <span className="w-2 h-2 bg-clinical-teal/30 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-clinical-teal/30 rounded-full animate-pulse [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-clinical-teal/30 rounded-full animate-pulse [animation-delay:0.4s]" />
                </div>
                <p className="mt-4 text-body-slate">Setting up your account...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-inst-blue mb-2">Password Set!</h2>
                <p className="text-body-slate">Signing you in...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-body-slate/60 mt-6">
            Medikah Corporation · Delaware, USA
          </p>
        </div>
      </div>
    </>
  );
}
