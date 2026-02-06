import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  XCircle,
  TrendingUp,
  Link2,
  AlertTriangle
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LinkHealthJob, LinkHealthCheck } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface LinkHealthStatusResponse {
  success: boolean;
  job: LinkHealthJob | null;
}

interface LinkHealthHistoryResponse {
  success: boolean;
  jobs: LinkHealthJob[];
}

interface BrokenLinksResponse {
  success: boolean;
  checks: Array<LinkHealthCheck & {
    resource?: {
      id: number;
      title: string;
      category: string;
    };
  }>;
}

export default function LinkHealthDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<'all' | 'broken' | 'timeout' | 'redirect'>('all');

  const { data: statusData, isLoading: isStatusLoading } = useQuery<LinkHealthStatusResponse>({
    queryKey: ['/api/admin/link-health/status'],
    refetchInterval: 5000
  });

  const { data: historyData } = useQuery<LinkHealthHistoryResponse>({
    queryKey: ['/api/admin/link-health/history'],
    refetchInterval: 30000
  });

  const { data: brokenLinksData } = useQuery<BrokenLinksResponse>({
    queryKey: ['/api/admin/link-health/broken-links', statusFilter],
    refetchInterval: 10000
  });

  const runCheckMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/link-health/run', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/link-health/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/link-health/history'] });
      toast({
        title: "Link health check started",
        description: "The system is now checking all resource links."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start check",
        description: error.message || "An error occurred while starting the link health check.",
        variant: "destructive"
      });
    }
  });

  const latestJob = statusData?.job;
  const jobs = historyData?.jobs || [];
  const isActiveJob = latestJob?.status === 'processing';
  const brokenLinks = brokenLinksData?.checks || [];

  const calculateHealthPercentage = (job: LinkHealthJob | null | undefined) => {
    if (!job || !job.totalLinks || job.totalLinks === 0) return 0;
    return Math.round(((job.healthyLinks || 0) / job.totalLinks) * 100);
  };

  const calculateProgress = (job: LinkHealthJob | null | undefined) => {
    if (!job || !job.totalLinks || job.totalLinks === 0) return 0;
    return Math.round(((job.checkedLinks || 0) / job.totalLinks) * 100);
  };

  const getStatusBadgeClassName = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500 hover:bg-blue-600 animate-pulse';
      case 'completed':
        return 'bg-green-500 hover:bg-green-600';
      case 'failed':
        return 'bg-red-500 hover:bg-red-600';
      case 'cancelled':
        return 'bg-gray-500 hover:bg-gray-600';
      default:
        return '';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'redirect':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      case 'broken':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'timeout':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'dns_failure':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500 text-green-500';
      case 'redirect':
        return 'border-yellow-500 text-yellow-500';
      case 'broken':
        return 'border-red-500 text-red-500';
      case 'timeout':
        return 'border-orange-500 text-orange-500';
      case 'dns_failure':
        return 'border-red-500 text-red-500';
      default:
        return '';
    }
  };

  // Prepare trend chart data from last 10 jobs
  const trendData = jobs.slice(0, 10).reverse().map((job) => ({
    date: new Date(job.createdAt).toLocaleDateString(),
    healthy: ((job.healthyLinks || 0) / (job.totalLinks || 1)) * 100,
    broken: ((job.brokenLinks || 0) / (job.totalLinks || 1)) * 100,
    redirect: ((job.redirectLinks || 0) / (job.totalLinks || 1)) * 100,
    timeout: ((job.timeoutLinks || 0) / (job.totalLinks || 1)) * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Link Health Summary
            </span>
            {latestJob && (
              <Badge
                className={getStatusBadgeClassName(latestJob.status)}
              >
                {latestJob.status === 'processing' && (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                )}
                {latestJob.status}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {latestJob
              ? `Last check: ${new Date(latestJob.createdAt).toLocaleString()}`
              : 'No link health checks performed yet'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {latestJob ? (
            <>
              {isActiveJob && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono font-semibold">
                        {calculateProgress(latestJob)}%
                      </span>
                    </div>
                    <Progress
                      value={calculateProgress(latestJob)}
                      className="h-2"
                    />
                  </div>
                  <Separator />
                </>
              )}

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {latestJob.totalLinks || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Links</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-green-500">
                    {latestJob.healthyLinks || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Healthy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-red-500">
                    {latestJob.brokenLinks || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Broken</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-yellow-500">
                    {latestJob.redirectLinks || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Redirects</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-orange-500">
                    {latestJob.timeoutLinks || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Timeouts</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Health Percentage</div>
                  <div className="text-3xl font-bold font-mono">
                    {calculateHealthPercentage(latestJob)}%
                  </div>
                </div>
                <Button
                  onClick={() => runCheckMutation.mutate()}
                  disabled={isActiveJob || runCheckMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {runCheckMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Activity className="h-4 w-4 mr-2" />
                      Run Check Now
                    </>
                  )}
                </Button>
              </div>

              {isActiveJob && (
                <Alert className="border-blue-500/20 bg-blue-500/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Link health check is currently running. Please wait for it to complete.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No link health data available yet
              </p>
              <Button
                onClick={() => runCheckMutation.mutate()}
                disabled={runCheckMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {runCheckMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Run First Check
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Link Health Trends
            </CardTitle>
            <CardDescription>
              Health status trends across the last {trendData.length} checks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="healthy"
                  stroke="#22c55e"
                  name="Healthy"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="broken"
                  stroke="#ef4444"
                  name="Broken"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="redirect"
                  stroke="#eab308"
                  name="Redirects"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="timeout"
                  stroke="#f97316"
                  name="Timeouts"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Broken Links Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Problem Links
            </span>
            {brokenLinks.length > 0 && (
              <Badge variant="outline">
                {brokenLinks.length} issues
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Links that require attention (broken, timeouts, redirects)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as any)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Issues</SelectItem>
                <SelectItem value="broken">Broken Links</SelectItem>
                <SelectItem value="timeout">Timeouts</SelectItem>
                <SelectItem value="redirect">Redirects</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isStatusLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : brokenLinks.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {statusFilter === 'all'
                  ? 'No problem links found. All links are healthy!'
                  : `No ${statusFilter} links found.`
                }
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-center">Failures</TableHead>
                    <TableHead className="text-center">Flagged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokenLinks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getHealthStatusBadge(check.status)}
                        >
                          {getHealthStatusIcon(check.status)}
                          <span className="ml-1">{check.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {check.resource?.title || `Resource #${check.resourceId}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {check.resource?.category || '-'}
                      </TableCell>
                      <TableCell className="text-sm font-mono max-w-md truncate">
                        <a
                          href={check.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-blue-500"
                        >
                          {check.url}
                        </a>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {check.consecutiveFailures || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {check.flaggedForReview ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
