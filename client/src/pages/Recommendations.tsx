import StatePanel, { RetryButton } from "@/components/layout/StatePanel";
import { useEffect, useRef, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryUnavailableReason } from "@/lib/query-availability";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import AIRecommendationsPanel from "@/components/ui/ai-recommendations-panel";
import ResourceCard from "@/components/resource/ResourceCard";
import { useAuth } from "@/hooks/useAuth";
import type { RecommendationResult } from "@/hooks/useAIRecommendations";
import {
  trackRecommendationOpened,
  trackRecommendationSignInClicked,
  trackRecommendationsRefreshed,
  trackRecommendationsViewed,
} from "@/lib/analytics-recommendations";
import "@/styles/pages/discovery-tools.css";

export default function Recommendations() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // Guest picks are only for visitors the session check has confirmed as
  // signed out. While it is still resolving, !isAuthenticated is also true, so
  // gating on it alone fired a guest request and flashed the guest layout for
  // signed-in visitors before the personalized panel took over.
  const isGuest = !authLoading && !isAuthenticated;

  // Anonymous browse: rule-based recommendations from the public GET endpoint.
  const anonQuery = useQuery<RecommendationResult[]>({
    // GET /api/recommendations (anonymous fallback) returns a plain array of
    // RecommendationResult (the authed POST endpoint returns the same shape).
    queryKey: ["/api/recommendations", "anonymous"],
    queryFn: async () => {
      const response: unknown = await apiRequest(
        "/api/recommendations?limit=12",
        { method: "GET" },
      );
      return Array.isArray(response)
        ? response as RecommendationResult[]
        : [];
    },
    enabled: isGuest,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const { data: anonData, isLoading: anonLoading, refetch } = anonQuery;
  // C6-V2-07: offline, the query is paused (not failed); don't call that "empty".
  const anonUnavailable = queryUnavailableReason(anonQuery);
  const anonError = anonUnavailable !== null;

  const anonRecommendations = Array.isArray(anonData) ? anonData : [];

  // One view per page load, once the guest picks (or their empty state) are
  // actually on screen. Signed-in visitors are counted by the panel itself;
  // The guest query only runs once auth has settled as signed out.
  const viewTrackedRef = useRef(false);
  const anonLoaded = isGuest && anonQuery.isSuccess && !anonError;
  useEffect(() => {
    if (!anonLoaded || viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackRecommendationsViewed({
      recommendationCount: anonRecommendations.length,
      signedIn: false,
    });
  }, [anonLoaded, anonRecommendations.length]);

  // ResourceCard owns its links (title, View Details, Open Link), so opens are
  // observed in the capture phase here — before Open Link stops propagation —
  // without changing how the card navigates.
  const handleAnonCardOpen = (event: MouseEvent<HTMLDivElement>) => {
    if (event.type === "auxclick" && event.button !== 1) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-testid]");
    const match = link?.dataset.testid?.match(
      /^(link-resource-title|link-view-details|button-visit)-(\d+)$/,
    );
    if (!match) return;
    const resourceId = Number(match[2]);
    const index = anonRecommendations.findIndex((rec) => rec.resource.id === resourceId);
    if (index === -1) return;
    trackRecommendationOpened({
      resourceId,
      position: index + 1,
      recommendationType: anonRecommendations[index].type,
      signedIn: false,
      linkTarget: match[1] === "button-visit" ? "external" : "detail",
    });
  };

  return (
    <div className="discovery-tools-page discovery-tools-page--recommendations">
      <SEOHead
        title="Personalized Recommendations — Awesome Video"
        description="Personalized video development resource recommendations based on your interests and learning goals."
        noindex
      />

      {/* Task #379 (uxv2-11): the page used to promise personalization to
          everyone and only admit further down that guests get popular picks.
          The heading and lead now describe what the visitor is actually about
          to see. */}
      <header className="discovery-tools-masthead discovery-tools-recommendations-masthead">
        <div className="discovery-tools-title-row">
          <Sparkles className="discovery-tools-masthead-icon" aria-hidden="true" />
          <h1 className="page-title discovery-tools-page-title">
            {isAuthenticated
              ? "Personalized Recommendations"
              : isGuest
                ? "Recommended Resources"
                : "Recommendations"}
          </h1>
        </div>
        <p className="discovery-tools-page-lede">
          {isAuthenticated
            ? "Get personalized resource recommendations based on your interests and learning goals."
            : isGuest
              ? "Popular picks from across the catalog. Sign in to tailor them to your interests and learning goals."
              : "Checking your session…"}
        </p>
      </header>

      {authLoading ? (
        <section
          className="discovery-tools-results-section"
          aria-busy="true"
          data-testid="recommendations-auth-loading"
        >
          <span className="sr-only" role="status">Loading recommendations</span>
          <div className="discovery-tools-recommendation-grid discovery-tools-recommendation-grid--anonymous">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="discovery-tools-recommendation-skeleton" />
            ))}
          </div>
        </section>
      ) : isAuthenticated ? (
        <div className="discovery-tools-owned-panel discovery-tools-ai-panel">
          <AIRecommendationsPanel showHeader={false} />
        </div>
      ) : (
        <>
          {/* Task #379 (uxv2-11): the sign-in gate used to occupy the first
              screen, so a guest scrolled past an offer they could not take up
              before reaching a single resource. The picks come first; the
              sign-in card follows them as the next step. */}
          <section className="discovery-tools-results-section">
            <h2 className="discovery-tools-section-title">
              Start here
            </h2>

            {anonLoading ? (
              <div className="discovery-tools-recommendation-grid discovery-tools-recommendation-grid--anonymous">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="discovery-tools-recommendation-skeleton" />
                ))}
              </div>
            ) : anonError ? (
              <StatePanel tone="error" label={anonUnavailable === "offline" ? "Offline" : "Error · unavailable"}
                title={anonUnavailable === "offline" ? "You’re offline" : "Couldn’t load recommendations"} inline
                testId="recommendations-error"
                actions={<RetryButton onRetry={() => {
                  trackRecommendationsRefreshed({ trigger: "retry", signedIn: false, recommendationCount: 0 });
                  void refetch();
                }} testId="button-retry-recommendations" />}>
                {anonUnavailable === "offline"
                  ? "Recommendations will load when your connection is back."
                  : "Something went wrong while fetching recommendations. Please try again."}
              </StatePanel>
            ) : anonRecommendations.length === 0 ? (
              <StatePanel tone="empty" label="No recommendations" title="No recommendations yet" inline
                actions={<Button asChild variant="outline"><Link href="/categories">Browse categories</Link></Button>}>
                Browse the categories to get started.
              </StatePanel>
            ) : (
              <div
                className="discovery-tools-recommendation-grid discovery-tools-recommendation-grid--anonymous"
                onClickCapture={handleAnonCardOpen}
                onAuxClickCapture={handleAnonCardOpen}
              >
                {anonRecommendations.map((rec) => (
                  <ResourceCard
                    key={rec.resource.id}
                    resource={{
                      id: String(rec.resource.id),
                      name: rec.resource.title,
                      url: rec.resource.url,
                      description: rec.resource.description,
                      category: rec.resource.category,
                       kind: rec.resource.kind,
                       resolvedKind: rec.resource.resolvedKind,
                       metadata: rec.resource.metadata,
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <Card className="discovery-tools-panel discovery-tools-signin-panel">
            <CardHeader className="discovery-tools-panel-header">
              <CardTitle className="discovery-tools-panel-title">
                <LogIn className="h-5 w-5" />
                Sign in to personalize these picks
              </CardTitle>
              <CardDescription className="discovery-tools-panel-description">
                Signed-in recommendations use your skill level, topics, goals, and the
                feedback you leave on resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="discovery-tools-panel-content">
              {/* BUG-049 (run26): asChild — no <a>-wrapping-<button> nesting. */}
              <Button asChild className="w-full sm:w-auto" data-testid="button-login-to-get-started">
                <Link
                  href="/sign-in?redirect_url=%2Frecommendations"
                  onClick={() => trackRecommendationSignInClicked("recommendations_page")}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
