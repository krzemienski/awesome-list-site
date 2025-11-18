import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { isAuthenticated } = useAuth();

  // Fetch all published journeys (includes enrollment and progress data)
  const { data: journeys = [], isLoading: journeysLoading } = useQuery<Journey[]>({
    queryKey: ['/api/journeys'],
  });

  // Get unique categories from journeys
  const categories = Array.from(new Set(journeys.map(j => j.category))).sort();

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
        description="Explore structured learning paths to master new skills"
      />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-pink-500" />
          Learning Journeys
        </h1>
        <p className="text-muted-foreground text-lg">
          Explore structured learning paths to master new skills step by step
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by category:</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
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
                onClick={() => setSelectedCategory("all")}
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
                  "overflow-hidden transition-all hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 flex flex-col",
                  enrolled && "border-pink-500/30"
                )}
                data-testid={`card-journey-${journey.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-4xl">{journey.icon || "📚"}</div>
                    <Badge 
                      variant="outline"
                      className={cn("text-xs capitalize", getDifficultyColor(journey.difficulty))}
                      data-testid={`badge-difficulty-${journey.id}`}
                    >
                      <Award className="h-3 w-3 mr-1" />
                      {journey.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl leading-tight">
                    {journey.title}
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
                          <span className="font-medium text-pink-500">
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
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
                      enrolled ? "bg-pink-500/20 hover:bg-pink-500/30 text-pink-500" : ""
                    )}
                    variant={enrolled ? "outline" : "default"}
                    onClick={() => setLocation(`/journey/${journey.id}`)}
                    data-testid={`button-view-journey-${journey.id}`}
                  >
                    {enrolled ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Continue Journey
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Journey
                      </>
                    )}
                    <ArrowRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
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
