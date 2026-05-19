import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Link, Sparkles, Brain } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import AdminStats from "@/components/admin/AdminStats";
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
export default function AdminDashboard() {
  const { stats, isLoading, error } = useAdmin();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash) return hash;
    }
    return "approvals";
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.history.replaceState(null, "", `#${value}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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

      <AdminStats stats={stats} isLoading={isLoading} />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-max">
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
            <TabsTrigger value="researcher" className="whitespace-nowrap">
              <Brain className="h-4 w-4 mr-1" />
              Researcher
            </TabsTrigger>
            <TabsTrigger value="export" className="whitespace-nowrap">Export</TabsTrigger>
            <TabsTrigger value="database" className="whitespace-nowrap">Database</TabsTrigger>
            <TabsTrigger value="resources" className="whitespace-nowrap">Resources</TabsTrigger>
            <TabsTrigger value="categories" className="whitespace-nowrap" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="subcategories" className="whitespace-nowrap" data-testid="tab-subcategories">Subcategories</TabsTrigger>
            <TabsTrigger value="subsubcategories" className="whitespace-nowrap" data-testid="tab-subsubcategories">Sub-Subcats</TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap">Users</TabsTrigger>
            <TabsTrigger value="github" className="whitespace-nowrap">GitHub</TabsTrigger>
            <TabsTrigger value="linkhealth" className="whitespace-nowrap">
              <Link className="h-4 w-4 mr-1" />
              Link Health
            </TabsTrigger>
            <TabsTrigger value="audit" className="whitespace-nowrap">Audit</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="approvals" data-testid="content-approvals">
          <PendingResources />
        </TabsContent>

        <TabsContent value="edits" data-testid="content-edits">
          <PendingEdits />
        </TabsContent>

        <TabsContent value="enrichment" data-testid="content-enrichment">
          <BatchEnrichmentPanel />
        </TabsContent>

        <TabsContent value="researcher">
          <ResearcherTab />
        </TabsContent>

        <TabsContent value="export">
          <ExportTab />
        </TabsContent>

        <TabsContent value="database">
          <DatabaseTab stats={stats} />
        </TabsContent>

        <TabsContent value="resources">
          <ResourceManager />
        </TabsContent>

        <TabsContent value="categories" data-testid="content-categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="subcategories" data-testid="content-subcategories">
          <SubcategoryManager />
        </TabsContent>

        <TabsContent value="subsubcategories" data-testid="content-subsubcategories">
          <SubSubcategoryManager />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="github">
          <GitHubSyncPanel />
        </TabsContent>

        <TabsContent value="linkhealth">
          <LinkHealthDashboard />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
