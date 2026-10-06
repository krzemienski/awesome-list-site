import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BookmarkQueueStatus } from "@shared/bookmarkCollections";

/** The parts of a saved /api/bookmarks row that removing it throws away. */
export interface RemovedBookmark {
  notes?: string | null;
  collectionIds?: number[];
  queueStatus?: BookmarkQueueStatus;
  archivedAt?: string | null;
  personalTags?: string[];
  /** Original saved date (/api/bookmarks `bookmarkedAt`). */
  bookmarkedAt?: string | null;
}

/**
 * Undo for a bookmark removal. Removal deletes the row and its collection
 * items, so re-POSTing the bookmark alone would bring it back as a bare
 * "saved" entry; this also puts back its queue state, archive flag, personal
 * tags and collection membership. Resolves `partial: true` when the bookmark
 * came back but some of that state couldn't be restored; rejects when the
 * bookmark itself couldn't be recreated.
 */
export async function restoreRemovedBookmark(
  resourceId: string | number,
  removed: RemovedBookmark | undefined,
): Promise<{ partial: boolean }> {
  await apiRequest(`/api/bookmarks/${resourceId}`, {
    method: "POST",
    // C6-VX-01: send the original saved date so Undo doesn't re-date the save.
    body: JSON.stringify({
      ...(removed?.notes ? { notes: removed.notes } : {}),
      ...(removed?.bookmarkedAt ? { restoreCreatedAt: removed.bookmarkedAt } : {}),
    }),
    credentials: "include",
  });

  let partial = false;
  if (removed) {
    const state: Record<string, unknown> = {};
    if (removed.queueStatus && removed.queueStatus !== "saved") {
      state.queueStatus = removed.queueStatus;
    }
    if (removed.archivedAt) state.archived = true;
    if (removed.personalTags?.length) state.personalTags = removed.personalTags;

    const results = await Promise.allSettled([
      ...(Object.keys(state).length
        ? [apiRequest(`/api/bookmarks/${resourceId}/state`, {
            method: "PATCH",
            body: JSON.stringify(state),
          })]
        : []),
      ...(removed.collectionIds ?? []).map((collectionId) =>
        apiRequest(`/api/collections/${collectionId}/items/${resourceId}`, {
          method: "POST",
        }),
      ),
    ]);
    partial = results.some((result) => result.status === "rejected");
  }

  queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
  queryClient.invalidateQueries({ queryKey: ["/api/collections?includeArchived=true"] });
  queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });
  return { partial };
}
