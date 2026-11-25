/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Violet — matches the reference app's exact palette (border-violet-100 etc).
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        ink: "#241f2f",
        surface: "#f8f7fb",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(51 45 41 / 0.04), 0 1px 3px 0 rgb(51 45 41 / 0.06)",
        card: "0 1px 3px 0 rgb(51 45 41 / 0.06), 0 4px 16px -4px rgb(51 45 41 / 0.08)",
        popover: "0 12px 32px -8px rgb(51 45 41 / 0.18), 0 4px 10px -4px rgb(51 45 41 / 0.10)",
      },
      // Radius intentionally uses Tailwind's stock scale (removed a custom
      // override here) so rounded-xl = 12px (controls) and rounded-3xl = 24px
      // (cards) match the reference design system exactly.
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(4px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(24px, -32px) scale(1.08)" },
          "66%": { transform: "translate(-18px, 18px) scale(0.94)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "slide-in-right": "slide-in-right 0.2s ease-out",
        "rise-in": "rise-in 0.5s cubic-bezier(0.16,1,0.3,1) both",
        blob: "blob 10s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
