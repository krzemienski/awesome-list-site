import { createContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  DESIGN_SYSTEMS,
  ACCENTS,
  SYSTEM_DEFAULT_ACCENT,
  DEFAULT_SYSTEM,
  DEFAULT_ACCENT,
  applyDesignSystem,
  type DesignSystem,
  type Accent,
} from "@/lib/design-system";
import { safeGetItem } from "@/lib/safeStorage";

type ThemeProviderState = {
  systemId: string;
  accentId: string;
  setSystem: (id: string) => void;
  setAccent: (id: string) => void;
  systems: Record<string, DesignSystem>;
  accents: Accent[];
  systemDefaultAccent: Record<string, string>;
};

const initialState: ThemeProviderState = {
  systemId: DEFAULT_SYSTEM,
  accentId: DEFAULT_ACCENT,
  setSystem: () => null,
  setAccent: () => null,
  systems: DESIGN_SYSTEMS,
  accents: ACCENTS,
  systemDefaultAccent: SYSTEM_DEFAULT_ACCENT,
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function readInitial(key: string, fallback: string, valid: (v: string) => boolean): string {
  if (typeof window === "undefined") return fallback;
  const saved = safeGetItem(key);
  return saved && valid(saved) ? saved : fallback;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemId, setSystemId] = useState<string>(() =>
    readInitial("ds-system", DEFAULT_SYSTEM, (v) => v in DESIGN_SYSTEMS)
  );

  const [accentId, setAccentId] = useState<string>(() =>
    readInitial("ds-accent", DEFAULT_ACCENT, (v) => ACCENTS.some((a) => a.id === v))
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
  }, []);

  useEffect(() => {
    applyDesignSystem(systemId, accentId);
  }, [systemId, accentId]);

  const setSystem = useCallback((id: string) => {
    if (!(id in DESIGN_SYSTEMS)) return;
    setSystemId(id);
    /* On system change, nudge the accent to the system's natural default
       only if the user is still on the previous system's natural default.
       Otherwise respect their explicit accent choice across systems. */
    setAccentId((prev) => {
      const prevDefault = SYSTEM_DEFAULT_ACCENT[systemId] || DEFAULT_ACCENT;
      const newDefault  = SYSTEM_DEFAULT_ACCENT[id] || DEFAULT_ACCENT;
      return prev === prevDefault ? newDefault : prev;
    });
  }, [systemId]);

  const setAccent = useCallback((id: string) => {
    if (!ACCENTS.some((a) => a.id === id)) return;
    setAccentId(id);
  }, []);

  return (
    <ThemeProviderContext.Provider
      value={{
        systemId,
        accentId,
        setSystem,
        setAccent,
        systems: DESIGN_SYSTEMS,
        accents: ACCENTS,
        systemDefaultAccent: SYSTEM_DEFAULT_ACCENT,
      }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}
