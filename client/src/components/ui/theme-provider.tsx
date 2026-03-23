import { createContext, useEffect, useState, useCallback, ReactNode } from "react";
import { themePresets, applyTheme, buildCustomTheme, generateRandomTheme, type ThemePreset } from "@/lib/shadcn-themes";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safeStorage";

export const FONT_OPTIONS = [
  { value: "inter", label: "Inter", family: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif", description: "Clean and modern, great readability" },
  { value: "dm-sans", label: "DM Sans", family: "'DM Sans', ui-sans-serif, system-ui, sans-serif", description: "Geometric, friendly and professional" },
  { value: "source-sans", label: "Source Sans 3", family: "'Source Sans 3', ui-sans-serif, system-ui, sans-serif", description: "Adobe's open-source workhorse" },
  { value: "ibm-plex", label: "IBM Plex Sans", family: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif", description: "Corporate, highly legible" },
  { value: "jetbrains", label: "JetBrains Mono", family: "'JetBrains Mono', ui-monospace, monospace", description: "Developer-focused monospace" },
  { value: "system", label: "System Default", family: "ui-sans-serif, system-ui, -apple-system, sans-serif", description: "Uses your device's native font" },
] as const;

type ThemeProviderState = {
  activeTheme: ThemePreset;
  setThemeByValue: (value: string) => void;
  setCustomColor: (hex: string) => void;
  randomizeTheme: () => void;
  presets: ThemePreset[];
  customHex: string;
  activeFont: string;
  setFont: (fontValue: string) => void;
};

const initialState: ThemeProviderState = {
  activeTheme: themePresets[0],
  setThemeByValue: () => null,
  setCustomColor: () => null,
  randomizeTheme: () => null,
  presets: themePresets,
  customHex: "",
  activeFont: "inter",
  setFont: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function applyFont(fontValue: string) {
  const fontOption = FONT_OPTIONS.find(f => f.value === fontValue);
  if (!fontOption) return;
  document.documentElement.style.setProperty('--font-sans', fontOption.family);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [customHex, setCustomHexState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return safeGetItem("theme-custom-hex") || "";
  });

  const [activeFont, setActiveFont] = useState<string>(() => {
    if (typeof window === "undefined") return "inter";
    return safeGetItem("app-font") || "inter";
  });

  const [activeTheme, setActiveTheme] = useState<ThemePreset>(() => {
    if (typeof window === "undefined") return themePresets[0];
    const saved = safeGetItem("theme-preset") || "cyberpunk";
    if (saved === "custom") {
      const hex = safeGetItem("theme-custom-hex") || "#3b82f6";
      return buildCustomTheme(hex);
    }
    if (saved === "random") {
      const savedTheme = safeGetItem("theme-random-json");
      if (savedTheme) {
        try { return JSON.parse(savedTheme); } catch {}
      }
      return generateRandomTheme();
    }
    return themePresets.find(t => t.value === saved) || themePresets[0];
  });

  const setThemeByValue = useCallback((value: string) => {
    const preset = themePresets.find(t => t.value === value);
    if (preset) {
      setActiveTheme(preset);
      setCustomHexState("");
      safeSetItem("theme-preset", value);
      safeRemoveItem("theme-custom-hex");
    }
  }, []);

  const setCustomColor = useCallback((hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex) && !/^#[0-9a-fA-F]{3}$/.test(hex)) return;
    setCustomHexState(hex);
    safeSetItem("theme-custom-hex", hex);
    const theme = buildCustomTheme(hex);
    setActiveTheme(theme);
    safeSetItem("theme-preset", "custom");
  }, []);

  const randomizeTheme = useCallback(() => {
    const theme = generateRandomTheme();
    safeSetItem("theme-random-json", JSON.stringify(theme));
    safeSetItem("theme-preset", "random");
    setActiveTheme(theme);
  }, []);

  const setFont = useCallback((fontValue: string) => {
    setActiveFont(fontValue);
    safeSetItem("app-font", fontValue);
    applyFont(fontValue);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
  }, []);

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    applyFont(activeFont);
  }, [activeFont]);

  return (
    <ThemeProviderContext.Provider value={{
      activeTheme,
      setThemeByValue,
      setCustomColor,
      randomizeTheme,
      presets: themePresets,
      customHex,
      activeFont,
      setFont,
    }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
