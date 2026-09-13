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
  RefreshCw,
  FileText,
  Code,
  Database,
  File,
  BookOpen,
  Settings
} from "lucide-react";
import { AwesomeList } from "@/types/awesome-list";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { writeFilterParams, usePopstateParams } from "@/lib/url-filter-state";
import "@/styles/pages/discovery-tools.css";

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
      <div className="discovery-tools-page discovery-tools-page--advanced">
        <div className="discovery-tools-state discovery-tools-state--loading" aria-busy="true">
          <Skeleton className="discovery-tools-skeleton discovery-tools-skeleton--title" />
          <Skeleton className="discovery-tools-skeleton discovery-tools-skeleton--lede" />
        </div>
        <div className="discovery-tools-loading-grid">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="discovery-tools-skeleton discovery-tools-skeleton--panel" />
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
      <div className="discovery-tools-page discovery-tools-page--advanced">
        <SEOHead title={advancedSeoTitle} description={advancedSeoDescription} />
        <div
          className="discovery-tools-state discovery-tools-state--error"
          role="alert"
          data-testid="advanced-error"
        >
          <span className="chip bad discovery-tools-state-badge">Error · Catalog</span>
          <AlertCircle className="discovery-tools-state-icon" aria-hidden="true" />
          <h1 className="display-h discovery-tools-state-title">Couldn&apos;t load advanced features</h1>
          <p className="discovery-tools-state-copy">
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
      <div className="discovery-tools-page discovery-tools-page--advanced">
        <div className="discovery-tools-state discovery-tools-state--empty">
          <span className="eyebrow discovery-tools-state-eyebrow">No catalog data</span>
          <h1 className="display-h discovery-tools-state-title">Advanced Features</h1>
          <p className="discovery-tools-state-copy">Unable to load awesome list data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="discovery-tools-page discovery-tools-page--advanced">
      <SEOHead title={advancedSeoTitle} description={advancedSeoDescription} />

      {/* Header */}
      <div className="discovery-tools-masthead">
        <div className="discovery-tools-title-row">
          <Sparkles className="discovery-tools-masthead-icon" aria-hidden="true" />
          <h1 className="display-h discovery-tools-page-title">Advanced Features</h1>
        </div>
        <p className="discovery-tools-page-lede">
          Discover powerful tools for exploring, analyzing, and sharing awesome list data
        </p>
      </div>

      {/* Feature Showcase */}
      {/* P6 — active tab gets bg + bottom border per ref 03 */}
      {/* BUG-036 (run14): the 4-col grid only engages at lg — at 768px the
          equal columns hard-truncated "AI Recommendations"; below lg the list
          stays a scrollable flex row with full-width labels. */}
      <Tabs value={tab} onValueChange={handleTabChange} className="discovery-tools-tabs-shell">
        {/* Run16 BUG-066: at 375px the 4th tab ("AI Recommendations") was
            clipped off-screen with no scroll cue — wrap the tab bar on small
            screens so every tab stays visible. */}
        {/* BUG-005 (audit2): sm:flex-nowrap + overflow-x-auto clipped the 4th
            tab at squeezed widths with no visible scroll affordance — below
            lg the list now WRAPS so every tab stays visible and tappable. */}
        <TabsList className="discovery-tools-tabs-list">
          <TabsTrigger
            value="explorer"
            className="discovery-tools-tab"
          >
            <Compass className="h-4 w-4" />
            Explorer
          </TabsTrigger>
          <TabsTrigger
            value="metrics"
            className="discovery-tools-tab"
          >
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger
            value="export"
            className="discovery-tools-tab"
          >
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="discovery-tools-tab"
          >
            <Lightbulb className="h-4 w-4" />
            <span>AI Recommendations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="discovery-tools-tab-panel">
          <Card className="discovery-tools-panel">
            <CardHeader className="discovery-tools-panel-header">
              <CardTitle className="discovery-tools-panel-title">
                <Compass className="h-5 w-5" />
                Interactive Category Explorer
              </CardTitle>
              <CardDescription className="discovery-tools-panel-description">
                Advanced search and filtering capabilities with real-time category statistics and interactive exploration
              </CardDescription>
            </CardHeader>
            <CardContent className="discovery-tools-panel-content">
              <div className="discovery-tools-stat-grid">
                <Card className="discovery-tools-stat-card">
                  <CardContent className="discovery-tools-stat-card-content">
                    <div className="discovery-tools-stat-value discovery-tools-stat-value--primary">{categories.length}</div>
                    <div className="eyebrow discovery-tools-stat-label">Categories</div>
                  </CardContent>
                </Card>
                <Card className="discovery-tools-stat-card">
                  <CardContent className="discovery-tools-stat-card-content">
                    <div className="discovery-tools-stat-value discovery-tools-stat-value--secondary">{resources.length.toLocaleString()}</div>
                    <div className="eyebrow discovery-tools-stat-label">Resources</div>
                  </CardContent>
                </Card>
                <Card className="discovery-tools-stat-card">
                  <CardContent className="discovery-tools-stat-card-content">
                    <div className="discovery-tools-stat-value discovery-tools-stat-value--tertiary">
                      {new Set(resources.flatMap((r) => r.metadata?.tags ?? r.tags ?? [])).size}
                    </div>
                    <div className="eyebrow discovery-tools-stat-label">Unique Tags</div>
                  </CardContent>
                </Card>
                <Card className="discovery-tools-stat-card">
                  <CardContent className="discovery-tools-stat-card-content">
                    <div className="discovery-tools-stat-value discovery-tools-stat-value--quaternary">
                      {categories.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0)}
                    </div>
                    <div className="eyebrow discovery-tools-stat-label">Subcategories</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <CategoryExplorer
            categories={categories}
            resources={resources}
            className="discovery-tools-owned-panel discovery-tools-category-explorer"
          />
        </TabsContent>

        <TabsContent value="metrics" className="discovery-tools-tab-panel">
          {/* BUG-049 (run13): the old "Activity High / Quality A+ / Completeness
              95%" cards were hard-coded vanity numbers with no data source —
              removed. CommunityMetrics below computes real counts from the
              live catalog. */}
          <CommunityMetrics 
            resources={resources}
            categories={categories}
            subTab={metricsSubTab}
            onSubTabChange={handleMetricsSubChange}
            className="discovery-tools-owned-panel discovery-tools-community-metrics"
          />
        </TabsContent>

        <TabsContent value="export" className="discovery-tools-tab-panel">
          <Card className="discovery-tools-panel">
            <CardHeader className="discovery-tools-panel-header">
              <CardTitle className="discovery-tools-panel-title">
                <Download className="h-5 w-5" />
                Multi-Format Export System
              </CardTitle>
              <CardDescription className="discovery-tools-panel-description">
                Export your curated lists in multiple formats including Markdown, JSON, CSV, YAML, HTML, and PDF with advanced filtering options
              </CardDescription>
            </CardHeader>
            <CardContent className="discovery-tools-panel-content">
              {/* BUG-026 (run13): format cards are now buttons that select the
                  matching format in the export panel below. */}
              <div className="discovery-tools-format-grid">
                {([
                  { format: "Markdown", value: "markdown", icon: FileText, desc: "GitHub-ready" },
                  { format: "JSON", value: "json", icon: Code, desc: "API-friendly" },
                  { format: "CSV", value: "csv", icon: Database, desc: "Spreadsheet" },
                  { format: "PDF", value: "pdf", icon: File, desc: "Professional" },
                  { format: "HTML", value: "html", icon: BookOpen, desc: "Web-ready" },
                  { format: "YAML", value: "yaml", icon: Settings, desc: "Config files" }
                ] as const).map(item => {
                  const FormatIcon = item.icon;
                  return (
                    <button
                      key={item.format}
                      type="button"
                      onClick={() => setExportFormat(item.value)}
                      aria-pressed={exportFormat === item.value}
                      aria-label={`Select ${item.format} export format`}
                      className="discovery-tools-format-option"
                      data-testid={`button-format-${item.value}`}
                    >
                      <Card
                        className={
                          exportFormat === item.value
                            ? "discovery-tools-format-card discovery-tools-format-card--selected"
                            : "discovery-tools-format-card"
                        }
                      >
                        <CardContent className="discovery-tools-format-card-content">
                          <FormatIcon className="mx-auto mb-1 h-6 w-6" aria-hidden="true" />
                          <div className="font-medium text-sm">{item.format}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </CardContent>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {awesomeList ? (
            <ExportTools
              awesomeList={awesomeList}
              formatOverride={exportFormat}
              className="discovery-tools-owned-panel discovery-tools-export-tools"
            />
          ) : null}
        </TabsContent>

        <TabsContent value="recommendations" className="discovery-tools-tab-panel">
          <div className="discovery-tools-owned-panel discovery-tools-ai-panel">
            <AIRecommendationsPanel />
          </div>
        </TabsContent>
      </Tabs>

      {/* Call to Action */}
      <Card className="discovery-tools-panel discovery-tools-cta-panel">
        <CardContent className="discovery-tools-cta-content">
          <h3 className="discovery-tools-cta-title">Explore More Features</h3>
          <p className="discovery-tools-cta-copy">
            These advanced features help you discover, analyze, and share awesome list data more effectively
          </p>
          <div className="discovery-tools-cta-actions">
            {/* BUG-011 (run19) linked this to /search because an empty query
                used to browse the full catalog; audit2 BUG-019 made empty
                /search an explicit "enter a search term" prompt, so the
                honest browse-everything destination is the categories hub. */}
            <Link
              href="/categories"
              className="discovery-tools-cta-primary"
              data-testid="link-browse-all-resources"
            >
              Browse All Resources
            </Link>
            <Link
              href={categories[0]?.slug ? `/category/${categories[0].slug}` : "/"}
              className="discovery-tools-cta-secondary"
            >
              Explore Categories
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
