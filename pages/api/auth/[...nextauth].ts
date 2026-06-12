import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import LinkedInProvider from 'next-auth/providers/linkedin';
import { supabase } from '../../../lib/supabase';
import { detectUserRole, ensureSupabaseUser } from '../../../lib/portalAuth';
import { mailcowImapAuthorize } from '../../../lib/auth/mailcowImapProvider';

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
    }),
    CredentialsProvider({
      id: 'mailcow-imap', // D-01: distinct provider id for the physician Mailcow IMAP path
      name: 'Medikah email',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        // The full IMAP probe + rate-limit + audit pipeline lives in
        // lib/auth/mailcowImapProvider.ts (Phase 16 Plan 03).
        return mailcowImapAuthorize(
          credentials as Record<string, string> | undefined,
          req as unknown as Parameters<typeof mailcowImapAuthorize>[1],
        );
      },
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

        // Phase 16 D-01/D-09/D-10 — mailcow-imap provider: lift the D-10 claim
        // set off the user object that mailcowImapAuthorize returned onto the JWT.
        // role is hard-coded 'physician' (Mailcow mailboxes exist only for
        // physicians; portalAuth.detectUserRole intentionally skipped per
        // 16-CONTEXT.md <code_context>).
        if (account?.provider === 'mailcow-imap') {
          const imapUser = user as {
            needs_totp?: boolean;
            totp_verified?: boolean;
            physician_id?: string;
            mailbox_email?: string;
            verification_status?: 'pending' | 'in_review' | 'verified' | 'rejected';
            workspace_role?: 'owner';
          };

          // Phase 17 Plan 04 — TOTP second-factor gate (T-17-04-01).
          // mailcowImapAuthorize() returns a sentinel { id: 'totp-pending:<id>',
          // needs_totp: true, physician_id } when the physician is enrolled.
          // The JWT must carry needs_totp=true and physician_id so the client
          // can call /api/auth/activate/totp-verify, but MUST NOT carry the full
          // D-10 physician claim set (role/mailbox_email/verification_status)
          // until TOTP is verified — that would be a 2FA bypass (T-17-04-01).
          if (imapUser.needs_totp === true) {
            token.userId = user.id;
            token.role = 'physician'; // hard-coded; only physicians have Mailcow accounts
            token.provider = 'mailcow-imap';
            token.needs_totp = true;
            token.physician_id = imapUser.physician_id;
            // Do NOT set mailbox_email, verification_status, workspace_role, totp_verified.
            // The session callback checks needs_totp before exposing physician claims.
            return token;
          }

          // Phase 17 Plan 04 — TOTP upgrade path.
          // When the totp-verify endpoint re-invokes signIn with totp_verified=true
          // (via a specially shaped user object returned from authorize()), clear
          // needs_totp and populate the full D-10 claim set.
          if (imapUser.totp_verified === true) {
            token.userId = user.id;
            token.role = 'physician';
            token.provider = 'mailcow-imap';
            token.needs_totp = false;
            token.totp_verified = true;
            token.physician_id = imapUser.physician_id;
            token.mailbox_email = imapUser.mailbox_email;
            token.verification_status = imapUser.verification_status;
            token.workspace_role = imapUser.workspace_role;
            return token;
          }

          // Standard mailcow-imap path (legacy physicians with no workspace row):
          // full D-10 claim set, no TOTP gate.
          token.userId = user.id;
          token.role = 'physician';
          token.provider = 'mailcow-imap';
          token.mailbox_email = imapUser.mailbox_email;
          token.physician_id = imapUser.physician_id;
          token.verification_status = imapUser.verification_status;
          token.workspace_role = imapUser.workspace_role;
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
        session.user.provider = token.provider as
          | 'credentials'
          | 'google'
          | 'linkedin'
          | 'mailcow-imap'
          | undefined;

        if (token.linkedInProfile) {
          session.user.linkedInProfile = token.linkedInProfile;
        }

        // Phase 16 D-10 — additive lift of mailcow-imap claims onto session.user.
        // Phase 17 Plan 04 — gate: do NOT expose physician claims if TOTP is pending.
        // needs_totp=true means IMAP password was correct but TOTP not yet verified.
        // Exposing role='physician' + mailbox_email on a needs_totp session would
        // allow a partial 2FA bypass (T-17-04-01).
        if (token.provider === 'mailcow-imap') {
          if (token.needs_totp === true) {
            // Pending TOTP session — expose only the minimum needed for the TOTP
            // verification UI: physician_id (to call /api/auth/activate/totp-verify)
            // and needs_totp flag. Do not expose mailbox_email, verification_status,
            // workspace_role. Role is set to physician (display purposes only — the
            // fast-API 'verified_physician' dependency still gates /practikah/* routes).
            session.user.needs_totp = true;
            session.user.physician_id = token.physician_id;
          } else {
            // Fully authenticated (TOTP verified or legacy no-workspace path).
            session.user.mailbox_email = token.mailbox_email;
            session.user.physician_id = token.physician_id;
            session.user.verification_status = token.verification_status;
            session.user.workspace_role = token.workspace_role;
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/chat',
  },
  // Phase 16 AUTH-08 — scope the session cookie to the parent domain so the
  // medikah.health JWT is presented on practikah.medikah.health (consumed by
  // the Plan 13.1-05 nginx auth_request handoff). The existing patient
  // Credentials sessions also become .medikah.health-scoped as a deliberate
  // side effect (16-04 must_haves) — NextAuth does not support per-provider
  // cookie config and no patient surface lives on practikah.medikah.health.
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        domain: '.medikah.health',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      },
    },
  },
  // ROADMAP Phase 16 Success Criterion 2 — ≤ 1h JWT TTL.
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,
  },
};

export default NextAuth(authOptions);
