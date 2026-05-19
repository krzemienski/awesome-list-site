import { useState } from "react";
import { AwesomeList } from "@/types/awesome-list";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import SearchDialog from "@/components/ui/search-dialog";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  provider?: string;
  role?: string;
  createdAt?: string;
}

interface MainLayoutProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
  children: React.ReactNode;
  user?: User;
  onLogout?: () => void;
}

export default function MainLayout({ awesomeList, isLoading, children, user, onLogout }: MainLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      {/* CC-17 — Skip-link is the first focusable element on every page. */}
      <a href="#main" className="skip-link">Skip to main content</a>
      {/* WP-1 — Editorial atmosphere: SVG grain overlay + radial accent
          atmosphere. The atmosphere gradient lives on body (handoff parity),
          and .grain is the SVG fractal-noise overlay at 0.32 opacity. */}
      <div className="grain" aria-hidden="true" />

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
        {/*
          CC-14 (landmark half) — single <main id="main"> wrapping route content.
          CC-16 — 1280 max-width with 48 px desktop gutters.
        */}
        <main
          id="main"
          className="flex-1 min-w-0 overflow-x-hidden mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-12 py-8"
        >
          {children}
        </main>
        <footer className="border-t px-4 sm:px-6 py-3 sm:py-4">
          <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground sm:flex-row">
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
