import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { useSessionAnalytics } from "./hooks/use-session-analytics";
import { trackKeyboardShortcut } from "./lib/analytics";

import { ThemeProvider } from "@/components/theme-provider-new";
import { AppLayout } from "@/components/layout/app-layout";
import ErrorPage from "@/pages/ErrorPage";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Subcategory from "@/pages/Subcategory";
import SubSubcategory from "@/pages/SubSubcategory";
import About from "@/pages/About";
import Advanced from "@/pages/Advanced";
import NotFound from "@/pages/not-found";

import { AwesomeList } from "@/types/awesome-list";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  // Track comprehensive session analytics
  const sessionAnalytics = useSessionAnalytics();
  
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

  return (
    <AppLayout 
      awesomeList={awesomeList} 
      isLoading={isLoading}
    >
      <Switch>
        <Route path="/" component={() => 
          <Home 
            awesomeList={awesomeList} 
            isLoading={isLoading} 
          />
        } />
        <Route path="/category/:slug" component={Category} />
        <Route path="/subcategory/:slug" component={Subcategory} />
        <Route path="/sub-subcategory/:slug" component={SubSubcategory} />
        <Route path="/about" component={About} />
        <Route path="/advanced" component={Advanced} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="awesome-video-theme">
      <Router />
    </ThemeProvider>
  );
}

export default App;
