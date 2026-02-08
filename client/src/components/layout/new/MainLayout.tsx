import { useState } from "react";
import { AwesomeList } from "@/types/awesome-list";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import SearchDialog from "@/components/ui/search-dialog";
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

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar
        categories={awesomeList?.categories || []}
        resources={awesomeList?.resources || []}
        isLoading={isLoading}
        user={user}
      />
      <SidebarInset>
        <AppHeader
          onSearchOpen={() => setSearchOpen(true)}
          user={user}
          onLogout={onLogout}
        />
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
        <footer className="border-t px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
            <p>
              Built with{" "}
              <a href="https://reactjs.org" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4 hover:text-foreground">React</a>
              {" "}and{" "}
              <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4 hover:text-foreground">shadcn/ui</a>
            </p>
            <a href="/about" className="font-medium underline underline-offset-4 hover:text-foreground">About</a>
          </div>
        </footer>
      </SidebarInset>
      <SearchDialog
        isOpen={searchOpen}
        setIsOpen={setSearchOpen}
        resources={awesomeList?.resources || []}
      />
    </SidebarProvider>
  );
}
