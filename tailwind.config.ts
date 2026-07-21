import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        washi: "rgb(var(--color-washi) / <alpha-value>)",
        washi2: "rgb(var(--color-washi2) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        indigo: {
          DEFAULT: "#274472",
          deep: "#1B2E4B",
          light: "#3E5C8A",
        },
        torii: {
          DEFAULT: "#D9462E",
          dark: "#B33A26",
          light: "#F0846A",
        },
        sakura: {
          DEFAULT: "#F4A6B7",
          deep: "#E6849B",
          pale: "#FCE7EC",
        },
        gold: {
          DEFAULT: "#E0A33C",
          deep: "#C4872A",
        },
        matcha: {
          DEFAULT: "#5C8A6A",
          deep: "#3F6A4D",
          pale: "#E3EEE3",
        },
      },
      fontFamily: {
        display: ["var(--font-zenmaru)", "sans-serif"],
        body: ["var(--font-jakarta)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        stamp: "0 2px 0 0 rgba(0,0,0,0.08)",
        node: "0 6px 0 0 rgba(0,0,0,0.12)",
        nodePressed: "0 2px 0 0 rgba(0,0,0,0.12)",
        card: "0 4px 16px rgba(34,37,43,0.06)",
        soft: "0 1px 2px rgba(34,37,43,0.04), 0 12px 28px -10px rgba(34,37,43,0.12)",
        glow: "0 8px 30px -6px rgba(39,68,114,0.35)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        popIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        drawLine: {
          "0%": { strokeDashoffset: "1000" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        float: "float 3.5s ease-in-out infinite",
        popIn: "popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        shake: "shake 0.4s ease-in-out",
      },
      backgroundImage: {
        seigaiha:
          "radial-gradient(circle at 50% 0%, transparent 24%, rgba(39,68,114,0.05) 25%, rgba(39,68,114,0.05) 28%, transparent 29%)",
        "grad-indigo": "linear-gradient(135deg, #3E5C8A 0%, #274472 55%, #1B2E4B 100%)",
        "grad-torii": "linear-gradient(135deg, #F0846A 0%, #D9462E 55%, #B33A26 100%)",
        "grad-sakura": "linear-gradient(135deg, #F4A6B7 0%, #E6849B 60%, #C96A82 100%)",
        "grad-gold": "linear-gradient(135deg, #F0C169 0%, #E0A33C 55%, #C4872A 100%)",
        "grad-matcha": "linear-gradient(135deg, #7FA98C 0%, #5C8A6A 55%, #3F6A4D 100%)",
        "grad-crimson": "linear-gradient(135deg, #3E5C8A 0%, #1B2E4B 45%, #B33A26 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
