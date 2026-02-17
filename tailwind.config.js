/** @type {import('tailwindcss').Config} */
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
          DEFAULT: '#2C7A8C',
          dark: '#236370',
        },
        'teal': {
          700: '#1A5A68',
          600: '#236B7A',
          500: '#2C7A8C',
          400: '#4A9AAC',
          300: '#7BBFCC',
          200: '#B5DDE6',
        },
        'steady-teal': '#E8F4F6',

        // Institutional Navy — authority/darks
        'warm-gray': {
          900: '#0D1520',
          800: '#1B2A41',
          700: '#243856',
          600: '#2E476B',
          500: '#3A5A85',
          400: '#5A7AAA',
          300: '#A8B4C0',
        },
        // inst-blue maps to navy-800
        'inst-blue': '#1B2A41',

        // Linen — ground
        'linen': '#F0EAE0',
        'linen-warm': '#E8E0D5',
        'linen-light': '#F5F1EA',
        'linen-white': '#FAF8F4',

        // Neutrals
        'deep-charcoal': '#1C1C1E',
        'body-slate': '#4A5568',
        'archival-grey': '#8A8D91',
        'border-line': '#D1D5DB',
        'clinical-surface': '#F5F6F8',

        // Cream — text on dark
        'cream': {
          100: '#FFFFFF',
          300: '#F5F0EA',
          400: '#EBE4DC',
          500: '#A8B4C0',
        },

        // Text semantic
        'text-primary': '#1C1C1E',
        'text-secondary': '#4A5568',
        'text-muted': '#718096',

        // Semantic
        'confirm-green': '#2D7D5F',
        'caution-amber': '#B8860B',
        'alert-garnet': '#B83D3D',
        'info-blue': '#3B82B6',
      },
      fontFamily: {
        sans: ['var(--font-mulish)', 'sans-serif'],
        body: ['var(--font-mulish)', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        instrument: ['var(--font-instrument)', 'Georgia', 'serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
        source: ['var(--font-source)', 'system-ui', 'sans-serif'],
        'dm-serif': ['var(--font-dm-serif)', 'Georgia', 'serif'],
        'dm-sans': ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-oswald)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
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
