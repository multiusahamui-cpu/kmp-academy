import type { Config } from "tailwindcss";

// Brand KMP-ADNG Academy: hijau daun (digitalcoop) + kuning emas (gold) sebagai aksen.
// Token warna dipindah dari skala lama ke identitas Academy; dipakai lintas komponen.
export default {
  darkMode: "class",
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // Hijau daun — warna utama digitalcoop (menggantikan skala lama).
        digitalcoop: {
          50: "#f0faf0",
          100: "#d9f2db",
          200: "#b4e5b9",
          300: "#83d08c",
          400: "#4fb65b",
          500: "#2e9d3c",
          600: "#228030",
          700: "#1d6628",
          800: "#1b5124",
          900: "#17431f",
          950: "#07240d",
        },
        // Kuning emas — aksen (CTA, sorotan, badge).
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },
      boxShadow: {
        digitalcoop: "0 10px 30px -10px rgba(34, 128, 48, 0.35)",
        gold: "0 10px 30px -10px rgba(245, 158, 11, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
