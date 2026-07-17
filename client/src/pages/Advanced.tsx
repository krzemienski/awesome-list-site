import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/layout/SEOHead";
import { advancedSeoTitle, advancedSeoDescription } from "@shared/seo-templates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryExplorer from "@/components/ui/category-explorer";
import CommunityMetrics from "@/components/ui/community-metrics";
import ExportTools from "@/components/ui/export-tools";
import ResourceRecommendations from "@/components/ui/resource-recommendations";
import AIRecommendationsPanel from "@/components/ui/ai-recommendations-panel";
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

const VALID_ADVANCED_TABS = ["explorer", "metrics", "export", "recommendations"];

export default function Advanced() {
  // BUG-038 (run14): ?tab= deep-links restore the selected tab, and switching
  // tabs serializes back to the URL (replaceState — wouter useLocation is
  // path-only, so read/write window.location.search directly).
  const [tab, setTab] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    return fromUrl && VALID_ADVANCED_TABS.includes(fromUrl) ? fromUrl : "explorer";
  });
  const handleTabChange = (next: string) => {
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "explorer") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  };

  const [selectedResource, setSelectedResource] = useState<Resource | undefined>();
  const [userInterests] = useState<string[]>(["web", "api", "testing", "database"]);
  // BUG-026 (run13): selected export format, driven by the showcase cards.
  const [exportFormat, setExportFormat] = useState<"markdown" | "json" | "csv" | "pdf" | "html" | "yaml" | undefined>();

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
      <SEOHead title={advancedSeoTitle} description={advancedSeoDescription} />

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
      {/* P6 — active tab gets bg + bottom border per ref 03 */}
      {/* BUG-036 (run14): the 4-col grid only engages at lg — at 768px the
          equal columns hard-truncated "AI Recommendations"; below lg the list
          stays a scrollable flex row with full-width labels. */}
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        {/* Run16 BUG-066: at 375px the 4th tab ("AI Recommendations") was
            clipped off-screen with no scroll cue — wrap the tab bar on small
            screens so every tab stays visible. */}
        <TabsList className="flex w-full flex-wrap justify-start sm:flex-nowrap sm:overflow-x-auto lg:grid lg:grid-cols-4 bg-[var(--surface)] border-b border-[var(--border)] rounded-none p-0 h-auto">
          <TabsTrigger
            value="explorer"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:bg-[var(--surface-2)] data-[state=active]:text-[var(--accent)] px-4 py-3"
          >
            <Compass className="h-4 w-4" />
            Explorer
          </TabsTrigger>
          <TabsTrigger
            value="metrics"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:bg-[var(--surface-2)] data-[state=active]:text-[var(--accent)] px-4 py-3"
          >
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger
            value="export"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:bg-[var(--surface-2)] data-[state=active]:text-[var(--accent)] px-4 py-3"
          >
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--accent)] data-[state=active]:bg-[var(--surface-2)] data-[state=active]:text-[var(--accent)] px-4 py-3"
          >
            <Lightbulb className="h-4 w-4" />
            <span>AI Recommendations</span>
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
              {/* DS-OK: stat semantic colors (primary/blue/green/purple) intentionally honor the design reference; do not flatten in DS sweeps. */}
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
                        {new Set(awesomeList.resources.flatMap((r) => ((r as any).metadata?.tags as string[] | undefined) ?? r.tags ?? [])).size}
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
          {/* BUG-049 (run13): the old "Activity High / Quality A+ / Completeness
              95%" cards were hard-coded vanity numbers with no data source —
              removed. CommunityMetrics below computes real counts from the
              live catalog. */}
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
              {/* BUG-026 (run13): format cards are now buttons that select the
                  matching format in the export panel below. */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                {([
                  { format: "Markdown", value: "markdown", icon: "📝", desc: "GitHub-ready" },
                  { format: "JSON", value: "json", icon: "⚡", desc: "API-friendly" },
                  { format: "CSV", value: "csv", icon: "📊", desc: "Spreadsheet" },
                  { format: "PDF", value: "pdf", icon: "📄", desc: "Professional" },
                  { format: "HTML", value: "html", icon: "🌐", desc: "Web-ready" },
                  { format: "YAML", value: "yaml", icon: "⚙️", desc: "Config files" }
                ] as const).map(item => (
                  <button
                    key={item.format}
                    type="button"
                    onClick={() => setExportFormat(item.value)}
                    aria-pressed={exportFormat === item.value}
                    aria-label={`Select ${item.format} export format`}
                    className="text-left"
                    data-testid={`button-format-${item.value}`}
                  >
                    <Card
                      className={
                        exportFormat === item.value
                          ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                          : "hover:border-[var(--accent)] transition-colors cursor-pointer"
                      }
                    >
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className="font-medium text-sm">{item.format}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <ExportTools awesomeList={awesomeList} formatOverride={exportFormat} />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <AIRecommendationsPanel resources={awesomeList.resources} />
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
              href={awesomeList.categories?.[0]?.slug ? `/category/${awesomeList.categories[0].slug}` : "/"} 
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
            >
              Explore Categories
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}