import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BookOpen, 
  Clock, 
  Award, 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Circle,
  ExternalLink,
  Trophy,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import SEOHead from "@/components/layout/SEOHead";

interface JourneyStep {
  id: number;
  journeyId: number;
  resourceId: number;
  stepNumber: number;
  title: string;
  description: string;
  isOptional: boolean;
  resource?: {
    id: number;
    title: string;
    url: string;
    description: string;
  };
}

interface Journey {
  id: number;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  icon: string;
  category: string;
  status: string;
  steps: JourneyStep[];
  progress?: UserProgress;
}

interface UserProgress {
  id: number;
  userId: string;
  journeyId: number;
  currentStepId: number | null;
  completedSteps: number[];
  startedAt: string;
  lastAccessedAt: string;
  completedAt: string | null;
}

export default function JourneyDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch journey details (includes progress if authenticated)
  const { data: journey, isLoading: journeyLoading } = useQuery<Journey>({
    queryKey: [`/api/journeys/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/${id}`);
      if (!response.ok) throw new Error('Failed to fetch journey');
      return response.json();
    },
  });

  // Start journey mutation
  const startJourneyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/journeys/${id}/start`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      toast({
        title: "Journey Started!",
        description: "You've successfully enrolled in this learning journey.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Journey",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark step as complete mutation
  const completeStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      return await apiRequest(`/api/journeys/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify({ stepId }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
      toast({
        title: "Step Completed!",
        description: "Great job! Keep going to complete the journey.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Progress",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  if (journeyLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl" aria-busy={true} aria-live="polite">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-96 mb-4" />
        <Skeleton className="h-24 w-full mb-8" />
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Journey not found. It may have been removed or archived.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => setLocation('/journeys')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Journeys
        </Button>
      </div>
    );
  }

  const isEnrolled = !!journey?.progress;
  const completedSteps = journey?.progress?.completedSteps || [];
  const totalSteps = journey?.steps?.length || 0;
  const completedCount = completedSteps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const isCompleted = !!journey?.progress?.completedAt;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <SEOHead 
        title={`${journey.title} - Learning Journey`}
        description={journey.description}
      />
      
      {/* Back Button */}
      <Button 
        variant="ghost" 
        className="mb-6"
        onClick={() => setLocation('/journeys')}
        data-testid="button-back-to-journeys"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Journeys
      </Button>

      {/* Journey Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <div className="text-6xl">{journey.icon || "📚"}</div>
            <div className="flex flex-col gap-2 items-end">
              <Badge 
                variant="outline"
                className={cn("text-xs capitalize", getDifficultyColor(journey.difficulty))}
                data-testid="badge-journey-difficulty"
              >
                <Award className="h-3 w-3 mr-1" />
                {journey.difficulty}
              </Badge>
              {isCompleted && (
                <Badge 
                  variant="outline"
                  className="bg-green-500/10 text-green-500 border-green-500/30"
                  data-testid="badge-journey-completed"
                >
                  <Trophy className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl mb-2">{journey.title}</CardTitle>
          <CardDescription className="text-sm sm:text-base">{journey.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-3 mb-6">
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {journey.estimatedDuration}
            </Badge>
            <Badge variant="secondary">
              {journey.category}
            </Badge>
            <Badge variant="secondary">
              {totalSteps} {totalSteps === 1 ? 'step' : 'steps'}
            </Badge>
          </div>

          {/* Progress Section */}
          {isEnrolled && (
            <>
              <Separator className="mb-6" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Your Progress</h3>
                  <span className="text-sm font-medium text-pink-500">
                    {progressPercent}%
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" data-testid="progress-bar-journey" />
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {totalSteps} steps completed
                </p>
              </div>
            </>
          )}

          {/* Enroll Button */}
          {!isAuthenticated ? (
            <Alert className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please <button 
                  className="underline font-medium min-h-[44px] px-2 inline-flex items-center"
                  onClick={() => setLocation('/login')}
                >
                  log in
                </button> to start this journey and track your progress.
              </AlertDescription>
            </Alert>
          ) : !isEnrolled && (
            <Button 
              className="w-full mt-6"
              onClick={() => startJourneyMutation.mutate()}
              disabled={startJourneyMutation.isPending}
              data-testid="button-start-journey"
            >
              {startJourneyMutation.isPending ? (
                <>Starting Journey...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Journey
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Journey Steps */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Learning Path</h2>
        
        {journey.steps && journey.steps.length > 0 ? (
          journey.steps
            .sort((a: JourneyStep, b: JourneyStep) => a.stepNumber - b.stepNumber)
            .map((step: JourneyStep, index: number) => {
              const isStepCompleted = completedSteps.includes(step.id);
              const isCurrentStep = journey?.progress?.currentStepId === step.id;

              return (
                <Card 
                  key={step.id}
                  className={cn(
                    "transition-all",
                    isStepCompleted && "border-green-500/30 bg-green-500/5",
                    isCurrentStep && !isStepCompleted && "border-pink-500/50 shadow-lg shadow-pink-500/10"
                  )}
                  data-testid={`card-step-${step.id}`}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Step Number/Status */}
                      <div className={cn(
                        "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm",
                        isStepCompleted 
                          ? "bg-green-500 text-white" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isStepCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          step.stepNumber
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="text-base sm:text-lg font-semibold mb-1">
                              {step.title}
                              {step.isOptional && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Optional
                                </Badge>
                              )}
                            </h3>
                            {step.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {step.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Resource Link */}
                        {step.resource && (
                          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                            <a 
                              href={step.resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-pink-500 transition-colors min-h-[44px] py-2"
                              data-testid={`link-resource-${step.id}`}
                            >
                              <ExternalLink className="h-4 w-4 flex-shrink-0" />
                              <span className="font-medium">{step.resource.title}</span>
                            </a>
                            {step.resource.description && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {step.resource.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Complete Button */}
                        {isEnrolled && !isStepCompleted && (
                          <Button 
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => completeStepMutation.mutate(step.id)}
                            disabled={completeStepMutation.isPending}
                            data-testid={`button-complete-step-${step.id}`}
                          >
                            {completeStepMutation.isPending ? (
                              <>Marking as Complete...</>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Complete
                              </>
                            )}
                          </Button>
                        )}

                        {isStepCompleted && (
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This journey doesn't have any steps yet. Check back later!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <Card className="mt-8 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30">
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">🎉 Congratulations!</h3>
            <p className="text-muted-foreground">
              You've completed the "{journey.title}" learning journey!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
