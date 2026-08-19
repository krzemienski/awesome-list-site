// Task #329: on-device bookmark store for signed-out visitors.
//
// Guests get the same one-click save UX as signed-in users; their saves live
// in localStorage under a single versioned key and merge into the account on
// sign-in (components/auth/GuestBookmarkMerge.tsx). Design notes:
//
// - Entries carry `savedAt` so the guest library can order by recency.
// - Storage-unavailable (private mode quota, blocked storage, sandboxed
//   iframes) degrades to an in-memory list for the session instead of
//   breaking the button; `isGuestStorePersistent()` lets surfaces warn that
//   saves last only for this visit.
// - Reactivity: `useSyncExternalStore` subscribed to a same-tab custom event
//   (localStorage writes don't fire `storage` in the writing tab) plus the
//   native cross-tab `storage` event.
// - Cap: guests keep up to GUEST_BOOKMARK_CAP saves; past that the UI prompts
//   sign-in (the account library is uncapped). The cap also bounds the merge
//   work done against the authed API after sign-in.

import { useSyncExternalStore } from "react";

export interface GuestBookmarkEntry {
  id: number;
  savedAt: string; // ISO timestamp
}

export const GUEST_BOOKMARK_CAP = 50;

const STORAGE_KEY = "guest-bookmarks-v1";
const CHANGE_EVENT = "guest-bookmarks-changed";

// Matches the server's int4 bound check — ids beyond this can never resolve.
const PG_INT_MAX = 2147483647;

export type GuestAddResult =
  | { ok: true; count: number; alreadySaved: boolean }
  | { ok: false; reason: "cap" | "invalid"; count: number };

// Non-null once we've fallen back to session-only in-memory storage.
let memoryEntries: GuestBookmarkEntry[] | null = null;
// Cached snapshots — useSyncExternalStore requires referential stability
// between change notifications.
let entriesCache: GuestBookmarkEntry[] | null = null;
let idSetCache: Set<number> | null = null;
let probeResult: boolean | null = null;

const EMPTY_ENTRIES: GuestBookmarkEntry[] = [];
const EMPTY_IDS: Set<number> = new Set();

function normalizeId(value: string | number): number | null {
  const n =
    typeof value === "number"
      ? value
      : /^\d+$/.test(String(value).trim())
        ? parseInt(String(value).trim(), 10)
        : NaN;
  if (!Number.isSafeInteger(n) || n < 1 || n > PG_INT_MAX) return null;
  return n;
}

function sanitize(value: unknown): GuestBookmarkEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  const out: GuestBookmarkEntry[] = [];
  for (const item of value) {
    const id = normalizeId((item as { id?: unknown })?.id as string | number);
    if (id === null || seen.has(id)) continue;
    seen.add(id);
    const savedAt = (item as { savedAt?: unknown })?.savedAt;
    out.push({
      id,
      savedAt: typeof savedAt === "string" ? savedAt : new Date(0).toISOString(),
    });
    if (out.length >= GUEST_BOOKMARK_CAP) break;
  }
  return out;
}

function readEntries(): GuestBookmarkEntry[] {
  if (memoryEntries !== null) return memoryEntries;
  if (typeof window === "undefined") return EMPTY_ENTRIES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_ENTRIES;
    return sanitize(JSON.parse(raw));
  } catch {
    // Unreadable/corrupt storage — treat as empty rather than crashing.
    return EMPTY_ENTRIES;
  }
}

function invalidateCaches(): void {
  entriesCache = null;
  idSetCache = null;
}

function notifyChanged(): void {
  invalidateCaches();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function writeEntries(entries: GuestBookmarkEntry[]): void {
  if (memoryEntries === null && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      notifyChanged();
      return;
    } catch {
      // Quota exceeded / storage blocked mid-session — degrade to memory so
      // the click still works; the save just won't outlive this visit.
      probeResult = false;
    }
  }
  memoryEntries = entries;
  notifyChanged();
}

/** False when saves can only last for the current visit (no localStorage). */
export function isGuestStorePersistent(): boolean {
  if (typeof window === "undefined") return false;
  if (memoryEntries !== null) return false;
  if (probeResult === null) {
    try {
      const probeKey = `${STORAGE_KEY}:probe`;
      window.localStorage.setItem(probeKey, "1");
      window.localStorage.removeItem(probeKey);
      probeResult = true;
    } catch {
      probeResult = false;
    }
  }
  return probeResult;
}

export function getGuestBookmarks(): GuestBookmarkEntry[] {
  if (entriesCache === null) entriesCache = readEntries();
  return entriesCache;
}

export function getGuestBookmarkIdSet(): Set<number> {
  if (idSetCache === null) {
    idSetCache = new Set(getGuestBookmarks().map((entry) => entry.id));
  }
  return idSetCache;
}

export function guestBookmarkCount(): number {
  return getGuestBookmarks().length;
}

export function isGuestBookmarked(resourceId: string | number): boolean {
  const id = normalizeId(resourceId);
  return id !== null && getGuestBookmarkIdSet().has(id);
}

export function addGuestBookmark(resourceId: string | number): GuestAddResult {
  const current = getGuestBookmarks();
  const id = normalizeId(resourceId);
  if (id === null) return { ok: false, reason: "invalid", count: current.length };
  if (current.some((entry) => entry.id === id)) {
    return { ok: true, count: current.length, alreadySaved: true };
  }
  if (current.length >= GUEST_BOOKMARK_CAP) {
    return { ok: false, reason: "cap", count: current.length };
  }
  const next = [...current, { id, savedAt: new Date().toISOString() }];
  writeEntries(next);
  return { ok: true, count: next.length, alreadySaved: false };
}

export function removeGuestBookmark(resourceId: string | number): {
  removed: boolean;
  count: number;
} {
  const current = getGuestBookmarks();
  const id = normalizeId(resourceId);
  if (id === null || !current.some((entry) => entry.id === id)) {
    return { removed: false, count: current.length };
  }
  const next = current.filter((entry) => entry.id !== id);
  writeEntries(next);
  return { removed: true, count: next.length };
}

/** Bulk removal (single write + notification); returns the remaining count. */
export function removeGuestBookmarkIds(ids: Array<string | number>): number {
  const idSet = new Set(
    ids.map(normalizeId).filter((value): value is number => value !== null),
  );
  const current = getGuestBookmarks();
  if (idSet.size === 0) return current.length;
  const next = current.filter((entry) => !idSet.has(entry.id));
  if (next.length !== current.length) writeEntries(next);
  return next.length;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocalChange = () => {
    invalidateCaches();
    callback();
  };
  const onStorage = (event: StorageEvent) => {
    // key === null means storage.clear(); otherwise only react to our key.
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    invalidateCaches();
    callback();
  };
  window.addEventListener(CHANGE_EVENT, onLocalChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onLocalChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getEmptyEntries = () => EMPTY_ENTRIES;
const getEmptyIds = () => EMPTY_IDS;

/** Reactive list of guest saves (newest additions last; sort at render). */
export function useGuestBookmarks(): GuestBookmarkEntry[] {
  return useSyncExternalStore(subscribe, getGuestBookmarks, getEmptyEntries);
}

/** Reactive id membership set — cheap `has()` checks for buttons/cards. */
export function useGuestBookmarkIds(): Set<number> {
  return useSyncExternalStore(subscribe, getGuestBookmarkIdSet, getEmptyIds);
}
