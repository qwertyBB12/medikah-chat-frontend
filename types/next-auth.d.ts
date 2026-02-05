import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'patient' | 'physician' | 'insurer' | 'employer';
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    role?: 'patient' | 'physician' | 'insurer' | 'employer';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'patient' | 'physician' | 'insurer' | 'employer';
    userId: string;
  }
}
