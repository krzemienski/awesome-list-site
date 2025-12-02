import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { useSessionAnalytics } from "./hooks/use-session-analytics";
import { trackKeyboardShortcut } from "./lib/analytics";
import { useAuth } from "./hooks/useAuth";

import MainLayout from "@/components/layout/new/MainLayout";
import ErrorPage from "@/pages/ErrorPage";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
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
import SearchDialog from "@/components/ui/search-dialog";

// Lazy load admin components for better initial bundle size
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const ResourceBrowser = lazy(() => import("@/components/admin/ResourceBrowser").then(m => ({ default: m.ResourceBrowser })));
const PendingResources = lazy(() => import("@/components/admin/PendingResources"));
const PendingEdits = lazy(() => import("@/components/admin/PendingEdits"));
const BatchEnrichmentPanel = lazy(() => import("@/components/admin/BatchEnrichmentPanel"));
const GitHubSyncPanel = lazy(() => import("@/components/admin/GitHubSyncPanel"));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Removed static JSON imports - using database-only via /api/categories and /api/resources

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  // Track comprehensive session analytics
  const sessionAnalytics = useSessionAnalytics();
  
  // Authentication hook
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  // Fetch hierarchical categories for navigation
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch all resources for search (flattened array)
  const { data: resourcesData } = useQuery<{resources: any[], total: number}>({
    queryKey: ['/api/resources-for-search'],
    queryFn: async () => {
      const response = await fetch('/api/resources?status=approved&limit=10000');
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Construct AwesomeList object matching type definition
  const awesomeList = categoriesData && resourcesData ? {
    title: "Awesome Video Resources",
    description: "Curated video development resources from awesome-video",
    repoUrl: "https://github.com/krzemienski/awesome-video",
    resources: resourcesData.resources, // Flat array for search
    categories: categoriesData // Hierarchical structure for navigation
  } : undefined;

  const isDataLoading = categoriesLoading || authLoading;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // '/' key for search
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && 
          !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        trackKeyboardShortcut("/", "open_search");
        sessionAnalytics.incrementSearchesPerformed();
        setSearchOpen(true);
      }
      
      // Escape key to close search
      if (e.key === "Escape" && searchOpen) {
        trackKeyboardShortcut("Escape", "close_search");
        setSearchOpen(false);
      }
      
      // Ctrl/Cmd+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        trackKeyboardShortcut("Ctrl+K", "open_search");
        sessionAnalytics.incrementSearchesPerformed();
        setSearchOpen(true);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  // Show loading state while checking authentication or fetching data
  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show main app for all users (authenticated and guests)
  // Guest users can browse all resources, authenticated users get additional features
  return (
    <MainLayout
      awesomeList={awesomeList}
      isLoading={isDataLoading}
      user={user}
      onLogout={logout}
    >
      <Switch>
        <Route path="/" component={() => <Home awesomeList={awesomeList} />} />
        <Route path="/login" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/category/:slug" component={Category} />
        <Route path="/subcategory/:slug" component={Subcategory} />
        <Route path="/sub-subcategory/:slug" component={SubSubcategory} />
        <Route path="/about" component={About} />
        <Route path="/advanced" component={Advanced} />
        <Route path="/submit" component={SubmitResource} />
        <Route path="/journeys" component={Journeys} />
        <Route path="/journey/:id" component={JourneyDetail} />
        <Route path="/profile" component={() => (
          <AuthGuard>
            <Profile user={user} />
          </AuthGuard>
        )} />
        <Route path="/bookmarks" component={() => (
          <AuthGuard>
            <Bookmarks />
          </AuthGuard>
        )} />
        <Route path="/admin" component={() => (
          <AdminGuard>
            <Suspense fallback={<LoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          </AdminGuard>
        )} />
        <Route path="/admin/resources" component={() => (
          <AdminGuard>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout><ResourceBrowser /></AdminLayout>
            </Suspense>
          </AdminGuard>
        )} />
        <Route path="/admin/approvals" component={() => (
          <AdminGuard>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout><PendingResources /></AdminLayout>
            </Suspense>
          </AdminGuard>
        )} />
        <Route path="/admin/edits" component={() => (
          <AdminGuard>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout><PendingEdits /></AdminLayout>
            </Suspense>
          </AdminGuard>
        )} />
        <Route path="/admin/enrichment" component={() => (
          <AdminGuard>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout><BatchEnrichmentPanel /></AdminLayout>
            </Suspense>
          </AdminGuard>
        )} />
        <Route path="/admin/github" component={() => (
          <AdminGuard>
            <Suspense fallback={<LoadingFallback />}>
              <AdminLayout><GitHubSyncPanel /></AdminLayout>
            </Suspense>
          </AdminGuard>
        )} />
        <Route component={NotFound} />
      </Switch>

      {/* Search Dialog - opens on "/" keyboard shortcut */}
      <SearchDialog
        isOpen={searchOpen}
        setIsOpen={setSearchOpen}
        resources={awesomeList?.resources || []}
      />
    </MainLayout>
  );
}

function App() {
  // Force dark mode - apply dark class to document root
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return <Router />;
}

export default App;
