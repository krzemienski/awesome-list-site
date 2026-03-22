import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  TrendingUp,
  Info,
} from "lucide-react";
import ResearchJobsTable from "./ResearchJobsTable";
import ResearchJobDetail from "./ResearchJobDetail";
import NewResearchJobDialog from "./NewResearchJobDialog";
import { useResearchJobs, useResearchStats } from "./hooks/useResearchJobs";

export default function ResearchDashboard() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useResearchStats();
  const { data: jobsData, isLoading: jobsLoading } = useResearchJobs(undefined, 1, 100);

  const stats = statsData?.stats;
  const jobs = jobsData?.jobs || [];

  const handleViewDetails = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleBack = () => {
    setSelectedJobId(null);
  };

  if (selectedJobId) {
    return <ResearchJobDetail jobId={selectedJobId} onBack={handleBack} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-pink-500" />
            AI Research
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated analysis and improvement suggestions for your awesome lists
          </p>
        </div>
        <Button
          onClick={() => setIsNewJobDialogOpen(true)}
          className="bg-pink-500 hover:bg-pink-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Research Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                {statsLoading ? (
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <p className="text-3xl font-bold font-mono mt-1">
                    {stats?.totalJobs || 0}
                  </p>
                )}
              </div>
              <Activity className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                {statsLoading ? (
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <p className="text-3xl font-bold font-mono mt-1 text-blue-500">
                    {stats?.activeJobs || 0}
                  </p>
                )}
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            {stats && stats.activeJobs > 0 && (
              <Badge className="mt-2 bg-blue-500 animate-pulse">Processing</Badge>
            )}
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Findings</p>
                {statsLoading ? (
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <p className="text-3xl font-bold font-mono mt-1 text-yellow-500">
                    {stats?.pendingFindings || 0}
                  </p>
                )}
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                {statsLoading ? (
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <p className="text-3xl font-bold font-mono mt-1 text-green-500">
                    {stats?.successRate || 0}%
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs Alert */}
      {stats && stats.activeJobs > 0 && (
        <Alert className="border-blue-500/20 bg-blue-500/5">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {stats.activeJobs} research job{stats.activeJobs !== 1 ? "s" : ""} currently processing.
            The page will auto-refresh every 5 seconds.
          </AlertDescription>
        </Alert>
      )}

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Research Jobs
              </CardTitle>
              <CardDescription>
                Complete history of all research jobs
              </CardDescription>
            </div>
            {jobs.length > 0 && (
              <Badge variant="outline">
                {jobs.length} total jobs
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                No research jobs yet. Create your first job to get started.
              </p>
              <Button
                onClick={() => setIsNewJobDialogOpen(true)}
                className="bg-pink-500 hover:bg-pink-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Job
              </Button>
            </div>
          ) : (
            <ResearchJobsTable jobs={jobs} onViewDetails={handleViewDetails} />
          )}
        </CardContent>
      </Card>

      {/* New Job Dialog */}
      <NewResearchJobDialog
        open={isNewJobDialogOpen}
        onOpenChange={setIsNewJobDialogOpen}
      />
    </div>
  );
}
