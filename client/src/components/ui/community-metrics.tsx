import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, GitBranch, FolderTree } from "lucide-react";
import { Resource, Category } from "@/types/awesome-list";

interface CommunityMetricsProps {
  resources: Resource[];
  categories: Category[];
  className?: string;
  // audit2 BUG-036: optionally controlled inner sub-tab so /advanced can
  // deep-link it via ?tab=metrics&sub=…; uncontrolled fallback keeps any
  // other caller working unchanged.
  subTab?: string;
  onSubTabChange?: (value: string) => void;
}

interface CategoryMetric {
  name: string;
  resourceCount: number;
  growthRate: number;
  // NB-047 (run18): renamed from the misleading "engagement" — this is purely a
  // size ratio (share of the catalog), not real engagement. See the categories
  // tab for the honest label.
  catalogShare: number;
}

export default function CommunityMetrics({ resources, categories, className, subTab, onSubTabChange }: CommunityMetricsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  // Calculate metrics based on actual resource properties from database
  const metrics = useMemo(() => {
    // Run16 BUG-025: `category.resources` is the DIRECT-only slice of the
    // tree — most resources live under subcategories/sub-subcategories, so
    // the tab showed 923 total vs the 2303 every other surface reports.
    // Flatten the whole branch so counts agree with the sidebar/Explorer.
    const getAllCategoryResources = (category: (typeof categories)[number]) => {
      const all = [...(category.resources || [])];
      for (const sub of category.subcategories || []) {
        all.push(...(sub.resources || []));
        for (const ss of (sub as any).subSubcategories || []) {
          all.push(...(ss.resources || []));
        }
      }
      return all;
    };

    // Calculate category metrics based on actual resource data
    const totalCategoryResources = categories.reduce((sum, c) => sum + getAllCategoryResources(c).length, 0);
    const categoryMetrics: CategoryMetric[] = categories.map(category => {
      const allCategoryResources = getAllCategoryResources(category);
      const resourceCount = allCategoryResources.length;
      // NB-047 (run18): this metric is the category's share of the total catalog
      // (real, derived from resource counts) — NOT engagement. The old
      // "engagement = share of average" could hit a capped 100%, which
      // contradicted the Popular tab's real 0% per-browser engagement.
      const catalogShare = Math.round((resourceCount / Math.max(totalCategoryResources, 1)) * 100);
      // Count how many resources in this category are recent (has createdAt in last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentResources = allCategoryResources.filter(r => {
        if (!r.createdAt) return false;
        return new Date(r.createdAt) > thirtyDaysAgo;
      }).length;
      const growthRate = Math.round((recentResources / Math.max(resourceCount, 1)) * 100);
      return {
        name: category.name,
        resourceCount,
        growthRate: Math.min(100, growthRate),
        catalogShare: Math.min(100, catalogShare),
      };
    }).sort((a, b) => b.resourceCount - a.resourceCount || a.name.localeCompare(b.name));

    // Calculate actual weekly growth from recent resources
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyAddedCount = resources.filter(r => {
      if (!r.createdAt) return false;
      return new Date(r.createdAt) > oneWeekAgo;
    }).length;

    return {
      categoryMetrics,
      totalContributions: resources.length,
      weeklyGrowth: recentlyAddedCount
    };
  }, [resources, categories]);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community Metrics
          </CardTitle>
          <CardDescription>
            Catalog size, weekly growth, and each category's share of the catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={subTab}
            defaultValue="overview"
            onValueChange={onSubTabChange}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
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
                    <p className="text-2xl font-bold mt-1">{metrics.totalContributions.toLocaleString()}</p>
                    <p className="text-xs text-[var(--status-ok)] mt-1">{/* DS-OK: status ok */}
                      +{metrics.weeklyGrowth.toLocaleString()} this week
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Categories</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{categories.length}</p>
                    <p className="text-xs text-[var(--status-info)] mt-1">{/* DS-OK: cyan info (DS chart/info constant) */}
                      top-level sections
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      {/* Run15 BUG-012: weeklyGrowth is a raw new-resource
                          count, not a percentage — label it honestly. */}
                      <span className="text-sm text-muted-foreground">New This Week</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">+{metrics.weeklyGrowth.toLocaleString()}</p>
                    <p className="text-xs text-[var(--status-ok)] mt-1">{/* DS-OK: status ok */}
                      resources added
                    </p>
                  </CardContent>
                </Card>
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
                            {category.resourceCount.toLocaleString()} {category.resourceCount === 1 ? "resource" : "resources"}
                          </p>
                        </div>
                        <div className="text-right">
                          {/* NB-047 (run18): labeled honestly as the category's
                              share of the catalog — the previous "engagement"
                              label contradicted the Popular tab's real 0%. */}
                          <div className="text-lg font-bold text-foreground">
                            {category.catalogShare}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            of catalog
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Growth Rate</span>
                            <span className="text-[var(--status-ok)]">+{category.growthRate}%</span>{/* DS-OK: status ok */}
                          </div>
                          <Progress value={category.growthRate} className="h-2" />
                          {/* NB-047: say where the number comes from instead of
                              presenting an unsourced percentage. */}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Share of this category's resources added in the last 30 days
                          </p>
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