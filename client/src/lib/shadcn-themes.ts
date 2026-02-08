export interface ThemePreset {
  name: string;
  value: string;
  preview: { bg: string; sidebar: string; accent: string; text: string };
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export const themePresets: ThemePreset[] = [
  {
    name: "Orange",
    value: "orange",
    preview: { bg: "#1a1410", sidebar: "#1a1410", accent: "#e8720c", text: "#f5f0eb" },
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "20 14.3% 4.1%",
        card: "0 0% 100%",
        "card-foreground": "20 14.3% 4.1%",
        popover: "0 0% 100%",
        "popover-foreground": "20 14.3% 4.1%",
        primary: "24.6 95% 53.1%",
        "primary-foreground": "60 9.1% 97.8%",
        secondary: "60 4.8% 95.9%",
        "secondary-foreground": "24 9.8% 10%",
        muted: "60 4.8% 95.9%",
        "muted-foreground": "25 5.3% 44.7%",
        accent: "60 4.8% 95.9%",
        "accent-foreground": "24 9.8% 10%",
        destructive: "0 84.2% 60.2%",
        border: "20 5.9% 90%",
        input: "20 5.9% 90%",
        ring: "24.6 95% 53.1%",
      },
      dark: {
        background: "20 14.3% 4.1%",
        foreground: "60 9.1% 97.8%",
        card: "20 14.3% 4.1%",
        "card-foreground": "60 9.1% 97.8%",
        popover: "20 14.3% 4.1%",
        "popover-foreground": "60 9.1% 97.8%",
        primary: "20.5 90.2% 48.2%",
        "primary-foreground": "60 9.1% 97.8%",
        secondary: "12 6.5% 15.1%",
        "secondary-foreground": "60 9.1% 97.8%",
        muted: "12 6.5% 15.1%",
        "muted-foreground": "24 5.4% 63.9%",
        accent: "12 6.5% 15.1%",
        "accent-foreground": "60 9.1% 97.8%",
        destructive: "0 62.8% 30.6%",
        border: "12 6.5% 15.1%",
        input: "12 6.5% 15.1%",
        ring: "20.5 90.2% 48.2%",
      }
    }
  },
  {
    name: "Blue",
    value: "blue",
    preview: { bg: "#030711", sidebar: "#030711", accent: "#3b82f6", text: "#e2e8f0" },
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        card: "0 0% 100%",
        "card-foreground": "222.2 84% 4.9%",
        popover: "0 0% 100%",
        "popover-foreground": "222.2 84% 4.9%",
        primary: "221.2 83.2% 53.3%",
        "primary-foreground": "210 40% 98%",
        secondary: "210 40% 96%",
        "secondary-foreground": "222.2 47.4% 11.2%",
        muted: "210 40% 96%",
        "muted-foreground": "215.4 16.3% 46.9%",
        accent: "210 40% 96%",
        "accent-foreground": "222.2 47.4% 11.2%",
        destructive: "0 84.2% 60.2%",
        border: "214.3 31.8% 91.4%",
        input: "214.3 31.8% 91.4%",
        ring: "221.2 83.2% 53.3%",
      },
      dark: {
        background: "222.2 84% 4.9%",
        foreground: "210 40% 98%",
        card: "222.2 84% 4.9%",
        "card-foreground": "210 40% 98%",
        popover: "222.2 84% 4.9%",
        "popover-foreground": "210 40% 98%",
        primary: "217.2 91.2% 59.8%",
        "primary-foreground": "222.2 84% 4.9%",
        secondary: "217.2 32.6% 17.5%",
        "secondary-foreground": "210 40% 98%",
        muted: "217.2 32.6% 17.5%",
        "muted-foreground": "215 20.2% 65.1%",
        accent: "217.2 32.6% 17.5%",
        "accent-foreground": "210 40% 98%",
        destructive: "0 62.8% 30.6%",
        border: "217.2 32.6% 17.5%",
        input: "217.2 32.6% 17.5%",
        ring: "224.3 76.3% 48%",
      }
    }
  },
  {
    name: "Green",
    value: "green",
    preview: { bg: "#0a1a0f", sidebar: "#0a1a0f", accent: "#22c55e", text: "#e2f0e8" },
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "240 10% 3.9%",
        card: "0 0% 100%",
        "card-foreground": "240 10% 3.9%",
        popover: "0 0% 100%",
        "popover-foreground": "240 10% 3.9%",
        primary: "142.1 76.2% 36.3%",
        "primary-foreground": "355.7 100% 97.3%",
        secondary: "240 4.8% 95.9%",
        "secondary-foreground": "240 5.9% 10%",
        muted: "240 4.8% 95.9%",
        "muted-foreground": "240 3.8% 46.1%",
        accent: "240 4.8% 95.9%",
        "accent-foreground": "240 5.9% 10%",
        destructive: "0 84.2% 60.2%",
        border: "240 5.9% 90%",
        input: "240 5.9% 90%",
        ring: "142.1 76.2% 36.3%",
      },
      dark: {
        background: "20 14.3% 4.1%",
        foreground: "0 0% 95%",
        card: "24 9.8% 10%",
        "card-foreground": "0 0% 95%",
        popover: "0 0% 9%",
        "popover-foreground": "0 0% 95%",
        primary: "142.1 70.6% 45.3%",
        "primary-foreground": "144.9 80.4% 10%",
        secondary: "240 3.7% 15.9%",
        "secondary-foreground": "0 0% 98%",
        muted: "0 0% 15%",
        "muted-foreground": "240 5% 64.9%",
        accent: "12 6.5% 15.1%",
        "accent-foreground": "0 0% 98%",
        destructive: "0 62.8% 30.6%",
        border: "240 3.7% 15.9%",
        input: "240 3.7% 15.9%",
        ring: "142.1 70.6% 45.3%",
      }
    }
  },
  {
    name: "Violet",
    value: "violet",
    preview: { bg: "#0a0520", sidebar: "#0a0520", accent: "#8b5cf6", text: "#e8e2f0" },
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "224 71.4% 4.1%",
        card: "0 0% 100%",
        "card-foreground": "224 71.4% 4.1%",
        popover: "0 0% 100%",
        "popover-foreground": "224 71.4% 4.1%",
        primary: "262.1 83.3% 57.8%",
        "primary-foreground": "210 20% 98%",
        secondary: "220 14.3% 95.9%",
        "secondary-foreground": "220.9 39.3% 11%",
        muted: "220 14.3% 95.9%",
        "muted-foreground": "220 8.9% 46.1%",
        accent: "220 14.3% 95.9%",
        "accent-foreground": "220.9 39.3% 11%",
        destructive: "0 84.2% 60.2%",
        border: "220 13% 91%",
        input: "220 13% 91%",
        ring: "262.1 83.3% 57.8%",
      },
      dark: {
        background: "224 71.4% 4.1%",
        foreground: "210 20% 98%",
        card: "224 71.4% 4.1%",
        "card-foreground": "210 20% 98%",
        popover: "224 71.4% 4.1%",
        "popover-foreground": "210 20% 98%",
        primary: "263.4 70% 50.4%",
        "primary-foreground": "210 20% 98%",
        secondary: "215 27.9% 16.9%",
        "secondary-foreground": "210 20% 98%",
        muted: "215 27.9% 16.9%",
        "muted-foreground": "217.9 10.6% 64.9%",
        accent: "215 27.9% 16.9%",
        "accent-foreground": "210 20% 98%",
        destructive: "0 62.8% 30.6%",
        border: "215 27.9% 16.9%",
        input: "215 27.9% 16.9%",
        ring: "263.4 70% 50.4%",
      }
    }
  },
];

function wrapHsl(value: string): string {
  if (value.startsWith("hsl(") || value.startsWith("oklch(") || value.startsWith("rgb(")) {
    return value;
  }
  return `hsl(${value})`;
}

export function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function buildCustomTheme(accentHsl: string): ThemePreset {
  const parts = accentHsl.split(" ");
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  const hsl = `${h} ${s}% ${l}%`;
  const fgHsl = l > 50 ? `${h} ${Math.min(s, 30)}% 10%` : `${h} ${Math.min(s, 20)}% 98%`;

  return {
    name: "Custom",
    value: "custom",
    preview: { bg: "#111", sidebar: "#111", accent: `hsl(${hsl})`, text: "#eee" },
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "240 10% 3.9%",
        card: "0 0% 100%",
        "card-foreground": "240 10% 3.9%",
        popover: "0 0% 100%",
        "popover-foreground": "240 10% 3.9%",
        primary: hsl,
        "primary-foreground": fgHsl,
        secondary: "240 4.8% 95.9%",
        "secondary-foreground": "240 5.9% 10%",
        muted: "240 4.8% 95.9%",
        "muted-foreground": "240 3.8% 46.1%",
        accent: "240 4.8% 95.9%",
        "accent-foreground": "240 5.9% 10%",
        destructive: "0 84.2% 60.2%",
        border: "240 5.9% 90%",
        input: "240 5.9% 90%",
        ring: hsl,
      },
      dark: {
        background: `${h} ${Math.min(s, 15)}% 4%`,
        foreground: "0 0% 95%",
        card: `${h} ${Math.min(s, 10)}% 8%`,
        "card-foreground": "0 0% 95%",
        popover: `${h} ${Math.min(s, 10)}% 6%`,
        "popover-foreground": "0 0% 95%",
        primary: hsl,
        "primary-foreground": fgHsl,
        secondary: `${h} ${Math.min(s, 8)}% 15%`,
        "secondary-foreground": "0 0% 98%",
        muted: `${h} ${Math.min(s, 8)}% 15%`,
        "muted-foreground": `${h} ${Math.min(s, 10)}% 64%`,
        accent: `${h} ${Math.min(s, 8)}% 15%`,
        "accent-foreground": "0 0% 98%",
        destructive: "0 62.8% 30.6%",
        border: `${h} ${Math.min(s, 8)}% 15%`,
        input: `${h} ${Math.min(s, 8)}% 15%`,
        ring: hsl,
      }
    }
  };
}

export function generateRandomTheme(): ThemePreset {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 35);
  const l = 45 + Math.floor(Math.random() * 20);
  const theme = buildCustomTheme(`${h} ${s} ${l}`);
  theme.name = "Random";
  theme.value = "random";
  return theme;
}

export function applyTheme(theme: ThemePreset, mode: "light" | "dark") {
  const root = document.documentElement;
  const vars = theme.cssVars[mode];

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, wrapHsl(value));
  });

  const bg = vars.background;
  const fg = vars.foreground;
  const primary = vars.primary;
  const primaryFg = vars["primary-foreground"];
  const accentVal = vars.accent;
  const accentFg = vars["accent-foreground"];
  const border = vars.border;

  root.style.setProperty("--sidebar", wrapHsl(mode === "dark" ? bg : "0 0% 98%"));
  root.style.setProperty("--sidebar-background", wrapHsl(mode === "dark" ? bg : "0 0% 98%"));
  root.style.setProperty("--sidebar-foreground", wrapHsl(fg));
  root.style.setProperty("--sidebar-primary", wrapHsl(primary));
  root.style.setProperty("--sidebar-primary-foreground", wrapHsl(primaryFg));
  root.style.setProperty("--sidebar-accent", wrapHsl(accentVal));
  root.style.setProperty("--sidebar-accent-foreground", wrapHsl(accentFg));
  root.style.setProperty("--sidebar-border", wrapHsl(border));
  root.style.setProperty("--sidebar-ring", wrapHsl(primary));

  root.setAttribute("data-theme", theme.value);
}
