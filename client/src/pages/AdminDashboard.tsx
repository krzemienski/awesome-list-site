import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Link, Sparkles, Brain, ListOrdered } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Link as WLink, useRoute } from "wouter";
import AdminStats from "@/components/admin/AdminStats";
import SEOHead from "@/components/layout/SEOHead";
import ExportTab from "@/components/admin/ExportTab";
import DatabaseTab from "@/components/admin/DatabaseTab";
import UsersTab from "@/components/admin/UsersTab";
import AuditTab from "@/components/admin/AuditTab";
import PendingResources from "@/components/admin/PendingResources";
import PendingEdits from "@/components/admin/PendingEdits";
import BatchEnrichmentPanel from "@/components/admin/BatchEnrichmentPanel";
import GitHubSyncPanel from "@/components/admin/GitHubSyncPanel";
import LinkHealthDashboard from "@/components/admin/LinkHealthDashboard";
import ResourceManager from "@/components/admin/ResourceManager";
import CategoryManager from "@/components/admin/CategoryManager";
import SubcategoryManager from "@/components/admin/SubcategoryManager";
import SubSubcategoryManager from "@/components/admin/SubSubcategoryManager";
import ResearcherTab from "@/components/admin/ResearcherTab";
import JourneyStepsManager from "@/components/admin/JourneyStepsManager";
import ErrorBoundary from "@/components/ErrorBoundary";
// Run3 audit R3-02: the 15 valid tab ids — used to validate /admin/:section
// deep-links (unknown sections fall back to the default tab).
const ADMIN_TAB_IDS = [
  "approvals", "edits", "enrichment", "researcher", "export", "database",
  "resources", "categories", "subcategories", "subsubcategories", "journeys",
  "users", "github", "linkhealth", "audit",
] as const;

// Run16 BUG-085: human-guessable slug aliases → canonical tab ids.
const ADMIN_TAB_ALIASES: Record<string, string> = {
  "link-health": "linkhealth",
  "sub-subcategories": "subsubcategories",
  "sub-subcats": "subsubcategories",
  "github-sync": "github",
};

// Run16 BUG-034/074/085: normalize any inbound tab slug (hash, ?tab= query
// param, or /admin/:section) to a valid tab id, or null if unknown.
function normalizeTab(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const slug = raw.replace(/^#/, "").toLowerCase();
  const mapped = ADMIN_TAB_ALIASES[slug] ?? slug;
  return (ADMIN_TAB_IDS as readonly string[]).includes(mapped) ? mapped : null;
}

function tabFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  const fromHash = normalizeTab(window.location.hash);
  if (fromHash) return fromHash;
  // BUG-074: /admin?tab=export style deep links.
  const fromQuery = normalizeTab(new URLSearchParams(window.location.search).get("tab"));
  return fromQuery;
}

export default function AdminDashboard() {
  const { stats, isLoading, error } = useAdmin();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const isAdmin = Boolean(user && (user as { role?: string }).role === "admin");

  // R3-02: /admin/:section deep-links (e.g. /admin/users) select that tab.
  const [, sectionParams] = useRoute("/admin/:section");
  const sectionTab =
    sectionParams && (ADMIN_TAB_IDS as readonly string[]).includes(sectionParams.section)
      ? sectionParams.section
      : null;

  const [activeTab, setActiveTab] = useState(() => {
    if (sectionTab) return sectionTab;
    return tabFromWindow() ?? "approvals";
  });

  // Keep the tab in sync if the user navigates between /admin/:section links.
  useEffect(() => {
    if (sectionTab) setActiveTab(sectionTab);
  }, [sectionTab]);

  // Run16 BUG-034/086: keep the active tab in sync with manual hash edits
  // (hashchange) and Back/Forward (popstate). Tab clicks pushState below, so
  // Back walks the tab trail instead of exiting the dashboard.
  useEffect(() => {
    const syncFromUrl = () => {
      const tab = tabFromWindow();
      if (tab) setActiveTab(tab);
    };
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Tab clicks always normalize back to /admin#tab (tabs stay on /admin);
    // the /admin/:section path form is only an inbound deep-link alias.
    // BUG-086: pushState (not replaceState) so Back returns to the prior tab.
    if (window.location.hash !== `#${value}`) {
      window.history.pushState(null, "", `/admin#${value}`);
    }
  };

  if (!authLoading && (!isAuthenticated || !isAdmin)) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display font-medium tracking-tight text-2xl sm:text-3xl text-[var(--text)] mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[var(--accent)]" />
          Admin Dashboard
        </h1>
        <div className="alert warn border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4 rounded-lg" role="alert">
          <p className="text-sm text-[var(--text)] mb-3">
            You must be signed in as an administrator to view this page.
          </p>
          <WLink href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline" data-testid="link-admin-login">
            Sign in to continue →
          </WLink>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <h1 className="sr-only">Admin Dashboard</h1>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
          <p className="text-[var(--text-2)]">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 text-[var(--accent)] mx-auto mb-4" />
          <p className="text-[var(--accent)]">Error loading admin dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-full overflow-x-hidden">
      <SEOHead
        title="Admin"
        description="Awesome Video admin panel."
        noindex
      />
      <div className="mb-8 space-y-3">
        <div className="eyebrow flex items-center gap-3">
          <span aria-hidden="true" className="text-[var(--accent)]">──</span>
          <span>Admin</span>
          <span aria-hidden="true" className="text-[var(--text-2)]">·</span>
          <span>Control Surface</span>
        </div>
        <h1 className="font-display font-medium tracking-tight text-3xl sm:text-4xl text-[var(--text)] flex items-center gap-3">
          <Shield className="h-7 w-7 text-[var(--accent)]" />
          <span><em className="not-italic font-display italic text-[var(--accent)]">Admin</em> Dashboard</span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-2)]">Manage resources, users, and system configuration.</p>
      </div>

      {/* R4-L17: stat cards jump straight to their admin tab. */}
      <AdminStats stats={stats} isLoading={isLoading} onNavigate={handleTabChange} />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        {/* BUG-020 (run14): the 15-tab strip used to overflow-scroll with no
            visible affordance — off-screen tabs were undiscoverable at 1440px
            AND 375px. Tabs now wrap onto extra rows so every tab is always
            visible; the scroller class is kept only as a safety net. */}
        <div className="w-full pb-2 admin-tab-scroller">
          <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
            <TabsTrigger value="approvals" className="whitespace-nowrap" data-testid="tab-approvals">
              Approvals {stats?.pendingApprovals ? <Badge variant="accent" className="ml-2">{stats.pendingApprovals}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="edits" className="whitespace-nowrap" data-testid="tab-edits">
              Edits
            </TabsTrigger>
            <TabsTrigger value="enrichment" className="whitespace-nowrap" data-testid="tab-enrichment">
              <Sparkles className="h-4 w-4 mr-1" />
              Enrichment
            </TabsTrigger>
            <TabsTrigger value="researcher" className="whitespace-nowrap" data-testid="tab-researcher">
              <Brain className="h-4 w-4 mr-1" />
              Researcher
            </TabsTrigger>
            <TabsTrigger value="export" className="whitespace-nowrap" data-testid="tab-export">Export</TabsTrigger>
            <TabsTrigger value="database" className="whitespace-nowrap" data-testid="tab-database">Database</TabsTrigger>
            <TabsTrigger value="resources" className="whitespace-nowrap" data-testid="tab-resources">Resources</TabsTrigger>
            <TabsTrigger value="categories" className="whitespace-nowrap" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="subcategories" className="whitespace-nowrap" data-testid="tab-subcategories">Subcategories</TabsTrigger>
            <TabsTrigger value="subsubcategories" className="whitespace-nowrap" data-testid="tab-subsubcategories">Sub-Subcats</TabsTrigger>
            <TabsTrigger value="journeys" className="whitespace-nowrap" data-testid="tab-journeys">
              <ListOrdered className="h-4 w-4 mr-1" />
              Journeys
            </TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="github" className="whitespace-nowrap" data-testid="tab-github">GitHub</TabsTrigger>
            <TabsTrigger value="linkhealth" className="whitespace-nowrap" data-testid="tab-linkhealth">
              <Link className="h-4 w-4 mr-1" />
              Link Health
            </TabsTrigger>
            <TabsTrigger value="audit" className="whitespace-nowrap" data-testid="tab-audit">Audit</TabsTrigger>
          </TabsList>
        </div>

        {/* R2-L13: each tab body sits in its own ErrorBoundary so a render
            crash in one panel can't blank the entire admin dashboard. */}
        <TabsContent value="approvals" data-testid="content-approvals">
          <ErrorBoundary label="Approvals tab"><PendingResources /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="edits" data-testid="content-edits">
          <ErrorBoundary label="Edits tab"><PendingEdits /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="enrichment" data-testid="content-enrichment">
          <ErrorBoundary label="Enrichment tab"><BatchEnrichmentPanel /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="researcher">
          <ErrorBoundary label="Researcher tab"><ResearcherTab /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="export">
          <ErrorBoundary label="Export tab"><ExportTab /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="database">
          <ErrorBoundary label="Database tab"><DatabaseTab stats={stats} /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="resources">
          <ErrorBoundary label="Resources tab"><ResourceManager /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="categories" data-testid="content-categories">
          <ErrorBoundary label="Categories tab"><CategoryManager /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="subcategories" data-testid="content-subcategories">
          <ErrorBoundary label="Subcategories tab"><SubcategoryManager /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="subsubcategories" data-testid="content-subsubcategories">
          <ErrorBoundary label="Sub-Subcategories tab"><SubSubcategoryManager /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="journeys" data-testid="content-journeys">
          <ErrorBoundary label="Journeys tab"><JourneyStepsManager /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="users">
          <ErrorBoundary label="Users tab"><UsersTab /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="github">
          <ErrorBoundary label="GitHub tab"><GitHubSyncPanel /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="linkhealth">
          <ErrorBoundary label="Link Health tab"><LinkHealthDashboard /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="audit">
          <ErrorBoundary label="Audit tab"><AuditTab /></ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
