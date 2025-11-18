import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Users, 
  GitBranch, 
  FileText, 
  Activity, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Link,
  Clock,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  Database
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    rule: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    line: number;
    rule: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  stats: {
    totalLines: number;
    totalResources: number;
    totalCategories: number;
  };
  report?: string;
}

interface LinkCheckResult {
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  redirects: number;
  errors: number;
  summary: {
    byStatus: { [key: string]: number };
    averageResponseTime: number;
  };
  report?: string;
  brokenResources?: Array<{
    url: string;
    status: number;
    statusText: string;
    resourceTitle?: string;
    error?: string;
  }>;
}

interface ValidationStatus {
  awesomeLint?: ValidationResult;
  linkCheck?: LinkCheckResult;
  lastUpdated?: string;
}

export default function AdminDashboard() {
  const { stats, isLoading, error } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isExporting, setIsExporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  
  // Fetch validation status
  const { data: validationStatus } = useQuery<ValidationStatus>({
    queryKey: ['/api/admin/validation-status'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Export awesome list
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Awesome Video',
          description: 'A curated list of awesome video streaming resources, tools, frameworks, and learning materials.',
          includeContributing: true,
          includeLicense: true
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'awesome-list.md';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Awesome list markdown file has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export awesome list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

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

  // Seed database
  const seedDatabaseMutation = useMutation({
    mutationFn: async (options: { clearExisting?: boolean } = {}) => {
      const response = await apiRequest('/api/admin/seed-database', {
        method: 'POST',
        body: JSON.stringify(options)
      });
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Database Seeded Successfully",
        description: `Added ${data.counts.resourcesInserted} resources, ${data.counts.categoriesInserted} categories, ${data.counts.subcategoriesInserted} subcategories, and ${data.counts.subSubcategoriesInserted} sub-subcategories.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Database Seeding Failed",
        description: error.message || "Failed to seed database. Please try again.",
        variant: "destructive",
      });
    }
  });

  // AdminGuard already verified role, but show loading for stats
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
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
        <h1 className="text-3xl font-bold text-pink-500 font-mono flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Manage resources, users, and system configuration</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-pink-500/20 bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-500 font-mono">
              {isLoading ? "..." : stats?.users || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20 bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-500 font-mono">
              {isLoading ? "..." : stats?.resources || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-pink-500/20 bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Learning Journeys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-500 font-mono">
              {isLoading ? "..." : stats?.journeys || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20 bg-black">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-500 font-mono">
              {isLoading ? "..." : stats?.pendingApprovals || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full lg:w-auto lg:inline-grid bg-black border border-pink-500/20">
          <TabsTrigger value="export" className="data-[state=active]:bg-pink-500/20">
            Export
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:bg-pink-500/20">
            Database
          </TabsTrigger>
          <TabsTrigger value="validation" className="data-[state=active]:bg-pink-500/20">
            Validation
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-pink-500/20">
            Resources
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-pink-500/20">
            Users
          </TabsTrigger>
          <TabsTrigger value="github" className="data-[state=active]:bg-pink-500/20">
            GitHub
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-pink-500/20">
            Audit
          </TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export">
          <div className="space-y-4">
            <Card className="border-pink-500/20 bg-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Awesome List
                </CardTitle>
                <CardDescription>
                  Generate and download the awesome list in markdown format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-pink-500 hover:bg-pink-600"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export Markdown
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-gray-400">
                    Generates awesome-lint compliant markdown file
                  </span>
                </div>
                
                {validationStatus?.lastUpdated && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    Last exported: {new Date(validationStatus.lastUpdated).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-cyan-500/20 bg-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => validateMutation.mutate()}
                    disabled={validateMutation.isPending}
                    variant="outline"
                    className="justify-start"
                  >
                    {validateMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <FileCheck className="mr-2 h-4 w-4" />
                        Run Validation
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => checkLinksMutation.mutate()}
                    disabled={checkLinksMutation.isPending}
                    variant="outline"
                    className="justify-start"
                  >
                    {checkLinksMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Checking Links...
                      </>
                    ) : (
                      <>
                        <Link className="mr-2 h-4 w-4" />
                        Check All Links
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database">
          <div className="space-y-4">
            <Card className="border-cyan-500/20 bg-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Management
                </CardTitle>
                <CardDescription>
                  Seed the database with 2,011 video resources from awesome-video JSON
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-cyan-500/20 bg-cyan-500/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Database Seeding</AlertTitle>
                  <AlertDescription>
                    This operation will populate the PostgreSQL database with all categories, subcategories, 
                    sub-subcategories, and resources from the awesome-video JSON source. Resources already 
                    in the database will be skipped.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={() => seedDatabaseMutation.mutate({ clearExisting: false })}
                      disabled={seedDatabaseMutation.isPending}
                      className="bg-cyan-500 hover:bg-cyan-600"
                      data-testid="button-seed-database"
                    >
                      {seedDatabaseMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Seeding Database...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" />
                          Seed Database
                        </>
                      )}
                    </Button>
                    <span className="text-sm text-gray-400">
                      Add new resources without removing existing data
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all existing data and re-seed? This action cannot be undone.')) {
                          seedDatabaseMutation.mutate({ clearExisting: true });
                        }
                      }}
                      disabled={seedDatabaseMutation.isPending}
                      variant="destructive"
                      data-testid="button-clear-reseed"
                    >
                      {seedDatabaseMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Clearing & Reseeding...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Clear & Re-seed
                        </>
                      )}
                    </Button>
                    <span className="text-sm text-gray-400">
                      Remove all data and re-populate (use with caution)
                    </span>
                  </div>
                </div>

                {seedDatabaseMutation.isSuccess && seedDatabaseMutation.data && (
                  <Alert className="border-green-500/20 bg-green-500/5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Seeding Completed Successfully</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Categories inserted:</span>
                          <span className="font-mono font-semibold text-cyan-400">
                            {seedDatabaseMutation.data.counts.categoriesInserted}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Subcategories inserted:</span>
                          <span className="font-mono font-semibold text-cyan-400">
                            {seedDatabaseMutation.data.counts.subcategoriesInserted}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sub-subcategories inserted:</span>
                          <span className="font-mono font-semibold text-cyan-400">
                            {seedDatabaseMutation.data.counts.subSubcategoriesInserted}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Resources inserted:</span>
                          <span className="font-mono font-semibold text-pink-400">
                            {seedDatabaseMutation.data.counts.resourcesInserted}
                          </span>
                        </div>
                        {seedDatabaseMutation.data.totalErrors > 0 && (
                          <div className="flex justify-between text-yellow-400">
                            <span>Errors:</span>
                            <span className="font-mono font-semibold">
                              {seedDatabaseMutation.data.totalErrors}
                            </span>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-4 border-t border-gray-800">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Current Database Stats</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Resources</div>
                      <div className="text-xl font-mono font-bold text-pink-400">
                        {stats?.resources || 0}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Categories</div>
                      <div className="text-xl font-mono font-bold text-cyan-400">
                        {stats?.categories || 0}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Users</div>
                      <div className="text-xl font-mono font-bold text-pink-400">
                        {stats?.users || 0}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Journeys</div>
                      <div className="text-xl font-mono font-bold text-cyan-400">
                        {stats?.journeys || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation">
          <div className="space-y-4">
            {/* Awesome Lint Validation */}
            <Card className="border-pink-500/20 bg-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Awesome List Validation
                </CardTitle>
                <CardDescription>
                  Validate the generated markdown against awesome-lint rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validationStatus?.awesomeLint ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {validationStatus.awesomeLint.valid ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                      <span className="text-sm text-gray-400">
                        {validationStatus.awesomeLint.stats.totalResources} resources,{' '}
                        {validationStatus.awesomeLint.stats.totalCategories} categories
                      </span>
                    </div>

                    {validationStatus.awesomeLint.errors.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-red-400">
                          Errors ({validationStatus.awesomeLint.errors.length})
                        </h4>
                        <ScrollArea className="h-48 rounded-md border border-red-500/20 p-3">
                          {validationStatus.awesomeLint.errors.map((error, i) => (
                            <div key={i} className="mb-2 text-sm">
                              <div className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                <div>
                                  <div className="font-mono text-xs text-gray-400">
                                    Line {error.line}: {error.rule}
                                  </div>
                                  <div className="text-gray-300">{error.message}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}

                    {validationStatus.awesomeLint.warnings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-yellow-400">
                          Warnings ({validationStatus.awesomeLint.warnings.length})
                        </h4>
                        <ScrollArea className="h-48 rounded-md border border-yellow-500/20 p-3">
                          {validationStatus.awesomeLint.warnings.map((warning, i) => (
                            <div key={i} className="mb-2 text-sm">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                                <div>
                                  <div className="font-mono text-xs text-gray-400">
                                    Line {warning.line}: {warning.rule}
                                  </div>
                                  <div className="text-gray-300">{warning.message}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No validation results available</p>
                    <Button 
                      onClick={() => validateMutation.mutate()}
                      disabled={validateMutation.isPending}
                      className="mt-4"
                      variant="outline"
                    >
                      Run Validation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Link Checker Results */}
            <Card className="border-cyan-500/20 bg-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Link Check Results
                </CardTitle>
                <CardDescription>
                  Check all resource URLs for availability and redirects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validationStatus?.linkCheck ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-green-500">
                          {validationStatus.linkCheck.validLinks}
                        </div>
                        <div className="text-xs text-gray-400">Valid Links</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-500">
                          {validationStatus.linkCheck.brokenLinks}
                        </div>
                        <div className="text-xs text-gray-400">Broken Links</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-500">
                          {validationStatus.linkCheck.redirects}
                        </div>
                        <div className="text-xs text-gray-400">Redirects</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-500">
                          {validationStatus.linkCheck.errors}
                        </div>
                        <div className="text-xs text-gray-400">Errors</div>
                      </div>
                    </div>

                    {validationStatus.linkCheck.brokenResources && 
                     validationStatus.linkCheck.brokenResources.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-red-400">
                          Broken Links ({validationStatus.linkCheck.brokenResources.length})
                        </h4>
                        <ScrollArea className="h-64 rounded-md border border-red-500/20">
                          <div className="p-3">
                            {validationStatus.linkCheck.brokenResources.map((link, i) => (
                              <div key={i} className="mb-3 pb-3 border-b border-gray-800 last:border-0">
                                <div className="flex items-start gap-2">
                                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                  <div className="flex-1">
                                    <div className="font-semibold text-sm text-gray-300">
                                      {link.resourceTitle || 'Unknown Resource'}
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono break-all">
                                      {link.url}
                                    </div>
                                    <div className="text-xs text-red-400 mt-1">
                                      {link.status} {link.statusText}
                                      {link.error && ` - ${link.error}`}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    <div className="text-xs text-gray-400">
                      Average response time: {validationStatus.linkCheck.summary.averageResponseTime.toFixed(0)}ms
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No link check results available</p>
                    <Button 
                      onClick={() => checkLinksMutation.mutate()}
                      disabled={checkLinksMutation.isPending}
                      className="mt-4"
                      variant="outline"
                    >
                      Check Links
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <Card className="border-pink-500/20 bg-black">
            <CardHeader>
              <CardTitle>Resource Moderation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Approve or reject pending resource submissions.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="border-pink-500/20 bg-black">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Manage user accounts and permissions.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github">
          <Card className="border-pink-500/20 bg-black">
            <CardHeader>
              <CardTitle>GitHub Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Configure and manage GitHub repository synchronization.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border-pink-500/20 bg-black">
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">View system audit logs and activity history.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}