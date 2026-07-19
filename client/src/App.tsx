import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { noteLocationChange, useScrollRestoration } from "./lib/nav-history";
import { useAuth } from "./hooks/useAuth";
import { useCrossTabSync } from "./lib/crossTabSync";
import { ThemeProvider } from "@/components/ui/theme-provider";

import MainLayout from "@/components/layout/new/MainLayout";
import ErrorPage from "@/pages/ErrorPage";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Subcategory from "@/pages/Subcategory";
import SubSubcategory from "@/pages/SubSubcategory";
import AdminGuard from "@/components/auth/AdminGuard";
import AuthGuard from "@/components/auth/AuthGuard";
import NotFound from "@/pages/not-found";
import ResourceDetail from "@/pages/ResourceDetail";
import Categories from "@/pages/Categories";
import ConsentBanner from "@/components/ui/consent-banner";

// Admin dashboard is the only heavy, role-gated surface. Lazy-load it so the
// entire admin tree (and its /api/admin/* fetch strings) lands in a separate
// chunk that regular visitors never download.
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

// Task 169 (cold-load perf): only the hot browse surfaces (home, the three
// category-tree levels, resource detail, 404) stay in the entry chunk.
// Everything else — auth forms, profile/bookmarks, submit (react-hook-form +
// zod), journeys, settings, static/legal pages — is code-split so the first
// parse/eval of the main bundle is smaller on cold loads of heavy category
// pages. Each lazy route renders inside the Suspense boundary around the
// Switch below (lightweight skeleton fallback, chrome stays mounted).
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const About = lazy(() => import("@/pages/About"));
const Advanced = lazy(() => import("@/pages/Advanced"));
const Profile = lazy(() => import("@/pages/Profile"));
const Bookmarks = lazy(() => import("@/pages/Bookmarks"));
const SubmitResource = lazy(() => import("@/pages/SubmitResource"));
const Journeys = lazy(() => import("@/pages/Journeys"));
const JourneyDetail = lazy(() => import("@/pages/JourneyDetail"));
const ThemeSettings = lazy(() => import("@/pages/ThemeSettings"));
const Recommendations = lazy(() => import("@/pages/Recommendations"));
const Search = lazy(() => import("@/pages/Search"));
const Settings = lazy(() => import("@/pages/Settings"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));

/** Route-level Suspense fallback — mirrors the page skeletons so a code-split
 * route paints a familiar loading state instead of a blank main region. */
function RouteFallback() {
  return (
    <div className="space-y-6" data-testid="route-chunk-skeleton" aria-busy="true" aria-label="Loading page">
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

import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";

// Run3 audit R3-29: every path pattern the Switch below can handle. Anything
// that matches none of these is a hard 404 — rendered as a standalone lean
// page BEFORE MainLayout so unknown URLs don't get the full app chrome
// (sidebar/header) that made 404s look like real content pages.
const KNOWN_ROUTE_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/(login|logout|register|signup|explore|forgot-password|reset-password|categories|category|recommendations|search|about|advanced|submit|journeys|journey|profile|bookmarks|favorites|account|admin|settings|resource|terms|privacy)\/?$/,
  /^\/auth\/(login|register)\/?$/,
  /^\/category\/[^/]+(\/[^/]+)?$/,
  /^\/(subcategory|sub-subcategory|subsubcategory)\/[^/]+$/,
  /^\/resource\/[^/]+$/,
  /^\/journey\/[^/]+$/,
  /^\/admin\/[^/]+$/,
  /^\/settings\/theme\/?$/,
];

// Run3 audit R3-10: SPA-side /logout. Direct browser navigation is handled by
// the server's GET /logout (302 → "/"), but client-side navigation to /logout
// previously fell through to the 404 page with the session intact. This route
// posts to /api/auth/logout then hard-redirects home — the full reload wipes
// all in-memory query cache so no stale authed data survives.
function Logout() {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .catch(() => {
        // Even if the API call fails, fall through to the redirect — the
        // server GET /logout on the next full load is the backstop.
      })
      .finally(() => {
        window.location.replace("/");
      });
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Signing out…</p>
      </div>
    </div>
  );
}

function Router() {
  useAnalytics();
  // R4-081: refresh auth + bookmarks/favorites when another tab logs in/out or
  // toggles a bookmark/favorite (sentinel written via notifyCrossTabSync()).
  useCrossTabSync();
  const { user, isLoading: authLoading, error: authError, refetchAuth, logout } = useAuth();
  const [location] = useLocation();
  const isKnownRoute = KNOWN_ROUTE_PATTERNS.some((re) => re.test(location));

  // BUG-013 (run14): count wouter navigations so back buttons can tell a
  // deep-linked first page (no in-app history) from real in-app browsing.
  useEffect(() => {
    noteLocationChange();
  }, [location]);

  // Run17 BUG-052: Back/Forward return to the saved scroll position instead
  // of the top; forward navigations still start at the top.
  useScrollRestoration(location);

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });

  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;

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
      <MainLayout awesomeList={awesomeList} isLoading={isLoading} user={user ?? undefined} onLogout={logout}>
        <NotFound />
      </MainLayout>
    );
  }

  return (
    <MainLayout awesomeList={awesomeList} isLoading={isLoading} user={user ?? undefined} onLogout={logout}>
      {/* NB-028 (run18): when the auth check itself fails (429/500/network),
          the app keeps working logged-out — surface it once with a manual
          retry instead of silently looping refetches behind a skeleton. */}
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
      <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={() => {
          const q = new URLSearchParams(window.location.search).get("q");
          if (q && q.trim()) return <Redirect to={`/search?q=${encodeURIComponent(q.trim())}`} replace />;
          return <Home awesomeList={awesomeList} isLoading={isLoading} />;
        }} />
        <Route path="/login" component={Login} />
        <Route path="/logout" component={Logout} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/auth/login">
          <Redirect to="/login" replace />
        </Route>
        <Route path="/auth/register">
          <Redirect to="/register" replace />
        </Route>
        <Route path="/signup">
          <Redirect to="/register" replace />
        </Route>
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
        <Route path="/categories" component={() => <Categories awesomeList={awesomeList} isLoading={isLoading} />} />
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
        <Route path="/journey">
          <Redirect to="/journeys" replace />
        </Route>
        <Route path="/profile" component={() => (<AuthGuard><Profile user={user} /></AuthGuard>)} />
        <Route path="/bookmarks" component={() => (<AuthGuard><Bookmarks /></AuthGuard>)} />
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
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
              <AdminDashboard />
            </Suspense>
          </AdminGuard>
        )} />
        {/* R3-02: admin section deep-links (/admin/users, /admin/resources, …)
            open the matching tab — AdminDashboard reads :section via useRoute. */}
        <Route path="/admin/:section" component={() => (
          <AdminGuard>
            <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
              <AdminDashboard />
            </Suspense>
          </AdminGuard>
        )} />
        <Route path="/settings/theme" component={ThemeSettings} />
        <Route path="/settings" component={Settings} />
        <Route>
          <NotFound />
        </Route>
      </Switch>
      </Suspense>
    </MainLayout>
  );
}

function App() {
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
    <ThemeProvider>
      <Router />
      {/* BUG-020 (run13): analytics consent banner — gtag loads only after
          an explicit Accept (initGA is consent-gated). */}
      <ConsentBanner />
    </ThemeProvider>
  );
}

export default App;
