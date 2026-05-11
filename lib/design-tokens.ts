// ---------------------------------------------------------------------------
// Canonical Medikah design tokens.
//
// Source-of-truth ladder:
//   1. Live medikah.health DOM (verified via Playwright getComputedStyle)
//   2. THIS FILE — lib/design-tokens.ts
//   3. Component source (lib/emailChrome.ts, components/landing/*, etc.)
//
// Edit this file ONLY when the live homepage DOM changes (per D-02 in
// .planning/phases/20-design-system-reconciliation-shared-wave-primitive/20-CONTEXT.md).
//
// Do NOT edit `lib/emailChrome.ts` token literals — that file re-exports
// from here. Token additions (gradients, motion, etc.) belong here.
//
// Consumers:
//   - lib/emailChrome.ts            (re-export; email templates)
//   - tailwind.config.js            (via lib/design-tokens.cjs prebuild shim)
//   - components/shared/practikah/* (Phase 20 wave primitive)
//   - scripts/build-sogo-wave.ts    (Phase 20 SOGo build hook)
// ---------------------------------------------------------------------------

export const tokens = {
  colors: {
    // Navy / warm-gray scale (Hero + Footer + dark surfaces)
    navyDeep: '#0D1520',         // warm-gray-900 — gradient terminus
    instBlue: '#1B2A41',         // warm-gray-800 / inst-blue — gradient origin
    navyMid: '#243856',          // warm-gray-700
    navyLight: '#5A7AAA',        // warm-gray-400 — rare

    // Teal scale (CTAs, eyebrows, accents) — graduated, not flat
    teal700: '#1A5A68',
    teal600: '#236B7A',
    teal500: '#2C7A8C',          // clinical-teal — primary CTA bg
    teal400: '#4A9AAC',          // eyebrow on dark, footer accent text
    teal300: '#7BBFCC',          // hero second-line color
    teal200: '#B5DDE6',

    // Linen (warm light surfaces)
    linen: '#F0EAE0',
    linenWarm: '#E8E0D5',
    linenLight: '#F5F1EA',
    linenWhite: '#FAF8F4',

    // Cream (text on dark)
    white: '#FFFFFF',
    cream300: '#F5F0EA',         // primary text on navy
    cream400: '#EBE4DC',         // body text on navy
    cream500: '#A8B4C0',         // muted text on navy

    // Light-surface text
    deepCharcoal: '#1C1C1E',     // primary headlines
    bodySlate: '#4A5568',        // primary body
    textMuted: '#718096',        // muted body
    archivalGrey: '#8A8D91',     // very muted

    // Hairlines / borders
    borderLine: '#D1D5DB',
    hairlineDark: 'rgba(27,42,65,0.06)',    // navy 6% on light surfaces
    hairlineLight: 'rgba(255,255,255,0.06)', // white 6% on dark surfaces
    overlayWhite30: 'rgba(255,255,255,0.30)',
    overlayWhite50: 'rgba(255,255,255,0.50)',
    overlayWhite60: 'rgba(255,255,255,0.60)',
    tealOverlay8: 'rgba(44,122,140,0.08)',   // teal-500 8% — chip bg on light
    tealOverlay15: 'rgba(44,122,140,0.15)',  // teal-500 15% — chip bg on dark

    // Semantic
    success: '#2D7D5F',
    warning: '#B8860B',
    error: '#B83D3D',

    // Compat aliases (old names → new names) so existing template references
    // keep working without 50+ site-specific edits. Prefer the canonical
    // names above for new code.
    clinicalTeal: '#2C7A8C',     // → teal500
    creamOnDark: '#F5F0EA',      // → cream300
  },

  fonts: {
    // Body, wordmark, buttons, eyebrows, labels, footer — Mulish dominates.
    body: "'Mulish', -apple-system, 'Segoe UI', Arial, sans-serif",
    // Display headlines — Oswald, ALL CAPS only. Bad for body copy.
    heading: "'Oswald', 'Arial Narrow', Arial, sans-serif",
    // Aliases retained for backwards compatibility — both resolve to body
    // since DM Sans / DM Serif do not appear on the live homepage.
    ui: "'Mulish', -apple-system, 'Segoe UI', Arial, sans-serif",
    accent: "'Mulish', -apple-system, 'Segoe UI', Arial, sans-serif",
    // Alias: display → heading (Oswald)
    display: "'Oswald', 'Arial Narrow', Arial, sans-serif",
  },

  radii: {
    sm: '8px',
    md: '16px',
    lg: '24px',                  // primary — CTAs, chips, cards
    xl: '32px',                  // footer top corners
  },

  // Gradients — emit as background-image; Outlook falls back to bg-color
  gradients: {
    navy: 'linear-gradient(180deg,#1B2A41 0%,#0D1520 100%)',
    linenWarm: 'linear-gradient(135deg,#F5F1EA 0%,#E8E0D5 100%)',
    tealSoft: 'linear-gradient(135deg,#B5DDE6 0%,#E8E0D5 100%)',
    // Práctikah workspace house-style gradient (per memory
    // feedback_practikah_teal_gradient). Consumed by SOGo big-date /
    // light-avatar / FAB surfaces. No white stop — keeps the action
    // moment saturated.
    practikahTeal: 'linear-gradient(135deg,#2C7A8C 0%,#4A9AAC 50%,#9DD0DA 100%)',
  },

  // Motion tokens — extracted from tailwind.config.js keyframes/animation.
  // Durations + easings only; keyframe geometry stays in the Tailwind config
  // (Phase 20 does not touch keyframe shapes).
  motion: {
    fadeIn: { duration: '0.35s', easing: 'ease-out' },
    messageAppear: { duration: '0.4s', easing: 'cubic-bezier(0.4,0,0.2,1)' },
    welcomeFade: { duration: '0.6s', easing: 'cubic-bezier(0.4,0,0.2,1)' },
  },

  // Page background — parchment. Mirrors the homepage's StaggeredGrid CARD
  // surface (#FAF8F4 linen-white), where users actually read text. Cool-cream
  // for clinical readability while staying on-brand. The header band stays in
  // warmer linen on the linen variant, creating a tonal step into the body.
  pageBg: '#FAF8F4',             // linen-white — parchment body
} as const;

export type Tokens = typeof tokens;
