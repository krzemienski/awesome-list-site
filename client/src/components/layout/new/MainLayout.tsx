import { useState, useEffect } from "react";
import ModernSidebar from "./ModernSidebar";
import { AwesomeList } from "@/types/awesome-list";
import TopBar from "../TopBar";
import Footer from "../Footer";
import SearchDialog from "@/components/ui/search-dialog";
import { useIsMobile, useIsTablet, useIsDesktop } from "@/hooks/use-mobile";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface MainLayoutProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
  children: React.ReactNode;
  user?: any;
  onLogout?: () => void;
}

export default function MainLayout({ awesomeList, isLoading, children, user, onLogout }: MainLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setIsSidebarOpen(true);
      } else if (width >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <TopBar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSearchOpen={() => setSearchOpen(true)}
        title={awesomeList?.title || "Awesome Selfhosted"}
        repoUrl={awesomeList?.repoUrl}
        resources={awesomeList?.resources || []}
        user={user}
        onLogout={onLogout}
      />
      
      <SidebarProvider className="flex-1 overflow-hidden" open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <ModernSidebar 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          title={awesomeList?.title || "Awesome Selfhosted"}
          categories={awesomeList?.categories || []}
          resources={awesomeList?.resources || []}
          isLoading={isLoading}
          user={user}
        />
        
        <SidebarInset className="overflow-auto">
          <div className="flex-1 py-6 px-4 md:px-6">
            {children}
          </div>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
      
      <SearchDialog 
        isOpen={searchOpen} 
        setIsOpen={setSearchOpen}
        resources={awesomeList?.resources || []}
      />
      
    </div>
  );
}