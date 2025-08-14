import { useState, useEffect } from "react";
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import Footer from './Footer';
import SearchDialog from '@/components/ui/search-dialog';
import { AwesomeList } from '@/types/awesome-list';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu, Search, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

interface MainLayoutProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
  children: React.ReactNode;
}

export default function MainLayoutNew({ awesomeList, isLoading, children }: MainLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex w-full min-h-screen bg-background">
        <AppSidebar awesomeList={awesomeList} isLoading={isLoading} />
        
        <SidebarInset className="flex-1">
          <div className="flex flex-col h-full">
            {/* Top Bar */}
            <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
              <SidebarTrigger className="-ml-1">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle sidebar</span>
              </SidebarTrigger>
              
              <div className="flex-1 flex items-center justify-between">
                {/* Title - Hidden on mobile when sidebar is open */}
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold hidden sm:block">
                    {awesomeList?.title || "Awesome Video"}
                  </h1>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchOpen(true)}
                    className="h-9 w-9"
                  >
                    <Search className="h-4 w-4" />
                    <span className="sr-only">Search</span>
                  </Button>
                  
                  {awesomeList?.repoUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-9 w-9"
                    >
                      <a
                        href={awesomeList.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-4 w-4" />
                        <span className="sr-only">GitHub</span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </header>
            
            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </main>
            
            {/* Footer */}
            <Footer />
          </div>
        </SidebarInset>
      </div>
      
      {/* Search Dialog */}
      <SearchDialog 
        isOpen={searchOpen} 
        setIsOpen={setSearchOpen}
        resources={awesomeList?.resources || []}
      />
    </SidebarProvider>
  );
}