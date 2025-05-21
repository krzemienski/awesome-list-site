import { useState } from "react";
import ModernSidebar from "./ModernSidebar";
import { AwesomeList } from "@/types/awesome-list";
import TopBar from "../TopBar";
import Footer from "../Footer";
import SearchDialog from "@/components/ui/search-dialog";
import ThemeSelector from "@/components/ui/theme-selector";

interface MainLayoutProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
  children: React.ReactNode;
}

export default function MainLayout({ awesomeList, isLoading, children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onSearchOpen={() => setSearchOpen(true)}
        title={awesomeList?.title || "Awesome Video"}
        repoUrl={awesomeList?.repoUrl}
      />
      
      <div className="flex flex-1 container">
        <ModernSidebar 
          title={awesomeList?.title || "Awesome Video"}
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