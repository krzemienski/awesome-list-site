import type { Config } from "tailwindcss";

/*
 * Dark-mode class collapsed (CC-10): Terminal is dark-only.
 * `xs` breakpoint set to 375 px (CC-13): aligned with Phase-2 mobile viewport.
 * Color keys aliased to DS tokens — see `client/src/styles/design-system.css`
 * and the `@theme inline` block in `client/src/index.css`. Legacy shadcn
 * callsites (`bg-card`, `border-input`, `text-primary`, etc.) compile against
 * the DS surface.
 */
export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      borderRadius: {
        lg: "0",
        md: "0",
        sm: "0",
      },
      colors: {
        background: "var(--bg)",
        foreground: "var(--text)",
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text)",
        },
        popover: {
          DEFAULT: "var(--bg-2)",
          foreground: "var(--text)",
        },
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--text)",
        },
        muted: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-2)",
        },
        accent: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--text)",
        },
        destructive: {
          DEFAULT: "#ff5c7a",
          foreground: "#000000",
        },
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--accent)",
        chart: {
          "1": "var(--accent)",
          "2": "#34d08c",
          "3": "#5eddf2",
          "4": "#ffb84d",
          "5": "#9d4edd",
        },
        sidebar: {
          DEFAULT: "var(--bg)",
          foreground: "var(--text)",
          primary: "var(--accent)",
          "primary-foreground": "#000000",
          accent: "var(--surface-2)",
          "accent-foreground": "var(--text)",
          border: "var(--border)",
          ring: "var(--accent)",
        },
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
} satisfies Config;
