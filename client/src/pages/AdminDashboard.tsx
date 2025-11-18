import { useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, GitBranch, FileText, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { stats, isLoading } = useAdmin();

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && user && (user as any).role !== "admin") {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  // Don't render anything until we verify admin role
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Double-check admin role before rendering
  if (!user || (user as any).role !== "admin") {
    return null; // Return nothing while redirect happens
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
      <Tabs defaultValue="resources" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full lg:w-auto lg:inline-grid bg-black border border-pink-500/20">
          <TabsTrigger value="resources" className="data-[state=active]:bg-pink-500/20">
            Resources
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-pink-500/20">
            Users
          </TabsTrigger>
          <TabsTrigger value="github" className="data-[state=active]:bg-pink-500/20">
            GitHub Sync
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-pink-500/20">
            Audit Logs
          </TabsTrigger>
        </TabsList>

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