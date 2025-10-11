/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a7c8b",
        accent: "#FFD54F",
        brandbg: "#b38382",
        text: "#111827",
        muted: "#9CA3AF",
        surface: "#f8f8f8"
      },
      fontFamily: {
        sans: ['var(--font-raleway)', "sans-serif"],
        heading: ['var(--font-sora)', "sans-serif"],
        body: ['var(--font-raleway)', "sans-serif"]
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease-out forwards"
      }
    }
  },
  plugins: []
};
