import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
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
import {
  FONT_LS_KEY,
  applyFontOverride,
  resolveFontOverrideId,
} from "@/lib/font-options";
import { useLearningPreferences } from "@/hooks/use-learning-preferences";

interface ThemeProviderState {
  systemId: DesignSystemId;
  accentId: AccentId;
  setSystem: (id: string) => void;
  setAccent: (id: string) => void;
  systems: typeof DESIGN_SYSTEMS;
  accents: typeof ACCENTS;
  systemDefaultAccent: typeof SYSTEM_DEFAULT_ACCENT;
}

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
      if (event.key === FONT_LS_KEY || event.key === null) {
        applyFontOverride(resolveFontOverrideId(safeGetItem(FONT_LS_KEY)));
      }
      if (event.key !== null && event.key !== "ds-system" && event.key !== "ds-accent") return;

      if (syncTimer !== null) window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        // Coalesce the two native events from a paired system/accent change,
        // then resolve both values from the writer's completed storage state.
        const nextSystem = resolveSystemId(safeGetItem("ds-system"));
        const nextAccent = resolveAccentId(safeGetItem("ds-accent"), nextSystem);
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

/**
 * Adds signed-in persistence below ClerkProvider while ThemeProvider itself
 * remains usable during SSR and before Clerk mounts.
 */
export function AccountThemePreferenceBridge({ children }: { children: ReactNode }) {
  const theme = useContext(ThemeProviderContext);
  const {
    setSystem: applySystem,
    setAccent: applyAccent,
  } = theme;
  const {
    theme: accountTheme,
    isLoading,
    isAuthenticated,
    saveThemeAsync,
    refetch,
  } = useLearningPreferences();
  const localSelectionMade = useRef(false);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const selectedSystem = useRef(theme.systemId);
  const selectedAccent = useRef(theme.accentId);

  useEffect(() => {
    selectedSystem.current = theme.systemId;
    selectedAccent.current = theme.accentId;
  }, [theme.accentId, theme.systemId]);

  useEffect(() => {
    if (
      isLoading ||
      localSelectionMade.current ||
      !accountTheme ||
      !isSystemId(accountTheme.systemId) ||
      !isAccentId(accountTheme.accentId)
    ) return;
    selectedSystem.current = accountTheme.systemId;
    selectedAccent.current = accountTheme.accentId;
    applySystem(accountTheme.systemId);
    applyAccent(accountTheme.accentId);
  }, [accountTheme, applyAccent, applySystem, isLoading]);

  const persist = useCallback(
    (themeSystem: DesignSystemId, themeAccent: AccentId) => {
      if (!isAuthenticated) return;
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => saveThemeAsync({ themeSystem, themeAccent }))
        .catch(async () => {
          await refetch();
        });
    },
    [isAuthenticated, refetch, saveThemeAsync],
  );

  const setSystem = useCallback((id: string) => {
    if (!isSystemId(id)) return;
    localSelectionMade.current = true;
    const previousDefault =
      SYSTEM_DEFAULT_ACCENT[selectedSystem.current] || DEFAULT_ACCENT;
    const nextAccent =
      selectedAccent.current === previousDefault
        ? SYSTEM_DEFAULT_ACCENT[id] || DEFAULT_ACCENT
        : selectedAccent.current;
    selectedSystem.current = id;
    selectedAccent.current = nextAccent;
    applySystem(id);
    persist(id, nextAccent);
  }, [applySystem, persist]);

  const setAccent = useCallback((id: string) => {
    if (!isAccentId(id)) return;
    localSelectionMade.current = true;
    selectedAccent.current = id;
    applyAccent(id);
    persist(selectedSystem.current, id);
  }, [applyAccent, persist]);

  return (
    <ThemeProviderContext.Provider value={{ ...theme, setSystem, setAccent }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
