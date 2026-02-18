import { useEffect, useRef, useState } from 'react';

/**
 * Hook to fetch a Supabase access token for the current NextAuth session.
 * Used to authenticate backend API calls from physician dashboard components.
 */
export function useSupabaseToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch('/api/auth/supabase-token')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.access_token) setToken(data.access_token);
      })
      .catch(() => {
        // Token unavailable; API calls will proceed without auth
      });
  }, []);

  return token;
}
