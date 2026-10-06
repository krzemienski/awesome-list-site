import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, List, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import SEOHead from "@/components/layout/SEOHead";
import { trackEvent } from "@/lib/analytics";
import { reportDeadLink } from "@/lib/route-monitor";
import "@/styles/pages/system.css";

// Must equal the server's SITE_URL so the 404 og:url/og:image match the
// crawl-pass head byte-for-byte (same env-override rule as SEOHead's base).
const SITE_BASE = (import.meta.env.VITE_SITE_URL || "https://awesome.video").replace(/\/+$/, "");

interface NotFoundProps {
  /**
   * R5-050: the per-caller heading override ("This page doesn't exist.",
   * "Resource Not Found") produced three different h1s for the same 404
   * state. The prop is retained so existing call sites keep compiling, but
   * the rendered h1 is now always "Page Not Found".
   */
  heading?: string;
  /** Optional "Did you mean …?" suggestion link. */
  suggestion?: { label: string; href: string };
}

export default function NotFound({ suggestion }: NotFoundProps) {
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    trackEvent("page_not_found", "navigation", path);
    reportDeadLink(path, document.referrer);
  }, []);

  // min-h-full, not a 100vh calc: <main> already fills whatever the app shell
  // leaves (see index.css), so filling main centers the panel without claiming
  // a viewport height the shell may not have to give.
  return (
    <div className="system-state">
      {/* R5-050: ONE 404 head shared by every not-found surface (unknown path,
          unknown taxonomy slug, unknown resource) — mirrors the server's
          notFoundMeta: same title/description/noindex, og tags kept, og:url
          pointing at the site card (never the dead URL). */}
      <SEOHead
        title="Page Not Found"
        description="The page you're looking for doesn't exist on Awesome Video. Browse the curated index of video development resources instead."
        noindex
        ogUrl={`${SITE_BASE}/`}
        image={`${SITE_BASE}/og-image.png?path=%2F`}
      />

      {/* docs/11-patterns.md empty state, opened with the README's 404
          typewriter beat. One primary action: back home. */}
      <div className="system-state-panel">
        <p className="system-state-kicker caret" aria-hidden="true">
          ~/awesome.video/404 → not_found
        </p>
        <h1 className="display-h system-state-title">Page Not Found</h1>
        <p className="system-state-copy">
          We couldn't find the page you're looking for. The page may have been
          moved or doesn't exist.
        </p>
        {suggestion && (
          <p className="system-state-copy">
            <Link
              href={suggestion.href}
              className="system-state-suggestion"
              data-testid="link-did-you-mean"
            >
              {suggestion.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </p>
        )}
        <p className="system-state-note">
          You can return to the home page to explore our curated collection of
          awesome resources.
        </p>
        {/* Run16 BUG-045: the CTAs stack full-width at 375px so neither is
            pushed off-screen; the categories CTA points at /categories. */}
        <div className="system-state-actions">
          <Button variant="outline" asChild>
            <Link href="/categories" data-testid="link-browse-categories">
              <List className="h-4 w-4" aria-hidden="true" />
              Browse all categories
            </Link>
          </Button>
          <Button asChild>
            <Link href="/" data-testid="link-go-home">
              <Home className="h-4 w-4" aria-hidden="true" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
