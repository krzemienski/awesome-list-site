import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn, AlertCircle } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import AIRecommendationsPanel from "@/components/ui/ai-recommendations-panel";
import ResourceCard from "@/components/resource/ResourceCard";
import { useAuth } from "@/hooks/useAuth";
import type { RecommendationResult } from "@/hooks/useAIRecommendations";
import "@/styles/pages/discovery-tools.css";

export default function Recommendations() {
  const { isAuthenticated } = useAuth();

  // Anonymous browse: rule-based recommendations from the public GET endpoint.
  const {
    data: anonData,
    isLoading: anonLoading,
    isError: anonError,
    refetch,
  } = useQuery<RecommendationResult[]>({
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
    enabled: !isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const anonRecommendations = Array.isArray(anonData) ? anonData : [];

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
          <h1 className="display-h discovery-tools-page-title">
            {isAuthenticated ? "Personalized Recommendations" : "Recommended Resources"}
          </h1>
        </div>
        <p className="discovery-tools-page-lede">
          {isAuthenticated
            ? "Get personalized resource recommendations based on your interests and learning goals."
            : "Popular picks from across the catalog. Sign in to tailor them to your interests and learning goals."}
        </p>
      </header>

      {isAuthenticated ? (
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
              <Card className="discovery-tools-state-card">
                <CardContent className="discovery-tools-state discovery-tools-state--error">
                  <span className="chip bad discovery-tools-state-badge">Error · Recommendations</span>
                  <AlertCircle className="discovery-tools-state-icon" aria-hidden="true" />
                  <p className="discovery-tools-state-copy">
                    We couldn&apos;t load recommendations right now.
                  </p>
                  <Button variant="outline" onClick={() => void refetch()} data-testid="button-retry-recommendations">
                    Try again
                  </Button>
                </CardContent>
              </Card>
            ) : anonRecommendations.length === 0 ? (
              <Card className="discovery-tools-state-card">
                <CardContent className="discovery-tools-state discovery-tools-state--empty">
                  <span className="eyebrow discovery-tools-state-eyebrow">No recommendations</span>
                  <p className="discovery-tools-state-copy">
                  No recommendations available yet. Browse the categories on the home page to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="discovery-tools-recommendation-grid discovery-tools-recommendation-grid--anonymous">
                {anonRecommendations.map((rec) => (
                  <ResourceCard
                    key={rec.resource.id}
                    resource={{
                      id: String(rec.resource.id),
                      name: rec.resource.title,
                      url: rec.resource.url,
                      description: rec.resource.description,
                      category: rec.resource.category,
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
                <Link href="/sign-in">
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
