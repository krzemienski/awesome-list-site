# Collections and Learning Queue — Approved Design

## Outcome

Turn the existing bookmarks page into a private-by-default personal library. The
existing `user_bookmarks` row remains the single source of truth for a saved
resource and its private note. Collections organize that row; they do not replace
it.

## Constraints

- Preserve every existing bookmark and note.
- A bookmark may belong to multiple collections.
- Queue status is global per bookmark: `saved`, `watch-next`, `in-progress`, or
  `done`.
- Deleting a collection removes memberships only.
- Public collection data must never expose owner identity, private notes,
  personal tags, queue status, archived bookmarks, or unrelated bookmarks.
- Only approved resources may appear publicly.
- Collections remain private until explicitly published. Unpublishing must
  revoke access immediately.
- Existing bookmark add/remove and note-editing contracts remain compatible.

## Data Model

### `user_bookmarks` additions

- `queue_status text NOT NULL DEFAULT 'saved'` with a check constraint.
- `archived_at timestamp NULL`.
- `personal_tags jsonb NOT NULL DEFAULT '[]'`.

These columns keep learning state global even when a bookmark is in several
collections.

### `bookmark_collections`

- Integer primary key.
- `user_id` owner with cascade delete.
- Trimmed `name`.
- Integer `position`.
- Nullable `archived_at`.
- Nullable unique high-entropy `share_id`.
- Nullable `published_at`.
- Created and updated timestamps.
- A `UNIQUE(id, user_id)` owner key for composite membership enforcement.

The share identifier is generated only on first publish and retained after
unpublish so a later republish uses the same stable URL.

### `bookmark_collection_items`

- `collection_id`.
- `user_id`.
- `resource_id`.
- Integer `position`.
- Created timestamp.

The membership has a composite foreign key to `user_bookmarks(user_id,
resource_id)` and a composite owner foreign key to
`bookmark_collections(id, user_id)`. Both point **from membership to parent**:
deleting a bookmark or collection cascades down to membership rows, while
deleting a membership never deletes the bookmark. This enforces that
memberships cannot point at a bookmark or collection owned by somebody else.

## API and Transaction Model

Authenticated routes provide:

- Collection list, create, rename, reorder, archive/unarchive, and delete.
- Publish/unpublish with a stable returned public URL.
- Add/remove bookmark memberships.
- Bookmark status, archive, personal-tag, and note updates.
- A source-aware bulk action endpoint.

`GET /api/bookmarks` retains its established flattened resource shape (`id`,
resource fields, `notes`, and `bookmarkedAt`). Queue state, archive state,
personal tags, and collection IDs are additive fields; existing callers never
need to unwrap a new object or switch from `id` to `resourceId`.

Bulk move semantics:

- From a concrete collection: add the destination and remove only the current
  source membership.
- From All Saved: add the destination and preserve every existing membership.

Bulk requests report every invalid resource/collection honestly. Valid items are
applied together in one database transaction. All success returns `200`; mixed
success returns `207`; no valid work returns `400`.

Owner-scoped routes return `404` for another user's collection rather than
revealing its existence.

The unauthenticated public read route returns `404` for malformed, unknown,
unpublished, or deleted collection links. Its serializer emits only safe
collection metadata and public resource fields selected with the exact predicate
`resources.status = 'approved'`; nullable status is never treated as approved.

## User Experience

The `/bookmarks` route becomes a responsive workspace:

- Desktop has a collection rail and resource workspace.
- Mobile uses a compact collection picker.
- Collection, status, archived visibility, and sort are URL-backed and restored
  by reload and browser history.
- Counts and empty states explain the active scope.
- Selecting items reveals a bulk toolbar for status, source-aware move, personal
  tags, and archive actions.
- Collection management lives in contextual dialogs and menus.

The existing bookmark dialog gains an optional compact collection chooser.
Resource cards retain a simple bookmark affordance.

The public route `/collection/:shareId` renders a read-only collection with only
approved resource cards and no private controls. It is wired through both the
client router and server OG middleware. Valid links return `200` with safe
collection-specific metadata but remain `noindex,follow`; invalid or revoked
links return the existing soft-404 response. This supports sharing without
listing private-by-default libraries in search or the sitemap.

## Error and Privacy Behavior

- Inputs are trimmed, length-bounded, free of control/HTML-shaped content, and
  validated before writes.
- Collection owner checks are repeated inside write transactions.
- Duplicate memberships are idempotent.
- Duplicate/invalid bulk items are reported without rolling back unrelated valid
  items.
- Revocation is an immediate `published_at = NULL` write; the public endpoint
  checks it on every request.
- Public output is an explicit allowlist rather than a stripped private object.
- Client and server metadata both mark valid share links `noindex` so crawler
  passes cannot disagree.
- Every new mobile action, selection control, and collection picker has a
  minimum 44×44 CSS-pixel target.

## Validation

A permanent real-system flow must:

1. Create two users and approved/unapproved resources.
2. Preserve a legacy bookmark and private note.
3. Exercise collection CRUD, reordering, archive, memberships, queue states,
   personal tags, source-aware bulk moves, and honest partial failure responses.
4. Prove cross-owner writes cannot see or mutate collections.
5. Publish and read a collection, verify the safe response shape and
   approved-only gate, then revoke it and receive `404`.
6. Exercise malformed/unknown public links.
7. Tear down all generated users and rows.

Completion also requires clean fresh-schema provisioning, migration drift,
typecheck/build, focused integration tests, desktop/mobile browser flows,
responsive/tablet audits, auth smoke, clean logs, and zero QA residue.

## Non-goals

- Real-time collaboration.
- Comments, followers, or feeds.
- Team workspaces or billing.
- Per-collection queue status.
