import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Link, Sparkles } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminStats from "@/components/admin/AdminStats";
import ExportTab from "@/components/admin/ExportTab";
import DatabaseTab from "@/components/admin/DatabaseTab";
import ValidationTab from "@/components/admin/ValidationTab";
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
import type { ValidationStatus } from "@/components/admin/types/validation";

export default function AdminDashboard() {
  const { stats, isLoading, error } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch validation status
  const { data: validationStatus } = useQuery<ValidationStatus>({
    queryKey: ['/api/admin/validation-status'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Validate awesome list
  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/validate', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Awesome Video',
          description: 'A curated list of awesome video streaming resources, tools, frameworks, and learning materials.',
          includeContributing: true,
          includeLicense: true
        })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-status'] });
      toast({
        title: "Validation Complete",
        description: "Awesome list validation has been completed.",
      });
    },
    onError: () => {
      toast({
        title: "Validation Failed",
        description: "Failed to validate awesome list. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Check links
  const checkLinksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/check-links', {
        method: 'POST',
        body: JSON.stringify({
          timeout: 10000,
          concurrent: 5,
          retryCount: 1
        })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-status'] });
      toast({
        title: "Link Check Complete",
        description: "All resource links have been checked.",
      });
    },
    onError: () => {
      toast({
        title: "Link Check Failed",
        description: "Failed to check links. Please try again.",
        variant: "destructive",
      });
    }
  });

  // AdminGuard already verified role, but show loading for stats
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error if stats failed to load
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500">Error loading admin dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary font-mono flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Manage resources, users, and system configuration</p>
      </div>

      {/* Statistics Cards */}
      <AdminStats stats={stats} isLoading={isLoading} />

      {/* Admin Tabs */}
      <Tabs defaultValue="approvals" className="space-y-4">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex h-10 items-center gap-1 bg-card border border-primary/20 p-1">
            <TabsTrigger value="approvals" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap" data-testid="tab-approvals">
              Approvals {stats?.pendingApprovals ? <Badge variant="destructive" className="ml-2">{stats.pendingApprovals}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="edits" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap" data-testid="tab-edits">
              Edits
            </TabsTrigger>
            <TabsTrigger value="enrichment" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap" data-testid="tab-enrichment">
              <Sparkles className="h-4 w-4 mr-1" />
              Enrichment
            </TabsTrigger>
            <TabsTrigger value="export" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Export
            </TabsTrigger>
            <TabsTrigger value="database" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Database
            </TabsTrigger>
            <TabsTrigger value="validation" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Validation
            </TabsTrigger>
            <TabsTrigger value="resources" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Resources
            </TabsTrigger>
            <TabsTrigger value="categories" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap" data-testid="tab-categories">
              Categories
            </TabsTrigger>
            <TabsTrigger value="subcategories" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap" data-testid="tab-subcategories">
              Subcategories
            </TabsTrigger>
            <TabsTrigger value="subsubcategories" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap" data-testid="tab-subsubcategories">
              Sub-Subcats
            </TabsTrigger>
            <TabsTrigger value="users" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Users
            </TabsTrigger>
            <TabsTrigger value="github" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              GitHub
            </TabsTrigger>
            <TabsTrigger value="linkhealth" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              <Link className="h-4 w-4 mr-1" />
              Link Health
            </TabsTrigger>
            <TabsTrigger value="audit" className="px-3 py-1.5 text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary whitespace-nowrap">
              Audit
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Approvals Tab */}
        <TabsContent value="approvals" data-testid="content-approvals">
          <PendingResources />
        </TabsContent>

        {/* Edits Tab */}
        <TabsContent value="edits" data-testid="content-edits">
          <PendingEdits />
        </TabsContent>

        {/* Enrichment Tab */}
        <TabsContent value="enrichment" data-testid="content-enrichment">
          <BatchEnrichmentPanel />
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export">
          <ExportTab validationStatus={validationStatus} />
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database">
          <DatabaseTab stats={stats} />
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation">
          <ValidationTab
            validationStatus={validationStatus || null}
            validateMutation={validateMutation}
            checkLinksMutation={checkLinksMutation}
          />
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