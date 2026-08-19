import { useEffect, useRef, useState, lazy, Suspense, Component, type ReactNode } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { noteLocationChange, useScrollRestoration } from "./lib/nav-history";
import { useAuth } from "./hooks/useAuth";
import { useCrossTabSync } from "./lib/crossTabSync";
import { ThemeProvider } from "@/components/ui/theme-provider";

import MainLayout from "@/components/layout/new/MainLayout";
import SEOHead from "@/components/layout/SEOHead";
import ErrorPage from "@/pages/ErrorPage";
import Home from "@/pages/Home";
import AdminGuard from "@/components/auth/AdminGuard";
import AuthGuard from "@/components/auth/AuthGuard";
import GuestBookmarkMerge from "@/components/auth/GuestBookmarkMerge";
import NotFound from "@/pages/not-found";
import ConsentBanner from "@/components/ui/consent-banner";
import ScrubbedParamsNotice from "@/components/ui/scrubbed-params-notice";
import { Button } from "@/components/ui/button";

// Admin dashboard is the only heavy, role-gated surface. Lazy-load it so the
// entire admin tree (and its /api/admin/* fetch strings) lands in a separate
// chunk that regular visitors never download.
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

// Task 301: Home is the only route kept in the entry chunk. Every other page
// loads behind the shared Suspense + RouteErrorBoundary below, so anonymous
// visitors do not parse category/detail form dependencies or role-gated code
// before they can use the landing page. The shell stays eager and interactive.
const Category = lazy(() => import("@/pages/Category"));
const Subcategory = lazy(() => import("@/pages/Subcategory"));
const SubSubcategory = lazy(() => import("@/pages/SubSubcategory"));
const ResourceDetail = lazy(() => import("@/pages/ResourceDetail"));
const Categories = lazy(() => import("@/pages/Categories"));
const About = lazy(() => import("@/pages/About"));
const Advanced = lazy(() => import("@/pages/Advanced"));
const Profile = lazy(() => import("@/pages/Profile"));
const Contributions = lazy(() => import("@/pages/Contributions"));

const BookmarksGate = lazy(() => import("@/pages/BookmarksGate"));
const BookmarksGate = lazy(() => import("@/pages/BookmarksGate"));
const PublicCollection = lazy(() => import("@/pages/PublicCollection"));
const SubmitResource = lazy(() => import("@/pages/SubmitResource"));
const Journeys = lazy(() => import("@/pages/Journeys"));
const JourneyDetail = lazy(() => import("@/pages/JourneyDetail"));

const ContinueLearning = lazy(() => import("@/pages/ContinueLearning"));
const ThemeSettings = lazy(() => import("@/pages/ThemeSettings"));
const Recommendations = lazy(() => import("@/pages/Recommendations"));
const Search = lazy(() => import("@/pages/Search"));
const Settings = lazy(() => import("@/pages/Settings"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const SearchDialog = lazy(() => import("@/components/ui/search-dialog"));

/** Route-level Suspense fallback — mirrors the page skeletons so a code-split
 * route paints a familiar loading state instead of a blank main region. */
function RouteFallback() {
  return (
    <div className="space-y-6" data-testid="route-chunk-skeleton" aria-busy="true" aria-label="Loading page">
      {/* BUG-031 (run22): while a lazy chunk loads, the head must already
          belong to the CURRENT route (brand title + current-path canonical),
          never linger on the previous route's metadata. The destination page
          replaces this with its real head in the same render that swaps the
          skeleton out. */}
      <SEOHead />
      <div className="h-8 w-2/3 max-w-md rounded-none bg-muted animate-pulse" />
      <div className="h-4 w-1/2 max-w-sm rounded-none bg-muted animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-none bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/** Search-palette Suspense fallback. It occupies the same modal layer as the
 * eventual palette, so opening search on a cold cache has a truthful visible
 * loading state instead of an inert click or a blank page. */
function SearchDialogFallback() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 px-4 pt-[15vh]"
      role="status"
      aria-busy="true"
      aria-label="Loading search"
      data-testid="search-dialog-skeleton"
    >
      <div className="w-full max-w-lg border border-border bg-background p-5 shadow-2xl">
        <div className="mb-4 h-5 w-32 animate-pulse bg-muted" />
        <div className="h-11 w-full animate-pulse bg-muted" />
      </div>
    </div>
  );
}

// NB-001 (run23): a rejected lazy-route import (deploy rotated the hashed
// chunk filenames, or a flaky network) used to escape the Suspense boundary
// and white-screen the whole app. This boundary keeps the chrome alive:
// chunk-load failures trigger ONE automatic full reload (new HTML → new
// chunk manifest); if that still fails, the visitor gets an in-app retry
// card. Vite caches the rejected import promise, so recovery must be a full
// reload — a soft re-render would replay the same rejection.
const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\d]+ failed/i;
const CHUNK_RELOAD_FLAG = "route-chunk-reload-attempted";

function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR_RE.test(`${error.name}: ${error.message}`);
}

interface RouteErrorBoundaryProps {
  location: string;
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
  // R5-018 (run24): set when a retry is attempted while still offline so the
  // card can say so instead of silently doing nothing (or dying in a reload).
  stillOffline: boolean;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null, stillOffline: false };

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (isChunkLoadError(error)) {
      // One-shot auto-reload guarded by a TIMESTAMP, not a boolean flag.
      // A boolean cleared on "clean render" loops forever: the boundary
      // renders error-free while Suspense is still fetching the chunk, so
      // the flag was wiped before every failure and each page load reloaded
      // again (verified live: 8 reloads/20s with a blocked chunk). With a
      // timestamp, a failure within the cooldown shows the retry card, and
      // a stale timestamp (future deploy rotation) re-arms the auto-reload
      // without any explicit clearing.
      // R5-018 (run24): the guard also records WHICH URL was auto-reloaded —
      // a second failure on the SAME URL inside the cooldown means the reload
      // didn't help, so fall through to the retry card; a failure on a
      // DIFFERENT route gets its own one-shot reload.
      let recentlyReloaded = false;
      try {
        const raw = sessionStorage.getItem(CHUNK_RELOAD_FLAG) ?? "0";
        const sep = raw.indexOf("|");
        const last = Number(sep === -1 ? raw : raw.slice(0, sep));
        const lastHref = sep === -1 ? "" : raw.slice(sep + 1);
        recentlyReloaded =
          Date.now() - last < 60_000 && lastHref === window.location.href;
        if (!recentlyReloaded) {
          sessionStorage.setItem(
            CHUNK_RELOAD_FLAG,
            `${Date.now()}|${window.location.href}`,
          );
        }
      } catch {
        // Storage unavailable (private mode) — skip the auto-reload guard
        // and fall through to the manual retry card to avoid a reload loop.
        recentlyReloaded = true;
      }
      // R5-018 (run24): NEVER auto-reload while offline — a full document
      // reload with no network dies on the browser's error page and destroys
      // the whole app session. Offline chunk failures fall through to the
      // in-app retry card, which keeps the shell (and in-memory state) alive.
      if (!recentlyReloaded && navigator.onLine !== false) {
        window.location.reload();
        return;
      }
    }
    console.error("Route render error:", error);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    // Navigating away clears the error so the next route renders normally.
    if (this.state.error && prevProps.location !== this.props.location) {
      this.setState({ error: null, stillOffline: false });
    }
  }

  handleRetry = () => {
    // R5-018 (run24): while offline a reload would land on the browser's
    // error page and kill the app session — surface an inline "still offline"
    // notice instead and keep the card (and app state) alive.
    if (navigator.onLine === false) {
      this.setState({ stillOffline: true });
      return;
    }
    // Stamp (not clear) the guard: this click IS a reload attempt, so if the
    // chunk still fails after it, the visitor lands back on this card instead
    // of burning an extra automatic reload first. (NB-001: never CLEAR the
    // timestamp — clearing re-arms the auto-reload loop.)
    try {
      sessionStorage.setItem(
        CHUNK_RELOAD_FLAG,
        `${Date.now()}|${window.location.href}`,
      );
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      // Do NOT clear the reload timestamp here: error-free renders happen
      // while Suspense is still fetching the chunk, so clearing on "clean
      // render" wiped the guard before every failure and caused an infinite
      // reload loop. The timestamp going stale (60s) re-arms auto-reload.
      return this.props.children;
    }

    if (isChunkLoadError(error)) {
      // R5-018 (run24): offline chunk failures get connection-specific copy;
      // online ones keep the deploy-rotation explanation.
      const offline = navigator.onLine === false;
      return (
        <div
          className="flex flex-col items-center justify-center gap-4 py-24 px-4 text-center"
          role="alert"
          data-testid="route-error-boundary"
        >
          <h1 className="text-xl font-semibold">
            {offline ? "Couldn't load this page — you appear to be offline" : "This page failed to load"}
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {offline
              ? "Check your connection, then retry. The rest of the app is still available."
              : "The site was likely updated while you were browsing, so your browser asked for files that no longer exist. Reloading fetches the new version."}
          </p>
          {this.state.stillOffline && (
            <p
              className="max-w-md text-sm font-medium text-[var(--accent)]"
              data-testid="text-still-offline"
            >
              Still offline — reconnect and try again.
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            data-testid="button-route-retry"
          >
            {offline ? "Retry" : "Reload page"}
          </button>
        </div>
      );
    }

    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-24 px-4 text-center"
        role="alert"
        data-testid="route-error-boundary"
      >
        <h1 className="text-xl font-semibold">Something went wrong on this page</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The rest of the site still works. You can retry this page or head back home.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.handleRetry}
            className="border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            data-testid="button-route-retry"
          >
            Retry
          </button>
          <a
            href="/"
            className="border border-border px-4 py-2 text-sm font-medium"
            data-testid="link-route-error-home"
          >
            Go home
          </a>
        </div>
      </div>
    );
  }
}

import { processAwesomeListData } from "@/lib/parser";
import {
  fetchStaticAwesomeList,
  fetchAwesomeListNav,
  needsCorpusRoute,
  type AwesomeListNav,
} from "@/lib/static-data";

// Run3 audit R3-29: every path pattern the Switch below can handle. Anything
// that matches none of these is a hard 404 — rendered as a standalone lean
// page BEFORE MainLayout so unknown URLs don't get the full app chrome
// (sidebar/header) that made 404s look like real content pages.
const KNOWN_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/(login|logout|register|signup|explore|forgot-password|reset-password|categories|category|recommendations|search|about|advanced|submit|journeys|journey|continue-learning|profile|contributions|bookmarks|favorites|account|admin|settings|notifications|onboarding|resource|terms|privacy)\/?$/,
  // Task #307: Clerk-hosted auth pages, including OAuth/verification sub-paths.
  /^\/(sign-in|sign-up)(\/.*)?$/,
  /^\/auth\/(login|register)\/?$/,
  /^\/category\/[^/]+(\/[^/]+)?$/,
  /^\/(subcategory|sub-subcategory|subsubcategory)\/[^/]+$/,
  /^\/resource\/[^/]+$/,
  /^\/journey\/[^/]+$/,
  /^\/collection\/[^/]+$/,
  /^\/admin\/[^/]+$/,
  /^\/settings\/theme\/?$/,
];

// Task #307 — Clerk auth wiring. REQUIRED canonical constants (copy-verbatim
// per the platform auth integration): resolve the publishable key from the
// window hostname so the same build serves multiple domains, and pass the
// proxy URL unconditionally (empty in dev is intentional — no PROD gates).
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

// Branded appearance: the app is dark-only with a red accent (--accent:
// #E50914 in the design system) and square corners throughout.
const clerkAppearance = {
  theme: dark,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/favicon.svg`,
  },
  variables: {
    colorPrimary: "#E50914",
    colorBackground: "#0a0a0a",
    colorForeground: "#f5f5f5",
    colorMutedForeground: "#a3a3a3",
    borderRadius: "0px",
  },
  elements: {
    // OAuth provider marks default to dark ink. Keep the dark card treatment,
    // but invert those marks so Apple, GitHub, and other monochrome providers
    // remain visible against their near-black buttons.
    socialButtonsBlockButton: {
      color: "#f5f5f5",
      borderColor: "#2a2a2a",
    },
    socialButtonsBlockButtonText: {
      color: "#f5f5f5",
    },
    socialButtonsProviderIcon: {
      filter: "brightness(0) invert(1)",
    },
  },
} as const;

const clerkLocalization = {
  signIn: {
    start: {
      title: "Welcome back",
      subtitle: "Sign in to continue to Awesome Video",
    },
  },
  signUp: {
    start: {
      title: "Create your account",
      subtitle: "Track journeys, bookmarks, and recommendations",
    },
  },
};

/** Legacy auth URL redirect: maps the old validated ?next= param onto Clerk's
 * ?redirect_url= so pre-migration links keep returning users to their page. */
function LegacyAuthRedirect({ to }: { to: "/sign-in" | "/sign-up" }) {
  const next = new URLSearchParams(window.location.search).get("next");
  const safeNext = next && /^\/(?![/\\])/.test(next) ? next : null;
  const suffix = safeNext ? `?redirect_url=${encodeURIComponent(safeNext)}` : "";
  return <Redirect to={`${to}${suffix}`} replace />;
}

function SignInPage() {
  return (
    <div className="flex justify-center py-10" data-testid="page-sign-in">
      {/* Title mirrors the og-middleware /sign-in template (two-pass parity). */}
      <SEOHead title="Sign In" noindex />
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex justify-center py-10" data-testid="page-sign-up">
      {/* Title mirrors the og-middleware /sign-up template (two-pass parity). */}
      <SEOHead title="Create an Account" noindex />
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
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
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// SPA-side /logout. Both direct and client-side navigation render this route,
// which signs out via Clerk and confirms invalidation before redirecting.
function Logout() {
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const doSignOut = async () => {
      try {
        await signOut();
        const authCheck = await fetch("/api/auth/user", {
          credentials: "include",
          cache: "no-store",
          signal: AbortSignal.timeout(5_000),
        });
        const state = authCheck.ok ? await authCheck.json() : null;
        if (!authCheck.ok || state?.isAuthenticated !== false) {
          throw new Error("The server could not confirm that your session ended");
        }
        if (!cancelled) window.location.replace("/");
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error ? reason.message : "Sign out failed",
          );
        }
      }
    };
    void doSignOut();
    return () => {
      cancelled = true;
    };
  }, [signOut]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-destructive font-medium" role="alert">
              {error}. You are still signed in.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Signing out…</p>
          </>
        )}
      </div>
    </div>
  );
}

function Router() {
  useAnalytics();
  // R4-081: refresh auth + bookmarks/favorites when another tab logs in/out or
  // toggles a bookmark/favorite (sentinel written via notifyCrossTabSync()).
  useCrossTabSync();
  const {
    user,
    isLoading: authLoading,
    error: authError,
    refetchAuth,
    logout,
    logoutError,
  } = useAuth();
  const [location] = useLocation();
  const isKnownRoute = KNOWN_ROUTE_PATTERNS.some((re) => re.test(location));
  const renderSearchDialog = ({
    isOpen,
    setIsOpen,
  }: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
  }) => (
    <RouteErrorBoundary location={location}>
      {isOpen ? (
        <Suspense fallback={<SearchDialogFallback />}>
          <SearchDialog isOpen setIsOpen={setIsOpen} />
        </Suspense>
      ) : null}
    </RouteErrorBoundary>
  );

  // BUG-013 (run14): count wouter navigations so back buttons can tell a
  // deep-linked first page (no in-app history) from real in-app browsing.
  useEffect(() => {
    noteLocationChange();
  }, [location]);

  // Run17 BUG-052: Back/Forward return to the saved scroll position instead
  // of the top; forward navigations still start at the top.
  useScrollRestoration(location);

  // Run22 BUG-008: the chrome (sidebar/header) renders from a ~few-KB nav
  // tree; the 2.7MB corpus is only fetched on routes whose CONTENT needs it
  // (home/category listings/advanced/recommendations). Other pages (resource
  // detail, journeys, profile, …) never download the corpus.
  // R5-024 (run24): expose the nav query's error + refetch so /categories can
  // render a real error card with a Retry button (instead of an eternal
  // skeleton) and the sidebar subtitle can resolve out of "Loading…".
  const {
    data: nav,
    isLoading: navLoading,
    isError: navError,
    refetch: refetchNav,
  } = useQuery<AwesomeListNav>({
    queryKey: ["awesome-list-nav"],
    queryFn: fetchAwesomeListNav,
    staleTime: 1000 * 60 * 60,
  });

  // The corpus is only a warm-start for Advanced browse. Taxonomy pages fetch
  // one server-paged tree slice and opt into this query themselves only after
  // an in-page search, tag filter, or alternate sort is active.
  const corpusNeeded = needsCorpusRoute(location);
  const { error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
    enabled: corpusNeeded,
  });

  /* MR-DS-03 — Orphan `/` + Ctrl/Cmd+K listener removed. The header
   * advertises the `/` kbd hint on the search chip; the real listener
   * now lives in SearchDialog so the hint resolves to the dialog that
   * MainLayout actually renders. */

  if (error) {
    return <ErrorPage error={error} />;
  }

  // BUG-009 (run14) → Task 169: shell-first paint, now content-first too.
  // Public routes render immediately while the auth check resolves — they
  // don't depend on auth, and blocking them serialized cold loads behind
  // /api/auth/user. Auth-gated routes are safe because AuthGuard/AdminGuard
  // each render their own loading state while `isLoading` is true, so no
  // wrong redirect can flash before /api/auth/user answers. The old
  // app-wide skeleton gate is gone entirely; the guards own their loading UI.

  // Run15 BUG-033 (supersedes R3-29's lean standalone 404): unknown URLs keep
  // the full sidebar/header chrome so lost visitors can navigate away instead
  // of hitting a dead end.
  if (!isKnownRoute) {
    return (
      <MainLayout nav={nav} isLoading={navLoading} navError={navError} onRetryNav={() => refetchNav()} user={user ?? undefined} onLogout={logout} logoutError={logoutError} renderSearchDialog={renderSearchDialog}>
        <NotFound />
      </MainLayout>
    );
  }

  return (
    <MainLayout nav={nav} isLoading={navLoading} navError={navError} onRetryNav={() => refetchNav()} user={user ?? undefined} onLogout={logout} logoutError={logoutError} renderSearchDialog={renderSearchDialog}>
      {/* NB-028 (run18): when the auth check itself fails (429/500/network),
          the app keeps working logged-out — surface it once with a manual
          retry instead of silently looping refetches behind a skeleton. */}
      {/* BUG-032/BUG-064 (run27): if the pre-boot scrubber removed unsafe
          query params (e.g. an HTML-shaped ?q= or ?tags=), say so explicitly
          instead of silently rendering the unfiltered page. */}
      <ScrubbedParamsNotice />
      {authError ? (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm"
          role="alert"
          data-testid="banner-auth-error"
        >
          <span>We couldn't verify your sign-in status. You can keep browsing as a guest.</span>
          <button
            type="button"
            className="underline underline-offset-2 font-medium"
            onClick={() => refetchAuth()}
            data-testid="button-auth-retry"
          >
            Retry
          </button>
        </div>
      ) : null}
      <RouteErrorBoundary location={location}>
      <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={() => {
          const q = new URLSearchParams(window.location.search).get("q");
          if (q && q.trim()) return <Redirect to={`/search?q=${encodeURIComponent(q.trim())}`} replace />;
          return <Home nav={nav} navLoading={navLoading} />;
        }} />
        {/* REQUIRED — the /*? optional wildcard is the only wouter syntax that
            matches both the bare URL and Clerk's OAuth/verification sub-paths. */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/logout" component={Logout} />
        {/* Legacy auth URLs (pre-Clerk) — preserve validated ?next= returns. */}
        <Route path="/login" component={() => <LegacyAuthRedirect to="/sign-in" />} />
        <Route path="/register" component={() => <LegacyAuthRedirect to="/sign-up" />} />
        <Route path="/forgot-password" component={() => <LegacyAuthRedirect to="/sign-in" />} />
        <Route path="/reset-password" component={() => <LegacyAuthRedirect to="/sign-in" />} />
        <Route path="/auth/login" component={() => <LegacyAuthRedirect to="/sign-in" />} />
        <Route path="/auth/register" component={() => <LegacyAuthRedirect to="/sign-up" />} />
        <Route path="/signup" component={() => <LegacyAuthRedirect to="/sign-up" />} />
        <Route path="/explore">
          <Redirect to="/search" replace />
        </Route>
        <Route path="/resource" component={() => {
          const q = new URLSearchParams(window.location.search).get("q");
          return <Redirect to={q && q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search"} replace />;
        }} />
        <Route path="/category/:slug/:subSlug">
          {(params) => <Redirect to={`/subcategory/${params.subSlug}`} replace />}
        </Route>
        <Route path="/category/:slug" component={Category} />
        <Route path="/categories" component={() => (
          <Categories
            nav={nav}
            isLoading={navLoading}
            error={navError}
            onRetry={() => refetchNav()}
          />
        )} />
        <Route path="/category">
          <Redirect to="/" replace />
        </Route>
        <Route path="/subcategory/:slug" component={Subcategory} />
        <Route path="/recommendations" component={Recommendations} />
        <Route path="/search" component={Search} />
        <Route path="/sub-subcategory/:slug" component={SubSubcategory} />
        <Route path="/subsubcategory/:slug">
          {(params) => <Redirect to={`/sub-subcategory/${params.slug}`} replace />}
        </Route>
        <Route path="/resource/:id" component={ResourceDetail} />
        <Route path="/about" component={About} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/advanced" component={Advanced} />
        <Route path="/submit" component={SubmitResource} />
        <Route path="/journeys" component={Journeys} />
        <Route path="/journey/:id" component={JourneyDetail} />
        <Route path="/continue-learning" component={ContinueLearning} />
        <Route path="/journey">
          <Redirect to="/journeys" replace />
        </Route>
        <Route path="/collection/:shareId">
          {(params) => <PublicCollection shareId={params.shareId} />}
        </Route>
        <Route path="/profile" component={() => (<AuthGuard><Profile user={user} /></AuthGuard>)} />
        <Route path="/contributions" component={() => (<AuthGuard><Contributions /></AuthGuard>)} />
        <Route path="/bookmarks" component={BookmarksGate} />
        <Route path="/notifications" component={() => (
          <AuthGuard>
            <Notifications />
          </AuthGuard>
        )} />
        {/* Run17 BUG-055: favorites and bookmarks are different collections —
            this used to land on /bookmarks. */}
        <Route path="/favorites">
          <Redirect to="/profile?tab=favorites" replace />
        </Route>
        <Route path="/account">
          <Redirect to="/profile" replace />
        </Route>
        <Route path="/admin" component={() => (
          <AdminGuard>
            <Suspense fallback={<RouteFallback />}>
              <AdminDashboard />
            </Suspense>
          </AdminGuard>
        )} />
        {/* R3-02: admin section deep-links (/admin/users, /admin/resources, …)
            open the matching tab — AdminDashboard reads :section via useRoute. */}
        <Route path="/admin/:section" component={() => (
          <AdminGuard>
            <Suspense fallback={<RouteFallback />}>
              <AdminDashboard />
            </Suspense>
          </AdminGuard>
        )} />
        <Route path="/settings/theme" component={ThemeSettings} />
        <Route path="/settings" component={Settings} />
        <Route path="/onboarding" component={() => (
          <AuthGuard>
            <Onboarding />
          </AuthGuard>
        )} />
        <Route>
          <NotFound />
        </Route>
      </Switch>
      </Suspense>
      </RouteErrorBoundary>
    </MainLayout>
  );
}

function App() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn("Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID");
    } else {
      initGA();
    }
  }, []);

  // R4-057: the server (og-middleware) injects a full crawl-time meta set into
  // <head>; after hydration react-helmet renders its own tags (marked with
  // data-react-helmet), leaving DUPLICATE title/description/og/twitter tags in
  // the live DOM. One-time cleanup: remove an UNMARKED tag only when a
  // helmet-marked counterpart with the same identity key exists, so
  // server-only tags (og:image:type, twitter:site, JSON-LD) are untouched.
  useEffect(() => {
    const keyOf = (el: Element) =>
      el.tagName === "TITLE"
        ? "title"
        : el.tagName === "LINK"
          ? `link:${el.getAttribute("rel")}`
          : `meta:${(el.getAttribute("name") || el.getAttribute("property") || "").toLowerCase()}`;
    const dedupe = (): boolean => {
      const head = document.head;
      const marked = new Set<string>();
      head
        .querySelectorAll("[data-react-helmet]")
        .forEach((el) => marked.add(keyOf(el)));
      if (marked.size === 0) return false;
      head
        .querySelectorAll(
          "title, meta[name], meta[property], link[rel='canonical']",
        )
        .forEach((el) => {
          if (el.hasAttribute("data-react-helmet")) return;
          if (marked.has(keyOf(el))) el.remove();
        });
      return true;
    };
    // Helmet commits asynchronously after first paint — try on the next two
    // frames, then once more after a short delay as a backstop.
    let cancelled = false;
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled && !dedupe()) {
          setTimeout(() => {
            if (!cancelled) dedupe();
          }, 300);
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
    };
  }, []);

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
      <ClerkQueryClientCacheInvalidator />
      {/* Task #329: pushes on-device guest saves into the account after
          sign-in (SPA transition or full-reload) — see the component for the
          dedupe/cleanup rules. */}
      <GuestBookmarkMerge />
      <ThemeProvider>
        {/* BUG-020 (run13): analytics consent banner — gtag loads only after
            an explicit Accept (initGA is consent-gated).
            BUG-054 (run26): rendered AFTER the router so the layout's
            "Skip to main content" link is the document's FIRST tab stop
            (run22 had it first in DOM, which put 3 banner controls ahead of
            the skip link on every fresh visit). The banner stays fixed at the
            bottom visually and remains keyboard-reachable after the page
            content, with Escape still dismissing it for the session. */}
        <Router />
        <ConsentBanner />
      </ThemeProvider>
    </ClerkProvider>
  );
}

export default App;
