import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Star, 
  TrendingUp, 
  Award, 
  GitBranch, 
  Calendar,
  ExternalLink,
  Heart,
  Eye,
  MessageSquare
} from "lucide-react";
import { Resource, Category } from "@/types/awesome-list";

interface CommunityMetricsProps {
  resources: Resource[];
  categories: Category[];
  className?: string;
}

interface ContributorMetric {
  name: string;
  contributions: number;
  categories: string[];
  badge: string;
  level: "bronze" | "silver" | "gold" | "platinum";
}

interface PopularityMetric {
  resourceId: string;
  title: string;
  category: string;
  url: string;
  score: number;
  trends: {
    clicks: number;
    searches: number;
    shares: number;
  };
}

interface CategoryMetric {
  name: string;
  resourceCount: number;
  growthRate: number;
  engagement: number;
  completeness: number;
}

export default function CommunityMetrics({ resources, categories, className }: CommunityMetricsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  // Calculate mock metrics based on actual data
  const metrics = useMemo(() => {
    // Generate contributor metrics
    const contributors: ContributorMetric[] = [
      {
        name: "awesome-go maintainers",
        contributions: Math.floor(resources.length * 0.3),
        categories: categories.slice(0, 5).map(c => c.name),
        badge: "Core Maintainer",
        level: "platinum"
      },
      {
        name: "community contributors", 
        contributions: Math.floor(resources.length * 0.4),
        categories: categories.slice(2, 8).map(c => c.name),
        badge: "Active Contributor",
        level: "gold"
      },
      {
        name: "occasional contributors",
        contributions: Math.floor(resources.length * 0.2),
        categories: categories.slice(5, 10).map(c => c.name),
        badge: "Contributor",
        level: "silver"
      },
      {
        name: "new contributors",
        contributions: Math.floor(resources.length * 0.1),
        categories: categories.slice(8, 12).map(c => c.name),
        badge: "New Contributor",
        level: "bronze"
      }
    ];

    // Generate popularity metrics
    const popularResources: PopularityMetric[] = resources
      .slice(0, 10)
      .map((resource, index) => ({
        resourceId: resource.id,
        title: resource.title,
        category: resource.category,
        url: resource.url,
        score: 100 - (index * 8) + ((index * 3 + 7) % 15),
        trends: {
          clicks: ((index * 37 + 100) % 900) + 100,
          searches: ((index * 23 + 50) % 450) + 50,
          shares: ((index * 17 + 20) % 180) + 20
        }
      }))
      .sort((a, b) => b.score - a.score);

    // Generate category metrics
    const categoryMetrics: CategoryMetric[] = categories.map((category, idx) => ({
      name: category.name,
      resourceCount: category.count,
      growthRate: ((idx * 13 + 5) % 30) + 5,
      engagement: ((idx * 19 + 50) % 100) + 50,
      completeness: Math.min(100, (category.count / 20) * 100)
    })).sort((a, b) => b.engagement - a.engagement);

    return {
      contributors,
      popularResources,
      categoryMetrics,
      totalContributions: resources.length,
      activeContributors: contributors.length,
      weeklyGrowth: ((categories.length * 11 + 5) % 15) + 5
    };
  }, [resources, categories]);

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "platinum": return "bg-gradient-to-r from-gray-300 to-gray-500";
      case "gold": return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case "silver": return "bg-gradient-to-r from-gray-400 to-gray-600";
      case "bronze": return "bg-gradient-to-r from-orange-400 to-orange-600";
      default: return "bg-muted";
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Metrics & Contributions
          </CardTitle>
          <CardDescription>
            Track community engagement, popular resources, and contribution patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contributors">Contributors</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Resources</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{metrics.totalContributions}</p>
                    <p className="text-xs text-green-600 mt-1">
                      +{metrics.weeklyGrowth} this week
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Active Contributors</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{metrics.activeContributors}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Across {categories.length} categories
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Growth Rate</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">+{metrics.weeklyGrowth}%</p>
                    <p className="text-xs text-green-600 mt-1">
                      Weekly average
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.popularResources.slice(0, 5).map((resource, index) => (
                      <div key={resource.resourceId} className="flex items-center justify-between p-3 border">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">#{index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              {resource.category}
                            </Badge>
                          </div>
                          <div>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {resource.title}
                            </a>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {resource.trends.clicks}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {resource.trends.shares}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {resource.score}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            engagement
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributors" className="space-y-4">
              <div className="space-y-4">
                {metrics.contributors.map((contributor, index) => (
                  <Card key={contributor.name}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{contributor.name}</span>
                            </div>
                            <Badge 
                              className={`text-white text-xs ${getBadgeColor(contributor.level)}`}
                            >
                              {contributor.badge}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Contributions:</span>
                              <div className="font-medium">{contributor.contributions} resources</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Categories:</span>
                              <div className="font-medium">{contributor.categories.length} active</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Level:</span>
                              <div className="font-medium capitalize">{contributor.level}</div>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <div className="text-xs text-muted-foreground mb-1">
                              Active categories:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {contributor.categories.slice(0, 4).map(category => (
                                <Badge key={category} variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                              {contributor.categories.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{contributor.categories.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="popular" className="space-y-4">
              <div className="space-y-3">
                {metrics.popularResources.map((resource, index) => (
                  <Card key={resource.resourceId}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-muted-foreground">
                              #{index + 1}
                            </span>
                            <div>
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:text-primary transition-colors flex items-center gap-1"
                              >
                                {resource.title}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <Badge variant="outline" className="text-xs mt-1">
                                {resource.category}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-blue-500" />
                              <div>
                                <div className="font-medium">{resource.trends.clicks}</div>
                                <div className="text-xs text-muted-foreground">clicks</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-green-500" />
                              <div>
                                <div className="font-medium">{resource.trends.searches}</div>
                                <div className="text-xs text-muted-foreground">searches</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-red-500" />
                              <div>
                                <div className="font-medium">{resource.trends.shares}</div>
                                <div className="text-xs text-muted-foreground">shares</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`text-xl font-bold ${getEngagementColor(resource.score)}`}>
                            {resource.score}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            popularity score
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="space-y-3">
                {metrics.categoryMetrics.map((category, index) => (
                  <Card key={category.name}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {category.resourceCount} resources
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getEngagementColor(category.engagement)}`}>
                            {category.engagement}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            engagement
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Growth Rate</span>
                            <span className="text-green-600">+{category.growthRate}%</span>
                          </div>
                          <Progress value={category.growthRate} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Completeness</span>
                            <span>{Math.round(category.completeness)}%</span>
                          </div>
                          <Progress value={category.completeness} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}