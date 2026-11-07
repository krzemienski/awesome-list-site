/**
 * The lazily loaded Clerk half of the app (backlog X-03). App mounts this as
 * a sibling of the router only once Clerk is requested (see
 * lib/clerk-bridge), so anonymous visitors never download or run the Clerk
 * SDK. Clerk widgets render here through portals into <ClerkSlot> nodes,
 * which keeps the page tree mounted while Clerk arrives.
 */
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ClerkProvider, useAuth as useClerkAuth, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { setSessionTokenRefresher } from "@/lib/queryClient";
import { authPageHeadings } from "@shared/seo-templates";
import { useClerkAppearance } from "@/lib/clerk-appearance";
import { publishClerkState, useClerkSlots, type BridgedClerk } from "@/lib/clerk-bridge";
import AuthConversionTracker from "./AuthConversionTracker";
import GuestBookmarkMerge from "./GuestBookmarkMerge";

// Task #307 — browser loads derive the publishable key from the current
// hostname so one build can serve multiple domains. A loopback host has no
// Clerk custom domain to derive (a production build served on localhost would
// otherwise ask for clerk.localhost), so local runs use the configured key. A
// missing build-time key is a configuration error; never substitute a fake key.
const configuredClerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isLoopbackHost = (host: string) =>
  host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost");
const clerkPubKey = isLoopbackHost(window.location.hostname)
  ? configuredClerkPubKey
  : publishableKeyFromHost(window.location.hostname, configuredClerkPubKey);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!clerkPubKey) {
  throw new Error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY: configure the Clerk publishable key for browser auth",
  );
}

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkLocalization = {
  signIn: {
    start: {
      title: authPageHeadings.signIn,
      subtitle: "Sign in to continue to Awesome Video",
    },
  },
  signUp: {
    start: {
      title: authPageHeadings.signUp,
      subtitle: "Track journeys, bookmarks, and recommendations",
    },
  },
};

/** Publishes Clerk's load/session state and actions to the eager app. */
function ClerkBridgePublisher() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();

  // Lets the query cache refresh a stale __session token before treating a
  // protected 401 as an expired session (C3-V5A-07). Registered before the
  // loaded state is published, so a caller woken by whenClerkLoaded() finds it.
  useEffect(() => {
    setSessionTokenRefresher(() => getToken({ skipCache: true }));
    return () => setSessionTokenRefresher(null);
  }, [getToken]);

  // One stable action object per Clerk instance, so consumers keyed on it do
  // not re-run when only the session state changes.
  const bridged = useMemo<BridgedClerk>(
    () => ({
      signOut: async () => {
        // The no-op callback stops Clerk routing to its after-sign-out URL;
        // callers do their own full reload once the server confirms.
        await clerk.signOut(() => {});
      },
      openUserProfile: () => clerk.openUserProfile(),
    }),
    [clerk],
  );

  useEffect(() => {
    publishClerkState({ mounted: true, loaded: isLoaded, isSignedIn, clerk: bridged });
  }, [bridged, isLoaded, isSignedIn]);

  return null;
}

// Keeps the webview truthful when the signed-in user changes: any Clerk user
// switch (sign-in, sign-out, account change) clears the query cache so no
// user-scoped data leaks across identities.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current === undefined) {
        // The first callback may already contain a restored Clerk user. The
        // anonymous SSR/query cache must not outlive that first authenticated
        // observation, but it holds no other identity's data (the session
        // cookie was already sent with every client fetch), so refetch it in
        // place rather than clearing it: `clear()` here also dropped
        // /api/auth/user and every guard flashed "Verifying access…", which
        // remounted the whole signed-in page tree 50–400 ms after load and
        // lost its scroll positions and any early input.
        if (userId !== null) void qc.invalidateQueries();
      } else if (prevUserIdRef.current !== userId) {
        // A real identity switch (sign-in, sign-out, account change): nothing
        // user-scoped may survive it. resetQueries, not clear(): clear() drops
        // the cache but leaves mounted observers holding their old result, so
        // the header kept showing "Visitor" after sign-in until a reload.
        void qc.resetQueries();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkSlotPortals() {
  const slots = useClerkSlots();
  return <>{slots.map((slot) => createPortal(slot.children, slot.node, slot.id))}</>;
}

export default function ClerkRuntime() {
  const [, setLocation] = useLocation();
  // Task #376: the Clerk widget paints from resolved DS tokens and re-resolves
  // when the visitor changes system/accent at /settings/theme.
  const clerkAppearance = useClerkAppearance(basePath);

  useEffect(
    () => () => publishClerkState({ mounted: false, loaded: false, isSignedIn: undefined, clerk: null }),
    [],
  );

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={clerkLocalization}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkBridgePublisher />
      <ClerkQueryClientCacheInvalidator />
      {/* Task #393: fires the GA4 login / sign_up conversions once per
          completed Clerk auth attempt (never on a session restore or token
          refresh) — see the component for how the two are told apart. */}
      <AuthConversionTracker />
      {/* Task #329: pushes on-device guest saves into the account after
          sign-in (SPA transition or full-reload) — see the component for the
          dedupe/cleanup rules. */}
      <GuestBookmarkMerge />
      <ClerkSlotPortals />
    </ClerkProvider>
  );
}
