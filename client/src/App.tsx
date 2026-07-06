import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "@/components/ui/theme-provider";

import MainLayout from "@/components/layout/new/MainLayout";
import ErrorPage from "@/pages/ErrorPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
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

// Admin dashboard is the only heavy, role-gated surface. Lazy-load it so the
// entire admin tree (and its /api/admin/* fetch strings) lands in a separate
// chunk that regular visitors never download.
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";

function Router() {
  useAnalytics();
  const { user, isLoading: authLoading, logout } = useAuth();

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
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
        <Route path="/register" component={Register} />
        <Route path="/auth/login">
          <Redirect to="/login" replace />
        </Route>
        <Route path="/auth/register">
          <Redirect to="/register" replace />
        </Route>
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
    </ThemeProvider>
  );
}

export default App;
