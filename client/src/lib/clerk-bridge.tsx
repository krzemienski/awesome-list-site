/**
 * Deferred Clerk loading (backlog X-03).
 *
 * The Clerk SDK (and the clerk-js/UI bundles it pulls from Clerk's CDN) used
 * to load on every page view, costing anonymous mobile visitors ~0.5 s of
 * main-thread time they never needed: identity comes from /api/auth/user,
 * which the server answers from the session cookie without Clerk in the page.
 *
 * This module is the eager, Clerk-free half. It holds a tiny store that says
 * whether Clerk has been requested and, once the lazily loaded runtime
 * (components/auth/ClerkRuntime) has mounted, exposes the handful of Clerk
 * actions the eager app needs (sign-out, the account portal). Clerk is
 * requested when it can matter:
 *   - a Clerk session hint exists (session cookies, Clerk handshake params),
 *   - the route is an auth page or a signed-in page,
 *   - the server reports a signed-in user,
 *   - the visitor opens the account menu, or a component needs a Clerk action.
 * Clerk UI widgets render through <ClerkSlot>: the runtime portals them into
 * the slot so the app tree never remounts when Clerk arrives.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/** The Clerk actions the eager (Clerk-free) app is allowed to call. */
export interface BridgedClerk {
  /** End the local Clerk session without Clerk's own after-sign-out navigation. */
  signOut: () => Promise<void>;
  openUserProfile: () => void;
}

interface ClerkBridgeSnapshot {
  /** Something asked for Clerk; the runtime chunk is (being) mounted. */
  requested: boolean;
  /** The runtime's ClerkProvider is mounted (clerk-js may still be loading). */
  mounted: boolean;
  /** clerk-js finished loading. */
  loaded: boolean;
  isSignedIn: boolean | undefined;
  clerk: BridgedClerk | null;
}

const INITIAL: ClerkBridgeSnapshot = {
  requested: false,
  mounted: false,
  loaded: false,
  isSignedIn: undefined,
  clerk: null,
};

let snapshot: ClerkBridgeSnapshot = INITIAL;
const listeners = new Set<() => void>();
let loadedWaiters: Array<(clerk: BridgedClerk) => void> = [];

function emit(next: ClerkBridgeSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestClerk(): void {
  if (!snapshot.requested) emit({ ...snapshot, requested: true });
}

export function isClerkRequested(): boolean {
  return snapshot.requested;
}

/** Called only by the runtime's publisher component. */
export function publishClerkState(state: {
  mounted: boolean;
  loaded: boolean;
  isSignedIn: boolean | undefined;
  clerk: BridgedClerk | null;
}): void {
  emit({ ...snapshot, ...state });
  if (state.loaded && state.clerk) {
    const waiters = loadedWaiters;
    loadedWaiters = [];
    for (const resolve of waiters) resolve(state.clerk);
  }
}

/**
 * Request Clerk and resolve once clerk-js has loaded. Rejects after
 * `timeoutMs` so callers surface an explicit "sign-in service didn't load"
 * failure instead of hanging.
 */
export function whenClerkLoaded(timeoutMs = 10_000): Promise<BridgedClerk> {
  requestClerk();
  if (snapshot.loaded && snapshot.clerk) return Promise.resolve(snapshot.clerk);
  return new Promise<BridgedClerk>((resolve, reject) => {
    const timer = setTimeout(() => {
      loadedWaiters = loadedWaiters.filter((waiter) => waiter !== done);
      reject(new Error("The sign-in service didn't load"));
    }, timeoutMs);
    const done = (clerk: BridgedClerk) => {
      clearTimeout(timer);
      resolve(clerk);
    };
    loadedWaiters.push(done);
  });
}

export function useClerkBridge(): ClerkBridgeSnapshot {
  // The server snapshot is the initial state, so hydration always sees the
  // same "not requested" tree the server rendered.
  return useSyncExternalStore(subscribe, () => snapshot, () => INITIAL);
}

const CLERK_ROUTE_RE =
  /^\/(sign-in|sign-up|logout|profile|contributions|notifications|onboarding|admin|bookmarks)(\/|$)/;

/** Auth pages and signed-in pages load Clerk up front. */
export function routeNeedsClerk(pathname: string): boolean {
  return CLERK_ROUTE_RE.test(pathname);
}

/**
 * Does this browser plausibly hold a Clerk session (or is it mid-handshake)?
 * clerk-js keeps `__client_uat` (non-zero while signed in) and `__session` as
 * first-party, script-readable cookies; OAuth/dev-browser returns carry
 * `__clerk_*` query parameters.
 */
export function hasClerkSessionHint(): boolean {
  if (typeof document === "undefined") return false;
  const cookie = document.cookie || "";
  for (const match of cookie.matchAll(/(?:^|;\s*)__client_uat(?:_[^=;]*)?=([^;]*)/g)) {
    const value = (match[1] ?? "").trim();
    if (value && value !== "0") return true;
  }
  if (/(?:^|;\s*)__session(?:_[^=;]*)?=/.test(cookie)) return true;
  return /[?&]__clerk_/.test(window.location.search);
}

// ---------------------------------------------------------------------------
// Clerk UI slots
// ---------------------------------------------------------------------------

export interface ClerkSlotEntry {
  id: string;
  node: HTMLElement;
  children: ReactNode;
}

let slots: ClerkSlotEntry[] = [];
const slotListeners = new Set<() => void>();

function emitSlots(next: ClerkSlotEntry[]) {
  slots = next;
  for (const listener of slotListeners) listener();
}

function subscribeSlots(listener: () => void) {
  slotListeners.add(listener);
  return () => {
    slotListeners.delete(listener);
  };
}

/** Read by the runtime, which portals each slot's children into its node. */
export function useClerkSlots(): ClerkSlotEntry[] {
  return useSyncExternalStore(subscribeSlots, () => slots, () => slots);
}

/**
 * Render Clerk-dependent UI (e.g. <SignIn>) at this position. Its children
 * are rendered by the Clerk runtime through a portal, so they see Clerk's
 * React context; `fallback` shows until the runtime has mounted.
 */
export function ClerkSlot({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const id = useId();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const { mounted } = useClerkBridge();

  useEffect(() => {
    requestClerk();
  }, []);

  useLayoutEffect(() => {
    if (!node) return;
    const entry: ClerkSlotEntry = { id, node, children };
    const index = slots.findIndex((slot) => slot.id === id);
    emitSlots(index === -1 ? [...slots, entry] : slots.map((slot, i) => (i === index ? entry : slot)));
  });

  useEffect(
    () => () => {
      emitSlots(slots.filter((slot) => slot.id !== id));
    },
    [id],
  );

  return (
    <>
      {!mounted && fallback}
      <div ref={setNode} className="contents" data-clerk-slot="" />
    </>
  );
}
