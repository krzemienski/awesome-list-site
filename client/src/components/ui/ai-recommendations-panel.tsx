import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAIRecommendations, type AIRecommendationResult } from "@/hooks/useAIRecommendations";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Resource } from "@/types/awesome-list";
import {
  Sparkles,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  Zap,
} from "lucide-react";

interface AIRecommendationsPanelProps {
  resources: Resource[];
}

const formSchema = z.object({
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  preferredCategories: z.array(z.string()).default([]),
  learningGoals: z.array(z.string()).default([]),
  preferredResourceTypes: z.array(z.string()).default([]),
  timeCommitment: z.enum(['daily', 'weekly', 'flexible']),
});

type FormValues = z.infer<typeof formSchema>;

const AVAILABLE_CATEGORIES = [
  "Encoding & Codecs",
  "Intro & Learning",
  "Protocols & Transport",
  "Players & Clients",
  "Media Tools",
  "Standards & Industry",
  "Infrastructure & Delivery",
  "General Tools",
  "Community & Events",
];

const LEARNING_GOALS = [
  "Master video streaming protocols",
  "Learn encoding optimization",
  "Build streaming applications",
  "Understand video codecs",
  "Implement adaptive bitrate",
  "Deploy CDN solutions",
  "Develop video players",
  "Optimize video quality",
];

const RESOURCE_TYPES = [
  "Documentation",
  "Tutorials",
  "Tools",
  "Libraries",
  "Frameworks",
  "Services",
  "Case Studies",
  "Community Resources",
];

export default function AIRecommendationsPanel({ resources }: AIRecommendationsPanelProps) {
  const { userProfile } = useUserProfile();
  const {
    generateRecommendations,
    recommendations,
    isLoading,
    isError,
    error,
    isSuccess,
  } = useAIRecommendations({ limit: 10 });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      skillLevel: userProfile.skillLevel || 'beginner',
      preferredCategories: userProfile.preferredCategories.length > 0 
        ? userProfile.preferredCategories 
        : [],
      learningGoals: userProfile.learningGoals.length > 0 
        ? userProfile.learningGoals 
        : [],
      preferredResourceTypes: userProfile.preferredResourceTypes.length > 0 
        ? userProfile.preferredResourceTypes 
        : [],
      timeCommitment: userProfile.timeCommitment || 'flexible',
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      userId: userProfile.userId,
      preferredCategories: values.preferredCategories,
      skillLevel: values.skillLevel,
      learningGoals: values.learningGoals,
      preferredResourceTypes: values.preferredResourceTypes,
      timeCommitment: values.timeCommitment,
      viewHistory: userProfile.viewHistory,
      bookmarks: userProfile.bookmarks,
      completedResources: userProfile.completedResources,
      ratings: userProfile.ratings,
    };

    generateRecommendations(payload);
  };

  const getResourceDetails = (resourceId: string): Resource | undefined => {
    // Debug logging to see what we're searching for
    console.log('[AI Recommendations] Searching for resourceId:', resourceId);
    console.log('[AI Recommendations] Sample resources URLs (first 3):', resources.slice(0, 3).map(r => ({
      url: r.url,
      title: r.title,
      id: r.id
    })));
    
    // Try exact URL match first
    let resource = resources.find(r => r.url === resourceId);
    
    // If not found, try matching by ID or title as fallback
    if (!resource) {
      resource = resources.find(r => r.id?.toString() === resourceId);
    }
    
    // Additional fallback: try partial URL match
    if (!resource) {
      resource = resources.find(r => r.url?.includes(resourceId) || resourceId.includes(r.url || ''));
    }
    
    console.log('[AI Recommendations] Found resource:', resource ? 'Yes' : 'No', resource?.title);
    
    return resource;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-cyan-500";
    return "text-primary";
  };

  const getConfidenceBadgeVariant = (confidence: number): "default" | "secondary" | "outline" => {
    if (confidence >= 0.8) return "default";
    if (confidence >= 0.6) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Recommendations
          </CardTitle>
          <CardDescription>
            Get personalized resource recommendations powered by Claude AI based on your learning profile and goals
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Preference Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configure Your Preferences</CardTitle>
          <CardDescription>
            Tell us about your skill level and interests to get tailored recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Skill Level */}
              <FormField
                control={form.control}
                name="skillLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Level</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      data-testid="select-skill-level"
                    >
                      <FormControl>
                        <SelectTrigger data-testid="trigger-skill-level">
                          <SelectValue placeholder="Select your skill level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner" data-testid="option-skill-beginner">
                          Beginner - Just getting started with video technology
                        </SelectItem>
                        <SelectItem value="intermediate" data-testid="option-skill-intermediate">
                          Intermediate - Have basic understanding, want to go deeper
                        </SelectItem>
                        <SelectItem value="advanced" data-testid="option-skill-advanced">
                          Advanced - Experienced professional seeking advanced topics
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Your current experience level with video streaming and development
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preferred Categories */}
              <FormField
                control={form.control}
                name="preferredCategories"
                render={() => (
                  <FormItem>
                    <FormLabel>Preferred Categories</FormLabel>
                    <FormDescription>
                      Select the categories you're most interested in learning about
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {AVAILABLE_CATEGORIES.map((category) => (
                        <FormField
                          key={category}
                          control={form.control}
                          name="preferredCategories"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  data-testid={`checkbox-category-${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  checked={field.value?.includes(category)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, category])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== category)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">
                                {category}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Learning Goals */}
              <FormField
                control={form.control}
                name="learningGoals"
                render={() => (
                  <FormItem>
                    <FormLabel>Learning Goals</FormLabel>
                    <FormDescription>
                      What do you want to achieve? Select all that apply
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {LEARNING_GOALS.map((goal) => (
                        <FormField
                          key={goal}
                          control={form.control}
                          name="learningGoals"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  data-testid={`checkbox-goal-${goal.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  checked={field.value?.includes(goal)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, goal])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== goal)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">
                                {goal}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preferred Resource Types */}
              <FormField
                control={form.control}
                name="preferredResourceTypes"
                render={() => (
                  <FormItem>
                    <FormLabel>Preferred Resource Types</FormLabel>
                    <FormDescription>
                      What types of resources do you prefer to learn from?
                    </FormDescription>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {RESOURCE_TYPES.map((type) => (
                        <FormField
                          key={type}
                          control={form.control}
                          name="preferredResourceTypes"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  data-testid={`checkbox-type-${type.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, type])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== type)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal text-sm">
                                {type}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Commitment */}
              <FormField
                control={form.control}
                name="timeCommitment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Commitment</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      data-testid="select-time-commitment"
                    >
                      <FormControl>
                        <SelectTrigger data-testid="trigger-time-commitment">
                          <SelectValue placeholder="Select your time commitment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily" data-testid="option-time-daily">
                          Daily - I can dedicate time every day
                        </SelectItem>
                        <SelectItem value="weekly" data-testid="option-time-weekly">
                          Weekly - I prefer weekly learning sessions
                        </SelectItem>
                        <SelectItem value="flexible" data-testid="option-time-flexible">
                          Flexible - I'll learn at my own pace
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How much time can you dedicate to learning?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
                data-testid="button-generate-recommendations"
              >
                {isLoading ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-pulse" />
                    Generating AI Recommendations...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Recommendations
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card data-testid="loading-state">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary animate-pulse" />
              Analyzing Your Profile...
            </CardTitle>
            <CardDescription>
              Claude AI is generating personalized recommendations based on your preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Alert variant="destructive" data-testid="error-state">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Generating Recommendations</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
              
              {/* Specific error handling for different failure modes */}
              {error?.message?.includes('401') || error?.message?.includes('Unauthorized') ? (
                <div className="mt-2 p-2 bg-background/50 rounded border">
                  <p className="font-semibold">🔑 API Key Issue</p>
                  <p className="text-sm">The Anthropic API key is missing or invalid. Please configure it in the integration settings.</p>
                </div>
              ) : error?.message?.includes('fetch') || error?.message?.includes('network') || error?.message?.includes('Failed to fetch') ? (
                <div className="mt-2 p-2 bg-background/50 rounded border">
                  <p className="font-semibold">🌐 Network Error</p>
                  <p className="text-sm">Unable to connect to the AI service. Please check your internet connection and try again.</p>
                </div>
              ) : error?.message?.includes('timeout') ? (
                <div className="mt-2 p-2 bg-background/50 rounded border">
                  <p className="font-semibold">⏱️ Request Timeout</p>
                  <p className="text-sm">The AI service took too long to respond. Please try again.</p>
                </div>
              ) : (
                <div className="mt-2 p-2 bg-background/50 rounded border">
                  <p className="font-semibold">ℹ️ Error Details</p>
                  <p className="text-sm">If this persists, try adjusting your preferences or contact support.</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success State - Recommendations */}
      {isSuccess && recommendations && recommendations.length > 0 && (
        <div className="space-y-4" data-testid="recommendations-list">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Your Personalized Recommendations
              </CardTitle>
              <CardDescription>
                {recommendations.length} resources selected specifically for your learning journey
                {recommendations.some(r => r.aiGenerated) && (
                  <Badge variant="outline" className="ml-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
          </Card>

          {recommendations.map((rec, index) => {
            const resource = getResourceDetails(rec.resourceId);
            
            // Fallback display info when resource lookup fails
            const displayTitle = resource?.title || rec.resourceId.split('/').pop()?.replace(/-/g, ' ') || rec.resourceId;
            const hasResourceDetails = !!resource;
            
            return (
              <Card 
                key={rec.resourceId} 
                className="hover:border-primary transition-colors"
                data-testid={`recommendation-${index}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">
                          {displayTitle}
                        </CardTitle>
                        {rec.aiGenerated && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-ai-${index}`}>
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                        {!hasResourceDetails && (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10">
                            External
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" data-testid={`badge-category-${index}`}>
                          {rec.category}
                        </Badge>
                        <Badge 
                          variant={getConfidenceBadgeVariant(rec.confidenceLevel)}
                          className={getConfidenceColor(rec.confidenceLevel)}
                          data-testid={`badge-confidence-${index}`}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {Math.round(rec.confidenceLevel * 100)}% match
                        </Badge>
                        <Badge 
                          variant="outline"
                          data-testid={`badge-score-${index}`}
                        >
                          Score: {rec.score.toFixed(2)}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI Reasoning */}
                  <div className="flex gap-2" data-testid={`reason-${index}`}>
                    <Lightbulb className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Why this matches: </span>
                      {rec.reason}
                    </p>
                  </div>

                  {/* Resource Description - show if available */}
                  {resource?.description && (
                    <p className="text-sm" data-testid={`description-${index}`}>
                      {resource.description}
                    </p>
                  )}
                  
                  {/* Fallback info when resource details unavailable */}
                  {!hasResourceDetails && (
                    <div className="p-3 bg-muted/50 rounded-md border border-dashed">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">URL:</span> {rec.resourceId}
                      </p>
                    </div>
                  )}

                  {/* Additional resource metadata if available */}
                  {resource?.subcategory && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Subcategory:</span> {resource.subcategory}
                    </p>
                  )}

                  {/* Action Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                    data-testid={`button-view-${index}`}
                  >
                    <a
                      href={rec.resourceId}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Resource
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No Recommendations State */}
      {isSuccess && recommendations && recommendations.length === 0 && (
        <Alert data-testid="no-recommendations">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>No Recommendations Found</AlertTitle>
          <AlertDescription>
            Try adjusting your preferences or selecting different categories to get personalized recommendations.
          </AlertDescription>
        </Alert>
      )}

      {/* API Unavailable Fallback */}
      {!isLoading && !isSuccess && !isError && (
        <Card data-testid="initial-state">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ready to Get Started
            </CardTitle>
            <CardDescription>
              Configure your preferences above and click "Generate AI Recommendations" to receive personalized suggestions powered by Claude AI
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
