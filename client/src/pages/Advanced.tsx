import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryExplorer from "@/components/ui/category-explorer";
import CommunityMetrics from "@/components/ui/community-metrics";
import ExportTools from "@/components/ui/export-tools";
import ResourceRecommendations from "@/components/ui/resource-recommendations";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Zap, 
  Compass, 
  BarChart3, 
  Download, 
  Lightbulb,
  Sparkles
} from "lucide-react";
import { AwesomeList, Resource } from "@/types/awesome-list";

export default function Advanced() {
  const [selectedResource, setSelectedResource] = useState<Resource | undefined>();
  const [userInterests] = useState<string[]>(["web", "api", "testing", "database"]);

  const { data: awesomeList, isLoading } = useQuery<AwesomeList>({
    queryKey: ['/api/awesome-list'],
  });

  // Select a featured resource for demonstration
  const featuredResource = awesomeList?.resources?.[0];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-full mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!awesomeList) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Advanced Features</h1>
        <p className="text-muted-foreground">Unable to load awesome list data</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>Advanced Features - {awesomeList.title}</title>
        <meta name="description" content="Explore advanced features including category explorer, community metrics, export tools, and AI-powered recommendations" />
      </Helmet>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Advanced Features</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Discover powerful tools for exploring, analyzing, and sharing awesome list data
        </p>
      </div>

      {/* Feature Showcase */}
      <Tabs defaultValue="explorer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="explorer" className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Explorer
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5" />
                Interactive Category Explorer
              </CardTitle>
              <CardDescription>
                Advanced search and filtering capabilities with real-time category statistics and interactive exploration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                <Card className="lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{awesomeList.categories.length}</div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{awesomeList.resources.length}</div>
                      <div className="text-sm text-muted-foreground">Resources</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {new Set(awesomeList.resources.flatMap(r => r.tags || [])).size}
                      </div>
                      <div className="text-sm text-muted-foreground">Unique Tags</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {awesomeList.categories.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Subcategories</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <CategoryExplorer 
            categories={awesomeList.categories}
            resources={awesomeList.resources}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Community Analytics Dashboard
              </CardTitle>
              <CardDescription>
                Track engagement, contributions, and popularity metrics across the awesome list ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">Activity Level</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">High</p>
                    <p className="text-xs text-green-600 mt-1">
                      Active community with regular updates
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Quality Score</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">A+</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Comprehensive documentation and categorization
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-muted-foreground">Completeness</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">95%</p>
                    <p className="text-xs text-purple-600 mt-1">
                      Well-organized with detailed descriptions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <CommunityMetrics 
            resources={awesomeList.resources}
            categories={awesomeList.categories}
          />
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Multi-Format Export System
              </CardTitle>
              <CardDescription>
                Export your curated lists in multiple formats including Markdown, JSON, CSV, PDF, and HTML with advanced filtering options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                {[
                  { format: "Markdown", icon: "📝", desc: "GitHub-ready" },
                  { format: "JSON", icon: "⚡", desc: "API-friendly" },
                  { format: "CSV", icon: "📊", desc: "Spreadsheet" },
                  { format: "PDF", icon: "📄", desc: "Professional" },
                  { format: "HTML", icon: "🌐", desc: "Web-ready" },
                  { format: "YAML", icon: "⚙️", desc: "Config files" }
                ].map(item => (
                  <Card key={item.format}>
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="font-medium text-sm">{item.format}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <ExportTools awesomeList={awesomeList} />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI-Powered Resource Recommendations
              </CardTitle>
              <CardDescription>
                Intelligent recommendations based on tags, categories, usage patterns, and community trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                  { 
                    title: "Similar Resources", 
                    desc: "Same category and shared tags",
                    icon: "🎯",
                    color: "text-blue-600"
                  },
                  { 
                    title: "Trending Tools", 
                    desc: "Popular and well-documented",
                    icon: "📈",
                    color: "text-green-600"
                  },
                  { 
                    title: "Personal Match", 
                    desc: "Based on your interests",
                    icon: "💡",
                    color: "text-purple-600"
                  },
                  { 
                    title: "Complementary", 
                    desc: "Tools that work together",
                    icon: "⚡",
                    color: "text-orange-600"
                  }
                ].map(item => (
                  <Card key={item.title}>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <div className={`font-medium text-sm ${item.color}`}>{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {featuredResource && (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Currently showing recommendations for:</div>
                  <div className="font-medium">{featuredResource.title}</div>
                  <div className="text-xs text-muted-foreground">{featuredResource.category}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <ResourceRecommendations
            currentResource={selectedResource || featuredResource}
            allResources={awesomeList.resources}
            userTags={userInterests}
          />
        </TabsContent>
      </Tabs>

      {/* Call to Action */}
      <Card className="mt-8">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-semibold mb-2">Explore More Features</h3>
          <p className="text-muted-foreground mb-4">
            These advanced features help you discover, analyze, and share awesome list data more effectively
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a 
              href="/" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Browse All Resources
            </a>
            <a 
              href="/category/web-frameworks" 
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors"
            >
              Explore Categories
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}