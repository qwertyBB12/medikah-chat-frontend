/** @type {import('tailwindcss').Config} */
// Token authority lives in lib/design-tokens.ts (Plan 20-01 / D-05).
// scripts/build-design-tokens-cjs.ts emits lib/design-tokens.cjs from that
// TypeScript source on every predev/prebuild — this require pulls the
// generated shim so Tailwind utility classes can never drift from
// emailChrome's tokens or the live homepage DOM.
const tokens = require('./lib/design-tokens.cjs');

module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Clinical Teal — primary accent/CTA
        'clinical-teal': {
          DEFAULT: tokens.colors.teal500,
          dark: tokens.colors.teal600,
        },
        'teal': {
          700: tokens.colors.teal700,
          600: tokens.colors.teal600,
          500: tokens.colors.teal500,
          400: tokens.colors.teal400,
          300: tokens.colors.teal300,
          200: tokens.colors.teal200,
        },
        // Not in tokens — legacy literal kept to avoid scope creep.
        'steady-teal': '#E8F4F6',

        // Institutional Navy — authority/darks
        'warm-gray': {
          900: tokens.colors.navyDeep,
          800: tokens.colors.instBlue,
          700: tokens.colors.navyMid,
          // 600 + 500 + 300 are not in tokens — keep as literals.
          600: '#2E476B',
          500: '#3A5A85',
          400: tokens.colors.navyLight,
          300: '#A8B4C0',
        },
        // inst-blue maps to navy-800
        'inst-blue': tokens.colors.instBlue,

        // Linen — ground
        'linen': tokens.colors.linen,
        'linen-warm': tokens.colors.linenWarm,
        'linen-light': tokens.colors.linenLight,
        'linen-white': tokens.colors.linenWhite,

        // Neutrals
        'deep-charcoal': tokens.colors.deepCharcoal,
        'body-slate': tokens.colors.bodySlate,
        'archival-grey': tokens.colors.archivalGrey,
        'border-line': tokens.colors.borderLine,
        // Not in tokens — legacy literal.
        'clinical-surface': '#F5F6F8',

        // Cream — text on dark
        'cream': {
          100: tokens.colors.white,
          300: tokens.colors.cream300,
          400: tokens.colors.cream400,
          500: tokens.colors.cream500,
        },

        // Text semantic
        'text-primary': tokens.colors.deepCharcoal,
        'text-secondary': tokens.colors.bodySlate,
        'text-muted': tokens.colors.textMuted,

        // Semantic
        'confirm-green': tokens.colors.success,
        'caution-amber': tokens.colors.warning,
        'alert-garnet': tokens.colors.error,
        // Not in tokens — legacy literal.
        'info-blue': '#3B82B6',
      },
      fontFamily: {
        // Keep CSS-variable plumbing for next/font (--font-mulish etc.) —
        // do NOT swap to literal family names; var(--font-X) is what
        // _app.tsx + next/font wire up. Tokens.fonts are for inline-style
        // / email contexts where CSS variables don't apply.
        sans: ['var(--font-mulish)', 'sans-serif'],
        body: ['var(--font-mulish)', 'sans-serif'],
        display: ['var(--font-oswald)', 'sans-serif'],
        heading: ['var(--font-oswald)', 'sans-serif'],
        'dm-serif': ['var(--font-dm-serif)', 'Georgia', 'serif'],
        'dm-sans': ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: tokens.radii,
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        messageAppear: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        welcomeFade: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        typingBounce: {
          "0%, 60%, 100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-8px)" },
        },
        scrollPulse: {
          "0%, 100%": { opacity: "0.3", transform: "scaleY(0.6)" },
          "50%": { opacity: "1", transform: "scaleY(1)" },
        },
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease-out forwards",
        messageAppear: "messageAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards",
        welcomeFade: "welcomeFade 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        welcomeFadeDelay: "welcomeFade 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s backwards",
        typingBounce: "typingBounce 1.4s infinite ease-in-out",
        scrollPulse: "scrollPulse 2s ease-in-out infinite",
        blink: "blink 0.8s infinite",
      },
    },
  },
  plugins: [],
};
