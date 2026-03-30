import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Cream / White ──
        cream: {
          50:  "#FDFCF9",
          DEFAULT: "#FAF7F2",
          100: "#FAF7F2",
          200: "#F0EBE1",
          300: "#E4D9C8",
          400: "#D4C4A8",
        },
        // ── Gold ──
        gold: {
          50:  "#FDF8EE",
          100: "#F5E8C8",
          200: "#EDD49A",
          300: "#E0BC6A",
          DEFAULT: "#C9A96E",
          400: "#C9A96E",
          500: "#B8922A",
          600: "#9A7520",
          700: "#7A5C18",
          800: "#5C4410",
          dark: "#8A6520",
        },
        // ── Midnight Green ──
        forest: {
          50:  "#EBF5EF",
          100: "#D0E8D8",
          200: "#A3D1B3",
          300: "#6BB38A",
          400: "#3D9066",
          500: "#2D7A52",
          600: "#1F5038",
          700: "#163B2B",
          800: "#0F2A1C",
          900: "#0A1F14",
          950: "#060F0A",
          DEFAULT: "#0A1F14",
        },
        // ── Ink (text) ──
        ink: {
          DEFAULT: "#1A2E22",
          light:   "#4A6855",
          muted:   "#7A9080",
        },
      },
      fontFamily: {
        sans:  ["'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        serif: ["Georgia", "Cambria", "serif"],
      },
      backgroundImage: {
        "gold-gradient":    "linear-gradient(135deg, #C9A96E 0%, #E0BC6A 50%, #C9A96E 100%)",
        "forest-gradient":  "linear-gradient(135deg, #0A1F14 0%, #163B2B 100%)",
        "cream-gradient":   "linear-gradient(180deg, #FAF7F2 0%, #F0EBE1 100%)",
      },
      boxShadow: {
        "gold-sm": "0 2px 8px rgba(201,169,110,0.20)",
        "gold-md": "0 4px 20px rgba(201,169,110,0.25)",
        "card":    "0 1px 3px rgba(26,46,34,0.06), 0 4px 16px rgba(26,46,34,0.04)",
        "card-hover": "0 4px 20px rgba(26,46,34,0.10), 0 1px 4px rgba(26,46,34,0.06)",
      },
      // Extend opacity scale so non-standard values work in @apply
      opacity: {
        "6":  "0.06",
        "8":  "0.08",
        "15": "0.15",
        "25": "0.25",
        "35": "0.35",
        "45": "0.45",
        "55": "0.55",
        "65": "0.65",
        "75": "0.75",
        "85": "0.85",
        "95": "0.95",
      },
    },
  },
  plugins: [],
};
export default config;
