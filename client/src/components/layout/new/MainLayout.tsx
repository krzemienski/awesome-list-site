import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { ArrowUp } from "lucide-react";
import type { AwesomeListNav } from "@/lib/static-data";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import PageBreadcrumb from "./PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import "@/styles/shell/layout.css";
import type { ProductProfileId } from "@/lib/design-system";
import { useHomeBoot } from "@/lib/home-boot";

// Contact variants (docs/CONTACT-VARIANTS.md) are opt-in via
// VITE_CONTACT_VARIANT; with it unset (the default) neither chunk is fetched
// and the shell renders exactly as before. Variants a/b/c add footer links,
// b/e host the contact dialog.
import AppFooter from "./AppFooter";
import { contactVariant, useContactConfig } from "@/lib/contact";
const ContactDialogHost = lazy(() => import("@/components/contact/contact-dialog").then((module) => ({ default: module.ContactDialogHost })));

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
      // Fixed to the SCREEN, so it is lifted by the app shell's
      // --app-bottom-inset (0px unless an app-level bottom bar is showing).
      className="fixed bottom-[calc(1.5rem+var(--app-bottom-inset,0px))] right-6 z-40 h-11 w-11 shadow-lg bg-[var(--surface)]"
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
  productProfile: ProductProfileId;
  // Run22 BUG-008: chrome (sidebar/header) renders from the lightweight nav
  // tree, not the 2.7MB corpus — non-listing pages never download the corpus.
  nav?: AwesomeListNav;
  isLoading: boolean;
  // R5-024 (run24): nav tree failed to load — the sidebar resolves its
  // "Loading…" subtitle instead of showing it forever.
  navError?: boolean;
  // R5-024 (run25): let the sidebar's error state retry the nav fetch, matching
  // the /categories card's Retry button.
  onRetryNav?: () => void;
  children: React.ReactNode;
  user?: User;
  onLogout?: () => void;
  logoutError?: string | null;
  renderSearchDialog?: (controls: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
  }) => React.ReactNode;
}

export default function MainLayout({ productProfile, nav, isLoading, navError, onRetryNav, children, user, onLogout, logoutError, renderSearchDialog }: MainLayoutProps) {
  const homeBoot = useHomeBoot();
  const [location] = useLocation();
  const isAdmin = /^\/admin(?:\/|$)/.test(location);
  const hasBrowseSidebar = location === "/" || /^\/(?:category|subcategory|sub-subcategory)\//.test(location);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: publicConfig } = useContactConfig(true);

  // Keep the lightweight global trigger in the eager shell. The palette code
  // itself is loaded only after one of these controls opens it.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as Element | null;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        if (searchOpen) {
          if (inField) event.preventDefault();
          return;
        }
        if (!inField) {
          event.preventDefault();
          setSearchOpen(true);
        }
      }
    };
    const openSearch = () => setSearchOpen(true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("awesome:open-search-palette", openSearch);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("awesome:open-search-palette", openSearch);
    };
  }, [searchOpen]);

  return (
    <SidebarProvider
      // Audit2 BUG-004/005/017/018: default the sidebar CLOSED below 1024px.
      // At tablet widths (768–1023) the expanded 17.5rem panel squeezed main
      // content to ~390px — /advanced chips and tabs clipped past the
      // viewport, the home CTA row overflowed, and /search columns collapsed
      // to 188px. ui/sidebar.tsx additionally force-collapses when a viewport
      // ENTERS that range carrying a stale expanded preference.
      defaultOpen={typeof window !== "undefined" && window.innerWidth >= 1024}
      initialOpen={homeBoot?.sidebarOpen}
      initialDrawer={homeBoot?.viewport === "tablet" || homeBoot?.viewport === "phone"}
      initialPhone={homeBoot?.viewport === "phone"}
      // DS shell parity: column layout — the full-width header owns the brand
      // (reference layout.jsx Header), and the sidebar/icon-rail starts BELOW
      // it. Keep the responsive header height in one shell variable so the
      // header, sticky previews, and sidebar all clear the same offset.
      //
      // flex-1 + min-h-[auto] (overriding SidebarProvider's own min-h-svh):
      // this region is a ROW of the #root shell column (see index.css), so it
      // must consume the column's REMAINING height, not claim a full viewport
      // for itself. Claiming 100svh here would push the shell's optional
      // bottom row past the fold, and on a short page a first paint would show
      // that row over the end of this one. Growing past the column on long
      // pages still works: a flex item never shrinks below its content.
      className="flex-col flex-1 min-h-[auto] [--header-height:56px] min-[769px]:[--header-height:60px]"
    >
      {/* CC-17 — Skip-link is the first focusable element on every page. */}
      <a href="#main" className="skip-link">Skip to main content</a>
      {/* WP-1 — Editorial atmosphere: SVG grain overlay + radial accent
          atmosphere. The atmosphere gradient lives on body (handoff parity),
          and .grain is the SVG fractal-noise overlay at 0.32 opacity.
          MR-CH-03 — Wrap chrome subtree in `.page` to satisfy DS handoff
          contract (page-level structural class required by Editorial DS). */}
      <div
        className="page app-shell-page"
        data-product-profile={productProfile}
        style={{ "--shell-page-measure": "var(--profile-page-measure, var(--content-max))" } as CSSProperties}
      >
        <div className="grain" aria-hidden="true" />
        <AppHeader
          onSearchOpen={() => setSearchOpen(true)}
          user={user}
          onLogout={onLogout}
          logoutError={logoutError}
          categories={nav?.categories ?? []}
        />
        <div className="app-shell-row" data-browse-sidebar={hasBrowseSidebar}>
        <AppSidebar
          categories={nav?.categories ?? []}
          totalResources={nav?.totalResources ?? 0}
          isLoading={isLoading}
          navError={navError}
          onRetryNav={onRetryNav}
          user={user}
        />
        {/*
          CC-14 (landmark half) — single <main id="main"> wrapping route content.
          Canonical page-content-wrap owns the token-backed measure and gutters.
        */}
        <main
          id="main"
          data-product-profile={productProfile}
          // BUG-043 (run13): tabIndex={-1} makes the skip-link target
          // programmatically focusable, so "Skip to content" actually moves
          // keyboard focus instead of only scrolling.
          tabIndex={-1}
          // Task #379: `overflow-x-hidden` computes overflow-y to `auto`, which
          // makes <main> a scroll container that never scrolls — and that silently
          // disables `position: sticky` for every descendant. `overflow-x-clip`
          // clips the same content without creating a scroll container (a `clip`
          // axis leaves the other axis `visible`), so sticky works inside routes.
          className="app-shell-main focus:outline-none"
        >
          <div className="page-content-wrap" data-admin={isAdmin}>
          <PageBreadcrumb categories={nav?.categories ?? []} />
          {children}
          </div>
        </main>
        </div>
        {!isAdmin && publicConfig?.site ? (
          <AppFooter
            nav={nav}
            site={{
              name: publicConfig.site.title.replace(/\s+Dashboard$/, ""),
              tagline: publicConfig.site.description,
              repoUrl: publicConfig.site.repoUrl,
              repoBranch: publicConfig.site.repoBranch,
            }}
          />
        ) : null}
      </div>
      {contactVariant === "b" || contactVariant === "e" ? (
        <Suspense fallback={null}><ContactDialogHost /></Suspense>
      ) : null}
      {renderSearchDialog?.({
        isOpen: searchOpen,
        setIsOpen: setSearchOpen,
      })}
      <BackToTop />
    </SidebarProvider>
  );
}
