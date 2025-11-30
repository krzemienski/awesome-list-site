import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { useSessionAnalytics } from "./hooks/use-session-analytics";
import { trackKeyboardShortcut } from "./lib/analytics";
import { useAuth } from "./hooks/useAuth";

import MainLayout from "@/components/layout/new/MainLayout";
import ErrorPage from "@/pages/ErrorPage";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Subcategory from "@/pages/Subcategory";
import SubSubcategory from "@/pages/SubSubcategory";
import About from "@/pages/About";
import Advanced from "@/pages/Advanced";
import Profile from "@/pages/Profile";
import Bookmarks from "@/pages/Bookmarks";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminGuard from "@/components/auth/AdminGuard";
import AuthGuard from "@/components/auth/AuthGuard";
import NotFound from "@/pages/not-found";
import SubmitResource from "@/pages/SubmitResource";
import Journeys from "@/pages/Journeys";
import JourneyDetail from "@/pages/JourneyDetail";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ResourceBrowser } from "@/components/admin/ResourceBrowser";
import PendingResources from "@/components/admin/PendingResources";
import PendingEdits from "@/components/admin/PendingEdits";
import BatchEnrichmentPanel from "@/components/admin/BatchEnrichmentPanel";
import GitHubSyncPanel from "@/components/admin/GitHubSyncPanel";

import { AwesomeList } from "@/types/awesome-list";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  // Track comprehensive session analytics
  const sessionAnalytics = useSessionAnalytics();
  
  // Authentication hook
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  // Fetch awesome list data - use static data in production builds
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Process the raw data into a structured AwesomeList
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;

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

  if (error) {
    return <ErrorPage error={error} />;
  }

  // Show loading state while checking authentication
  if (authLoading) {
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
      isLoading={isLoading}
      user={user}
      onLogout={logout}
    >
      <Switch>
        <Route path="/" component={() => 
          <Home 
            awesomeList={awesomeList} 
            isLoading={isLoading} 
          />
        } />
        <Route path="/login" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />
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
            <AdminDashboard />
          </AdminGuard>
        )} />
        <Route path="/admin/resources" component={() => (
          <AdminGuard>
            <AdminLayout><ResourceBrowser /></AdminLayout>
          </AdminGuard>
        )} />
        <Route path="/admin/approvals" component={() => (
          <AdminGuard>
            <AdminLayout><PendingResources /></AdminLayout>
          </AdminGuard>
        )} />
        <Route path="/admin/edits" component={() => (
          <AdminGuard>
            <AdminLayout><PendingEdits /></AdminLayout>
          </AdminGuard>
        )} />
        <Route path="/admin/enrichment" component={() => (
          <AdminGuard>
            <AdminLayout><BatchEnrichmentPanel /></AdminLayout>
          </AdminGuard>
        )} />
        <Route path="/admin/github" component={() => (
          <AdminGuard>
            <AdminLayout><GitHubSyncPanel /></AdminLayout>
          </AdminGuard>
        )} />
        <Route component={NotFound} />
      </Switch>
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
