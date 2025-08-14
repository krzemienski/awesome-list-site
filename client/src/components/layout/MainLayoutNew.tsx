import { useState, useEffect } from "react";
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AppSidebar07 } from '@/components/app-sidebar-07';
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
        <AppSidebar07 awesomeList={awesomeList} isLoading={isLoading} />
        
        <SidebarInset className="flex-1">
          <div className="flex flex-col h-full">
            {/* Top Bar */}
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 h-4"
                />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="/">
                        Awesome Video
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Resources</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              
              <div className="flex items-center gap-2 px-4">
                
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
            </header>
            
            {/* Main Content */}
            <main className="flex-1 p-4 pt-0">
              <div className="mx-auto">
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