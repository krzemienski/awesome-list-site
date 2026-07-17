import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { noteLocationChange } from "./lib/nav-history";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "@/components/ui/theme-provider";

import MainLayout from "@/components/layout/new/MainLayout";
import ErrorPage from "@/pages/ErrorPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Subcategory from "@/pages/Subcategory";
import SubSubcategory from "@/pages/SubSubcategory";
import About from "@/pages/About";
import Advanced from "@/pages/Advanced";
import Profile from "@/pages/Profile";
import Bookmarks from "@/pages/Bookmarks";
import AdminGuard from "@/components/auth/AdminGuard";
import AuthGuard from "@/components/auth/AuthGuard";
import NotFound from "@/pages/not-found";
import SubmitResource from "@/pages/SubmitResource";
import Journeys from "@/pages/Journeys";
import JourneyDetail from "@/pages/JourneyDetail";
import ResourceDetail from "@/pages/ResourceDetail";
import ThemeSettings from "@/pages/ThemeSettings";
import Recommendations from "@/pages/Recommendations";
import Search from "@/pages/Search";
import Categories from "@/pages/Categories";
import Settings from "@/pages/Settings";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import ConsentBanner from "@/components/ui/consent-banner";

// Admin dashboard is the only heavy, role-gated surface. Lazy-load it so the
// entire admin tree (and its /api/admin/* fetch strings) lands in a separate
// chunk that regular visitors never download.
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

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
  const { user, isLoading: authLoading, logout } = useAuth();
  const [location] = useLocation();
  const isKnownRoute = KNOWN_ROUTE_PATTERNS.some((re) => re.test(location));

  // BUG-013 (run14): count wouter navigations so back buttons can tell a
  // deep-linked first page (no in-app history) from real in-app browsing.
  useEffect(() => {
    noteLocationChange();
  }, [location]);

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

  // BUG-009 (run14): shell-first paint. While the auth check resolves, render
  // the real header/sidebar chrome with content skeletons instead of blocking
  // the whole app behind a bare full-screen spinner (15s to first content on
  // slow 3G). Route content stays deferred so auth-gated routes never flash
  // a wrong redirect before /api/auth/user answers.
  if (authLoading) {
    return (
      <MainLayout awesomeList={awesomeList} isLoading={true} user={undefined} onLogout={logout}>
        <div className="space-y-6" data-testid="app-shell-skeleton" aria-busy="true" aria-label="Loading page">
          <div className="h-8 w-2/3 max-w-md rounded-none bg-muted animate-pulse" />
          <div className="h-4 w-1/2 max-w-sm rounded-none bg-muted animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-none bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

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
        <Route path="/favorites">
          <Redirect to="/bookmarks" replace />
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
