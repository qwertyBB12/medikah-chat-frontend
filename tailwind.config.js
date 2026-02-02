/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary
        'inst-blue': '#1B2A41',
        'clinical-teal': {
          DEFAULT: '#2C7A8C',
          dark: '#236370',
        },
        'steady-teal': '#E8F4F6',

        // Neutrals
        'deep-charcoal': '#1C1C1E',
        'body-slate': '#4A5568',
        'archival-grey': '#8A8D91',
        'border-line': '#D1D5DB',
        'clinical-surface': '#F5F6F8',

        // Semantic
        'confirm-green': '#2D7D5F',
        'caution-amber': '#B8860B',
        'alert-garnet': '#B83D3D',
        'info-blue': '#3B82B6',

        // Warm accent
        'linen': '#F0EAE0',
      },
      fontFamily: {
        sans: ['var(--font-mulish)', 'sans-serif'],
        body: ['var(--font-mulish)', 'sans-serif'],
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
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease-out forwards",
      },
    },
  },
  plugins: [],
};
