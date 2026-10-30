import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  lazy,
  Suspense,
  Component,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import { Switch, Route, Redirect, useLocation, useSearch } from "wouter";
import { discoveryRedirect } from "@shared/discovery-params";
import { AccountThemePreferenceBridge } from "@/components/ui/theme-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { noteLocationChange, useRouteFocus, useScrollRestoration } from "./lib/nav-history";
import { useAuth } from "./hooks/useAuth";
import { findRouteSuggestion } from "./lib/not-found-suggestion";
import { pendingRouteTitle } from "./lib/pending-route-title";
import { useAnalytics } from "./hooks/use-analytics";
import { trackSiteError } from "./lib/analytics";
import { useCrossTabSync } from "./lib/crossTabSync";
import { hasClerkSessionHint, requestClerk, routeNeedsClerk, useClerkBridge } from "./lib/clerk-bridge";
import {
  applyProductProfile,
  resolveProductProfile,
} from "@/lib/design-system";

import MainLayout from "@/components/layout/new/MainLayout";
import SEOHead from "@/components/layout/SEOHead";
import ConsentBanner from "@/components/ui/consent-banner";
import ScrubbedParamsNotice from "@/components/ui/scrubbed-params-notice";
import { Button } from "@/components/ui/button";
import { focusPageHeading } from "@/hooks/focus-handoff";
// Static, not lazy: a corpus failure while offline must render this page
// without fetching another chunk.
import ErrorPage from "@/pages/ErrorPage";
import { useHeldError } from "@/hooks/useHeldError";

/**
 * React.lazy caches a rejected import for the life of the lazy object, so a
 * route chunk that failed while offline would rethrow the same error on every
 * re-render. Each route registers a reset here; RouteErrorBoundary calls
 * retryFailedRouteImports() once the server is reachable again, and the next
 * render imports the chunk afresh without a document reload. Resets are only
 * triggered by that explicit recovery, never by a render, so a chunk that keeps
 * failing cannot spin a retry loop.
 */
const routeImportResets = new Set<() => void>();

function retryFailedRouteImports(): void {
  routeImportResets.forEach((reset) => reset());
}

function lazyRoute<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  let rejected = false;
  const create = () =>
    lazy(() =>
      factory().catch((error: unknown) => {
        rejected = true;
        throw error;
      }),
    );
  let Inner = create();
  routeImportResets.add(() => {
    if (!rejected) return;
    rejected = false;
    Inner = create();
  });
  return function LazyRoute(props: ComponentProps<T>) {
    return <Inner {...props} />;
  };
}

// Guard and terminal error surfaces only render after routing has selected a
// matching branch. Keep them out of the anonymous entry while the auth/theme
// provider and the shell remain eager.
const AdminGuard = lazyRoute(() => import("@/components/auth/AdminGuard"));
const AuthGuard = lazyRoute(() => import("@/components/auth/AuthGuard"));
const NotFound = lazyRoute(() => import("@/pages/not-found"));
const LazyHomeRoute = lazyRoute(() => import("@/pages/Home"));
// Backlog X-03: the Clerk SDK is not part of the anonymous entry. Auth pages
// are route chunks, and the Clerk runtime mounts only once requested.
const SignInPage = lazyRoute(() => import("@/pages/AuthPages").then((m) => ({ default: m.SignInPage })));
const SignUpPage = lazyRoute(() => import("@/pages/AuthPages").then((m) => ({ default: m.SignUpPage })));
const Logout = lazyRoute(() => import("@/pages/AuthPages").then((m) => ({ default: m.Logout })));
const ClerkRuntime = lazyRoute(() => import("@/components/auth/ClerkRuntime"));

// Admin dashboard is the only heavy, role-gated surface. Lazy-load it so the
// entire admin tree (and its /api/admin/* fetch strings) lands in a separate
// chunk that regular visitors never download.
const AdminDashboard = lazyRoute(() => import("@/pages/AdminDashboard"));

// Task 301: every page loads behind the shared Suspense +
// RouteErrorBoundary below, so visitors do not parse route-specific
// dependencies or role-gated code before they can use the shell. Home is also
// a route chunk now; its anonymous SSR markup remains available immediately
// while the browser hydrates that chunk only on the landing route.
const Category = lazyRoute(() => import("@/pages/Category"));
const Subcategory = lazyRoute(() => import("@/pages/Subcategory"));
const SubSubcategory = lazyRoute(() => import("@/pages/SubSubcategory"));
const TagLanding = lazyRoute(() => import("@/pages/TagLanding"));
const ResourceDetail = lazyRoute(() => import("@/pages/ResourceDetail"));
const Categories = lazyRoute(() => import("@/pages/Categories"));
const About = lazyRoute(() => import("@/pages/About"));
const Advanced = lazyRoute(() => import("@/pages/Advanced"));
const Profile = lazyRoute(() => import("@/pages/Profile"));
const Contributions = lazyRoute(() => import("@/pages/Contributions"));

const BookmarksGate = lazyRoute(() => import("@/pages/BookmarksGate"));
const PublicCollection = lazyRoute(() => import("@/pages/PublicCollection"));
const SubmitResource = lazyRoute(() => import("@/pages/SubmitResource"));
const Journeys = lazyRoute(() => import("@/pages/Journeys"));
const JourneyDetail = lazyRoute(() => import("@/pages/JourneyDetail"));

const ContinueLearning = lazyRoute(() => import("@/pages/ContinueLearning"));
const ThemeSettings = lazyRoute(() => import("@/pages/ThemeSettings"));
const DesignSystemShowcase = lazyRoute(() => import("@/pages/DesignSystemShowcase"));
const Recommendations = lazyRoute(() => import("@/pages/Recommendations"));
const Search = lazyRoute(() => import("@/pages/Search"));
const Settings = lazyRoute(() => import("@/pages/Settings"));
const Notifications = lazyRoute(() => import("@/pages/Notifications"));
const Onboarding = lazyRoute(() => import("@/pages/Onboarding"));
const Terms = lazyRoute(() => import("@/pages/Terms"));
const Privacy = lazyRoute(() => import("@/pages/Privacy"));
const CodeOfConduct = lazyRoute(() => import("@/pages/CodeOfConduct"));
const SearchDialog = lazyRoute(() => import("@/components/ui/search-dialog"));
/** Route-level Suspense fallback — mirrors the page skeletons so a code-split
 * route paints a familiar loading state instead of a blank main region. */
function RouteFallback() {
  const queryClient = useQueryClient();
  const pendingTitle =
    typeof window === "undefined" ? undefined : pendingRouteTitle(queryClient, window.location.pathname);
  return (
    <div className="space-y-6" data-testid="route-chunk-skeleton" role="status" aria-busy="true" aria-label="Loading page">
      {/* BUG-031 (run22): while a lazy chunk loads, the head must already
          belong to the CURRENT route (brand title + current-path canonical),
          never linger on the previous route's metadata. The destination page
          replaces this with its real head in the same render that swaps the
          skeleton out. */}
      {pendingTitle ? <SEOHead title={pendingTitle} loading /> : <SEOHead />}
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
// C8-V2-01: Vite rejects a route import with "Unable to preload CSS for …"
// when the route's stylesheet can't load (offline, rotated hash) — the same
// failure as a missing script chunk.
const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\d]+ failed|Unable to preload CSS/i;
const CHUNK_RELOAD_FLAG = "route-chunk-reload-attempted";
const CONNECTIVITY_PROBE_TIMEOUT_MS = 3000;
/** Delays between reachability probes after a failed one; then the card waits for a click or `online`. */
const CONNECTIVITY_PROBE_BACKOFF_MS = [1000, 2000, 4000, 8000];

/** Any HTTP answer from our own server means a reload can load a document. */
async function isServerReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), CONNECTIVITY_PROBE_TIMEOUT_MS);
  try {
    await fetch("/api/health", { cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}
// C10-V2-01: a keyboard user who was on the route error card when it reloads
// the page lands on the recovered page's h1, not <body>.
const ROUTE_RETRY_FOCUS_FLAG = "route-retry-focus-heading";
const CARD_RETRY_FOCUS_WINDOW_MS = 10_000;

function restoreRouteRetryFocus(): void {
  let pending = false;
  try {
    pending = sessionStorage.getItem(ROUTE_RETRY_FOCUS_FLAG) === "1";
    sessionStorage.removeItem(ROUTE_RETRY_FOCUS_FLAG);
  } catch {
    return;
  }
  if (!pending) return;
  focusRecoveredHeading();
}

/** Wait for the recovered route's h1, then focus it unless focus already moved. */
function focusRecoveredHeading(): void {
  const startedAt = Date.now();
  const tick = () => {
    if (document.activeElement && document.activeElement !== document.body) return;
    if (document.querySelector("#main h1") && focusPageHeading()) return;
    if (Date.now() - startedAt < 10_000) window.setTimeout(tick, 200);
  };
  window.setTimeout(tick, 200);
}

if (typeof window !== "undefined") restoreRouteRetryFocus();

function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_ERROR_RE.test(`${error.name}: ${error.message}`);
}

interface RouteErrorBoundaryProps {
  location: string;
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  error: Error | null;
  // R5-018 (run24): set when a retry could not reload so the card says why
  // instead of silently doing nothing (or dying in a reload). "offline" is the
  // browser reporting no network; "unreachable" is a browser that believes it
  // is online but whose /api/health probe failed (server down, DNS, captive
  // portal).
  retryBlocked: "offline" | "unreachable" | null;
  // The route chunk failed while the browser was offline. Once the server
  // answers again the import is retried in place and the card never claims the
  // site was updated.
  failedOffline: boolean;
}

class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null, retryBlocked: null, failedOffline: false };

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error) {
    trackSiteError(isChunkLoadError(error) ? "chunk_load_failed" : "route_crash");
    if (isChunkLoadError(error)) {
      if (navigator.onLine === false) this.setState({ failedOffline: true });
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
        // Only a real reload attempt consumes the guard. An offline failure
        // never reloads, so stamping it there made the in-place retry after
        // reconnect find the guard already spent and show the "site was
        // updated" card instead of reloading (sweep C6-PC-062).
        if (!recentlyReloaded && navigator.onLine !== false) {
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
        if (Date.now() - this.cardRetryFocusAt < CARD_RETRY_FOCUS_WINDOW_MS) {
          try {
            sessionStorage.setItem(ROUTE_RETRY_FOCUS_FLAG, "1");
          } catch {
            // ignore
          }
        }
        window.location.reload();
        return;
      }
    }
    console.error("Route render error:", error);
  }

  // C8-V2-01: like the app's other offline states, a route that failed to load
  // offline retries by itself once the connection is back.
  handleOnline = () => {
    if (this.state.error && isChunkLoadError(this.state.error)) this.handleRetry();
  };

  private probeTimer: number | undefined;
  private probeAttempts = 0;
  // When an in-place retry started from the focused error card. The retried
  // import can fail again right after the card unmounts (focus is already on
  // <body> by then), and the boundary then reloads the document; this is how
  // that reload still knows to focus the recovered heading.
  private cardRetryFocusAt = 0;

  componentDidMount() {
    window.addEventListener("online", this.handleOnline);
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.handleOnline);
    window.clearTimeout(this.probeTimer);
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    // Navigating away clears the error so the next route renders normally.
    if (this.state.error && prevProps.location !== this.props.location) {
      window.clearTimeout(this.probeTimer);
      this.setState({ error: null, retryBlocked: null, failedOffline: false });
    }
  }

  handleRetry = () => {
    this.probeAttempts = 0;
    void this.reloadWhenReachable();
  };

  // The `online` event often fires before the network is usable, and a reload
  // into a dead network lands on the browser's error page where nothing can
  // retry. Reload only once the server answers; until then keep this page and
  // probe again on a short backoff.
  private reloadWhenReachable = async () => {
    window.clearTimeout(this.probeTimer);
    // R5-018 (run24): while offline a reload would land on the browser's
    // error page and kill the app session — surface an inline "still offline"
    // notice instead and keep the card (and app state) alive.
    if (navigator.onLine === false) {
      this.setState({ retryBlocked: "offline" });
      return;
    }
    if (!(await isServerReachable())) {
      if (!this.state.error) return;
      this.setState({ retryBlocked: "unreachable" });
      const delay = CONNECTIVITY_PROBE_BACKOFF_MS[this.probeAttempts++];
      if (delay !== undefined) {
        this.probeTimer = window.setTimeout(() => void this.reloadWhenReachable(), delay);
      }
      return;
    }
    if (!this.state.error) return;
    // A chunk that failed offline was never stale: retry the import in place
    // (keeps app state, no document reload, so the 60s reload guard is not
    // consumed). If it fails again online, componentDidCatch applies that guard.
    if (this.state.failedOffline) {
      // The error card held focus; once it unmounts focus falls to <body>, so
      // hand it to the recovered page's heading as the reload path does.
      const cardHadFocus = Boolean(
        document.activeElement?.closest("[data-testid='route-error-boundary']"),
      );
      if (cardHadFocus) this.cardRetryFocusAt = Date.now();
      retryFailedRouteImports();
      this.setState({ error: null, retryBlocked: null, failedOffline: false });
      if (cardHadFocus) focusRecoveredHeading();
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
      if (document.activeElement?.closest("[data-testid='route-error-boundary']")) {
        sessionStorage.setItem(ROUTE_RETRY_FOCUS_FLAG, "1");
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    const { error, retryBlocked } = this.state;
    const retryBlockedNote = retryBlocked && (
      <p
        className="max-w-md text-sm font-medium text-[var(--accent-ink)]"
        data-testid={retryBlocked === "offline" ? "text-still-offline" : "text-server-unreachable"}
      >
        {retryBlocked === "offline"
          ? "Still offline — reconnect and try again."
          : "Can't reach the server right now. Try again in a moment."}
      </p>
    );
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
      const offline = navigator.onLine === false || this.state.retryBlocked === "offline";
      const unreachable = !offline && this.state.retryBlocked === "unreachable";
      const reconnected = this.state.failedOffline && !offline && !unreachable;
      return (
        <div
          className="flex flex-col items-center justify-center gap-4 py-24 px-4 text-center"
          role="alert"
          data-testid="route-error-boundary"
        >
          <h1 className="display-h text-xl">
            {offline
              ? "Couldn't load this page — you appear to be offline"
              : reconnected
                ? "Reconnected — loading this page"
                : unreachable
                ? "Couldn't load this page — the server isn't responding"
                : "This page failed to load"}
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {offline
              ? "Check your connection, then retry. The rest of the app is still available."
              : reconnected
                ? "Your connection is back. This page will load in a moment."
                : unreachable
                ? "Your connection looks fine, but the site isn't answering. The rest of the app is still available."
                : "The site was likely updated while you were browsing, so your browser asked for files that no longer exist. Reloading fetches the new version."}
          </p>
          {retryBlockedNote}
          <Button
            type="button"
            onClick={this.handleRetry}
            data-testid="button-route-retry"
          >
            {offline || reconnected ? "Retry" : "Reload page"}
          </Button>
        </div>
      );
    }

    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-24 px-4 text-center"
        role="alert"
        data-testid="route-error-boundary"
      >
        <h1 className="display-h text-xl">Something went wrong on this page</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The rest of the site still works. You can retry this page or head back home.
        </p>
        {retryBlockedNote}
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={this.handleRetry}
            data-testid="button-route-retry"
          >
            Retry
          </Button>
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

import {
  fetchStaticAwesomeList,
  fetchAwesomeListNav,
  needsCorpusRoute,
  type AwesomeListNav,
} from "@/lib/static-data";

type HomeRouteProps = {
  nav?: AwesomeListNav;
  navLoading: boolean;
};
type HomeRouteComponent = ComponentType<HomeRouteProps>;
const HomeRoute: HomeRouteComponent = (props) => <LazyHomeRoute {...props} />;

// Run3 audit R3-29: every path pattern the Switch below can handle. Anything
// that matches none of these is a hard 404 — rendered as a standalone lean
// page BEFORE MainLayout so unknown URLs don't get the full app chrome
// (sidebar/header) that made 404s look like real content pages.
const KNOWN_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/(login|logout|register|signup|explore|forgot-password|reset-password|categories|category|subcategory|sub-subcategory|tag|recommendations|search|about|advanced|submit|journeys|journey|continue-learning|profile|contributions|bookmarks|favorites|account|admin|settings|notifications|onboarding|resource|terms|privacy|code-of-conduct)\/?$/,
  // Task #307: Clerk-hosted auth pages, including OAuth/verification sub-paths.
  /^\/(sign-in|sign-up)(\/.*)?$/,
  /^\/auth\/(login|register)\/?$/,
  /^\/category\/[^/]+(\/[^/]+)?$/,
  /^\/tag\/[^/]+$/,
  /^\/(subcategory|sub-subcategory|subsubcategory)\/[^/]+$/,
  /^\/resource\/[^/]+$/,
  /^\/journey\/[^/]+$/,
  /^\/collection\/[^/]+$/,
  /^\/admin\/[^/]+$/,
  /^\/settings\/theme\/?$/,
  // Task #346: living design-system showcase.
  /^\/design-system\/?$/,
];

/** Legacy auth URL redirect: maps the old validated ?next= param onto Clerk's
 * ?redirect_url= so pre-migration links keep returning users to their page. */
function LegacyAuthRedirect({ to }: { to: "/sign-in" | "/sign-up" }) {
  const next = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  ).get("next");
  const safeNext = next && /^\/(?![/\\])/.test(next) ? next : null;
  const suffix = safeNext ? `?redirect_url=${encodeURIComponent(safeNext)}` : "";
  return <Redirect to={`${to}${suffix}`} replace />;
}

/** A Clerk runtime that fails to load (offline, blocked CDN, rotated chunk)
 * must never take the app down: auth surfaces show their own fallbacks. */
class ClerkRuntimeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error("[auth] Clerk runtime failed to load", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Mounts the Clerk runtime once something needs it (see lib/clerk-bridge).
 * The first render is always empty, on the server and during hydration;
 * session hints and Clerk routes request it from an effect.
 */
function ClerkHost() {
  const { requested } = useClerkBridge();
  const [location] = useLocation();
  useEffect(() => {
    if (routeNeedsClerk(location) || hasClerkSessionHint()) requestClerk();
  }, [location]);
  if (!requested) return null;
  return (
    <ClerkRuntimeBoundary>
      <Suspense fallback={null}>
        <ClerkRuntime />
      </Suspense>
    </ClerkRuntimeBoundary>
  );
}

function Router({
  homeComponent: Home,
  resourceComponent: ResourcePage,
}: {
  homeComponent: HomeRouteComponent;
  resourceComponent: ComponentType;
}) {
  // Analytics tracking is consent-gated internally, but the hook itself stays
  // in the eager graph. Deferring it only relocates bytes: Router mounts it on
  // every route immediately, so visitors would still fetch this chunk on
  // first paint.
  useAnalytics();
  // R4-081: refresh auth + bookmarks/favorites when another tab logs in/out or
  // toggles a bookmark/favorite (sentinel written via notifyCrossTabSync()).
  useCrossTabSync();
  const {
    user,
    error: authError,
    refetchAuth,
    logout,
    logoutError,
  } = useAuth();
  const [location] = useLocation();
  // A signed-in visitor needs Clerk for token refresh and sign-out.
  useEffect(() => {
    if (user) requestClerk();
  }, [user]);
  // Legacy `/?q=` and `/resource?q=` searches redirect to /search. Read the
  // query through the router (not window.location at mount) so the routes
  // below can be plain children: an inline `component={() => …}` is a new
  // component type on every Router render, which remounted the whole page
  // (guards included) whenever auth/nav state changed.
  const search = useSearch();
  const legacyHomeQuery = new URLSearchParams(search).get("q")?.trim() || "";
  const productProfile = resolveProductProfile(location);
  useLayoutEffect(() => {
    applyProductProfile(productProfile);
  }, [productProfile]);
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
  useScrollRestoration(location, search);
  // PG-01: announce in-app navigations by focusing the new page's h1.
  useRouteFocus(location);

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
  const { error: corpusError, isFetching: corpusFetching, refetch } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
    enabled: corpusNeeded,
    // The default "online" mode pauses offline and never errors, which left
    // the chunk-failure fallback as the only thing an offline visitor saw.
    networkMode: "always",
  });

  /* MR-DS-03 — Orphan `/` + Ctrl/Cmd+K listener removed. The header
   * advertises the `/` kbd hint on the search chip; the real listener
   * now lives in SearchDialog so the hint resolves to the dialog that
   * MainLayout actually renders. */

  const error = useHeldError(corpusError, corpusFetching, "awesome-list-data");

  if (error) {
    return (
      <div className="page">
        <div className="grain" aria-hidden="true" />
        <RouteErrorBoundary location={location}>
          <ErrorPage error={error} retrying={corpusFetching} onRetry={() => void refetch()} />
        </RouteErrorBoundary>
      </div>
    );
  }

  // BUG-009 (run14) → Task 169: shell-first paint, now content-first too.
  // Public routes render immediately while the auth check resolves — they
  // don't depend on auth, and blocking them serialized cold loads behind
  // /api/auth/user. Auth-gated routes are safe because AuthGuard/AdminGuard
  // each render their own loading state while `isLoading` is true, so no
  // wrong redirect can flash before /api/auth/user answers. The old
  // app-wide skeleton gate is gone entirely; the guards own their loading UI.

  const homeElement = legacyHomeQuery ? (
    <Redirect to={`/search?q=${encodeURIComponent(legacyHomeQuery)}`} replace />
  ) : (
    <Home nav={nav} navLoading={navLoading} />
  );

  // Run15 BUG-033 (supersedes R3-29's lean standalone 404): unknown URLs keep
  // the full sidebar/header chrome so lost visitors can navigate away instead
  // of hitting a dead end.
  if (!isKnownRoute) {
    return (
      <MainLayout productProfile={productProfile} nav={nav} isLoading={navLoading} navError={navError} onRetryNav={() => void refetchNav()} user={user ?? undefined} onLogout={logout} logoutError={logoutError} renderSearchDialog={renderSearchDialog}>
        <RouteErrorBoundary location={location}>
        <Suspense fallback={<RouteFallback />}>
          <NotFound suggestion={findRouteSuggestion(location, nav)} />
        </Suspense>
        </RouteErrorBoundary>
      </MainLayout>
    );
  }

  return (
    <MainLayout productProfile={productProfile} nav={nav} isLoading={navLoading} navError={navError} onRetryNav={() => void refetchNav()} user={user ?? undefined} onLogout={logout} logoutError={logoutError} renderSearchDialog={renderSearchDialog}>
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
          <Button
            type="button"
            variant="link"
            className="underline underline-offset-2"
            onClick={() => void refetchAuth()}
            data-testid="button-auth-retry"
          >
            Retry
          </Button>
        </div>
      ) : null}
      <RouteErrorBoundary location={location}>
      {Home !== HomeRoute && location === "/" ? (
        // SSR and its hydration pass the resolved Home, so nothing here can
        // suspend. Keeping it outside the route Suspense matters: React defers
        // a server-rendered boundary to an idle hydration pass, and the shell's
        // query updates (auth, config) re-render into it first — a sync update
        // into a dehydrated boundary throws #421 and client-renders Home
        // (WebKit ~2/5 loads). Lazy pieces inside Home own their boundaries.
        homeElement
      ) : (
      <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/">{homeElement}</Route>
        {/* REQUIRED — the /*? optional wildcard is the only wouter syntax that
            matches both the bare URL and Clerk's OAuth/verification sub-paths. */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/logout" component={Logout} />
        {/* Legacy auth URLs (pre-Clerk) — preserve validated ?next= returns. */}
        <Route path="/login"><LegacyAuthRedirect to="/sign-in" /></Route>
        <Route path="/register"><LegacyAuthRedirect to="/sign-up" /></Route>
        <Route path="/forgot-password"><LegacyAuthRedirect to="/sign-in" /></Route>
        <Route path="/reset-password"><LegacyAuthRedirect to="/sign-in" /></Route>
        <Route path="/auth/login"><LegacyAuthRedirect to="/sign-in" /></Route>
        <Route path="/auth/register"><LegacyAuthRedirect to="/sign-up" /></Route>
        <Route path="/signup"><LegacyAuthRedirect to="/sign-up" /></Route>
        <Route path="/explore">
          <Redirect to={discoveryRedirect("/search", search)} replace />
        </Route>
        <Route path="/resource">
          <Redirect to={discoveryRedirect("/search", search)} replace />
        </Route>
        <Route path="/category/:slug/:subSlug">
          {/* Mirrors og-middleware: only a real subcategory slug redirects;
              an unknown nested slug stays a 404 at the URL the visitor used. */}
          {(params) =>
            navLoading ? null
            : nav?.categories.some((c) => (c.subcategories ?? []).some((sub) => sub.slug === params.subSlug))
              ? <Redirect to={discoveryRedirect(`/subcategory/${params.subSlug}`, search)} replace />
              : <NotFound suggestion={findRouteSuggestion(location, nav)} />}
        </Route>
        <Route path="/category/:slug" component={Category} />
        <Route path="/tag">
          <Redirect to="/categories" replace />
        </Route>
        <Route path="/tag/:slug" component={TagLanding} />
        <Route path="/categories">
          <Categories
            nav={nav}
            isLoading={navLoading}
            error={navError}
            onRetry={() => void refetchNav()}
          />
        </Route>
        {/* R5-051: one bare-prefix policy with the server — taxonomy
            prefixes without a slug land on the category index. */}
        <Route path="/category">
          <Redirect to="/categories" replace />
        </Route>
        <Route path="/subcategory">
          <Redirect to="/categories" replace />
        </Route>
        <Route path="/sub-subcategory">
          <Redirect to="/categories" replace />
        </Route>
        <Route path="/subcategory/:slug" component={Subcategory} />
        <Route path="/recommendations" component={Recommendations} />
        <Route path="/search" component={Search} />
        <Route path="/sub-subcategory/:slug" component={SubSubcategory} />
        <Route path="/subsubcategory/:slug">
          {(params) => <Redirect to={discoveryRedirect(`/sub-subcategory/${params.slug}`, search)} replace />}
        </Route>
        <Route path="/resource/:id" component={ResourcePage} />
        <Route path="/about" component={About} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/code-of-conduct" component={CodeOfConduct} />
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
        <Route path="/profile"><AuthGuard><Profile user={user} /></AuthGuard></Route>
        <Route path="/contributions"><AuthGuard><Contributions /></AuthGuard></Route>
        <Route path="/bookmarks" component={BookmarksGate} />
        <Route path="/notifications">
          <AuthGuard>
            <Notifications />
          </AuthGuard>
        </Route>
        {/* Run17 BUG-055: favorites and bookmarks are different collections —
            this used to land on /bookmarks. */}
        <Route path="/favorites">
          <Redirect to="/profile?tab=favorites" replace />
        </Route>
        <Route path="/account">
          <Redirect to="/profile" replace />
        </Route>
        <Route path="/admin">
          <AdminGuard>
            <Suspense fallback={<RouteFallback />}>
              <AdminDashboard />
            </Suspense>
          </AdminGuard>
        </Route>
        {/* R3-02: admin section deep-links (/admin/users, /admin/resources, …)
            open the matching tab — AdminDashboard reads :section via useRoute. */}
        <Route path="/admin/:section">
          <AdminGuard>
            <Suspense fallback={<RouteFallback />}>
              <AdminDashboard />
            </Suspense>
          </AdminGuard>
        </Route>
        <Route path="/settings/theme" component={ThemeSettings} />
        <Route path="/design-system" component={DesignSystemShowcase} />
        <Route path="/settings" component={Settings} />
        <Route path="/onboarding">
          <AuthGuard>
            <Onboarding />
          </AuthGuard>
        </Route>
        <Route>
          <NotFound suggestion={findRouteSuggestion(location, nav)} />
        </Route>
      </Switch>
      </Suspense>
      )}
      </RouteErrorBoundary>
    </MainLayout>
  );
}

export function App({
  homeComponent = HomeRoute,
  resourceComponent = ResourceDetail,
}: {
  homeComponent?: HomeRouteComponent;
  /**
   * The already-loaded resource page on a direct visit (main.tsx), so the
   * first commit is the finished page rather than the route skeleton that the
   * page then replaces — a full-height layout shift under the prerender hold.
   */
  resourceComponent?: ComponentType;
} = {}) {
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
    <AccountThemePreferenceBridge>
      {/* BUG-020 (run13): analytics consent banner — analytics loads only
          after an explicit grant through the shared post-paint coordinator.
          BUG-054 (run26): rendered AFTER the router so the layout's
          "Skip to main content" link is the document's FIRST tab stop
          (run22 had it first in DOM, which put 3 banner controls ahead of
          the skip link on every fresh visit). It is a sticky bottom row at
          every width, so its controls come after the page content both on
          screen and in focus order, and Escape still dismisses it for the
          session. */}
      <Router homeComponent={homeComponent} resourceComponent={resourceComponent} />
      <ConsentBanner />
      <ClerkHost />
    </AccountThemePreferenceBridge>
  );
}

export default App;
