import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom Brutalist Colors
        "brutal-bg": "hsl(0 0% 5%)",
        "brutal-text": "hsl(0 0% 95%)",
        "brutal-accent-red": "hsl(0 80% 50%)",
        "brutal-accent-gold": "hsl(40 90% 60%)",
        "brutal-card-bg": "hsl(0 0% 10%)",
        "brutal-border": "hsl(0 0% 20%)",
        "brutal-text-muted": "hsl(0 0% 60%)",
        "brutal-hover": "hsl(0 0% 15%)",
        // NEUE, deutlichere Farben für Tabellenzeilen
        "brutal-table-row-even": "hsl(0 0% 15%)", // Deutlich heller als Hintergrund
        "brutal-table-row-odd": "hsl(0 0% 8%)", // Deutlich dunkler als die andere Zeile, aber heller als der Hintergrund
        // Farben für die Hervorhebung der Top 3
        "brutal-table-top3-bg": "hsl(0 0% 25%)", // Ein helleres Grau für den Hintergrund
        "brutal-table-top3-text": "hsl(40 90% 60%)", // Gold für den Text
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
