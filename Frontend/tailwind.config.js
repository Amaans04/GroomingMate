/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Sora'", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eef1ff",
          100: "#d8deff",
          200: "#b4bcff",
          400: "#6674f4",
          600: "#4451d3",
          800: "#2a318f",
          900: "#161a52",
        },
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease both",
      },
    },
  },
  plugins: [],
};