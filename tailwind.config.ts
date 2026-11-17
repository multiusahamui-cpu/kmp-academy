import type { Config } from "tailwindcss";

// Dipindah dari konfigurasi CDN di index.html (tailwind.config inline) ke build PostCSS,
// mengikuti pola garuda-superapp.
export default {
  darkMode: "class",
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        kodman: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
