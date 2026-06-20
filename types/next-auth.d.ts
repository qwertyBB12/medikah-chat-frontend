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
      // Phase 18 Plan 04 — D-01 bootstrap-demotion flag.
      // Set true when a graduated physician (activation_complete=true) signs in
      // via Google or original email-password. /chat renders the demotion wall;
      // no dashboard access is granted on this session.
      bootstrap_demoted?: boolean;
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
    // Phase 21 — session issue time (epoch seconds), pinned at sign-in. The SSO
    // gate revokes a copied token when session_iat < the physician's session_epoch.
    session_iat?: number;
    // Phase 18 Plan 04 — D-01 bootstrap-demotion flag.
    // Set true when a graduated physician (activation_complete=true) signs in
    // via Google or original email-password. /chat renders the demotion wall;
    // no dashboard access is granted on this session.
    bootstrap_demoted?: boolean;
  }
}
