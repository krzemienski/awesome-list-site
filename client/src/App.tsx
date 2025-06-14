import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { initGA } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/use-analytics";
import { useSessionAnalytics } from "@/hooks/use-session-analytics";
import { trackKeyboardShortcut } from "@/lib/analytics";

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
  // Fetch awesome list data
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["/api/awesome-list"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Process the raw data into a structured AwesomeList
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading Data</h1>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-muted-foreground">Fetching awesome video resources...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={() => 
        <Home 
          awesomeList={awesomeList} 
          isLoading={isLoading} 
        />
      } />
      <Route component={NotFound} />
    </Switch>
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
