import { createContext, useEffect, useState, useCallback, ReactNode } from "react";
import { themePresets, applyTheme, buildCustomTheme, generateRandomTheme, hexToHsl, type ThemePreset } from "@/lib/shadcn-themes";

type Mode = "dark" | "light" | "system";

function hslToHex(hsl: string): string {
  const parts = hsl.split(/[\s%]+/).filter(Boolean);
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

type ThemeProviderState = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  activeTheme: ThemePreset;
  setThemeByValue: (value: string) => void;
  setCustomColor: (hex: string) => void;
  randomizeTheme: () => void;
  resolvedMode: "dark" | "light";
  presets: ThemePreset[];
  customHex: string;
};

const initialState: ThemeProviderState = {
  mode: "dark",
  setMode: () => null,
  activeTheme: themePresets[0],
  setThemeByValue: () => null,
  setCustomColor: () => null,
  randomizeTheme: () => null,
  resolvedMode: "dark",
  presets: themePresets,
  customHex: "",
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getSystemMode(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("theme-mode") as Mode) || "dark";
  });

  const [customHex, setCustomHexState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("theme-custom-hex") || "";
  });

  const [activeTheme, setActiveTheme] = useState<ThemePreset>(() => {
    if (typeof window === "undefined") return themePresets[0];
    const saved = localStorage.getItem("theme-preset") || "orange";
    if (saved === "custom") {
      const hex = localStorage.getItem("theme-custom-hex") || "#3b82f6";
      return buildCustomTheme(hexToHsl(hex));
    }
    if (saved === "random") {
      const savedRandom = localStorage.getItem("theme-random-hsl");
      if (savedRandom) return buildCustomTheme(savedRandom);
      return generateRandomTheme();
    }
    return themePresets.find(t => t.value === saved) || themePresets[0];
  });

  const resolvedMode = mode === "system" ? getSystemMode() : mode;

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem("theme-mode", newMode);
  };

  const setThemeByValue = useCallback((value: string) => {
    const preset = themePresets.find(t => t.value === value);
    if (preset) {
      setActiveTheme(preset);
      setCustomHexState("");
      localStorage.setItem("theme-preset", value);
      localStorage.removeItem("theme-custom-hex");
    }
  }, []);

  const setCustomColor = useCallback((hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex) && !/^#[0-9a-fA-F]{3}$/.test(hex)) return;
    setCustomHexState(hex);
    localStorage.setItem("theme-custom-hex", hex);
    const hsl = hexToHsl(hex);
    const theme = buildCustomTheme(hsl);
    setActiveTheme(theme);
    localStorage.setItem("theme-preset", "custom");
  }, []);

  const randomizeTheme = useCallback(() => {
    const theme = generateRandomTheme();
    const hsl = theme.cssVars.dark.primary;
    localStorage.setItem("theme-random-hsl", hsl);
    localStorage.setItem("theme-preset", "random");
    const hex = hslToHex(hsl);
    setCustomHexState(hex);
    localStorage.setItem("theme-custom-hex", hex);
    setActiveTheme(theme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedMode);
  }, [resolvedMode]);

  useEffect(() => {
    applyTheme(activeTheme, resolvedMode);
  }, [activeTheme, resolvedMode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      const resolved = mq.matches ? "dark" : "light";
      root.classList.add(resolved);
      applyTheme(activeTheme, resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, activeTheme]);

  return (
    <ThemeProviderContext.Provider value={{
      mode,
      setMode,
      activeTheme,
      setThemeByValue,
      setCustomColor,
      randomizeTheme,
      resolvedMode,
      presets: themePresets,
      customHex,
    }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
