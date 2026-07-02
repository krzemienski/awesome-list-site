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
          and .grain is the SVG fractal-noise overlay at 0.32 opacity.
          MR-CH-03 — Wrap chrome subtree in `.page` to satisfy DS handoff
          contract (page-level structural class required by Editorial DS). */}
      <div className="grain" aria-hidden="true" />

      <div className="page contents">
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
          categories={awesomeList?.categories || []}
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
        {/* R1 — minimal app footer (restored from T002 removal per ref 01/02/04/07) */}
        <footer className="border-t border-[var(--border)] mt-auto">
          <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-12 py-4 flex items-center justify-between text-xs text-[color:var(--text-3)]">
            <span>Built with React &amp; shadcn/ui</span>
            <a
              href="/about"
              className="hover:text-[color:var(--text)] transition-colors"
              data-testid="footer-about"
            >
              About
            </a>
          </div>
        </footer>
        </SidebarInset>
      </div>
      <SearchDialog
        isOpen={searchOpen}
        setIsOpen={setSearchOpen}
        resources={awesomeList?.resources || []}
      />
    </SidebarProvider>
  );
}
