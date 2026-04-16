import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        mono:    ["var(--font-mono)", "ui-monospace", "monospace"],
        body:    ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        // --- Page theme (light / blue) ---
        ink:   "#f0f4fe",   // page background — light lavender
        ink2:  "#ffffff",   // surface / card
        ink3:  "#f8faff",   // subtle surface
        cream: "#0f172a",   // primary text
        mist:  "#334155",   // secondary text
        fog:   "#64748b",   // muted / tertiary text
        amber: "#2563eb",   // primary accent (blue, keeps old "amber" slot)
        edge:  "#e2e8f0",   // light border
        edge2: "#c7d2fe",   // accent border
        edge3: "#93c5fd",   // bright accent border
        // --- Shadcn tokens ---
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      animation: {
        "fade-up":    "fadeUp 0.65s ease both",
        "fade-in":    "fadeIn 0.4s ease both",
        "blink":      "blink 1.1s step-end infinite",
        "glow-pulse": "glowPulse 4s ease-in-out infinite",
        "scan":       "scan 3.5s linear infinite",
        "float":      "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.5" },
          "50%":      { opacity: "1" },
        },
        scan: {
          from: { transform: "translateY(-100%)" },
          to:   { transform: "translateY(2000%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
