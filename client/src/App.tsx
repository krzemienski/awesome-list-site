import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import MainLayout from "@/components/layout/new/MainLayout";
import ErrorPage from "@/pages/ErrorPage";
import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Subcategory from "@/pages/Subcategory";
import About from "@/pages/About";
import NotFound from "@/pages/not-found";

import { AwesomeList } from "@/types/awesome-list";

function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  // Fetch awesome list data
  const { data: awesomeList, isLoading, error } = useQuery<AwesomeList>({
    queryKey: ["/api/awesome-list"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });

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
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

export default App;
