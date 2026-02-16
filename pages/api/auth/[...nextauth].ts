import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import LinkedInProvider from 'next-auth/providers/linkedin';
import { supabase } from '../../../lib/supabase';
import { detectUserRole, ensureSupabaseUser } from '../../../lib/portalAuth';

/**
 * NextAuth configuration
 *
 * Authenticates via Supabase Auth (credentials), Google, or LinkedIn.
 * Social login users are synced to Supabase Auth via ensureSupabaseUser.
 * Role detection queries the physicians table to determine if user is a physician.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID ?? '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
      authorization: {
        params: { scope: 'openid profile email' },
      },
    }),
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

        if (!supabase) {
          return null;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) {
          return null;
        }

        const role = await detectUserRole(data.user.email || '');

        return {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email,
          email: data.user.email,
          role,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For social providers, sync to Supabase Auth
      if (account?.provider === 'google' || account?.provider === 'linkedin') {
        const email = user.email;
        if (!email) return false;

        try {
          await ensureSupabaseUser(email, {
            name: user.name,
            provider: account.provider,
            image: user.image,
          });
        } catch (err) {
          console.error('Failed to sync social user to Supabase:', err);
          // Allow sign-in to proceed even if Supabase sync fails
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        // Credentials flow: user object already has id and role
        if (account?.provider === 'credentials') {
          token.userId = user.id;
          token.role = user.role || 'patient';
          token.provider = 'credentials';
        }
      }

      // Social provider flow
      if (account && (account.provider === 'google' || account.provider === 'linkedin')) {
        const email = token.email || user?.email || '';
        token.provider = account.provider;

        // Detect role
        if (email) {
          token.role = await detectUserRole(email);
        } else {
          token.role = 'patient';
        }

        // Sync userId from Supabase
        try {
          const supabaseId = await ensureSupabaseUser(email, {
            name: token.name,
            provider: account.provider,
            image: token.picture ?? null,
          });
          token.userId = supabaseId;
        } catch {
          token.userId = token.sub || '';
        }

        // Store LinkedIn profile data
        if (account.provider === 'linkedin') {
          token.linkedInProfile = {
            fullName: (profile as Record<string, unknown>)?.name as string ?? token.name ?? null,
            email: token.email ?? null,
            photoUrl: (profile as Record<string, unknown>)?.picture as string ?? token.picture ?? null,
          };
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.provider = token.provider as 'credentials' | 'google' | 'linkedin' | undefined;

        if (token.linkedInProfile) {
          session.user.linkedInProfile = token.linkedInProfile;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/chat',
  }
};

export default NextAuth(authOptions);
