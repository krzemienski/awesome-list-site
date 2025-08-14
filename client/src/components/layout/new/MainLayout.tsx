import { useState, useEffect } from "react";
import ModernSidebar from "./ModernSidebar";
import { AwesomeList } from "@/types/awesome-list";
import TopBar from "../TopBar";
import Footer from "../Footer";
import SearchDialog from "@/components/ui/search-dialog";
import ThemeSelector from "@/components/ui/theme-selector";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
  children: React.ReactNode;
}

export default function MainLayout({ awesomeList, isLoading, children }: MainLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Initialize sidebar state based on screen size
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // Open by default on desktop
    }
    return false;
  });

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      // On mobile, close sidebar. On desktop, keep current state unless it's closed
      if (!isDesktop) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Toggle sidebar function with proper state handling
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSearchOpen={() => setSearchOpen(true)}
        title={awesomeList?.title || "Awesome Selfhosted"}
        repoUrl={awesomeList?.repoUrl}
        resources={awesomeList?.resources || []}
      />
      
      <div className="flex flex-1 w-full">
        <ModernSidebar 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          title={awesomeList?.title || "Awesome Selfhosted"}
          categories={awesomeList?.categories || []}
          isLoading={isLoading}
        />
        
        <main className="flex-1 py-6 px-4 md:px-6">
          {children}
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