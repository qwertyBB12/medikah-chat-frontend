import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabase } from '../../../lib/supabase';

/**
 * NextAuth configuration
 *
 * Uses Supabase Auth when configured, falls back to env-based demo credentials.
 * Replace with full Supabase Auth flow before production.
 */
const DEMO_EMAIL = process.env.DEMO_EMAIL;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Try Supabase Auth first
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (!error && data.user) {
            return {
              id: data.user.id,
              name: data.user.user_metadata?.name || data.user.email,
              email: data.user.email,
            };
          }
        }

        // Fallback to env-based demo credentials
        if (
          DEMO_EMAIL &&
          DEMO_PASSWORD &&
          credentials.email === DEMO_EMAIL &&
          credentials.password === DEMO_PASSWORD
        ) {
          return { id: 'demo', name: 'Demo User', email: DEMO_EMAIL };
        }

        return null;
      }
    })
  ],
  pages: {
    signIn: '/',
  }
};

export default NextAuth(authOptions);
