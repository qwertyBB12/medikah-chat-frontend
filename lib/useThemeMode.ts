// Plan 20-06 — OS-aware theme mode hook.
//
// Abstracts the 13.1-08 SOGo theme resolver (mailcow-config/sogo/custom-sogo.js:65-128)
// into a React-side hook + helpers. Resolution rules MUST stay byte-equal in
// semantics to the SOGo IIFE so a single Medikah-level toggle behaves identically
// across medikah.health (React) and practikah.medikah.health (SOGo).
//
// Persistence (RESEARCH Pattern 6 — hybrid cookie + localStorage):
//   - localStorage `medikah_theme` (fast, per-domain)
//   - document.cookie `medikah_theme` scoped to .medikah.health (cross-domain handoff)
//
// Cookie is NOT HttpOnly: SOGo's custom-sogo.js is a static asset, not an SSR
// endpoint — it must read the cookie client-side. Theme preference is non-sensitive
// (RESEARCH Assumption A5).

import { useEffect, useState, useCallback } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'medikah_theme';
const COOKIE_DOMAIN = '.medikah.health';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === 'light' || v === 'dark' || v === 'auto';
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice !== 'auto') return choice;
  if (typeof window === 'undefined') return 'dark'; // SSR default
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function readChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'auto';
  try {
    const ls = localStorage.getItem(STORAGE_KEY);
    if (isThemeChoice(ls)) return ls;
  } catch {
    /* localStorage may throw in privacy modes — fall through */
  }
  const ck = readCookie(STORAGE_KEY);
  if (isThemeChoice(ck)) return ck;
  return 'auto';
}

export function persistTheme(choice: ThemeChoice): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* localStorage may throw in privacy modes — cookie still set below */
  }
  // Parent-domain cookie survives medikah.health ⇄ practikah.medikah.health hop.
  // NOT HttpOnly — SOGo custom-sogo.js needs client-side read access.
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  const secure = isHttps ? '; Secure' : '';
  document.cookie =
    `${STORAGE_KEY}=${encodeURIComponent(choice)}; ` +
    `domain=${COOKIE_DOMAIN}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function useThemeMode() {
  const [choice, setChoice] = useState<ThemeChoice>('auto');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    const c = readChoice();
    const r = resolveTheme(c);
    setChoice(c);
    setResolved(r);
    applyTheme(r);

    // React to OS preference changes — only when choice is 'auto'.
    // Mirrors the custom-sogo.js:127 `onPrefChange` handler.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      // Use functional setState so we read the latest choice without effect re-run.
      setChoice(curr => {
        if (curr === 'auto') {
          const next: ResolvedTheme = mq.matches ? 'dark' : 'light';
          setResolved(next);
          applyTheme(next);
        }
        return curr;
      });
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
    }
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
    };
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    persistTheme(next);
    setChoice(next);
    const r = resolveTheme(next);
    setResolved(r);
    applyTheme(r);
  }, []);

  return { choice, resolved, setTheme };
}
