import { createContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  DESIGN_SYSTEMS,
  ACCENTS,
  SYSTEM_DEFAULT_ACCENT,
  DEFAULT_SYSTEM,
  DEFAULT_ACCENT,
  PRODUCT_PROFILES,
  applyDesignSystem,
  resolveProductProfile,
  isSystemId,
  isAccentId,
  resolveSystemId,
  resolveAccentId,
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initialProfile =
    PRODUCT_PROFILES[
      resolveProductProfile(typeof window === "undefined" ? "/" : window.location.pathname)
    ];
  const [systemId, setSystemId] = useState<DesignSystemId>(() =>
    readInitial("ds-system", initialProfile.defaultSystem ?? DEFAULT_SYSTEM, isSystemId)
  );

  const [accentId, setAccentId] = useState<AccentId>(() =>
    readInitial("ds-accent", initialProfile.defaultAccent ?? DEFAULT_ACCENT, isAccentId)
  );

  useEffect(() => {
    applyDesignSystem(systemId, accentId);
  }, [systemId, accentId]);

  useEffect(() => {
    let syncTimer: number | null = null;

    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (event.key !== null && event.key !== "ds-system" && event.key !== "ds-accent") return;

      if (syncTimer !== null) window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        // Coalesce the two native events from a paired system/accent change,
        // then resolve both values from the writer's completed storage state.
        const nextSystem = resolveSystemId(safeGetItem("ds-system"));
        const nextAccent = resolveAccentId(safeGetItem("ds-accent"), nextSystem);
        loadDesignSystemFont(resolveSystemId(nextSystem));
        setSystemId(nextSystem);
        setAccentId(nextAccent);
        syncTimer = null;
      }, 0);
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      if (syncTimer !== null) window.clearTimeout(syncTimer);
    };
  }, []);

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
