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
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import type { RecommendationResult } from "@/hooks/useAIRecommendations";

export default function Recommendations() {
  const { isAuthenticated } = useAuth();

  // Shared cached tree (same key as App/Home) — no extra network round-trip.
  const { data: rawData, isLoading: treeLoading } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
    enabled: isAuthenticated,
  });
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;

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
    queryFn: async () => apiRequest("/api/recommendations?limit=12", { method: "GET" }),
    enabled: !isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const anonRecommendations = Array.isArray(anonData) ? anonData : [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <SEOHead
        title="AI-Powered Recommendations — Awesome Video"
        description="Personalized video development resource recommendations based on your interests and learning goals."
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Sparkles className="h-6 w-6 text-[var(--accent)] shrink-0" />
          <h1 className="font-sans font-bold text-2xl sm:text-3xl tracking-tight">
            AI-Powered Recommendations
          </h1>
        </div>
        <p className="text-sm sm:text-base text-[color:var(--text-2)]">
          Get personalized resource recommendations based on your interests and learning goals.
        </p>
      </div>

      {isAuthenticated ? (
        treeLoading || !awesomeList ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : (
          <AIRecommendationsPanel resources={awesomeList.resources} />
        )
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Login to See Personalized Recommendations
              </CardTitle>
              <CardDescription>
                Sign in to unlock AI-powered recommendations tailored to your skill level and interests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full sm:w-auto" data-testid="button-login-to-get-started">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login to Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="font-sans font-semibold text-lg sm:text-xl tracking-tight">
              Popular picks to get you started
            </h2>

            {anonLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-lg" />
                ))}
              </div>
            ) : anonError ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-[var(--accent)]" />
                  <p className="text-sm text-muted-foreground">
                    We couldn't load recommendations right now.
                  </p>
                  <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-recommendations">
                    Try again
                  </Button>
                </CardContent>
              </Card>
            ) : anonRecommendations.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No recommendations available yet. Browse the categories on the home page to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
        </>
      )}
    </div>
  );
}
