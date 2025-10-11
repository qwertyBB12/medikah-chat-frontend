import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * NextAuth configuration
 *
 * This example uses a simple credentials provider with a hardcoded dev user.
 * In a real application you would replace this with a proper user database lookup.
 */
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
        if (
          credentials?.email === 'test@example.com' &&
          credentials?.password === 'test123'
        ) {
          return { id: '1', name: 'Test User', email: 'test@example.com' };
        }
        // If you return null then an error will be displayed advising the user to check their details.
        return null;
      }
    })
  ],
  pages: {
    signIn: '/',
  }
};

export default NextAuth(authOptions);
