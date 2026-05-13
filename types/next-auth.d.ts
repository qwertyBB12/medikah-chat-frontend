import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'patient' | 'physician' | 'insurer' | 'employer';
      provider?: 'credentials' | 'google' | 'linkedin' | 'mailcow-imap';
      linkedInProfile?: {
        fullName?: string | null;
        email?: string | null;
        photoUrl?: string | null;
      };
      // Phase 16 D-10 claims (populated only on mailcow-imap provider path)
      mailbox_email?: string;
      physician_id?: string;
      verification_status?: 'pending' | 'in_review' | 'verified' | 'rejected';
      workspace_role?: 'owner';
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
    provider?: 'credentials' | 'google' | 'linkedin' | 'mailcow-imap';
    linkedInProfile?: {
      fullName?: string | null;
      email?: string | null;
      photoUrl?: string | null;
    };
    // Phase 16 D-10 claims (populated only on mailcow-imap provider path)
    mailbox_email?: string;
    physician_id?: string;
    verification_status?: 'pending' | 'in_review' | 'verified' | 'rejected';
    workspace_role?: 'owner';
  }
}
