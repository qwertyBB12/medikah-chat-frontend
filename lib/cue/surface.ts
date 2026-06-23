/**
 * lib/cue/surface.ts — Phase 23 (PRES-03)
 *
 * Cue surface open/close state, Cmd+K / Ctrl+K global shortcut, and
 * medikah:cue:open CustomEvent listener.
 *
 * Design decisions:
 *   - Open state is owned by a React hook (useCueSurface) so PortalLayout
 *     can mount CueSurface once and wire it cleanly.
 *   - The `medikah:cue:open` event name is SHARED with the SOGo injection
 *     in Plan 23-06 — do NOT rename.
 *   - Cmd+K (Mac) + Ctrl+K (Windows/Linux) toggle the surface open/closed.
 *     The listener uses capture=true + stopPropagation so SOGo's own router
 *     never sees the event (T-23-03-01 mitigation).
 *   - surfaceContext is derived from window.location pathname at open time
 *     so the surface can adapt its prompt to the active SOGo module.
 */

import { useState, useEffect, useCallback } from 'react';

/** Which workspace context is active when the surface is summoned. */
export type SurfaceContext = 'mail' | 'calendar' | 'dashboard';

/** Derive surface context from current URL (e.g., SOGo modules or React dashboard). */
export function deriveSurfaceContext(pathname: string): SurfaceContext {
  if (/\/SOGo\/so\/[^/]+\/Mail/i.test(pathname) || pathname.includes('/mail')) {
    return 'mail';
  }
  if (/\/SOGo\/so\/[^/]+\/Calendar/i.test(pathname) || pathname.includes('/calendar')) {
    return 'calendar';
  }
  return 'dashboard';
}

/** The event name shared between the React surface and the SOGo injection (23-06). */
export const CUE_OPEN_EVENT = 'medikah:cue:open' as const;

/** Return value from useCueSurface. */
export interface CueSurfaceState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  surfaceContext: SurfaceContext;
}

/**
 * useCueSurface — owns open/close state + global keyboard shortcut + event listener.
 *
 * Mount once in PortalLayout; pass {isOpen, close} down to <CueSurface />.
 */
export function useCueSurface(): CueSurfaceState {
  const [isOpen, setIsOpen] = useState(false);
  const [surfaceContext, setSurfaceContext] = useState<SurfaceContext>('dashboard');

  const open = useCallback(() => {
    const ctx = typeof window !== 'undefined'
      ? deriveSurfaceContext(window.location.pathname)
      : 'dashboard';
    setSurfaceContext(ctx);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Global Cmd+K / Ctrl+K toggle (capture:true + stopPropagation prevents SOGo router capture).
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta || e.key !== 'k') return;
      e.stopPropagation();
      e.preventDefault();
      setIsOpen((prev) => {
        if (!prev) {
          const ctx = deriveSurfaceContext(window.location.pathname);
          setSurfaceContext(ctx);
        }
        return !prev;
      });
    }
    window.addEventListener('keydown', handleKeydown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeydown, { capture: true });
  }, []);

  // Listen for medikah:cue:open CustomEvent (dispatched by CueLauncher + SOGo injection).
  useEffect(() => {
    function handleCueOpen() {
      open();
    }
    window.addEventListener(CUE_OPEN_EVENT, handleCueOpen);
    return () => window.removeEventListener(CUE_OPEN_EVENT, handleCueOpen);
  }, [open]);

  return { isOpen, open, close, surfaceContext };
}
