import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";

import MainLayout from "@/components/layout/new/MainLayout";
import ErrorPage from "@/pages/ErrorPage";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Subcategory from "@/pages/Subcategory";
import About from "@/pages/About";
import Advanced from "@/pages/Advanced";
import NotFound from "@/pages/not-found";

import { AwesomeList } from "@/types/awesome-list";
import { processAwesomeListData } from "@/lib/parser";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  // Fetch awesome list data
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["/api/awesome-list"],
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
        setSearchOpen(true);
      }
      
      // Escape key to close search
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
      
      // Ctrl/Cmd+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
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
    <MainLayout 
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
        <Route path="/about" component={About} />
        <Route path="/advanced" component={Advanced} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
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
    <Router />
  );
}

export default App;
