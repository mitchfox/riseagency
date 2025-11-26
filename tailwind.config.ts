import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      fontFamily: {
        agrandir: ['Agrandir Tight', 'Bebas Neue', 'sans-serif'],
        bebas: ['Bebas Neue', 'sans-serif'],
        bbh: ['BBH Sans Bartle', 'Bebas Neue', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        gold: {
          DEFAULT: "hsl(var(--gold))",
          muted: "hsl(var(--gold-muted))",
        },
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
       keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "flash-glow": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
        "slide-glow": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 240, 255, 0)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 240, 255, 0.4)" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1.1)", opacity: "1" },
        },
        "pan-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-30%)" },
        },
        "spin-to-x": {
          "0%": { opacity: "0", transform: "rotate(-45deg) scale(0.8)" },
          "100%": { opacity: "1", transform: "rotate(0deg) scale(1)" },
        },
        "diagonal-to-x-1": {
          "0%": { transform: "rotate(-45deg)", opacity: "0.5" },
          "100%": { transform: "rotate(45deg)", x1: "4", y1: "4", x2: "20", y2: "20", opacity: "1" },
        },
        "diagonal-to-x-2": {
          "0%": { transform: "rotate(45deg)", opacity: "0.5" },
          "100%": { transform: "rotate(-45deg)", x1: "20", y1: "4", x2: "4", y2: "20", opacity: "1" },
        },
        "menu-open-line-1": {
          "0%": { 
            transform: "rotate(-45deg) translateY(4px)",
          },
          "50%": {
            transform: "rotate(0deg) translateY(0)",
          },
          "100%": { 
            transform: "rotate(45deg) translateY(0)",
          },
        },
        "menu-open-line-2": {
          "0%": { 
            transform: "rotate(-45deg) translateY(-4px)",
          },
          "50%": {
            transform: "rotate(0deg) translateY(0)",
          },
          "100%": { 
            transform: "rotate(-45deg) translateY(0)",
          },
        },
        "color-to-gold": {
          "0%": { stroke: "currentColor" },
          "100%": { stroke: "hsl(var(--primary))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "flash-glow": "flash-glow 1.5s ease-in-out",
        "slide-glow": "slide-glow 2s ease-in-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in-left": "slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.5s ease-out",
        "pan-right": "pan-right 6s linear infinite",
        "spin-to-x": "spin-to-x 0.3s ease-out forwards",
        "diagonal-to-x-1": "diagonal-to-x-1 0.4s ease-out forwards",
        "diagonal-to-x-2": "diagonal-to-x-2 0.4s ease-out forwards",
        "menu-open-line-1": "menu-open-line-1 0.6s ease-out forwards",
        "menu-open-line-2": "menu-open-line-2 0.6s ease-out forwards",
        "color-to-gold": "color-to-gold 0.3s ease-out 0.6s forwards",
        "diagonal-to-x-2": "diagonal-to-x-2 0.4s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
