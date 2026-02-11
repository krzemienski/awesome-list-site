export interface ThemePreset {
  name: string;
  value: string;
  description: string;
  preview: { bg: string; sidebar: string; accent: string; text: string; secondary: string };
  cssVars: Record<string, string>;
  font?: string;
  radius?: string;
}

export const themePresets: ThemePreset[] = [
  {
    name: "Cyberpunk",
    value: "cyberpunk",
    description: "Neon red on deep black — high contrast terminal aesthetic",
    preview: { bg: "#000000", sidebar: "#0a0a0a", accent: "#ff003c", text: "#ffffff", secondary: "#1a1a2e" },
    font: "'JetBrains Mono', ui-monospace, monospace",
    radius: "0.25rem",
    cssVars: {
      background: "oklch(0% 0 0)",
      foreground: "oklch(98% 0 0)",
      card: "oklch(10% 0.005 0)",
      "card-foreground": "oklch(98% 0 0)",
      popover: "oklch(7% 0.005 0)",
      "popover-foreground": "oklch(98% 0 0)",
      primary: "oklch(59% 0.28 18)",
      "primary-foreground": "oklch(98% 0 0)",
      secondary: "oklch(18% 0.02 280)",
      "secondary-foreground": "oklch(90% 0 0)",
      muted: "oklch(18% 0.01 0)",
      "muted-foreground": "oklch(65% 0.01 0)",
      accent: "oklch(22% 0.03 280)",
      "accent-foreground": "oklch(90% 0 0)",
      destructive: "oklch(55% 0.22 30)",
      "destructive-foreground": "oklch(98% 0 0)",
      border: "oklch(22% 0.02 0)",
      input: "oklch(22% 0.02 0)",
      ring: "oklch(59% 0.28 18)",
      "chart-1": "oklch(59% 0.28 18)",
      "chart-2": "oklch(70% 0.18 150)",
      "chart-3": "oklch(65% 0.2 260)",
      "chart-4": "oklch(80% 0.15 85)",
      "chart-5": "oklch(65% 0.22 300)",
    }
  },
  {
    name: "Limes",
    value: "limes",
    description: "Electric lime green on pure black — nature meets neon",
    preview: { bg: "#09090b", sidebar: "#0a0a0a", accent: "#65a30d", text: "#fafafa", secondary: "#1c1c22" },
    font: "'Geist', 'Inter', ui-sans-serif, system-ui, sans-serif",
    radius: "0.5rem",
    cssVars: {
      background: "oklch(0.13 0.028 261.69)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.13 0.028 261.69)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.13 0.028 261.69)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.648 0.15 131.684)",
      "primary-foreground": "oklch(0.253 0.042 131.684)",
      secondary: "oklch(0.268 0.019 261.69)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.268 0.019 261.69)",
      "muted-foreground": "oklch(0.651 0.019 261.69)",
      accent: "oklch(0.268 0.019 261.69)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      "destructive-foreground": "oklch(0.985 0 0)",
      border: "oklch(0.363 0.019 261.69)",
      input: "oklch(0.363 0.019 261.69)",
      ring: "oklch(0.648 0.15 131.684)",
      "chart-1": "oklch(0.648 0.15 131.684)",
      "chart-2": "oklch(0.6 0.118 184.714)",
      "chart-3": "oklch(0.398 0.07 227.392)",
      "chart-4": "oklch(0.828 0.189 84.429)",
      "chart-5": "oklch(0.769 0.188 70.08)",
    }
  },
  {
    name: "Black & Pink",
    value: "black-pink",
    description: "Hot magenta on midnight black — bold and expressive",
    preview: { bg: "#09090b", sidebar: "#0a0a0a", accent: "#ec4899", text: "#fafafa", secondary: "#1c1c22" },
    font: "'Inter', ui-sans-serif, system-ui, sans-serif",
    radius: "0.5rem",
    cssVars: {
      background: "oklch(0.13 0.028 261.69)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.178 0.019 261.69)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.178 0.019 261.69)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.718 0.202 349.761)",
      "primary-foreground": "oklch(0.253 0.042 349.761)",
      secondary: "oklch(0.268 0.019 261.69)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.268 0.019 261.69)",
      "muted-foreground": "oklch(0.651 0.019 261.69)",
      accent: "oklch(0.268 0.019 261.69)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      "destructive-foreground": "oklch(0.985 0 0)",
      border: "oklch(0.363 0.019 261.69)",
      input: "oklch(0.363 0.019 261.69)",
      ring: "oklch(0.718 0.202 349.761)",
      "chart-1": "oklch(0.718 0.202 349.761)",
      "chart-2": "oklch(0.6 0.118 184.714)",
      "chart-3": "oklch(0.398 0.07 227.392)",
      "chart-4": "oklch(0.828 0.189 84.429)",
      "chart-5": "oklch(0.769 0.188 70.08)",
    }
  },
  {
    name: "Flat Pink",
    value: "flat-pink",
    description: "Soft rose on charcoal — elegant and understated",
    preview: { bg: "#0c0a09", sidebar: "#1c1917", accent: "#f472b6", text: "#fafaf9", secondary: "#292524" },
    font: "'Inter', ui-sans-serif, system-ui, sans-serif",
    radius: "0.375rem",
    cssVars: {
      background: "oklch(0.16 0.011 56)",
      foreground: "oklch(0.985 0.001 106.423)",
      card: "oklch(0.2 0.009 56)",
      "card-foreground": "oklch(0.985 0.001 106.423)",
      popover: "oklch(0.2 0.009 56)",
      "popover-foreground": "oklch(0.985 0.001 106.423)",
      primary: "oklch(0.718 0.176 349)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.269 0.008 34.298)",
      "secondary-foreground": "oklch(0.985 0.001 106.423)",
      muted: "oklch(0.269 0.008 34.298)",
      "muted-foreground": "oklch(0.553 0.013 73.387)",
      accent: "oklch(0.269 0.008 34.298)",
      "accent-foreground": "oklch(0.985 0.001 106.423)",
      destructive: "oklch(0.704 0.191 22.216)",
      "destructive-foreground": "oklch(0.985 0 0)",
      border: "oklch(0.318 0.009 56)",
      input: "oklch(0.318 0.009 56)",
      ring: "oklch(0.718 0.176 349)",
      "chart-1": "oklch(0.718 0.176 349)",
      "chart-2": "oklch(0.6 0.118 184.714)",
      "chart-3": "oklch(0.398 0.07 227.392)",
      "chart-4": "oklch(0.828 0.189 84.429)",
      "chart-5": "oklch(0.769 0.188 70.08)",
    }
  },
  {
    name: "Purples",
    value: "purples",
    description: "Rich violet on deep indigo — cosmic and immersive",
    preview: { bg: "#09090b", sidebar: "#0f0f23", accent: "#a855f7", text: "#fafafa", secondary: "#1e1b4b" },
    font: "'Inter', ui-sans-serif, system-ui, sans-serif",
    radius: "0.5rem",
    cssVars: {
      background: "oklch(0.13 0.028 261.69)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.178 0.028 261.69)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.178 0.028 261.69)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: "oklch(0.627 0.235 303.9)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.268 0.032 261.69)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.268 0.032 261.69)",
      "muted-foreground": "oklch(0.651 0.019 261.69)",
      accent: "oklch(0.268 0.032 261.69)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      "destructive-foreground": "oklch(0.985 0 0)",
      border: "oklch(0.363 0.032 261.69)",
      input: "oklch(0.363 0.032 261.69)",
      ring: "oklch(0.627 0.235 303.9)",
      "chart-1": "oklch(0.627 0.235 303.9)",
      "chart-2": "oklch(0.541 0.281 293.009)",
      "chart-3": "oklch(0.398 0.07 227.392)",
      "chart-4": "oklch(0.828 0.189 84.429)",
      "chart-5": "oklch(0.769 0.188 70.08)",
    }
  },
  {
    name: "Flat Purples",
    value: "flat-purples",
    description: "Muted lavender on slate — refined and calm",
    preview: { bg: "#0c0a09", sidebar: "#1c1917", accent: "#8b5cf6", text: "#fafaf9", secondary: "#292524" },
    font: "'Inter', ui-sans-serif, system-ui, sans-serif",
    radius: "0.375rem",
    cssVars: {
      background: "oklch(0.16 0.011 56)",
      foreground: "oklch(0.985 0.001 106.423)",
      card: "oklch(0.2 0.011 56)",
      "card-foreground": "oklch(0.985 0.001 106.423)",
      popover: "oklch(0.2 0.011 56)",
      "popover-foreground": "oklch(0.985 0.001 106.423)",
      primary: "oklch(0.585 0.233 292.8)",
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.269 0.008 34.298)",
      "secondary-foreground": "oklch(0.985 0.001 106.423)",
      muted: "oklch(0.269 0.008 34.298)",
      "muted-foreground": "oklch(0.553 0.013 73.387)",
      accent: "oklch(0.269 0.008 34.298)",
      "accent-foreground": "oklch(0.985 0.001 106.423)",
      destructive: "oklch(0.704 0.191 22.216)",
      "destructive-foreground": "oklch(0.985 0 0)",
      border: "oklch(0.318 0.011 56)",
      input: "oklch(0.318 0.011 56)",
      ring: "oklch(0.585 0.233 292.8)",
      "chart-1": "oklch(0.585 0.233 292.8)",
      "chart-2": "oklch(0.541 0.281 293.009)",
      "chart-3": "oklch(0.398 0.07 227.392)",
      "chart-4": "oklch(0.828 0.189 84.429)",
      "chart-5": "oklch(0.769 0.188 70.08)",
    }
  },
];

export function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;
  const vars = theme.cssVars;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  const bg = vars.background;
  const fg = vars.foreground;
  const primary = vars.primary;
  const primaryFg = vars["primary-foreground"];
  const accentVal = vars.accent;
  const accentFg = vars["accent-foreground"];
  const border = vars.border;

  root.style.setProperty("--sidebar", bg);
  root.style.setProperty("--sidebar-background", bg);
  root.style.setProperty("--sidebar-foreground", fg);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-primary-foreground", primaryFg);
  root.style.setProperty("--sidebar-accent", accentVal);
  root.style.setProperty("--sidebar-accent-foreground", accentFg);
  root.style.setProperty("--sidebar-border", border);
  root.style.setProperty("--sidebar-ring", primary);

  if (theme.font) {
    root.style.setProperty("--font-sans", theme.font);
  }
  if (theme.radius) {
    root.style.setProperty("--radius", theme.radius);
  }

  root.setAttribute("data-theme", theme.value);
}

export function hexToOklch(hex: string): string {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const cbrtL = Math.cbrt(l), cbrtM = Math.cbrt(m), cbrtS = Math.cbrt(s);
  const L = 0.2104542553 * cbrtL + 0.7936177850 * cbrtM - 0.0040720468 * cbrtS;
  const a = 1.9779984951 * cbrtL - 2.4285922050 * cbrtM + 0.4505937099 * cbrtS;
  const bVal = 0.0259040371 * cbrtL + 0.7827717662 * cbrtM - 0.8086757660 * cbrtS;

  const C = Math.sqrt(a * a + bVal * bVal);
  let H = Math.atan2(bVal, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

export function buildCustomTheme(hex: string): ThemePreset {
  const primary = hexToOklch(hex);
  return {
    name: "Custom",
    value: "custom",
    description: "Your custom accent color",
    preview: { bg: "#0a0a0a", sidebar: "#0a0a0a", accent: hex, text: "#fafafa", secondary: "#1c1c22" },
    cssVars: {
      background: "oklch(0.13 0.028 261.69)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.178 0.019 261.69)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.178 0.019 261.69)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: primary,
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.268 0.019 261.69)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.268 0.019 261.69)",
      "muted-foreground": "oklch(0.651 0.019 261.69)",
      accent: "oklch(0.268 0.019 261.69)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      "destructive-foreground": "oklch(0.985 0 0)",
      border: "oklch(0.363 0.019 261.69)",
      input: "oklch(0.363 0.019 261.69)",
      ring: primary,
      "chart-1": primary,
      "chart-2": "oklch(0.6 0.118 184.714)",
      "chart-3": "oklch(0.398 0.07 227.392)",
      "chart-4": "oklch(0.828 0.189 84.429)",
      "chart-5": "oklch(0.769 0.188 70.08)",
    }
  };
}

export function generateRandomTheme(): ThemePreset {
  const h = Math.floor(Math.random() * 360);
  const c = 0.15 + Math.random() * 0.15;
  const l = 0.5 + Math.random() * 0.2;
  const primary = `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h})`;
  const hue2rgb = (p: number, q: number, t: number) => { if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p; };
  const s2 = c / 0.3;
  const q = l < 0.5 ? l * (1 + s2) : l + s2 - l * s2;
  const p = 2 * l - q;
  const rr = hue2rgb(p, q, h/360 + 1/3);
  const gg = hue2rgb(p, q, h/360);
  const bb = hue2rgb(p, q, h/360 - 1/3);
  const toHex2 = (v: number) => Math.min(255, Math.max(0, Math.round(v * 255))).toString(16).padStart(2, '0');
  const hex = `#${toHex2(rr)}${toHex2(gg)}${toHex2(bb)}`;

  return {
    name: "Random",
    value: "random",
    description: "A randomly generated accent color",
    preview: { bg: "#0a0a0a", sidebar: "#0a0a0a", accent: hex, text: "#fafafa", secondary: "#1c1c22" },
    cssVars: {
      background: "oklch(0.13 0.028 261.69)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.178 0.019 261.69)",
      "card-foreground": "oklch(0.985 0 0)",
      popover: "oklch(0.178 0.019 261.69)",
      "popover-foreground": "oklch(0.985 0 0)",
      primary: primary,
      "primary-foreground": "oklch(0.985 0 0)",
      secondary: "oklch(0.268 0.019 261.69)",
      "secondary-foreground": "oklch(0.985 0 0)",
      muted: "oklch(0.268 0.019 261.69)",
      "muted-foreground": "oklch(0.651 0.019 261.69)",
      accent: "oklch(0.268 0.019 261.69)",
      "accent-foreground": "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      "destructive-foreground": "oklch(0.985 0 0)",
      border: "oklch(0.363 0.019 261.69)",
      input: "oklch(0.363 0.019 261.69)",
      ring: primary,
      "chart-1": primary,
      "chart-2": "oklch(0.6 0.118 184.714)",
      "chart-3": "oklch(0.398 0.07 227.392)",
      "chart-4": "oklch(0.828 0.189 84.429)",
      "chart-5": "oklch(0.769 0.188 70.08)",
    }
  };
}

export function getThemeCssExport(theme: ThemePreset): string {
  const lines = Object.entries(theme.cssVars)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");

  const sidebarLines = [
    `  --sidebar: ${theme.cssVars.background};`,
    `  --sidebar-background: ${theme.cssVars.background};`,
    `  --sidebar-foreground: ${theme.cssVars.foreground};`,
    `  --sidebar-primary: ${theme.cssVars.primary};`,
    `  --sidebar-primary-foreground: ${theme.cssVars["primary-foreground"]};`,
    `  --sidebar-accent: ${theme.cssVars.accent};`,
    `  --sidebar-accent-foreground: ${theme.cssVars["accent-foreground"]};`,
    `  --sidebar-border: ${theme.cssVars.border};`,
    `  --sidebar-ring: ${theme.cssVars.primary};`,
  ].join("\n");

  return `.dark {\n${lines}\n${sidebarLines}\n${theme.radius ? `  --radius: ${theme.radius};` : ""}\n}`;
}
