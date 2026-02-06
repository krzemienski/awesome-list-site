import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lightbulb,
  TrendingUp,
  Tag,
  ExternalLink,
  Star,
  ArrowRight,
  Zap,
  Target,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Resource } from "@/types/awesome-list";

interface ResourceRecommendationsProps {
  currentResource?: Resource;
  allResources: Resource[];
  userTags?: string[];
  className?: string;
}

interface RecommendationScore {
  resource: Resource;
  score: number;
  confidence: number;
  reasons: string[];
  relationshipType?: 'similar' | 'prerequisite' | 'next-step';
}

interface RelatedResourcesResponse {
  similar: RecommendationScore[];
  prerequisites: RecommendationScore[];
  nextSteps: RecommendationScore[];
  totalFound: number;
}

export default function ResourceRecommendations({
  currentResource,
  allResources,
  userTags = [],
  className
}: ResourceRecommendationsProps) {
  const [activeTab, setActiveTab] = useState("similar");

  // Fetch AI-powered related resources from API
  const { data: relatedResourcesData, isLoading, isError, error } = useQuery<RelatedResourcesResponse>({
    queryKey: ['/api/resources/related', currentResource?.id],
    queryFn: async () => {
      if (!currentResource?.id) {
        throw new Error('No resource ID provided');
      }
      return await apiRequest(`/api/resources/${currentResource.id}/related?limit=5`, {
        method: 'GET'
      });
    },
    enabled: !!currentResource?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Transform API response to match component structure
  const recommendations = {
    similar: relatedResourcesData?.similar?.map(item => ({
      resource: item.resource,
      score: item.score * 100, // Convert 0-1 to 0-100 for display
      confidence: item.confidence,
      reasons: [item.reason],
      relationshipType: item.relationshipType
    })) || [],
    prerequisites: relatedResourcesData?.prerequisites?.map(item => ({
      resource: item.resource,
      score: item.score * 100,
      confidence: item.confidence,
      reasons: [item.reason],
      relationshipType: item.relationshipType
    })) || [],
    nextSteps: relatedResourcesData?.nextSteps?.map(item => ({
      resource: item.resource,
      score: item.score * 100,
      confidence: item.confidence,
      reasons: [item.reason],
      relationshipType: item.relationshipType
    })) || []
  };

  const renderRecommendationCard = (item: RecommendationScore, showScore: boolean = true) => (
    <Card key={item.resource.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <a
              href={item.resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-primary transition-colors flex items-center gap-1 text-sm"
            >
              {item.resource.title}
              <ExternalLink className="h-3 w-3" />
            </a>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {item.resource.category}
              </Badge>
              {showScore && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {Math.round(item.confidence)}% match
                </Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {item.resource.description}
        </p>

        {item.reasons && item.reasons.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              AI Analysis:
            </div>
            <div className="flex flex-wrap gap-1">
              {item.reasons.slice(0, 2).map((reason, index) => (
                <span key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.resource.tags && item.resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.resource.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded">
                {tag}
              </span>
            ))}
            {item.resource.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{item.resource.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!currentResource) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI-Powered Resource Recommendations</h3>
          <p className="text-muted-foreground">
            Select a resource to see AI-powered semantic recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Recommendations for "{currentResource.title}"
          </CardTitle>
          <CardDescription>
            Discovering semantically related resources using AI embeddings...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              Analyzing semantic relationships...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Recommendations for "{currentResource.title}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Failed to load AI recommendations
            </p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRecommendations =
    recommendations.similar.length +
    recommendations.prerequisites.length +
    recommendations.nextSteps.length;

  const hasAnyRecommendations = totalRecommendations > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Recommendations for "{currentResource.title}"
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Powered by semantic similarity and AI embeddings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAnyRecommendations ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="similar" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                Similar
              </TabsTrigger>
              <TabsTrigger value="prerequisites" className="text-xs">
                <ArrowRight className="h-3 w-3 mr-1 rotate-180" />
                Prerequisites
              </TabsTrigger>
              <TabsTrigger value="nextSteps" className="text-xs">
                <ArrowRight className="h-3 w-3 mr-1" />
                Next Steps
              </TabsTrigger>
            </TabsList>

            <TabsContent value="similar" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Similar Resources</span>
                  <Badge variant="outline" className="text-xs">
                    {recommendations.similar.length} found
                  </Badge>
                </div>
                {recommendations.similar.length > 0 ? (
                  recommendations.similar.map(item => renderRecommendationCard(item, true))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No similar resources found
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI embeddings are still being generated
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="prerequisites" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="h-4 w-4 text-green-600 rotate-180" />
                  <span className="text-sm font-medium">Prerequisites</span>
                  <Badge variant="outline" className="text-xs">
                    {recommendations.prerequisites.length} found
                  </Badge>
                </div>
                {recommendations.prerequisites.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Resources to learn before this one
                    </p>
                    {recommendations.prerequisites.map(item => renderRecommendationCard(item, true))}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No prerequisites identified
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This resource may be a good starting point
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="nextSteps" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Next Steps</span>
                  <Badge variant="outline" className="text-xs">
                    {recommendations.nextSteps.length} found
                  </Badge>
                </div>
                {recommendations.nextSteps.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      Resources to learn after mastering this one
                    </p>
                    {recommendations.nextSteps.map(item => renderRecommendationCard(item, true))}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No next steps identified
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This resource may be advanced or specialized
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              No AI recommendations available yet
            </p>
            <p className="text-xs text-muted-foreground">
              Embeddings for this resource are still being generated
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
