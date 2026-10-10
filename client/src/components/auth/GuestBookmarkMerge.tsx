import { useEffect, useRef } from "react";
import { useClerk } from "@clerk/react";
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
// - Binds each run to the identity that started it: the bookmark API rides
//   the session cookie, so a run that kept going after an in-app account
//   switch would POST the device's saves into the NEXT account. The run stops
//   at the first item after the identity changes (unsent ids stay local for
//   the new account's own run), and only one run is ever in flight.

interface MergeOutcome {
  merged: number;
  duplicates: number;
  failed: number;
  removedMissing: number;
  /** The signed-in identity changed mid-run; the rest stays local. */
  interrupted: boolean;
}

async function pushGuestBookmarks(isStillOwner: () => boolean): Promise<MergeOutcome | null> {
  const ids = getGuestBookmarks().map((entry) => entry.id);
  if (ids.length === 0) return null;

  if (!isStillOwner()) return null;
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
  let interrupted = false;

  // Sequential on purpose: at most GUEST_BOOKMARK_CAP items, and a polite
  // one-at-a-time drip never trips the per-minute API limiters.
  for (const id of ids) {
    if (!isStillOwner()) {
      interrupted = true;
      break;
    }
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
    if (!isStillOwner()) {
      interrupted = true;
      break;
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
    interrupted,
  };
}

export default function GuestBookmarkMerge() {
  const { isAuthenticated, user } = useAuth();
  const clerk = useClerk();
  const { toast } = useToast();
  const guestEntries = useGuestBookmarks();
  const serverUserId = user?.id ?? null;
  // Live identity, read at each checkpoint (render snapshots go stale while a
  // run is awaiting the network).
  const serverUserIdRef = useRef(serverUserId);
  serverUserIdRef.current = isAuthenticated ? serverUserId : null;
  const runInFlight = useRef<Promise<unknown>>(Promise.resolve());

  // One merge attempt per signed-in account per app load: ids that fail stay
  // local and retry on the next visit (an immediate loop would just replay
  // the same failure against the API). Keyed by account so a direct switch
  // to another account gets its own attempt.
  const attemptedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !serverUserId) {
      attemptedFor.current = null;
      return;
    }
    if (guestEntries.length === 0 || attemptedFor.current === serverUserId) return;
    attemptedFor.current = serverUserId;

    const ownerServerId = serverUserId;
    const ownerClerkId = clerk.user?.id ?? null;
    const isStillOwner = () =>
      serverUserIdRef.current === ownerServerId &&
      (clerk.user?.id ?? null) === ownerClerkId;

    // Wait for any earlier run (it stops at its next checkpoint once the
    // identity changed) so two runs never POST the same ids concurrently.
    runInFlight.current = runInFlight.current.catch(() => undefined).then(async () => {
      try {
        const outcome = await pushGuestBookmarks(isStillOwner);
        if (!outcome) return;
        if (outcome.merged > 0) {
          void queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
          notifyCrossTabSync();
        }
        // An interrupted run belongs to an account that is no longer signed
        // in here: no toast for it; the new account's run reports its own.
        if (outcome.interrupted || !isStillOwner()) return;

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
    });
  }, [isAuthenticated, serverUserId, clerk, guestEntries.length, toast]);

  return null;
}
