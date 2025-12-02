import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import {
  TrendingUp,
  Eye,
  Clock,
  Tag,
  Star,
  Activity,
  Globe,
  MousePointer,
  Search
} from "lucide-react";
import { Resource } from "@/types/awesome-list";

interface AnalyticsData {
  totalResources: number;
  totalCategories: number;
  totalViews: number;
  popularTags: Array<{ name: string; count: number; percentage: number }>;
  categoryDistribution: Array<{ name: string; value: number; color: string }>;
  popularResources: Array<{ 
    resource: Resource; 
    views: number; 
    clicks: number; 
    trending: boolean;
    lastViewed: string;
  }>;
  viewsTrend: Array<{ date: string; views: number; clicks: number }>;
  timeOfDayUsage: Array<{ hour: number; usage: number }>;
  searchTerms: Array<{ term: string; count: number; growth: number }>;
}

interface AnalyticsDashboardProps {
  resources: Resource[];
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export default function AnalyticsDashboard({ 
  resources, 
  isOpen, 
  onClose 
}: AnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [viewData, setViewData] = useState<Record<string, number>>({});
  const [clickData, setClickData] = useState<Record<string, number>>({});
  const [searchHistory, setSearchHistory] = useState<Array<{term: string; timestamp: number}>>([]);

  // Load analytics data from localStorage
  useEffect(() => {
    const views = localStorage.getItem('resource-views');
    const clicks = localStorage.getItem('resource-clicks');
    const searches = localStorage.getItem('search-history');
    
    if (views) setViewData(JSON.parse(views));
    if (clicks) setClickData(JSON.parse(clicks));
    if (searches) setSearchHistory(JSON.parse(searches));
  }, [isOpen]);

  // Generate analytics data
  const analyticsData: AnalyticsData = useMemo(() => {
    // Category distribution
    const categoryCount: Record<string, number> = {};
    resources.forEach(resource => {
      categoryCount[resource.category] = (categoryCount[resource.category] || 0) + 1;
    });

    const categoryDistribution = Object.entries(categoryCount)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Extract tags from descriptions and titles
    const tagCount: Record<string, number> = {};
    resources.forEach(resource => {
      const text = `${resource.title} ${resource.description}`.toLowerCase();
      const words = text.match(/\b\w{3,}\b/g) || [];
      
      // Common tech keywords and tools
      const techKeywords = [
        'docker', 'kubernetes', 'api', 'web', 'server', 'database', 'monitoring',
        'backup', 'security', 'authentication', 'ssl', 'https', 'open-source',
        'self-hosted', 'cloud', 'management', 'dashboard', 'interface', 'client',
        'tool', 'framework', 'library', 'application', 'service', 'platform',
        'automation', 'deployment', 'configuration', 'logging', 'analytics',
        'performance', 'scalable', 'lightweight', 'modern', 'fast', 'simple',
        'powerful', 'flexible', 'secure', 'privacy', 'real-time', 'cross-platform'
      ];
      
      words.forEach(word => {
        if (techKeywords.includes(word) && word.length > 2) {
          tagCount[word] = (tagCount[word] || 0) + 1;
        }
      });
    });

    const popularTags = Object.entries(tagCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / resources.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Popular resources (deterministic mock data based on resource index)
    const popularResources = resources
      .slice(0, 20)
      .map((resource, index) => ({
        resource,
        views: ((index * 47 + 123) % 900) + 100,
        clicks: ((index * 31 + 67) % 450) + 50,
        trending: index < 5,
        lastViewed: new Date(Date.now() - ((index * 24 * 60 * 60 * 1000) % (7 * 24 * 60 * 60 * 1000))).toISOString()
      }))
      .sort((a, b) => b.views - a.views);

    // Views trend (deterministic mock data)
    const viewsTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        views: ((i * 17 + 123) % 400) + 100,
        clicks: ((i * 13 + 89) % 150) + 50
      };
    });

    // Time of day usage (deterministic mock data)
    const timeOfDayUsage = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      usage: ((hour * 7 + 31) % 80) + 20
    }));

    // Search terms from history
    const searchTermCount: Record<string, number> = {};
    searchHistory.forEach(({ term }) => {
      searchTermCount[term] = (searchTermCount[term] || 0) + 1;
    });

    const searchTerms = Object.entries(searchTermCount)
      .map(([term, count], index) => ({
        term,
        count,
        growth: ((index * 11 + 13) % 40) - 20 // Mock growth percentage
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalResources: resources.length,
      totalCategories: Object.keys(categoryCount).length,
      totalViews: Object.values(viewData).reduce((sum, views) => sum + views, 0),
      popularTags,
      categoryDistribution,
      popularResources,
      viewsTrend,
      timeOfDayUsage,
      searchTerms
    };
  }, [resources, viewData, clickData, searchHistory, timeframe]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analytics Dashboard
          </DialogTitle>
          <DialogDescription>
            Insights into resource popularity, usage patterns, and trending content.
          </DialogDescription>
        </DialogHeader>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{analyticsData.totalResources}</div>
                  <div className="text-xs text-muted-foreground">Total Resources</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{analyticsData.totalCategories}</div>
                  <div className="text-xs text-muted-foreground">Categories</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{analyticsData.totalViews.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Views</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{analyticsData.popularResources.filter(r => r.trending).length}</div>
                  <div className="text-xs text-muted-foreground">Trending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="popular">Popular Content</TabsTrigger>
            <TabsTrigger value="tags">Tags & Keywords</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Category Distribution</CardTitle>
                  <CardDescription>Resources by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="block md:hidden mb-4">
                    {/* Mobile legend */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {analyticsData.categoryDistribution.slice(0, 6).map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="truncate">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={window.innerWidth > 768 ? ({ name, percentage }) => {
                          const truncatedName = name.length > 15 ? name.substring(0, 12) + "..." : name;
                          return `${truncatedName} (${percentage?.toFixed(1)}%)`;
                        } : false}
                      >
                        {analyticsData.categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value} resources`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Views Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Views Trend</CardTitle>
                  <CardDescription>Daily views and clicks over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.viewsTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Area type="monotone" dataKey="views" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="clicks" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Time of Day Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage by Time of Day</CardTitle>
                <CardDescription>When users are most active</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analyticsData.timeOfDayUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={(value) => `${value}:00`}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `${value}:00 - ${value + 1}:00`}
                    />
                    <Bar dataKey="usage" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="popular" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Popular Resources</CardTitle>
                <CardDescription>Resources with the highest engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {analyticsData.popularResources.map((item, index) => (
                      <div key={item.resource.id} className="flex items-center gap-4 p-4 border">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="font-bold text-sm">{index + 1}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{item.resource.title}</h4>
                            {item.trending && (
                              <Badge variant="secondary" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Trending
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.resource.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {item.views} views
                            </div>
                            <div className="flex items-center gap-1">
                              <MousePointer className="h-3 w-3" />
                              {item.clicks} clicks
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(item.lastViewed).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold">{item.views}</div>
                          <div className="text-xs text-muted-foreground">views</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Popular Tags</CardTitle>
                  <CardDescription>Most frequently mentioned keywords</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {analyticsData.popularTags.map((tag, index) => (
                        <div key={tag.name} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                            <span className="text-xs font-bold">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium capitalize">{tag.name}</span>
                              <span className="text-sm text-muted-foreground">{tag.count}</span>
                            </div>
                            <Progress value={tag.percentage} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search Terms</CardTitle>
                  <CardDescription>What users are searching for</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {analyticsData.searchTerms.length > 0 ? (
                        analyticsData.searchTerms.map((term, index) => (
                          <div key={term.term} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{term.term}</div>
                              <div className="text-sm text-muted-foreground">{term.count} searches</div>
                            </div>
                            <div className={`text-sm font-medium ${
                              term.growth > 0 ? 'text-green-600' : term.growth < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {term.growth > 0 ? '+' : ''}{term.growth}%
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No search data available yet</p>
                          <p className="text-sm">Search terms will appear here as users search</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Growth Trends</CardTitle>
                <CardDescription>Resource and category growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.viewsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="views" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}