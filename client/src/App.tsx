import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import TopBar from "@/components/layout/TopBar";
import SidebarNav from "@/components/layout/SidebarNav";
import Footer from "@/components/layout/Footer";
import SearchDialog from "@/components/ui/search-dialog";
import ThemeSelector from "@/components/ui/theme-selector";

import Home from "@/pages/Home";
import Category from "@/pages/Category";
import Subcategory from "@/pages/Subcategory";
import About from "@/pages/About";
import ErrorPage from "@/pages/ErrorPage";
import NotFound from "@/pages/not-found";

import { AwesomeList } from "@/types/awesome-list";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  // Close sidebar on location change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

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
    <div className="flex min-h-screen flex-col">
      <TopBar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSearchOpen={() => setSearchOpen(true)}
        title={awesomeList?.title || "Awesome List"}
        repoUrl={awesomeList?.repoUrl}
      />
      
      <div className="flex flex-1 container">
        <SidebarNav 
          isOpen={isSidebarOpen} 
          setIsOpen={setIsSidebarOpen}
          categories={awesomeList?.categories || []}
          isLoading={isLoading}
          title={awesomeList?.title || "Awesome List"}
        />
        
        <main className="flex-1 py-6 px-4 md:px-6">
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
        </main>
      </div>
      
      <Footer />
      
      <SearchDialog 
        isOpen={searchOpen} 
        setIsOpen={setSearchOpen}
        resources={awesomeList?.resources || []}
      />
      
      <ThemeSelector />
    </div>
  );
}

export default App;
