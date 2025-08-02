import { createContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";
type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  actualTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  actualTheme: "dark",
  setTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  
  // Determine the actual theme based on system preference when theme is "system"
  const getActualTheme = (theme: Theme): "dark" | "light" => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };
  
  const [actualTheme, setActualTheme] = useState<"dark" | "light">(() => getActualTheme(theme));
  
  // Initialize theme from localStorage or default
  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (storedTheme && ["dark", "light", "system"].includes(storedTheme)) {
      setTheme(storedTheme);
    }
  }, [storageKey]);
  
  // Apply theme changes to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    const newActualTheme = getActualTheme(theme);
    
    setActualTheme(newActualTheme);
    root.classList.remove("light", "dark");
    root.classList.add(newActualTheme);
    
    // Update color-scheme for better browser integration
    root.style.colorScheme = newActualTheme;
  }, [theme]);
  
  // Listen for system theme changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const newActualTheme = e.matches ? "dark" : "light";
      setActualTheme(newActualTheme);
      
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newActualTheme);
      root.style.colorScheme = newActualTheme;
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);
  
  const value = {
    theme,
    actualTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };
  
  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
