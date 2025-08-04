import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Target, 
  CheckCircle, 
  ExternalLink,
  Lightbulb,
  Route,
  Brain
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Resource } from "@/types/awesome-list";

interface UserProfile {
  userId: string;
  preferredCategories: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  preferredResourceTypes: string[];
  timeCommitment: 'daily' | 'weekly' | 'flexible';
  viewHistory: string[];
  bookmarks: string[];
  completedResources: string[];
  ratings: Record<string, number>;
}

interface RecommendationResult {
  resourceId: string;
  score: number;
  reason: string;
  category: string;
  confidenceLevel: number;
}

interface LearningPathSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  skillLevel: string;
  estimatedHours: number;
  resources: Resource[];
  prerequisites: string[];
  learningObjectives: string[];
  matchScore: number;
  matchReasons: string[];
}

interface RecommendationPanelProps {
  userProfile: UserProfile;
  onResourceClick?: (resourceId: string) => void;
  onStartLearningPath?: (pathId: string) => void;
}

export default function RecommendationPanel({ 
  userProfile, 
  onResourceClick,
  onStartLearningPath 
}: RecommendationPanelProps) {
  const queryClient = useQueryClient();
  const [selectedPath, setSelectedPath] = useState<LearningPathSuggestion | null>(null);

  // Initialize recommendation engine
  const { data: initStatus } = useQuery({
    queryKey: ["/api/recommendations/init"],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch personalized recommendations
  const { data: recommendations, isLoading: loadingRecommendations } = useQuery({
    queryKey: ["/api/recommendations", userProfile.userId],
    queryFn: async () => {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        body: JSON.stringify(userProfile),
        headers: { "Content-Type": "application/json" }
      });
      return response.json();
    },
    enabled: !!initStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch learning path suggestions
  const { data: learningPaths, isLoading: loadingPaths } = useQuery({
    queryKey: ["/api/learning-paths", userProfile.userId],
    queryFn: async () => {
      const response = await fetch("/api/learning-paths", {
        method: "POST",
        body: JSON.stringify(userProfile),
        headers: { "Content-Type": "application/json" }
      });
      return response.json();
    },
    enabled: !!initStatus,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Track user interactions
  const trackInteraction = useMutation({
    mutationFn: async (interaction: {
      resourceId: string;
      interactionType: string;
      interactionValue?: number;
      metadata?: any;
    }) => {
      const response = await fetch("/api/interactions", {
        method: "POST",
        body: JSON.stringify({
          userId: userProfile.userId,
          ...interaction
        }),
        headers: { "Content-Type": "application/json" }
      });
      return response.json();
    },
  });

  const handleResourceClick = (resourceId: string) => {
    trackInteraction.mutate({
      resourceId,
      interactionType: "click",
      metadata: { source: "recommendations" }
    });
    onResourceClick?.(resourceId);
  };

  const handlePathStart = (pathId: string) => {
    trackInteraction.mutate({
      resourceId: pathId,
      interactionType: "start_path",
      metadata: { source: "learning_paths" }
    });
    onStartLearningPath?.(pathId);
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'advanced': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (!initStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personalized Recommendations
          </CardTitle>
          <CardDescription>
            Initializing recommendation engine...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personalized Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered suggestions based on your preferences and learning goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recommendations" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recommendations" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="learning-paths" className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                Learning Paths
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-4">
              {loadingRecommendations ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {(recommendations as RecommendationResult[])?.map((rec: RecommendationResult, index: number) => (
                      <Card key={rec.resourceId} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {rec.category}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  <span className="text-sm font-medium">
                                    {(rec.score * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <span className={`text-xs ${getConfidenceColor(rec.confidenceLevel)}`}>
                                  {rec.confidenceLevel >= 0.8 ? 'High' : 
                                   rec.confidenceLevel >= 0.6 ? 'Medium' : 'Low'} confidence
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {rec.reason}
                              </p>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleResourceClick(rec.resourceId)}
                                className="flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Resource
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="learning-paths" className="space-y-4">
              {loadingPaths ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {(learningPaths as LearningPathSuggestion[])?.map((path: LearningPathSuggestion) => (
                      <Card key={path.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold">{path.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {path.description}
                                </p>
                              </div>
                              <Badge className={getSkillLevelColor(path.skillLevel)}>
                                {path.skillLevel}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {path.estimatedHours}h
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                {path.resources.length} resources
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                {(path.matchScore * 100).toFixed(0)}% match
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="font-medium">Why this fits you:</span>
                                <ul className="mt-1 text-muted-foreground">
                                  {path.matchReasons.map((reason, i) => (
                                    <li key={i} className="text-xs">• {reason}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setSelectedPath(path)}
                                  >
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>{path.title}</DialogTitle>
                                    <DialogDescription>
                                      {path.description}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedPath && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <span className="font-medium">Skill Level:</span>
                                          <br />
                                          <Badge className={getSkillLevelColor(selectedPath.skillLevel)}>
                                            {selectedPath.skillLevel}
                                          </Badge>
                                        </div>
                                        <div>
                                          <span className="font-medium">Duration:</span>
                                          <br />
                                          {selectedPath.estimatedHours} hours
                                        </div>
                                        <div>
                                          <span className="font-medium">Resources:</span>
                                          <br />
                                          {selectedPath.resources.length} items
                                        </div>
                                      </div>

                                      <Separator />

                                      <div>
                                        <h4 className="font-semibold mb-2">Learning Objectives</h4>
                                        <ul className="space-y-1 text-sm">
                                          {selectedPath.learningObjectives.map((objective, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                              <Target className="h-3 w-3 text-muted-foreground" />
                                              {objective}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>

                                      {selectedPath.prerequisites.length > 0 && (
                                        <div>
                                          <h4 className="font-semibold mb-2">Prerequisites</h4>
                                          <div className="flex flex-wrap gap-2">
                                            {selectedPath.prerequisites.map((prereq, i) => (
                                              <Badge key={i} variant="secondary">
                                                {prereq}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div>
                                        <h4 className="font-semibold mb-2">Resources ({selectedPath.resources.length})</h4>
                                        <ScrollArea className="h-32">
                                          <div className="space-y-2">
                                            {selectedPath.resources.map((resource, i) => (
                                              <div key={i} className="text-sm p-2 border rounded">
                                                <div className="font-medium">{resource.title}</div>
                                                <div className="text-muted-foreground text-xs">
                                                  {resource.description}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </ScrollArea>
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button 
                                size="sm" 
                                onClick={() => handlePathStart(path.id)}
                                className="flex items-center gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Start Learning
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}