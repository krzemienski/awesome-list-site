import { createContext, useEffect, useState, ReactNode } from "react";
import { shadcnThemes, applyTheme, type ShadcnTheme } from "@/lib/shadcn-themes";

type Mode = "dark" | "light" | "system";

type ThemeProviderState = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  resolvedMode: "dark" | "light";
  availableColors: ShadcnTheme[];
};

const initialState: ThemeProviderState = {
  mode: "dark",
  setMode: () => null,
  accentColor: "orange",
  setAccentColor: () => null,
  resolvedMode: "dark",
  availableColors: shadcnThemes,
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

  const [accentColor, setAccentColorState] = useState<string>(() => {
    if (typeof window === "undefined") return "orange";
    return localStorage.getItem("theme-accent") || "orange";
  });

  const resolvedMode = mode === "system" ? getSystemMode() : mode;

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem("theme-mode", newMode);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem("theme-accent", color);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedMode);
  }, [resolvedMode]);

  useEffect(() => {
    const theme = shadcnThemes.find(t => t.value === accentColor);
    if (theme) {
      applyTheme(theme, resolvedMode);
    }
  }, [accentColor, resolvedMode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      const resolved = mq.matches ? "dark" : "light";
      root.classList.add(resolved);
      const theme = shadcnThemes.find(t => t.value === accentColor);
      if (theme) applyTheme(theme, resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, accentColor]);

  return (
    <ThemeProviderContext.Provider value={{
      mode,
      setMode,
      accentColor,
      setAccentColor,
      resolvedMode,
      availableColors: shadcnThemes,
    }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
