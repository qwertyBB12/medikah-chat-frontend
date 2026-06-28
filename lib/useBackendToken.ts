import { useEffect, useRef, useState } from 'react';

/**
 * Hook to fetch a short-lived HS256 backend token for the current NextAuth
 * session. Physician dashboard / workspace components send it as
 * `Authorization: Bearer <token>` on their DIRECT calls to the FastAPI backend.
 *
 * The backend verifies HS256 with NEXTAUTH_SECRET (utils/auth.py). The previous
 * `useSupabaseToken` returned a Supabase access token (signed with Supabase's
 * secret), which never passed that gate → every direct dashboard call 401'd
 * ("Invalid token"). See lib/auth/backendToken.ts for the root-cause writeup.
 */
export function useBackendToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch('/api/auth/backend-token')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.token) setToken(data.token);
      })
      .catch(() => {
        // Token unavailable; API calls will proceed without auth
      });
  }, []);

  return token;
}
