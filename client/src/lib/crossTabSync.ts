import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { safeSetItem } from "@/lib/safeStorage";

// R4-081: cross-tab consistency for auth + bookmark/favorite state. When one
// tab logs in/out or toggles a bookmark/favorite, it bumps a sentinel key in
// localStorage. The `storage` event fires ONLY in OTHER tabs (never the writer),
// so listening tabs can invalidate the relevant queries and re-render the right
// state/chrome without waiting for a full reload.
const SYNC_KEY = "cross-tab-sync";

// Query keys whose data must refresh when another tab signals a change.
const SYNCED_QUERY_KEYS: string[][] = [
  ["/api/auth/user"],
  ["/api/bookmarks"],
  ["/api/favorites"],
];

/** Signal other open tabs that auth/bookmark/favorite state changed. */
export function notifyCrossTabSync(): void {
  // A always-changing value guarantees the `storage` event fires every time,
  // even for two identical actions in a row.
  safeSetItem(SYNC_KEY, `${Date.now()}-${Math.random()}`);
}

/**
 * Wire once at the app root: when another tab signals a change, invalidate the
 * auth + bookmarks/favorites queries so this tab reflects it without a reload.
 */
export function useCrossTabSync(): void {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SYNC_KEY) return;
      for (const queryKey of SYNCED_QUERY_KEYS) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
