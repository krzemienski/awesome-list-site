import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AlertCircle, Home, List, ArrowRight } from "lucide-react";
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
  // leaves (see index.css), so filling main centers this card without claiming
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

      <Card className="system-state-card">
        <CardHeader>
          <span className="chip bad system-state-code">Error · 404</span>
          <div className="system-state-heading flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-[var(--accent)]" aria-hidden="true" />
            <h1 className="display-h system-state-title">Page Not Found</h1>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            We couldn't find the page you're looking for. The page may have been moved or doesn't exist.
          </p>
          {suggestion && (
            <p className="mb-4">
              <Link
                href={suggestion.href}
                className="inline-flex items-center gap-1 font-medium text-[var(--accent)] underline underline-offset-4"
                data-testid="link-did-you-mean"
              >
                {suggestion.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            You can return to the home page to explore our curated collection of awesome resources.
          </p>
        </CardContent>
        {/* Run16 BUG-045: at 375px the unwrappable row pushed "Browse all
            categories" 9px off the left viewport edge. Stack the CTAs
            full-width on narrow screens; row layout resumes at sm. The
            categories CTA also now points at /categories, not home. */}
        <CardFooter className="system-state-actions flex-col sm:flex-row">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/categories" data-testid="link-browse-categories">
              <List className="mr-2 h-4 w-4" />
              Browse all categories
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/" data-testid="link-go-home">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
