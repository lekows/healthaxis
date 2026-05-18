import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Dark backgrounds
        night: "#0D0D0B",
        "night-2": "#141412",
        "night-3": "#1C1C19",
        "night-4": "#252520",
        "night-5": "#2E2E28",
        // Light text on dark
        "ink-light": "#E8E4D9",
        "ink-dim": "#9A9688",
        "ink-faint-dark": "#5A5A50",
        // Brand
        forest: "#1B4332",
        "forest-mid": "#2D6A4F",
        "forest-light": "#52B788",
        "forest-pale": "#D8F3DC",
        terra: "#C1440E",
        "terra-light": "#F4A261",
        "terra-pale": "#FDE8DF",
        // Legacy light (used in dashboard)
        canvas: "#FAF8F4",
        "canvas-subtle": "#F3F0EA",
        cream: "#FFFBF5",
        ink: "#1A1A18",
        "ink-muted": "#4A4A45",
        "border-soft": "#E8E4DA"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        editorial: ["DM Serif Display", "Georgia", "serif"]
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem"
      },
      boxShadow: {
        card: "0 2px 20px rgba(0,0,0,0.3)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.5)",
        "glow-green": "0 0 60px rgba(82,183,136,0.2)",
        "glow-green-sm": "0 0 20px rgba(82,183,136,0.15)",
        "glow-terra": "0 0 40px rgba(193,68,14,0.2)"
      }
    }
  },
  plugins: []
};

export default config;

