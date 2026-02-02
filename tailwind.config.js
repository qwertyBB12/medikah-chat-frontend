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
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease-out forwards",
        messageAppear: "messageAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards",
        welcomeFade: "welcomeFade 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        welcomeFadeDelay: "welcomeFade 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s backwards",
        typingBounce: "typingBounce 1.4s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};
