import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, List, ArrowRight } from "lucide-react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { trackEvent } from "@/lib/analytics";
import { reportDeadLink } from "@/lib/route-monitor";

interface NotFoundProps {
  /** Override the default heading (e.g. "This page doesn't exist."). */
  heading?: string;
  /** Optional "Did you mean …?" suggestion link. */
  suggestion?: { label: string; href: string };
}

export default function NotFound({ heading = "Page Not Found", suggestion }: NotFoundProps) {
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    trackEvent("page_not_found", "navigation", path);
    reportDeadLink(path, document.referrer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Helmet>
        <title>404 — Page Not Found — Awesome Video</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-[var(--accent)]" />
            <h1 className="text-xl font-semibold leading-none tracking-tight">{heading}</h1>
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
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/">
              <List className="mr-2 h-4 w-4" />
              Browse all categories
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
