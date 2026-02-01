/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#1b2a41",
          800: "#243650",
          700: "#2E4260",
          600: "#3A5070",
        },
        teal: {
          DEFAULT: "#1a7c8b",
          dark: "#166776",
        },
        cream: {
          600: "#eddfc7",
          500: "#f2e5d5",
          400: "#f5ebe0",
          300: "#fdf7ec",
          200: "#faf6f2",
          100: "#ffffff",
        },
        coral: "#ff6f61",
      },
      fontFamily: {
        sans: ['var(--font-mulish)', "sans-serif"],
        heading: ['var(--font-oswald)', "sans-serif"],
        body: ['var(--font-mulish)', "sans-serif"],
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
