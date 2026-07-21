import { useRef } from "react";
import { useLocation } from "wouter";
import { createElement, type ReactElement } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { humanizeApiError } from "@/lib/apiError";
import { notifyCrossTabSync } from "@/lib/crossTabSync";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";

// Shared favorite/bookmark toggle logic (Task: consolidate ResourceDetail's
// inline copies with FavoriteButton/BookmarkButton so behavior fixes land on
// every surface at once).
//
// This hook is the single home for:
// - NB-024/NB-059 (run24) latest-wins rapid-click handling: a click landing
//   while a request is in flight flips the UI optimistically and records the
//   DESIRED final state; onSettled fires at most ONE follow-up request to
//   converge — one request per final state, never a queue per click. The
//   baseline for the desired state is what the IN-FLIGHT request will make
//   true (!vars.remove), never a possibly-stale surface state.
// - R2-L09 / BUG-044/026 (run14) anonymous auth gate: signed-out clicks get a
//   toast with a working "Sign in" action preserving the page via ?next=.
// - R4-056 error surfacing: 401 → re-sign-in prompt; anything else → a
//   humanized destructive toast. BUG-038 (run24): 401s are expected, so they
//   are not console.error'd.
// - NB-024 (run18) toast hygiene: the previous toggle toast is dismissed
//   before a new one fires, so rapid toggles never leave a stale toast
//   contradicting the final state.
// - Cache invalidation + R4-081 cross-tab sync after every server-confirmed
//   change.
//
// Surface-specific concerns (visuals, success toasts, Undo actions,
// analytics, optimistic state storage — local useState vs. query cache) stay
// in the calling component via the callbacks below.

export interface ToggleVars {
  remove: boolean;
  notes?: string;
}

type ShowToast = (opts: any) => void;

interface ResourceToggleOptions {
  resourceId: string | number;
  /** Current UI state as the surface renders it. */
  isActive: boolean;
  /** Flip the surface's optimistic state (local state or query cache). */
  onOptimistic: (next: boolean, vars?: ToggleVars) => void;
  /** Surface-specific success handling: toasts, Undo, analytics, counts. */
  onSuccess?: (data: any, vars: ToggleVars, showToast: ShowToast) => void;
  /** Revert the surface's optimistic state after a failed request. */
  onErrorRevert?: (vars: ToggleVars) => void;
}

interface ToggleConfig {
  listKey: string; // '/api/favorites' | '/api/bookmarks'
  serverField: "isFavorited" | "isBookmarked";
  buildRequest: (
    resourceId: string | number,
    vars: ToggleVars,
  ) => Promise<any>;
  signInTitle: string;
  signInDescription: string;
  expiredDescription: string;
  errorTitle: string;
  errorFallback: string;
  logLabel: string;
}

function useResourceToggle(
  opts: ResourceToggleOptions,
  config: ToggleConfig,
) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // NB-024 (run18): dismiss the previous toggle toast before firing a new one.
  const lastToastRef = useRef<{ dismiss: () => void } | null>(null);
  const showToast: ShowToast = (toastOpts) => {
    lastToastRef.current?.dismiss();
    lastToastRef.current = toast(toastOpts);
  };

  // NB-024/NB-059 (run24): latest-wins desired final state.
  const desiredRef = useRef<boolean | null>(null);

  // Synchronous in-flight tracking: `mutation.isPending` is React state and
  // lags until the next render, so two clicks landing in the same tick both
  // saw pending=false and fired duplicate requests. This ref flips
  // immediately in onMutate, closing that window on every surface.
  const inFlightRef = useRef<ToggleVars | null>(null);

  const signInAction = (onClick: () => void): ReactElement =>
    createElement(ToastAction, { altText: "Sign in", onClick }, "Sign in");

  const goSignIn = () =>
    setLocation(
      `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
    );

  const mutation = useMutation({
    // `vars.remove` is captured at click time so the POST/DELETE decision
    // never depends on the optimistic state flip in onMutate (reading the
    // mutable surface state inside mutationFn caused removals to re-add).
    mutationFn: async (vars: ToggleVars) =>
      config.buildRequest(opts.resourceId, vars),
    onMutate: (vars: ToggleVars) => {
      inFlightRef.current = vars;
      opts.onOptimistic(!vars.remove, vars);
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: [config.listKey] });
      // Both key shapes are in use across surfaces — invalidate each.
      queryClient.invalidateQueries({
        queryKey: [`/api/resources/${opts.resourceId}`],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/resources", String(opts.resourceId)],
      });
      // R4-081: mirror the change into other open tabs.
      notifyCrossTabSync();
      opts.onSuccess?.(data, vars, showToast);
    },
    onError: (error, vars) => {
      opts.onErrorRevert?.(vars);

      // R4-056: never roll back silently.
      const status = error instanceof ApiError ? error.status : 0;
      if (status === 401) {
        showToast({
          title: config.signInTitle,
          description: config.expiredDescription,
          action: signInAction(goSignIn),
        });
      } else {
        showToast({
          title: config.errorTitle,
          description: humanizeApiError(error, config.errorFallback),
          variant: "destructive",
        });
      }
      // BUG-038 (run24): 401 is an expected signed-out/expired outcome.
      if (status !== 401) {
        console.error(`${config.logLabel} mutation error:`, error);
      }
    },
    onSettled: (data, error, vars) => {
      inFlightRef.current = null;
      // NB-024/NB-059 (run24): converge on the latest desired state with at
      // most one follow-up request.
      const desired = desiredRef.current;
      desiredRef.current = null;
      if (desired === null) return;
      const finalState = error
        ? vars.remove
        : ((data as any)?.[config.serverField] ?? !vars.remove);
      if (desired !== finalState) {
        mutation.mutate({ remove: !desired });
      }
    },
  });

  /**
   * Handle a toggle click. Covers the auth gate and in-flight latest-wins
   * handling; when a fresh request should start, `interceptActivate` (if
   * provided) may claim an activation (e.g. to open a notes dialog) by
   * returning true.
   */
  const toggle = (options?: { interceptActivate?: () => boolean }) => {
    // NB-059/NB-022 (run18): guard in-flight clicks here instead of the
    // native `disabled` attribute — a disabled flip while focused drops
    // focus to body.
    if (inFlightRef.current !== null) {
      if (isAuthenticated) {
        // Baseline is what the IN-FLIGHT request will make true (its
        // target), not the surface state — cached/derived state can be
        // stale until invalidation, making a 2nd rapid click compute the
        // same target as the 1st instead of the inverse.
        const inFlightTarget = !inFlightRef.current.remove;
        const desired =
          desiredRef.current === null ? !inFlightTarget : !desiredRef.current;
        desiredRef.current = desired;
        opts.onOptimistic(desired);
      }
      return;
    }

    // R2-L09: anonymous users get a clear sign-in prompt instead of a
    // confusing failed request.
    if (!isAuthenticated) {
      toast({
        title: config.signInTitle,
        description: config.signInDescription,
        action: signInAction(goSignIn),
      });
      return;
    }

    if (!opts.isActive && options?.interceptActivate?.()) {
      return;
    }

    mutation.mutate({ remove: opts.isActive });
  };

  return {
    toggle,
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    showToast,
  };
}

export function useFavoriteToggle(opts: ResourceToggleOptions) {
  return useResourceToggle(opts, {
    listKey: "/api/favorites",
    serverField: "isFavorited",
    buildRequest: (resourceId, vars) =>
      apiRequest(`/api/favorites/${resourceId}`, {
        method: vars.remove ? "DELETE" : "POST",
        credentials: "include",
      }),
    signInTitle: "Sign in to favorite",
    signInDescription:
      "Create an account or sign in to save your favorite resources.",
    expiredDescription:
      "Your session has expired. Please sign in again to save favorites.",
    errorTitle: "Couldn't update favorite",
    errorFallback: "Failed to update favorite status. Please try again.",
    logLabel: "Favorite",
  });
}

export function useBookmarkToggle(opts: ResourceToggleOptions) {
  return useResourceToggle(opts, {
    listKey: "/api/bookmarks",
    serverField: "isBookmarked",
    buildRequest: (resourceId, vars) =>
      vars.remove
        ? apiRequest(`/api/bookmarks/${resourceId}`, {
            method: "DELETE",
            credentials: "include",
          })
        : apiRequest(`/api/bookmarks/${resourceId}`, {
            method: "POST",
            body: JSON.stringify(
              vars.notes !== undefined ? { notes: vars.notes } : {},
            ),
            credentials: "include",
          }),
    signInTitle: "Sign in to bookmark",
    signInDescription:
      "Create an account or sign in to save resources to your bookmarks.",
    expiredDescription:
      "Your session has expired. Please sign in again to save resources.",
    errorTitle: "Couldn't update bookmark",
    errorFallback: "Failed to update bookmark. Please try again.",
    logLabel: "Bookmark",
  });
}
