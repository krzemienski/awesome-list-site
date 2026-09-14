import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { HomeLayout } from "@shared/onboarding-values";
import { DEFAULT_HOME_LAYOUT } from "@shared/onboarding-values";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { useHomeBoot } from "@/lib/home-boot";

const HOME_LAYOUT_STORAGE_KEY = "awesome-video-home-layout";
const PREFERENCES_QUERY_KEY = ["/api/user/preferences"] as const;

interface HomeLayoutResponse {
  preferences: { homeLayout?: unknown; revision?: unknown } | null;
  homeLayout: HomeLayout;
  revision: number | null;
}

function isHomeLayout(value: unknown): value is HomeLayout {
  return value === "index" || value === "curated";
}

function readLayoutOverride(): HomeLayout | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("layout");
  return isHomeLayout(value) ? value : null;
}

function readGuestLayout(): HomeLayout {
  const value = safeGetItem(HOME_LAYOUT_STORAGE_KEY);
  return isHomeLayout(value) ? value : DEFAULT_HOME_LAYOUT;
}

function parseHomeLayoutResponse(value: unknown): HomeLayoutResponse {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid home layout preferences response");
  }

  const response = value as {
    preferences?: { homeLayout?: unknown; revision?: unknown } | null;
    homeLayout?: unknown;
    revision?: unknown;
  };
  const preferences = response.preferences ?? null;
  const revision = response.revision ?? preferences?.revision ?? null;
  if (revision !== null && revision !== undefined && typeof revision !== "number") {
    throw new Error("Invalid home layout preferences revision");
  }

  return {
    preferences,
    homeLayout: isHomeLayout(response.homeLayout)
      ? response.homeLayout
      : isHomeLayout(preferences?.homeLayout)
        ? preferences.homeLayout
        : DEFAULT_HOME_LAYOUT,
    revision: revision ?? null,
  };
}

/**
 * Reads and persists the home presentation without making anonymous visitors
 * wait on an account request. The URL override is intentionally read-only:
 * it changes the rendered mode for a link, while an explicit selection from
 * the preference control still saves the chosen value.
 */
export function useHomeLayout() {
  const homeBoot = useHomeBoot();
  const isInitialHomeHydration = homeBoot?.isAnonymous === true;
  // This is intentionally scoped to this mounted Home instance, not kept in
  // HomeBoot context. It preserves the exact SSR pixels while the initial
  // auth request settles, but cannot leak into a later client-side navigation
  // back to Home after the boot assertion has been retired.
  const exactHomeContinuityRef = useRef(isInitialHomeHydration);
  const hasExactHomeContinuity = exactHomeContinuityRef.current;
  const legacyLayoutReconciled = useRef(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [savedLayout, setSavedLayout] = useState<HomeLayout>(
    () =>
      homeBoot?.isAnonymous
        ? homeBoot.layout
        : readGuestLayout(),
  );
  const [layoutOverride, setLayoutOverride] = useState<HomeLayout | null>(readLayoutOverride);

  const preferencesQuery = useQuery<HomeLayoutResponse>({
    queryKey: PREFERENCES_QUERY_KEY,
    enabled: !authLoading && isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
    select: parseHomeLayoutResponse,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => setLayoutOverride(readLayoutOverride());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Pre-cookie visitors may only have the legacy localStorage preference.
  // Reconcile it after exact hydration (never during render) so their chosen
  // layout still wins without making SSR guess browser-only storage.
  useEffect(() => {
    if (
      !homeBoot ||
      homeBoot.layoutSource !== "default" ||
      legacyLayoutReconciled.current
    ) {
      return;
    }
    legacyLayoutReconciled.current = true;
    setSavedLayout(readGuestLayout());
  }, [homeBoot]);

  const layout = layoutOverride ?? savedLayout;

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.documentElement.getAttribute("data-home-layout-pending") !== "true") return;
    // Do not reveal index markup for a legacy curated visitor. This runs only
    // after the state above has committed their local preference.
    if (layout !== readGuestLayout()) return;
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.removeAttribute("data-home-layout-pending");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [layout]);

  // Auth transitions must never leak a previous account's server value into
  // the guest view. Guest storage is deliberately left intact on sign-out so
  // the visitor returns to the mode they chose before signing in.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setSavedLayout(readGuestLayout());
      return;
    }
    if (preferencesQuery.isFetching) return;
    setSavedLayout(preferencesQuery.data?.homeLayout ?? DEFAULT_HOME_LAYOUT);
  }, [
    authLoading,
    isAuthenticated,
    preferencesQuery.data?.homeLayout,
    preferencesQuery.isFetching,
  ]);

  const saveMutation = useMutation({
    mutationFn: async (nextLayout: HomeLayout) => {
      const cached = queryClient.getQueryData<unknown>(PREFERENCES_QUERY_KEY);
      let current: HomeLayoutResponse | null = null;
      try {
        current = cached === undefined ? null : parseHomeLayoutResponse(cached);
      } catch {
        current = null;
      }
      const response: unknown = await apiRequest("/api/user/preferences", {
        method: "PUT",
        body: JSON.stringify({
          homeLayout: nextLayout,
          // A partial layout save must use the same revision/tombstone guard as
          // the learning-preference form and must never send learning values.
          expectedRevision: current?.revision ?? preferencesQuery.data?.revision ?? null,
        }),
      });
      return parseHomeLayoutResponse(response);
    },
    onMutate: (nextLayout) => {
      setSavedLayout(nextLayout);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, response);
      setSavedLayout(response.homeLayout);
    },
    onError: () => {
      setSavedLayout(preferencesQuery.data?.homeLayout ?? DEFAULT_HOME_LAYOUT);
    },
  });

  const setLayout = useCallback(
    (nextLayout: HomeLayout) => {
      if (!isHomeLayout(nextLayout)) return;
      if (isAuthenticated) {
        saveMutation.mutate(nextLayout);
        return;
      }
      safeSetItem(HOME_LAYOUT_STORAGE_KEY, nextLayout);
      if (typeof document !== "undefined") {
        document.cookie = `${HOME_LAYOUT_STORAGE_KEY}=${nextLayout}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }
      setSavedLayout(nextLayout);
    },
    [isAuthenticated, saveMutation],
  );

  return {
    layout,
    isLoading:
      // Exact anonymous Home markup is already a valid guest presentation.
      // Do not replace it with a skeleton merely because its fresh auth check
      // is pending. Once a real user is known, resume normal preference
      // loading so account layout state is never masked as a permanent guest.
      !(hasExactHomeContinuity && (authLoading || !isAuthenticated)) &&
      !layoutOverride &&
      (authLoading ||
        (isAuthenticated && (preferencesQuery.isLoading || preferencesQuery.isFetching))),
    setLayout,
    isSaving: saveMutation.isPending,
    isError: preferencesQuery.isError || saveMutation.isError,
    error: preferencesQuery.error ?? saveMutation.error ?? null,
  };
}