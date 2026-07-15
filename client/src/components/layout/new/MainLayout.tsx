import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowUp } from "lucide-react";
import { AwesomeList } from "@/types/awesome-list";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import SearchDialog from "@/components/ui/search-dialog";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

/** R2-L01: floating "back to top" button, appears after scrolling ~600px. */
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      data-testid="button-back-to-top"
      className="fixed bottom-6 right-6 z-40 h-11 w-11 shadow-lg bg-[var(--surface)]"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}

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
        {/* R1 — minimal app footer; R2-M19 — navigation links + copyright. */}
        <footer className="border-t border-[var(--border)] mt-auto">
          <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[color:var(--text-3)]">
            <span data-testid="footer-copyright">
              © {new Date().getFullYear()} Awesome Video · Built with React &amp; shadcn/ui
            </span>
            {/* BUG-013 (run9): footer links get 44px-tall hit areas (WCAG 2.5.5)
                — text stays small, the tap target grows. BUG-030: GitHub source
                link added alongside internal nav. */}
            <nav aria-label="Footer" className="flex items-center gap-4 flex-wrap justify-center">
              <Link href="/" className="inline-flex items-center min-h-[44px] hover:text-[color:var(--text)] transition-colors" data-testid="footer-home">
                Home
              </Link>
              <Link href="/categories" className="inline-flex items-center min-h-[44px] hover:text-[color:var(--text)] transition-colors" data-testid="footer-categories">
                Categories
              </Link>
              <Link href="/journeys" className="inline-flex items-center min-h-[44px] hover:text-[color:var(--text)] transition-colors" data-testid="footer-journeys">
                Journeys
              </Link>
              <Link href="/submit" className="inline-flex items-center min-h-[44px] hover:text-[color:var(--text)] transition-colors" data-testid="footer-submit">
                Submit
              </Link>
              <Link href="/about" className="inline-flex items-center min-h-[44px] hover:text-[color:var(--text)] transition-colors" data-testid="footer-about">
                About
              </Link>
              <a
                href="https://github.com/krzemienski/awesome-video"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center min-h-[44px] hover:text-[color:var(--text)] transition-colors"
                data-testid="footer-github"
              >
                GitHub
              </a>
            </nav>
          </div>
        </footer>
        </SidebarInset>
      </div>
      <SearchDialog
        isOpen={searchOpen}
        setIsOpen={setSearchOpen}
        resources={awesomeList?.resources || []}
      />
      <BackToTop />
    </SidebarProvider>
  );
}
