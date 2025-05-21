import { useState } from "react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSearchOpen={() => setSearchOpen(true)}
        title={awesomeList?.title || "Awesome Selfhosted"}
        repoUrl={awesomeList?.repoUrl}
      />
      
      <div className="flex flex-1 w-full">
        <ModernSidebar 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          title={awesomeList?.title || "Awesome Selfhosted"}
          categories={awesomeList?.categories || []}
          isLoading={isLoading}
        />
        
        <main className="flex-1 py-6 px-4 md:px-6 md:ml-4">
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