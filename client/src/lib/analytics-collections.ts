// Collection usage events (tracking plan question 3 in docs/ANALYTICS.md:
// are collections created, filled and shared?). Typed helpers on top of the
// shared sender — every event reaches GA4, Mixpanel, PostHog and Amplitude
// with the same cleaned properties, and only after analytics consent.
//
// Rules for callers:
//  - Owner-side events fire at the server-confirmed success point (mutation
//    onSuccess / a fulfilled request), never on the click.
//  - Never send collection names or the owner's identity: collections are
//    described by id, share id and counts only. Public pages only know the
//    share id (the public payload has no numeric id), so owner-side publish
//    and share events carry it too, which joins them to public views.

import { track } from './analytics';

interface CollectionRef {
  collectionId: number;
  itemCount?: number;
}

const collectionProps = ({ collectionId, itemCount }: CollectionRef) => ({
  collection_id: String(collectionId),
  item_count: itemCount,
});

export const trackCollectionCreated = (collectionId: number, collectionCount: number) => {
  track('collection_created', {
    collection_id: String(collectionId),
    collection_count: collectionCount,
  });
};

export const trackCollectionRenamed = (ref: CollectionRef) => {
  track('collection_renamed', collectionProps(ref));
};

export const trackCollectionDeleted = (ref: CollectionRef & { wasPublished: boolean }) => {
  track('collection_deleted', {
    ...collectionProps(ref),
    was_published: ref.wasPublished,
  });
};

export const trackCollectionArchiveChanged = (ref: CollectionRef, archived: boolean) => {
  track(archived ? 'collection_archived' : 'collection_restored', collectionProps(ref));
};

export const trackCollectionPublishChanged = (
  ref: CollectionRef & { shareId?: string | null },
  published: boolean,
) => {
  track(published ? 'collection_published' : 'collection_unpublished', {
    ...collectionProps(ref),
    collection_share_id: ref.shareId ?? undefined,
  });
};

export const trackCollectionShared = (
  ref: CollectionRef & { shareId?: string | null; method: 'clipboard' },
) => {
  track('collection_shared', {
    ...collectionProps(ref),
    collection_share_id: ref.shareId ?? undefined,
    share_method: ref.method,
  });
};

export const trackCollectionsReordered = (move: {
  collectionId: number;
  fromPosition: number;
  toPosition: number;
  collectionCount: number;
}) => {
  track('collections_reordered', {
    collection_id: String(move.collectionId),
    from_position: move.fromPosition,
    to_position: move.toPosition,
    direction: move.toPosition < move.fromPosition ? 'up' : 'down',
    collection_count: move.collectionCount,
  });
};

export const trackCollectionItemsMoved = (move: {
  destinationCollectionId: number;
  sourceCollectionId: number | null;
  movedCount: number;
  failedCount: number;
}) => {
  if (move.movedCount <= 0) return;
  track('collection_items_moved', {
    destination_collection_id: String(move.destinationCollectionId),
    source_collection_id:
      move.sourceCollectionId === null ? undefined : String(move.sourceCollectionId),
    moved_count: move.movedCount,
    failed_count: move.failedCount,
  });
};

/** Which bookmark surface changed the membership (both open the notes dialog). */
export type CollectionMembershipSource = 'bookmark_button' | 'resource_detail';

/**
 * One event per membership change the server accepted. `results` is the
 * Promise.allSettled outcome of `[...additions, ...removals]` requests, in
 * that order; rejected requests send nothing.
 */
export const trackCollectionMembershipResults = ({
  resourceId,
  additions,
  removals,
  results,
  source,
  dialogMode,
}: {
  resourceId: string | number;
  additions: number[];
  removals: number[];
  results: PromiseSettledResult<unknown>[];
  source: CollectionMembershipSource;
  dialogMode: 'add' | 'edit';
}) => {
  const changes = [
    ...additions.map((collectionId) => ({ collectionId, added: true })),
    ...removals.map((collectionId) => ({ collectionId, added: false })),
  ];
  changes.forEach(({ collectionId, added }, index) => {
    if (results[index]?.status !== 'fulfilled') return;
    track(added ? 'collection_resource_added' : 'collection_resource_removed', {
      collection_id: String(collectionId),
      resource_id: String(resourceId),
      source,
      dialog_mode: dialogMode,
    });
  });
};

export const trackLibraryExploreClicked = () => {
  track('library_explore_clicked', { surface: 'bookmarks_empty_state' });
};

export const trackPublicCollectionViewed = (shareId: string, itemCount: number) => {
  track('public_collection_viewed', {
    collection_share_id: shareId,
    item_count: itemCount,
  });
};

export const trackPublicCollectionResourceOpened = (opened: {
  shareId: string;
  resourceId: string | number;
  position: number;
  itemCount: number;
  linkTarget: 'detail' | 'external';
}) => {
  track('public_collection_resource_opened', {
    collection_share_id: opened.shareId,
    resource_id: String(opened.resourceId),
    position: opened.position,
    item_count: opened.itemCount,
    link_target: opened.linkTarget,
  });
};

export type PublicCollectionRecoveryAction =
  | 'retry_error'
  | 'retry_offline'
  | 'explore_journeys'
  | 'home'
  | 'categories';

// Mirrors collectionShareIdSchema (shared/bookmarkCollections.ts) without
// pulling zod into the page chunk: a 404 can come from any typed-in path, and
// only a well-formed share id is worth recording.
const SHARE_ID = /^[A-Za-z0-9_-]{24}$/;

export const trackPublicCollectionRecoveryClicked = (
  shareId: string,
  action: PublicCollectionRecoveryAction,
  state: 'not_found' | 'error' | 'offline',
) => {
  track('public_collection_recovery_clicked', {
    collection_share_id: SHARE_ID.test(shareId) ? shareId : undefined,
    recovery_action: action,
    page_state: state,
  });
};
