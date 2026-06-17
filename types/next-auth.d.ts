import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'patient' | 'physician' | 'insurer' | 'employer';
      provider?: 'credentials' | 'google' | 'mailcow-imap';
      // Phase 16 D-10 claims (populated only on mailcow-imap provider path)
      mailbox_email?: string;
      physician_id?: string;
      verification_status?: 'pending' | 'in_review' | 'verified' | 'rejected';
      workspace_role?: 'owner';
      // Phase 17 Plan 04 — TOTP pending flag (set while needs_totp=true on the JWT)
      needs_totp?: boolean;
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
    provider?: 'credentials' | 'google' | 'mailcow-imap';
    // Phase 16 D-10 claims (populated only on mailcow-imap provider path)
    mailbox_email?: string;
    physician_id?: string;
    verification_status?: 'pending' | 'in_review' | 'verified' | 'rejected';
    workspace_role?: 'owner';
    // Phase 17 Plan 04 — TOTP second-factor gate
    // needs_totp=true: IMAP succeeded but TOTP not yet verified; no usable session
    needs_totp?: boolean;
    // totp_verified=true: totp-verify endpoint confirmed the TOTP code; full claims issued
    totp_verified?: boolean;
  }
}
