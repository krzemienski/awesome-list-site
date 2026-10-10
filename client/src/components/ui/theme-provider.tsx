import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import {
  DEFAULT_ACCENT,
  DEFAULT_SYSTEM,
  THEME_BOOT_DATA,
  getAccents,
  getDesignSystems,
  getSystemDefaultAccent,
  getSystemDefaultAccents,
  isAccentId,
  isSystemId,
  readAppliedTheme,
  resolveAccentId,
  resolveSystemId,
  selectSystem,
  setAccent as persistAccent,
  type AccentId,
  type DesignSystemId,
} from "@/lib/design-system";
import { safeGetItem } from "@/lib/safeStorage";
import {
  FONT_LS_KEY,
  applyFontOverride,
  reapplyStoredFontOverride,
  resolveFontOverrideId,
} from "@/lib/font-options";
import { useLearningPreferences } from "@/hooks/use-learning-preferences";
import { ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

interface ThemeProviderState {
  accountSync: "local" | "syncing" | "saved" | "failed";
  accountSyncError: string | null;
  retryAccountSync: () => void;
  systemId: DesignSystemId;
  accentId: AccentId;
  setSystem: (id: string) => void;
  setAccent: (id: string) => void;
  systems: ReturnType<typeof getDesignSystems>;
  accents: ReturnType<typeof getAccents>;
  systemDefaultAccent: ReturnType<typeof getSystemDefaultAccents>;
}

const initialState: ThemeProviderState = {
  accountSync: "local",
  accountSyncError: null,
  retryAccountSync: () => null,
  systemId: DEFAULT_SYSTEM,
  accentId: DEFAULT_ACCENT,
  setSystem: () => null,
  setAccent: () => null,
  systems: getDesignSystems(),
  accents: getAccents(),
  systemDefaultAccent: getSystemDefaultAccents(),
};

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * The boot script in client/index.html has already applied the visitor's
 * system and accent to <html> before React runs, so the provider adopts that
 * state and never re-applies a different one on mount. On the server there is
 * no document; editorial + crimson is what the server renders.
 */
function readInitialTheme(): { system: DesignSystemId; accent: AccentId } {
  if (typeof document === "undefined") return { system: DEFAULT_SYSTEM, accent: DEFAULT_ACCENT };
  return readAppliedTheme();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(readInitialTheme);
  const { system: systemId, accent: accentId } = theme;

  // The public switch API (`window.applyDesignSystem`) writes the <html>
  // attributes directly, and `storage` events never fire in the document that
  // wrote them, so mirror the document's attributes back into state. The
  // applier also clears --font-body, so re-assert a stored font override after
  // every apply — one code path for every way a switch can happen.
  useEffect(() => {
    const root = document.documentElement;
    const syncFromDocument = () => {
      reapplyStoredFontOverride();
      const next = readAppliedTheme();
      setTheme((prev) =>
        prev.system === next.system && prev.accent === next.accent ? prev : next,
      );
    };
    syncFromDocument();
    const observer = new MutationObserver(syncFromDocument);
    observer.observe(root, { attributes: true, attributeFilter: ["data-system", "data-accent"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let syncTimer: number | null = null;

    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (event.key === FONT_LS_KEY || event.key === null) {
        applyFontOverride(resolveFontOverrideId(safeGetItem(FONT_LS_KEY)));
      }
      if (event.key !== null && event.key !== THEME_BOOT_DATA.systemKey && event.key !== THEME_BOOT_DATA.accentKey) return;

      if (syncTimer !== null) window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        // Coalesce the two native events from a paired system/accent change,
        // then resolve both values from the writer's completed storage state.
        const nextSystem = resolveSystemId(safeGetItem(THEME_BOOT_DATA.systemKey));
        const nextAccent = resolveAccentId(safeGetItem(THEME_BOOT_DATA.accentKey), nextSystem);
        window.applyDesignSystem?.(nextSystem, nextAccent);
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
    // selectSystem persists ds-system/ds-accent, shifts the accent only when
    // it was still the previous system's natural default, and applies.
    selectSystem(id);
  }, []);

  const setAccent = useCallback((id: string) => {
    persistAccent(id);
  }, []);

  return (
    <ThemeProviderContext.Provider
      value={{
        accountSync: "local",
        accountSyncError: null,
        retryAccountSync: () => null,
        systemId,
        accentId,
        setSystem,
        setAccent,
        systems: getDesignSystems(),
        accents: getAccents(),
        systemDefaultAccent: getSystemDefaultAccents(),
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
  const { toast } = useToast();
  const localSelectionMade = useRef(false);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const selectedSystem = useRef(theme.systemId);
  const selectedAccent = useRef(theme.accentId);
  const [accountSync, setAccountSync] = useState<ThemeProviderState["accountSync"]>("local");
  const [accountSyncError, setAccountSyncError] = useState<string | null>(null);
  const saveGeneration = useRef(0);
  const failureToast = useRef<{ dismiss: () => void } | null>(null);
  const persistRef = useRef<(system: DesignSystemId, accent: AccentId) => void>(() => undefined);

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
    setAccountSync("saved");
  }, [accountTheme, applyAccent, applySystem, isLoading]);

  const persist = useCallback(
    (themeSystem: DesignSystemId, themeAccent: AccentId) => {
      if (!isAuthenticated) return;
      const generation = ++saveGeneration.current;
      setAccountSync("syncing");
      setAccountSyncError(null);
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          await saveThemeAsync({ themeSystem, themeAccent });
          if (generation === saveGeneration.current) {
            setAccountSync("saved");
            failureToast.current?.dismiss();
            failureToast.current = null;
          }
        })
        .catch(async (error: unknown) => {
          if (generation === saveGeneration.current) {
            const message = error instanceof ApiError && error.status === 409
              ? "Your account changed elsewhere. This selection is saved only on this device. Retry to save it to your account."
              : "Couldn't save to your account. This selection is saved only on this device.";
            setAccountSync("failed");
            setAccountSyncError(message);
            // The pickers sit far below the page's status line (and the
            // showcase has none), so the failure must also surface where the
            // visitor is looking, with the same retry.
            failureToast.current?.dismiss();
            failureToast.current = toast({
              variant: "destructive",
              title: "Theme not saved to your account",
              description: message,
              action: (
                <ToastAction
                  altText="Retry saving the theme to your account"
                  onClick={() => persistRef.current(selectedSystem.current, selectedAccent.current)}
                >
                  Retry
                </ToastAction>
              ),
            });
          }
          // Retain the explicit local selection, but refresh the revision so
          // a user-initiated retry reconciles a conflict rather than looping.
          try { await refetch(); } catch { /* The visible failure remains. */ }
        });
    },
    [isAuthenticated, refetch, saveThemeAsync, toast],
  );
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  const setSystem = useCallback((id: string) => {
    if (!isSystemId(id)) return;
    localSelectionMade.current = true;
    const previousDefault = getSystemDefaultAccent(selectedSystem.current);
    const nextAccent =
      selectedAccent.current === previousDefault
        ? getSystemDefaultAccent(id)
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
    <ThemeProviderContext.Provider value={{
      ...theme, setSystem, setAccent, accountSync, accountSyncError,
      retryAccountSync: () => persist(selectedSystem.current, selectedAccent.current),
    }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
