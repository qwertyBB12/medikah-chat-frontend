// Tests for useThemeMode hook + helpers (Plan 20-06).
// Resolution rules must match mailcow-config/sogo/custom-sogo.js:65-128 exactly.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  resolveTheme,
  persistTheme,
  useThemeMode,
  type ThemeChoice,
} from './useThemeMode';

type MQListener = (e: { matches: boolean }) => void;

function stubMatchMedia(prefersDark: boolean) {
  const listeners = new Set<MQListener>();
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null as null | MQListener,
    addEventListener: (_: string, l: MQListener) => listeners.add(l),
    removeEventListener: (_: string, l: MQListener) => listeners.delete(l),
    addListener: (l: MQListener) => listeners.add(l),
    removeListener: (l: MQListener) => listeners.delete(l),
    dispatchEvent: () => true,
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return { mql, listeners };
}

function clearCookies() {
  // jsdom: clear all cookies on current document
  document.cookie.split(';').forEach(c => {
    const eq = c.indexOf('=');
    const name = (eq > -1 ? c.substring(0, eq) : c).trim();
    if (name) {
      document.cookie = `${name}=; path=/; max-age=0`;
      document.cookie = `${name}=; domain=.medikah.health; path=/; max-age=0`;
    }
  });
}

describe('resolveTheme', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('Test 1a: resolveTheme("dark") returns "dark"', () => {
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('Test 1b: resolveTheme("light") returns "light"', () => {
    expect(resolveTheme('light')).toBe('light');
  });

  it('Test 2a: resolveTheme("auto") returns "dark" when prefers-color-scheme: dark matches', () => {
    stubMatchMedia(true);
    expect(resolveTheme('auto')).toBe('dark');
  });

  it('Test 2b: resolveTheme("auto") returns "light" when prefers-color-scheme: dark does NOT match', () => {
    stubMatchMedia(false);
    expect(resolveTheme('auto')).toBe('light');
  });
});

describe('persistTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookies();
    stubMatchMedia(false);
  });

  it('Test 3: persistTheme("dark") writes localStorage AND a cookie containing medikah_theme=dark and domain=.medikah.health', () => {
    // Capture cookie writes — jsdom drops `domain=.medikah.health` cookies
    // on a non-matching host, so we spy on the setter directly.
    const writes: string[] = [];
    const proto = Object.getPrototypeOf(document) as Document;
    const orig = Object.getOwnPropertyDescriptor(proto, 'cookie') ||
      Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => orig?.get?.call(document) ?? '',
      set: (v: string) => {
        writes.push(v);
        orig?.set?.call(document, v);
      },
    });

    try {
      persistTheme('dark');
      expect(localStorage.getItem('medikah_theme')).toBe('dark');
      const cookieLine = writes.find(w => w.includes('medikah_theme=dark'));
      expect(cookieLine).toBeDefined();
      expect(cookieLine).toContain('domain=.medikah.health');
      expect(cookieLine).toContain('SameSite=Lax');
      // NOT HttpOnly — confirm explicitly (cookies set via document.cookie
      // cannot be HttpOnly by spec, but we still assert the intent).
      expect(cookieLine).not.toMatch(/HttpOnly/i);
    } finally {
      if (orig) Object.defineProperty(document, 'cookie', orig);
    }
  });
});

describe('useThemeMode hook', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookies();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('Test 4: initial render with empty storage + matchMedia=dark returns choice:auto, resolved:dark', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useThemeMode());
    expect(result.current.choice).toBe('auto');
    expect(result.current.resolved).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('Test 5: setTheme("light") updates state, localStorage, and data-theme', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useThemeMode());

    act(() => result.current.setTheme('light'));

    expect(result.current.choice).toBe('light');
    expect(result.current.resolved).toBe('light');
    expect(localStorage.getItem('medikah_theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('Test 6: when localStorage is empty but cookie has medikah_theme=dark, choice resolves to "dark"', () => {
    stubMatchMedia(false);  // OS prefers light — so a 'dark' resolution must come from the cookie
    // jsdom default URL is http://localhost — set a host-scoped cookie that the
    // matcher will find.
    document.cookie = 'medikah_theme=dark; path=/';

    const { result } = renderHook(() => useThemeMode());
    expect(result.current.choice).toBe('dark');
    expect(result.current.resolved).toBe('dark');
  });
});
