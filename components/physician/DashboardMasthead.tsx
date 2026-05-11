/**
 * DashboardMasthead — Plan 20-04 (Phase 20, Wave 3).
 *
 * Brings the physician dashboard to visual parity with SOGo by stamping the
 * same masthead language at the top: a thin linen (light) / navy (dark)
 * letterhead band, followed by the shared <Wave/> primitive (Plan 20-02)
 * dropping into the work area below.
 *
 * Theme is resolved via useThemeMode() (Plan 20-06) which mirrors the
 * 13.1-08 OS-aware toggle. The no-flash IIFE in _document.tsx sets
 * data-theme before paint, so dark-mode users do NOT see a light flash.
 *
 * Per feedback_no_design_additions_to_shipped_ui (memory): this component
 * is intentionally CHROME-FREE. No headers, titles, wordmarks, or logos.
 * The only addition is the brand-continuity masthead language already
 * shipped in SOGo. Hector's D-07 declutter pass handles structural
 * dashboard changes separately.
 *
 * Per D-03 in 20-CONTEXT.md: this is one of only two surfaces the wave
 * belongs on (the other is SOGo, already shipped). Wave does NOT go on
 * the homepage or patient portal.
 */

'use client';

import { useEffect, useState } from 'react';
import { Wave } from '../shared/practikah/Wave';
import type { WaveVariant } from '../shared/practikah/Wave.types';
import { useThemeMode } from '../../lib/useThemeMode';
import { tokens } from '../../lib/design-tokens';

// Mobile breakpoint matches SOGo's custom-sogo.js mobile-wave switch (960px)
// — see RESEARCH Pattern 4 adapter notes. Keeping parity ensures both
// surfaces flip variants at the same window width.
const MOBILE_BREAKPOINT_PX = 960;

// Band height — tight tonal step from band into wave. Adjustable in the
// D-07 declutter pass without changing the API.
const BAND_HEIGHT_DESKTOP_PX = 40;
const BAND_HEIGHT_MOBILE_PX = 24;

export function DashboardMasthead() {
  const { resolved } = useThemeMode();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    return undefined;
  }, []);

  const device = isMobile ? 'Mobile' : 'Desktop';
  const variant = `${resolved}${device}` as WaveVariant;
  const bandBg = resolved === 'dark' ? tokens.colors.instBlue : tokens.colors.linen;
  const bandHeight = isMobile ? BAND_HEIGHT_MOBILE_PX : BAND_HEIGHT_DESKTOP_PX;

  return (
    <div aria-hidden="true" style={{ width: '100%' }}>
      <div style={{ width: '100%', height: `${bandHeight}px`, backgroundColor: bandBg }} />
      <Wave variant={variant} />
    </div>
  );
}

export default DashboardMasthead;
