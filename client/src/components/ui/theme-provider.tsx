import { createContext, useEffect, ReactNode } from "react";

type Theme = "dark" | "light" | "system";
type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Always force dark mode
    root.classList.remove("light");
    root.classList.add("dark");
  }, []);
  
  const value = {
    theme: "dark" as Theme,
    setTheme: () => {
      // No-op - dark mode only
    },
  };
  
  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
