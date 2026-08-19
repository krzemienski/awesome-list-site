import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/layout/SEOHead";
import { advancedSeoTitle, advancedSeoDescription } from "@shared/seo-templates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryExplorer from "@/components/ui/category-explorer";
import CommunityMetrics from "@/components/ui/community-metrics";
import ExportTools from "@/components/ui/export-tools";
import AIRecommendationsPanel from "@/components/ui/ai-recommendations-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Compass, 
  BarChart3, 
  Download, 
  Lightbulb,
  Sparkles,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { AwesomeList } from "@/types/awesome-list";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { writeFilterParams, usePopstateParams } from "@/lib/url-filter-state";

const VALID_ADVANCED_TABS = ["explorer", "metrics", "export", "recommendations"];
// audit2 BUG-036: inner sub-tabs of the Metrics panel, deep-linkable via
// ?sub= (only meaningful alongside tab=metrics).
const VALID_METRICS_SUBTABS = ["overview", "contributors", "popular", "categories"];

export default function Advanced() {
  // BUG-038 (run14): ?tab= deep-links restore the selected tab, and switching
  // tabs serializes back to the URL (replaceState — wouter useLocation is
  // path-only, so read/write window.location.search directly).
  const [tab, setTab] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    return fromUrl && VALID_ADVANCED_TABS.includes(fromUrl) ? fromUrl : "explorer";
  });
  // audit2 BUG-036: /advanced?tab=metrics&sub=… restores the exact inner
  // sub-tab after reload (it used to silently reset to Overview).
  const [metricsSubTab, setMetricsSubTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const sub = params.get("sub");
    return params.get("tab") === "metrics" && sub && VALID_METRICS_SUBTABS.includes(sub)
      ? sub
      : "overview";
  });
  const handleTabChange = (next: string) => {
    setTab(next);
    // audit2 BUG-036: ?sub= only means anything on the Metrics tab — reset
    // the inner selection and drop the param when the outer tab changes.
    setMetricsSubTab("overview");
    // Run22 BUG-016: push (not replace) so Back steps through tab changes.
    writeFilterParams({ tab: next === "explorer" ? null : next, sub: null });
  };
  const handleMetricsSubChange = (next: string) => {
    setMetricsSubTab(next);
    writeFilterParams({ sub: next === "overview" ? null : next });
  };

  // Run22 BUG-016: Back/Forward restore the tab from the URL.
  usePopstateParams((params) => {
    const fromUrl = params.get("tab");
    setTab(fromUrl && VALID_ADVANCED_TABS.includes(fromUrl) ? fromUrl : "explorer");
    // audit2 BUG-036: restore the inner sub-tab carried by this history entry.
    const sub = params.get("sub");
    setMetricsSubTab(
      fromUrl === "metrics" && sub && VALID_METRICS_SUBTABS.includes(sub) ? sub : "overview",
    );
  });

  // BUG-026 (run13): selected export format, driven by the showcase cards.
  const [exportFormat, setExportFormat] = useState<"markdown" | "json" | "csv" | "pdf" | "html" | "yaml" | undefined>();

  // R4-033 (run21): share ONE catalog cache entry app-wide. App.tsx fetches
  // under ["awesome-list-data"] via fetchStaticAwesomeList; using the raw
  // '/api/awesome-list' key here created a second cache entry and a second
  // full 3.1MB download on this page.
  const { data: awesomeList, isLoading, isError, refetch, isFetching } = useQuery<AwesomeList>({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  const resources = awesomeList?.resources ?? [];
  const categories = awesomeList?.categories ?? [];

  if (isLoading && tab !== "recommendations") {
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

  // Run21 R4-032: a failed catalog fetch (429/500/network) gets an explicit
  // error state with a manual retry — the same treatment /search already has —
  // instead of the ambiguous "Unable to load" dead-end that offered no recovery.
  if (isError && tab !== "recommendations") {
    return (
      <div className="container mx-auto px-4 py-8">
        <SEOHead title={advancedSeoTitle} description={advancedSeoDescription} />
        <div
          className="max-w-md mx-auto flex flex-col items-center gap-3 py-16 text-center"
          role="alert"
          data-testid="advanced-error"
        >
          <AlertCircle className="h-10 w-10 text-[var(--accent)]" />
          <h1 className="display-h text-xl">Couldn&apos;t load advanced features</h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t reach the catalog data. This is usually a temporary
            network problem.
          </p>
          <Button
            variant="outline"
            onClick={() => { if (!isFetching) void refetch(); }}
            aria-disabled={isFetching}
            data-testid="button-advanced-retry"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </div>
    );
  }

  if (!awesomeList && tab !== "recommendations") {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="display-h text-2xl mb-4">Advanced Features</h1>
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
          <h1 className="display-h text-3xl">Advanced Features</h1>
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
        {/* BUG-005 (audit2): sm:flex-nowrap + overflow-x-auto clipped the 4th
            tab at squeezed widths with no visible scroll affordance — below
            lg the list now WRAPS so every tab stays visible and tappable. */}
        <TabsList className="flex w-full flex-wrap justify-start lg:grid lg:grid-cols-4 bg-[var(--surface)] border-b border-[var(--border)] rounded-none p-0 h-auto">
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
                      <div className="text-2xl font-bold text-primary">{categories.length}</div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{resources.length.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Resources</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {new Set(resources.flatMap((r) => r.metadata?.tags ?? r.tags ?? [])).size}
                      </div>
                      <div className="text-sm text-muted-foreground">Unique Tags</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {categories.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Subcategories</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <CategoryExplorer 
            categories={categories}
            resources={resources}
          />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          {/* BUG-049 (run13): the old "Activity High / Quality A+ / Completeness
              95%" cards were hard-coded vanity numbers with no data source —
              removed. CommunityMetrics below computes real counts from the
              live catalog. */}
          <CommunityMetrics 
            resources={resources}
            categories={categories}
            subTab={metricsSubTab}
            onSubTabChange={handleMetricsSubChange}
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
                Export your curated lists in multiple formats including Markdown, JSON, CSV, YAML, HTML, and PDF with advanced filtering options
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

          {awesomeList ? (
            <ExportTools awesomeList={awesomeList} formatOverride={exportFormat} />
          ) : null}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <AIRecommendationsPanel />
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
            {/* BUG-011 (run19) linked this to /search because an empty query
                used to browse the full catalog; audit2 BUG-019 made empty
                /search an explicit "enter a search term" prompt, so the
                honest browse-everything destination is the categories hub. */}
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              data-testid="link-browse-all-resources"
            >
              Browse All Resources
            </Link>
            <Link
              href={categories[0]?.slug ? `/category/${categories[0].slug}` : "/"}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
            >
              Explore Categories
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
