import { createContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  DESIGN_SYSTEMS,
  ACCENTS,
  SYSTEM_DEFAULT_ACCENT,
  DEFAULT_SYSTEM,
  DEFAULT_ACCENT,
  applyDesignSystem,
  isSystemId,
  type DesignSystemId,
  type AccentId,
} from "@/lib/design-system";
import { safeGetItem } from "@/lib/safeStorage";
import { loadDesignSystemFont } from "@/lib/font-options";

type ThemeProviderState = {
  systemId: DesignSystemId;
  accentId: AccentId;
  setSystem: (id: string) => void;
  setAccent: (id: string) => void;
  systems: typeof DESIGN_SYSTEMS;
  accents: typeof ACCENTS;
  systemDefaultAccent: typeof SYSTEM_DEFAULT_ACCENT;
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

function readInitial<T extends string>(
  key: string,
  fallback: T,
  valid: (v: string) => v is T,
): T {
  if (typeof window === "undefined") return fallback;
  const saved = safeGetItem(key);
  return saved && valid(saved) ? saved : fallback;
}

function isAccentId(id: string): id is AccentId {
  return ACCENTS.some((a) => a.id === id);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemId, setSystemId] = useState<DesignSystemId>(() =>
    readInitial("ds-system", DEFAULT_SYSTEM, isSystemId)
  );

  const [accentId, setAccentId] = useState<AccentId>(() =>
    readInitial("ds-accent", DEFAULT_ACCENT, isAccentId)
  );

  useEffect(() => {
    applyDesignSystem(systemId, accentId);
  }, [systemId, accentId]);

  const setSystem = useCallback((id: string) => {
    if (!isSystemId(id)) return;
    loadDesignSystemFont(id);
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
    if (!isAccentId(id)) return;
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
