import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Award, ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import SEOHead from "@/components/layout/SEOHead";

interface Journey {
  id: number;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  icon: string;
  orderIndex: number;
  category: string;
  status: 'published' | 'draft' | 'archived';
  stepCount?: number;
  completedStepCount?: number;
  isEnrolled?: boolean;
}

export default function Journeys() {
  const [, setLocation] = useLocation();
  // BUG-033 (run19): the category filter is URL-synced (?category=...) so a
  // filtered view survives reload and can be shared — read it on mount, write
  // it on change (replaceState: filter tweaks shouldn't pollute history).
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("category");
    return fromUrl && fromUrl.trim() !== "" ? fromUrl : "all";
  });
  const handleCategoryChange = (next: string) => {
    setSelectedCategory(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "all") params.delete("category");
    else params.set("category", next);
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };
  const { isAuthenticated } = useAuth();

  // Fetch all published journeys (includes enrollment and progress data)
  const { data: journeys = [], isLoading: journeysLoading } = useQuery<Journey[]>({
    queryKey: ['/api/journeys'],
  });

  // Get unique categories from journeys. Filter out empty/nullish values:
  // Radix <SelectItem> throws at render time on an empty-string value, and with
  // no ErrorBoundary that crash blanks the whole page (BUG-022).
  const categories = Array.from(
    new Set(journeys.map((j) => j.category).filter((c): c is string => !!c && c.trim() !== "")),
  ).sort();

  // Filter journeys by category
  const filteredJourneys = selectedCategory === "all" 
    ? journeys 
    : journeys.filter(j => j.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "advanced":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "●";
      case "intermediate":
        return "●●";
      case "advanced":
        return "●●●";
      default:
        return "●";
    }
  };

  if (journeysLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl" aria-busy={true} aria-live="polite">
        <SEOHead
          title="Learning Journeys"
          description="Explore structured learning paths to master new skills"
        />
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <SEOHead
        title="Learning Journeys"
        description="Guided multi-step learning paths for video development — from beginner streaming to advanced encoding pipelines. Learn on Awesome Video."
      />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Learning Journeys
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Explore structured learning paths to master new skills step by step
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground">Filter by category:</span>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by category" data-testid="select-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredJourneys.length} {filteredJourneys.length === 1 ? 'journey' : 'journeys'} available
        </div>
      </div>

      {/* Journey Grid */}
      {filteredJourneys.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">No journeys found</h3>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === "all" 
                  ? "No learning journeys are available at the moment." 
                  : `No journeys found in the "${selectedCategory}" category.`}
              </p>
            </div>
            {selectedCategory !== "all" && (
              <Button 
                variant="outline" 
                onClick={() => handleCategoryChange("all")}
                data-testid="button-clear-filter"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJourneys.map((journey) => {
            const enrolled = journey.isEnrolled || false;
            const progressPercent = journey.stepCount && journey.stepCount > 0
              ? Math.round(((journey.completedStepCount || 0) / journey.stepCount) * 100)
              : 0;

            return (
              <Card 
                key={journey.id}
                className={cn(
                  "overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg flex flex-col",
                  enrolled && "border-primary/30"
                )}
                data-testid={`card-journey-${journey.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <BookOpen
                      className="h-10 w-10 flex-shrink-0"
                      style={{ color: 'var(--accent)' }}
                      aria-hidden
                      data-testid={`icon-journey-${journey.id}`}
                    />
                    <Badge 
                      variant="outline"
                      className={cn("text-xs capitalize", getDifficultyColor(journey.difficulty))}
                      data-testid={`badge-difficulty-${journey.id}`}
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {journey.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg sm:text-xl leading-tight">
                    {/* BUG-010 (run13): journey titles are links, matching the
                        card-title-as-link pattern used on resource cards. */}
                    {/* Run17 BUG-048: ≥24px tap target. */}
                    <Link
                      href={`/journey/${journey.id}`}
                      className="hover:underline hover:text-[var(--accent)] transition-colors inline-flex items-center min-h-[24px]"
                      data-testid={`link-journey-title-${journey.id}`}
                    >
                      {journey.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {journey.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="space-y-3">
                    {/* Meta Information */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {journey.estimatedDuration}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {journey.category}
                      </Badge>
                      {journey.stepCount && (
                        <Badge variant="secondary" className="text-xs">
                          {journey.stepCount} steps
                        </Badge>
                      )}
                    </div>

                    {/* Progress Bar for Enrolled Journeys */}
                    {enrolled && journey.stepCount && journey.stepCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-primary">
                            {progressPercent}%
                          </span>
                        </div>
                        {/* NB-058 (run18): progress bar exposes progressbar ARIA
                            semantics so assistive tech announces the percent. */}
                        <div
                          className="h-2 bg-muted rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={progressPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${journey.title} progress: ${progressPercent}%`}
                          data-testid={`progressbar-journey-${journey.id}`}
                        >
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {journey.completedStepCount || 0} of {journey.stepCount} steps completed
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button 
                    className={cn(
                      "w-full group",
                      enrolled ? "bg-primary/20 hover:bg-primary/30 text-primary" : ""
                    )}
                    variant={enrolled ? "outline" : "default"}
                    onClick={() => setLocation(`/journey/${journey.id}`)}
                    data-testid={`button-view-journey-${journey.id}`}
                  >
                    {/* BUG-037 (run14): shrink-0 icons + truncating label — at
                        768px the flex button squeezed the leading icon and
                        clipped it. */}
                    {/* Run17 BUG-046: "Continue" only once real progress exists —
                        enrolled-with-zero-progress previously showed "Continue
                        Journey" on journeys the user had never actually begun. */}
                    {enrolled && (journey.completedStepCount || 0) > 0 ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Continue Journey</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">Start Journey</span>
                      </>
                    )}
                    <ArrowRight className="h-4 w-4 ml-auto shrink-0 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
