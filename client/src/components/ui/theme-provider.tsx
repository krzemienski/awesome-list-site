import { createContext, useEffect, useState, useCallback, ReactNode } from "react";
import { themePresets, applyTheme, buildCustomTheme, generateRandomTheme, type ThemePreset } from "@/lib/shadcn-themes";

type ThemeProviderState = {
  activeTheme: ThemePreset;
  setThemeByValue: (value: string) => void;
  setCustomColor: (hex: string) => void;
  randomizeTheme: () => void;
  presets: ThemePreset[];
  customHex: string;
};

const initialState: ThemeProviderState = {
  activeTheme: themePresets[0],
  setThemeByValue: () => null,
  setCustomColor: () => null,
  randomizeTheme: () => null,
  presets: themePresets,
  customHex: "",
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [customHex, setCustomHexState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("theme-custom-hex") || "";
  });

  const [activeTheme, setActiveTheme] = useState<ThemePreset>(() => {
    if (typeof window === "undefined") return themePresets[0];
    const saved = localStorage.getItem("theme-preset") || "cyberpunk";
    if (saved === "custom") {
      const hex = localStorage.getItem("theme-custom-hex") || "#3b82f6";
      return buildCustomTheme(hex);
    }
    if (saved === "random") {
      const savedTheme = localStorage.getItem("theme-random-json");
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
      localStorage.setItem("theme-preset", value);
      localStorage.removeItem("theme-custom-hex");
    }
  }, []);

  const setCustomColor = useCallback((hex: string) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex) && !/^#[0-9a-fA-F]{3}$/.test(hex)) return;
    setCustomHexState(hex);
    localStorage.setItem("theme-custom-hex", hex);
    const theme = buildCustomTheme(hex);
    setActiveTheme(theme);
    localStorage.setItem("theme-preset", "custom");
  }, []);

  const randomizeTheme = useCallback(() => {
    const theme = generateRandomTheme();
    localStorage.setItem("theme-random-json", JSON.stringify(theme));
    localStorage.setItem("theme-preset", "random");
    setActiveTheme(theme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
  }, []);

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  return (
    <ThemeProviderContext.Provider value={{
      activeTheme,
      setThemeByValue,
      setCustomColor,
      randomizeTheme,
      presets: themePresets,
      customHex,
    }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
