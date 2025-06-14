import { useState, useMemo } from "react";
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
  Target
} from "lucide-react";
import { Resource } from "../../types/awesome-list";

interface ResourceRecommendationsProps {
  currentResource?: Resource;
  allResources: Resource[];
  userTags?: string[];
  className?: string;
}

interface RecommendationScore {
  resource: Resource;
  score: number;
  reasons: string[];
}

export default function ResourceRecommendations({ 
  currentResource, 
  allResources, 
  userTags = [], 
  className 
}: ResourceRecommendationsProps) {
  const [activeTab, setActiveTab] = useState("similar");

  // Calculate recommendations based on different algorithms
  const recommendations = useMemo(() => {
    if (!currentResource) {
      return {
        similar: [],
        trending: [],
        tagged: [],
        complementary: []
      };
    }

    // Similar resources (same category, shared tags)
    const similarResources = allResources
      .filter(r => r.id !== currentResource.id)
      .map(resource => {
        let score = 0;
        const reasons: string[] = [];

        // Same category bonus
        if (resource.category === currentResource.category) {
          score += 3;
          reasons.push(`Same category: ${resource.category}`);
        }

        // Shared tags bonus
        const sharedTags = resource.tags?.filter(tag => 
          currentResource.tags?.includes(tag)
        ) || [];
        if (sharedTags.length > 0) {
          score += sharedTags.length * 2;
          reasons.push(`Shared tags: ${sharedTags.join(', ')}`);
        }

        // Similar title words
        const currentWords = currentResource.title.toLowerCase().split(/\s+/);
        const resourceWords = resource.title.toLowerCase().split(/\s+/);
        const sharedWords = currentWords.filter(word => 
          word.length > 3 && resourceWords.includes(word)
        );
        if (sharedWords.length > 0) {
          score += sharedWords.length;
          reasons.push(`Similar title words`);
        }

        // Description similarity (basic keyword matching)
        if (currentResource.description && resource.description) {
          const currentDesc = currentResource.description.toLowerCase();
          const resourceDesc = resource.description.toLowerCase();
          const keywordMatches = ['api', 'framework', 'library', 'tool', 'service', 'database']
            .filter(keyword => currentDesc.includes(keyword) && resourceDesc.includes(keyword));
          if (keywordMatches.length > 0) {
            score += keywordMatches.length * 0.5;
            reasons.push(`Similar functionality`);
          }
        }

        return { resource, score, reasons };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Trending resources (simulate with highest tag count and category popularity)
    const trendingResources = allResources
      .filter(r => r.id !== currentResource.id)
      .map(resource => {
        let score = 0;
        const reasons: string[] = [];

        // Resources with many tags tend to be well-documented
        const tagCount = resource.tags?.length || 0;
        if (tagCount > 2) {
          score += tagCount;
          reasons.push(`Well-documented (${tagCount} tags)`);
        }

        // Resources in popular categories
        const categorySize = allResources.filter(r => r.category === resource.category).length;
        if (categorySize > 10) {
          score += Math.log(categorySize);
          reasons.push(`Popular category`);
        }

        // GitHub-based resources (more likely to be maintained)
        if (resource.url.includes('github.com')) {
          score += 2;
          reasons.push(`Open source on GitHub`);
        }

        // Add some randomness to simulate trending
        score += Math.random() * 2;

        return { resource, score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Tag-based recommendations (resources with user's preferred tags)
    const taggedResources = userTags.length > 0 
      ? allResources
          .filter(r => r.id !== currentResource.id)
          .map(resource => {
            let score = 0;
            const reasons: string[] = [];

            const matchingTags = resource.tags?.filter(tag => 
              userTags.includes(tag)
            ) || [];

            if (matchingTags.length > 0) {
              score = matchingTags.length * 3;
              reasons.push(`Matches your interests: ${matchingTags.join(', ')}`);
            }

            return { resource, score, reasons };
          })
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      : [];

    // Complementary resources (different category but related functionality)
    const complementaryResources = allResources
      .filter(r => r.id !== currentResource.id && r.category !== currentResource.category)
      .map(resource => {
        let score = 0;
        const reasons: string[] = [];

        // Look for complementary patterns
        const complementaryPairs = [
          { from: 'web', to: 'database', reason: 'Database for web applications' },
          { from: 'api', to: 'testing', reason: 'Testing tools for APIs' },
          { from: 'framework', to: 'monitoring', reason: 'Monitoring for frameworks' },
          { from: 'authentication', to: 'security', reason: 'Security tools' },
          { from: 'orm', to: 'migration', reason: 'Database migration tools' },
          { from: 'cli', to: 'configuration', reason: 'Configuration management' }
        ];

        const currentCategory = currentResource.category.toLowerCase();
        const resourceCategory = resource.category.toLowerCase();

        complementaryPairs.forEach(pair => {
          if ((currentCategory.includes(pair.from) && resourceCategory.includes(pair.to)) ||
              (currentCategory.includes(pair.to) && resourceCategory.includes(pair.from))) {
            score += 3;
            reasons.push(pair.reason);
          }
        });

        // Shared tags but different category
        const sharedTags = resource.tags?.filter(tag => 
          currentResource.tags?.includes(tag)
        ) || [];
        if (sharedTags.length > 0) {
          score += sharedTags.length;
          reasons.push(`Related tools: ${sharedTags.join(', ')}`);
        }

        return { resource, score, reasons };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      similar: similarResources,
      trending: trendingResources,
      tagged: taggedResources,
      complementary: complementaryResources
    };
  }, [currentResource, allResources, userTags]);

  const renderRecommendationCard = (item: RecommendationScore, showScore: boolean = false) => (
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
                <Badge variant="secondary" className="text-xs">
                  {Math.round(item.score * 10)/10} match
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {item.resource.description}
        </p>
        
        {item.reasons.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Why recommended:</div>
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
          <h3 className="text-lg font-semibold mb-2">Resource Recommendations</h3>
          <p className="text-muted-foreground">
            Select a resource to see personalized recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasAnyRecommendations = Object.values(recommendations).some(recs => recs.length > 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Recommendations for "{currentResource.title}"
        </CardTitle>
        <CardDescription>
          Discover related resources based on tags, categories, and usage patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAnyRecommendations ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="similar" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                Similar
              </TabsTrigger>
              <TabsTrigger value="trending" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="tagged" className="text-xs" disabled={userTags.length === 0}>
                <Tag className="h-3 w-3 mr-1" />
                For You
              </TabsTrigger>
              <TabsTrigger value="complementary" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Related
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
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No similar resources found in the same category
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="trending" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Trending Resources</span>
                  <Badge variant="outline" className="text-xs">
                    {recommendations.trending.length} found
                  </Badge>
                </div>
                {recommendations.trending.map(item => renderRecommendationCard(item))}
              </div>
            </TabsContent>

            <TabsContent value="tagged" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Based on Your Interests</span>
                  <Badge variant="outline" className="text-xs">
                    {recommendations.tagged.length} found
                  </Badge>
                </div>
                {userTags.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-2">
                      No user preferences set
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Interact with resources to build personalized recommendations
                    </p>
                  </div>
                ) : recommendations.tagged.length > 0 ? (
                  recommendations.tagged.map(item => renderRecommendationCard(item, true))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No resources found matching your interests: {userTags.join(', ')}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="complementary" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Complementary Tools</span>
                  <Badge variant="outline" className="text-xs">
                    {recommendations.complementary.length} found
                  </Badge>
                </div>
                {recommendations.complementary.length > 0 ? (
                  recommendations.complementary.map(item => renderRecommendationCard(item, true))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No complementary resources found
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recommendations available for this resource
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}