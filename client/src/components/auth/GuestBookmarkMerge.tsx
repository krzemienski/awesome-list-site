import { useEffect, useRef } from "react";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { notifyCrossTabSync } from "@/lib/crossTabSync";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { trackBookmarksMerged } from "@/lib/analytics";
import {
  getGuestBookmarks,
  removeGuestBookmarkIds,
  useGuestBookmarks,
} from "@/lib/guestBookmarks";

// Task #329 step 3: merge on-device guest saves into the account right after
// sign-in/sign-up. Mounted once at the app root so it covers both the SPA
// sign-in transition and a full-page reload that lands already signed in.
//
// Constraints honored:
// - Runs through the EXISTING authed bookmark API only (no auth changes).
// - Dedupes BEFORE posting: POST /api/bookmarks/:id is an upsert that resets
//   notes/savedAt on conflict, so re-posting an id the account already has
//   would clobber the user's notes.
// - Checks the public detail endpoint before each push: a deleted resource
//   would fail the bookmark POST with an opaque 500 (FK violation), polluting
//   the authed API error rate (the task's guardrail) and retrying forever.
// - Clears the local store ONLY for confirmed outcomes (merged, already in
//   the account, or resource gone). Failed pushes stay for the next visit.

interface MergeOutcome {
  merged: number;
  duplicates: number;
  failed: number;
  removedMissing: number;
}

async function pushGuestBookmarks(): Promise<MergeOutcome | null> {
  const ids = getGuestBookmarks().map((entry) => entry.id);
  if (ids.length === 0) return null;

  const existing = (await apiRequest("/api/bookmarks", {
    credentials: "include",
  })) as Array<{ id: number | string }>;
  const existingIds = new Set(
    (Array.isArray(existing) ? existing : [])
      .map((bookmark) => Number(bookmark.id))
      .filter(Number.isFinite),
  );

  const duplicates: number[] = [];
  const merged: number[] = [];
  const missing: number[] = [];
  const failed: number[] = [];

  // Sequential on purpose: at most GUEST_BOOKMARK_CAP items, and a polite
  // one-at-a-time drip never trips the per-minute API limiters.
  for (const id of ids) {
    if (existingIds.has(id)) {
      duplicates.push(id);
      continue;
    }
    try {
      await apiRequest(`/api/resources/${id}`, { credentials: "include" });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 410)) {
        missing.push(id); // resource no longer exists — drop the save
      } else {
        failed.push(id); // transient trouble — keep the save for a later retry
      }
      continue;
    }
    try {
      await apiRequest(`/api/bookmarks/${id}`, {
        method: "POST",
        body: JSON.stringify({}),
        credentials: "include",
      });
      merged.push(id);
    } catch {
      failed.push(id);
    }
  }

  removeGuestBookmarkIds([...merged, ...duplicates, ...missing]);

  return {
    merged: merged.length,
    duplicates: duplicates.length,
    failed: failed.length,
    removedMissing: missing.length,
  };
}

export default function GuestBookmarkMerge() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const guestEntries = useGuestBookmarks();

  // One merge attempt per signed-in session per app load: ids that fail stay
  // local and retry on the next visit (an immediate loop would just replay
  // the same failure against the API).
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      attemptedRef.current = false;
      return;
    }
    if (guestEntries.length === 0 || attemptedRef.current) return;
    attemptedRef.current = true;

    void (async () => {
      try {
        const outcome = await pushGuestBookmarks();
        if (!outcome) return;

        if (outcome.merged > 0) {
          queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
          notifyCrossTabSync();
        }
        trackBookmarksMerged(outcome);

        const noun = (n: number) => (n === 1 ? "resource" : "resources");
        if (outcome.merged > 0) {
          const extras: string[] = [];
          if (outcome.duplicates > 0) {
            extras.push(
              `${outcome.duplicates} ${outcome.duplicates === 1 ? "was" : "were"} already in your library`,
            );
          }
          if (outcome.failed > 0) {
            extras.push(
              `${outcome.failed} couldn't be moved and ${outcome.failed === 1 ? "stays" : "stay"} saved on this device`,
            );
          }
          toast({
            title: "Your saves are in your library",
            description:
              `${outcome.merged} saved ${noun(outcome.merged)} from this device ${
                outcome.merged === 1 ? "is" : "are"
              } now in your account.` + (extras.length ? ` ${extras.join("; ")}.` : ""),
          });
        } else if (outcome.failed > 0) {
          toast({
            title: "Couldn't move your saved resources",
            description: `${outcome.failed} saved ${noun(outcome.failed)} couldn't be moved to your account. ${
              outcome.failed === 1 ? "It's" : "They're"
            } still on this device — we'll retry on your next visit.`,
            variant: "destructive",
          });
        } else if (outcome.duplicates > 0) {
          toast({
            title: "Already in your library",
            description:
              "Everything saved on this device was already in your account.",
          });
        }
        // All-removedMissing case: the saved resources no longer exist —
        // nothing actionable, stay quiet.
      } catch (error) {
        // The initial GET /api/bookmarks failed (e.g. flaky network right
        // after sign-in). Local saves are untouched; retry next app load.
        console.error("Guest bookmark merge failed:", error);
      }
    })();
  }, [isAuthenticated, guestEntries.length, toast]);

  return null;
}
