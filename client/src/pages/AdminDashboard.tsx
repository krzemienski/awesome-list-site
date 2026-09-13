import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Activity, Sparkles, Zap, List, ArrowRight, Database, Folder, Users, LayoutGrid, Plus, Settings } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Link as WLink, useRoute } from "wouter";
import AdminStats from "@/components/admin/AdminStats";
import AdminOverview from "@/components/admin/AdminOverview";
import { Button } from "@/components/ui/button";
import "@/components/admin/admin-canonical.css";
import "@/styles/pages/admin-shell.css";
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
import DigestQueueHealth from "@/components/admin/DigestQueueHealth";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
// Run3 audit R3-02: valid tab ids — used to validate /admin/:section
// deep-links (unknown sections fall back to the default tab).
import { ApiError } from "@/lib/queryClient";
const ADMIN_TAB_IDS = [
  "overview", "approvals", "edits", "enrichment", "researcher", "export", "database",
  "resources", "categories", "subcategories", "subsubcategories", "journeys",
   "users", "github", "linkhealth", "digests", "audit", "research",
] as const;
const CANONICAL_TABS = [
  ["overview", "Overview", LayoutGrid], ["approvals", "Approvals", Shield],
  ["edits", "Edits", List], ["enrichment", "Enrichment", Sparkles],
  ["researcher", "Researcher", Zap], ["export", "Export", ArrowRight],
  ["database", "Database", Database], ["resources", "Resources", Folder],
  ["categories", "Categories", List], ["subcategories", "Subcategories", List],
  ["users", "Users", Users], ["github", "GitHub", Settings],
  ["linkhealth", "Link Health", Activity], ["audit", "Audit", List],
  ["research", "Research", Sparkles],
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
  // BUG-043 (run25): normalizeTab (not raw includes) so aliases like
  // /admin/link-health resolve, and a truly unknown section renders a 404
  // page below instead of silently falling back to the default tab.
  const [, sectionParams] = useRoute("/admin/:section");
  const sectionTab = normalizeTab(sectionParams?.section);
  const unknownSection = Boolean(sectionParams?.section) && !sectionTab;

  const [activeTab, setActiveTab] = useState(() => {
    if (sectionTab) return sectionTab;
    return tabFromWindow() ?? "overview";
  });
  const visibleTab = ({ subsubcategories: "subcategories", journeys: "research", digests: "github" } as Record<string, string>)[activeTab] ?? activeTab;

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
      if (tab) {
        setActiveTab(tab);
      } else if (window.location.pathname === "/admin") {
        // BUG-008 (run18): Back/Forward that strips the #hash must return to
        // the default tab so the URL (/admin) and the visible tab stay in sync
        // instead of leaving a stale active tab (e.g. Resources) on bare /admin.
        setActiveTab("overview");
      }
    };
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  const handleNewEntry = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("create", "1");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    handleTabChange("resources");
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Tab clicks always normalize back to /admin#tab (tabs stay on /admin);
    // the /admin/:section path form is only an inbound deep-link alias.
    // BUG-086: pushState (not replaceState) so Back returns to the prior tab.
    // BUG-007 (run18): preserve the current query string (e.g. the
    // ?status=rejected the "N rejected" stat deep-link sets) so ResourceManager
    // can still read it on mount — the previous /admin#tab pushState dropped it,
    // which is why the rejected stat opened Resources with "All Status".
    if (window.location.hash !== `#${value}`) {
      window.history.pushState(null, "", `/admin${window.location.search}#${value}`);
    }
  };

  // BUG-043 (run25): an unknown /admin/<section> is a 404, full stop — it
  // must never claim "you must be signed in" (misleading when you ARE signed
  // in) nor silently render the default tab as if the URL were valid.
  if (unknownSection) {
    return <NotFound />;
  }

  // BUG-008 (run19): distinguish "no session" from "session without the
  // admin role" — a signed-in non-admin used to be told to "sign in", a
  // contradictory demand while their avatar was visible in the header.
  if (!authLoading && (!isAuthenticated || !isAdmin)) {
    const signedInNonAdmin = isAuthenticated && !isAdmin;
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="display-h text-2xl sm:text-3xl text-[var(--text)] mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[var(--accent)]" />
          Admin Dashboard
        </h1>
        <div className="alert warn border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4 rounded-lg" role="alert">
          {signedInNonAdmin ? (
            <>
              <p className="text-sm text-[var(--text)] mb-3" data-testid="text-admin-forbidden">
                You don&apos;t have permission to view this page. It&apos;s restricted to
                administrators — your account is signed in, but doesn&apos;t have the
                admin role.
              </p>
              <WLink href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline" data-testid="link-admin-home">
                Back to home →
              </WLink>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--text)] mb-3">
                You must be signed in as an administrator to view this page.
              </p>
              <WLink href="/sign-in" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline" data-testid="link-admin-login">
                Sign in to continue →
              </WLink>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <h1 className="sr-only">Admin Dashboard</h1>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
          <p className="text-[var(--text-2)]">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // BUG-018 (run25): a 401 here means the session expired mid-use. The
    // global 401 handler flips the cached auth state (AdminGuard then takes
    // over with its sign-in prompt), but render an explicit re-login path
    // for the frame where this branch is still mounted — never a dead end.
    const sessionExpired = error instanceof ApiError && error.status === 401;
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <Shield className="h-12 w-12 text-[var(--accent)] mx-auto mb-4" />
          {sessionExpired ? (
            <>
              <p className="text-[var(--text)] mb-3" data-testid="text-session-expired">
                Your session has expired. Sign in again to continue.
              </p>
              <WLink
                href={`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline"
                data-testid="link-session-expired-login"
              >
                Sign in to continue →
              </WLink>
            </>
          ) : (
            <p className="text-[var(--accent)]">Error loading admin dashboard</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <SEOHead
        title="Admin"
        description="Awesome Video admin panel."
        noindex
      />
      <div className="admin-dashboard__masthead">
        <div>
        <div className="admin-dashboard__eyebrow-slot">
        <div className="eyebrow">
          <span aria-hidden="true" className="live-dot" />
          <span>Admin console · {user?.name ?? "Administrator"}</span>
        </div>
        </div>
        <h1 className="display-h">
          Operations <em>dashboard</em>
        </h1>
        <p>Manage the {(stats?.totalPublic ?? stats?.resources ?? 0).toLocaleString()} resources, jobs, and contributors that keep the index alive.</p>
        </div>
        <div className="admin-dashboard__actions">
          <Button asChild variant="outline" className="btn ghost"><WLink href="/settings/theme"><Settings className="h-4 w-4" /> Settings</WLink></Button>
          <Button className="btn primary" onClick={handleNewEntry}><Plus className="h-4 w-4" /> New entry</Button>
        </div>
      </div>

      {/* NB-020 (run18): `activeTab` is always one of the TabsTrigger values
          (normalizeTab yields a valid id or the "approvals" default), so Radix's
          roving tabindex always makes exactly the active trigger tabbable
          (tabindex=0) and arrow keys move focus between tabs — never all -1. */}
      <Tabs value={visibleTab} onValueChange={handleTabChange}>
        {/* Canonical single-row strip. Radix keeps off-screen triggers
            keyboard reachable; extra tools live in the related tab panels. */}
        <div className="w-full pb-2 admin-tab-scroller">
          {/* F017: keep every trigger a comfortable ≥40px touch target at the
              usage site (the global ui/tabs default is h-9/36px). */}
          <TabsList className="admin-dashboard__tabs flex flex-wrap h-auto w-full justify-start gap-1">
            {CANONICAL_TABS.map(([id, label, Icon]) => (
              <TabsTrigger
                key={id}
                value={id}
                data-testid={`tab-${id}`}
                onClick={() => {
                  // Radix suppresses same-value changes. A folded subsection
                  // still needs to return to its already-selected parent.
                  if (visibleTab === id && activeTab !== id) handleTabChange(id);
                }}
                onKeyDown={(event) => {
                  if (visibleTab === id && activeTab !== id &&
                    (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    handleTabChange(id);
                  }
                }}
              >
                <Icon aria-hidden="true" size={12} />{label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* R2-L13: each tab body sits in its own ErrorBoundary so a render
            crash in one panel can't blank the entire admin dashboard. */}
        <TabsContent value="overview" data-testid="content-overview">
          <AdminStats stats={stats} isLoading={isLoading} onNavigate={handleTabChange} />
          <ErrorBoundary label="Overview tab"><AdminOverview stats={stats} onNavigate={handleTabChange} /></ErrorBoundary>
        </TabsContent>

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
          <Button variant="ghost" data-testid="tab-subsubcategories" onClick={() => handleTabChange("subsubcategories")}>Sub-Subcats</Button>
          {activeTab === "subsubcategories"
            ? <div data-testid="content-subsubcategories"><ErrorBoundary label="Sub-Subcategories tab"><SubSubcategoryManager /></ErrorBoundary></div>
            : <ErrorBoundary label="Subcategories tab"><SubcategoryManager /></ErrorBoundary>}
        </TabsContent>

        <TabsContent value="users">
          <ErrorBoundary label="Users tab"><UsersTab /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="github">
          <Button variant="ghost" data-testid="tab-digests" onClick={() => handleTabChange("digests")}>Digests</Button>
          {activeTab === "digests"
            ? <div data-testid="content-digests"><ErrorBoundary label="Digests tab"><DigestQueueHealth /></ErrorBoundary></div>
            : <ErrorBoundary label="GitHub tab"><GitHubSyncPanel /></ErrorBoundary>}
        </TabsContent>

        <TabsContent value="linkhealth">
          <ErrorBoundary label="Link Health tab"><LinkHealthDashboard /></ErrorBoundary>
        </TabsContent>

        <TabsContent value="audit">
          <ErrorBoundary label="Audit tab"><AuditTab /></ErrorBoundary>
        </TabsContent>
        <TabsContent value="research" data-testid="content-research">
          <Button variant="ghost" data-testid="tab-journeys" onClick={() => handleTabChange("journeys")}>Journeys</Button>
          {activeTab === "journeys"
            ? <div data-testid="content-journeys"><ErrorBoundary label="Journeys tab"><JourneyStepsManager /></ErrorBoundary></div>
            : <ErrorBoundary label="Research tab"><ResearcherTab /></ErrorBoundary>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
