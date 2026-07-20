import { useState, useEffect } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatAdminDateTime, formatAdminDate } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CHART_PALETTE } from "@/lib/charts/palette";
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
  checks: (LinkHealthCheck & {
    resource?: {
      id: number;
      title: string;
      category: string;
    };
  })[];
}

export default function LinkHealthDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<'all' | 'broken' | 'timeout' | 'redirect' | 'suspect'>('all');
  const [isPolling, setIsPolling] = useState(false);
  // Run23 NB-040: explicit confirmation before starting a link-check job.
  const [confirmRun, setConfirmRun] = useState(false);

  const { data: statusData, isLoading: isStatusLoading } = useQuery<LinkHealthStatusResponse>({
    queryKey: ['/api/admin/link-health/status'],
    refetchInterval: isPolling ? 3000 : 60000
  });

  const { data: historyData } = useQuery<LinkHealthHistoryResponse>({
    queryKey: ['/api/admin/link-health/history'],
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // R4-044: fetch the full problem-links set once and filter client-side so the
  // summary counters and the table rows are driven by the SAME dataset. The old
  // server-filtered query made the counters (from the job record) reconcile
  // against a different/stale set than the visible rows.
  const { data: brokenLinksData } = useQuery<BrokenLinksResponse>({
    queryKey: ['/api/admin/link-health/broken-links'],
    queryFn: () => apiRequest('/api/admin/link-health/broken-links'),
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const runCheckMutation = useMutation({
    mutationFn: async (): Promise<unknown> => {
      return await apiRequest('/api/admin/link-health/run', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      setIsPolling(true);
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/link-health/status'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/link-health/history'] });
      toast({
        title: "Link health check started",
        description: "The system is now checking all resource links."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start check",
        description: error.message ?? "An error occurred while starting the link health check.",
        variant: "destructive"
      });
    }
  });

  const latestJob = statusData?.job;
  // BUG-031 (run18): the history endpoint can echo the same job multiple times
  // (one row per job×check join), which plotted duplicate trend points for a
  // single run — dedupe by job id in the render layer.
  const jobs = Array.from(
    new Map((historyData?.jobs ?? []).map((j) => [j.id, j])).values()
  );
  const isActiveJob = latestJob?.status === 'processing';
  // R4-043: a job can sit in 'pending' before it starts 'processing' — treat
  // both as in-progress so the panel never presents a stale all-clear/last-run
  // summary while a sweep is queued or running.
  const isJobInProgress = latestJob?.status === 'processing' || latestJob?.status === 'pending';
  // R4-044: one source of truth. The table filters this client-side; the
  // summary counters tally the same array, so counts == rows by construction.
  const allProblemLinks = brokenLinksData?.checks ?? [];
  const brokenLinks = statusFilter === 'all'
    ? allProblemLinks
    : allProblemLinks.filter((c) => c.status === statusFilter);

  // R4-044: summary counters tally the SAME array the table renders, so the
  // numbers always reconcile with the visible rows (dns_failure folds into
  // Broken, matching the table's badge semantics). Healthy is derived as
  // total − problems from the same set. While a job is still running we fall
  // back to the job record's live progress counts.
  const countByStatus = (statuses: string[]) =>
    allProblemLinks.filter((c) => statuses.includes(c.status)).length;
  const summaryCounts = !isJobInProgress && brokenLinksData
    ? {
        total: latestJob?.totalLinks || 0,
        broken: countByStatus(['broken', 'dns_failure']),
        redirect: countByStatus(['redirect']),
        timeout: countByStatus(['timeout']),
        suspect: countByStatus(['suspect']),
        healthy: Math.max(0, (latestJob?.totalLinks || 0) - allProblemLinks.length),
      }
    : {
        total: latestJob?.totalLinks || 0,
        broken: latestJob?.brokenLinks || 0,
        redirect: latestJob?.redirectLinks || 0,
        timeout: latestJob?.timeoutLinks || 0,
        suspect: latestJob?.suspectLinks || 0,
        healthy: latestJob?.healthyLinks || 0,
      };

  useEffect(() => {
    setIsPolling(isJobInProgress);
    if (!isActiveJob && latestJob && ['completed', 'failed', 'cancelled'].includes(latestJob.status)) {
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/link-health/history'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/link-health/broken-links'] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- latestJob object identity changes every poll; keying on status is intentional
  }, [isActiveJob, latestJob?.status]);

  const calculateHealthPercentage = (job: LinkHealthJob | null | undefined) => {
    if (!job?.totalLinks || job.totalLinks === 0) return 0;
    return Math.round(((job.healthyLinks || 0) / job.totalLinks) * 100);
  };

  const calculateProgress = (job: LinkHealthJob | null | undefined) => {
    if (!job?.totalLinks || job.totalLinks === 0) return 0;
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
      case 'suspect':
        return <AlertTriangle className="h-4 w-4 text-purple-500" />;
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
      case 'suspect':
        return 'border-purple-500 text-purple-500';
      default:
        return '';
    }
  };

  // Prepare trend chart data from last 10 jobs
  const trendData = jobs.slice(0, 10).reverse().map((job) => ({
    date: formatAdminDate(job.createdAt),
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
              ? `Last check: ${formatAdminDateTime(latestJob.createdAt)}`
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

              {/* R4-044: counters come from summaryCounts (the same dataset as
                  the Problem Links table) so counts always match the rows. */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold font-mono" data-testid="counter-total-links">
                    {summaryCounts.total}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Links</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-green-500" data-testid="counter-healthy-links">
                    {summaryCounts.healthy}
                  </div>
                  <div className="text-xs text-muted-foreground">Healthy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-red-500" data-testid="counter-broken-links">
                    {summaryCounts.broken}
                  </div>
                  <div className="text-xs text-muted-foreground">Broken</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-yellow-500" data-testid="counter-redirect-links">
                    {summaryCounts.redirect}
                  </div>
                  <div className="text-xs text-muted-foreground">Redirects</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-orange-500" data-testid="counter-timeout-links">
                    {summaryCounts.timeout}
                  </div>
                  <div className="text-xs text-muted-foreground">Timeouts</div>
                </div>
                <div>
                  {/* R4-001/023: 200-OK links flagged by the takeover / intent-flip
                      / parked-domain heuristics — need human review. */}
                  <div className="text-2xl font-bold font-mono text-purple-500" data-testid="counter-suspect-links">
                    {summaryCounts.suspect}
                  </div>
                  <div className="text-xs text-muted-foreground">Suspect</div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Health Percentage</div>
                  {/* R4-044: derived from the same summaryCounts dataset. */}
                  <div className="text-3xl font-bold font-mono">
                    {summaryCounts.total > 0
                      ? Math.round((summaryCounts.healthy / summaryCounts.total) * 100)
                      : calculateHealthPercentage(latestJob)}%
                  </div>
                </div>
                {/* BUG-024 (run19): default themed Button — the hardcoded
                    bg-blue-500 override was off-theme against the DS accent. */}
                <Button
                  onClick={() => setConfirmRun(true)}
                  disabled={isActiveJob || runCheckMutation.isPending}
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
                onClick={() => setConfirmRun(true)}
                disabled={runCheckMutation.isPending}
              >
                {runCheckMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Run Link Check
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
              {/* R5-039: pluralize correctly ("1 check" vs "N checks"). */}
              Health status trends across the last {trendData.length} {trendData.length === 1 ? 'check' : 'checks'}
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
                {/* MR-DS-07/08/09 — strokes sourced from centralized CHART_PALETTE
                    (ok=[2], bad=[5], warn=[3], --accent-2=[1]).
                    DS-OK: strokeWidth={2} recharts data-viz exception — CC-12's 1.5
                    default scopes lucide iconography only. */}
                <Line
                  type="monotone"
                  dataKey="healthy"
                  stroke={CHART_PALETTE[2]}
                  name="Healthy"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="broken"
                  stroke={CHART_PALETTE[5]}
                  name="Broken"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="redirect"
                  stroke={CHART_PALETTE[3]}
                  name="Redirects"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="timeout"
                  stroke={CHART_PALETTE[1]}
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
              onValueChange={(value) => setStatusFilter(value as 'all' | 'broken' | 'timeout' | 'redirect' | 'suspect')}
            >
              <SelectTrigger className="w-[200px]" aria-label="Filter by link status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Issues</SelectItem>
                <SelectItem value="broken">Broken Links</SelectItem>
                <SelectItem value="timeout">Timeouts</SelectItem>
                <SelectItem value="redirect">Redirects</SelectItem>
                <SelectItem value="suspect">Suspect (takeover/parked)</SelectItem>
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
                {/* Run16 BUG-043: don't claim "all links are healthy" when no
                    link check has ever run — there is no data to back it. */}
                {/* BUG-030 (run18): reference the button by its ACTUAL label —
                    the empty-state summary button reads "Run Link Check", not
                    "Run Check Now", so the instruction now matches. */}
                {/* R4-043: never claim an all-clear while a check is still
                    running — results aren't in yet, so say so instead. */}
                {!latestJob
                  ? 'No link check has been run yet. Click "Run Link Check" to scan the catalog.'
                  : isJobInProgress
                    ? 'Link check in progress — results will appear here when it completes.'
                    : statusFilter === 'all'
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
                        {check.resource?.title ?? `Resource #${check.resourceId}`}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {check.resource?.category ?? '-'}
                      </TableCell>
                      <TableCell className="text-sm font-mono max-w-md">
                        <div className="truncate">
                          <a
                            href={check.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-blue-500"
                          >
                            {check.url}
                          </a>
                        </div>
                        {/* Suspicion detail (why the heuristic fired) or fetch error */}
                        {check.errorMessage && (
                          <div className="text-xs text-muted-foreground truncate" title={check.errorMessage}>
                            {check.errorMessage}
                          </div>
                        )}
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

      {/* Run23 NB-040: explicit confirmation before starting a link-check job. */}
      <AlertDialog open={confirmRun} onOpenChange={(open) => { if (!open) setConfirmRun(false); }}>
        <AlertDialogContent data-testid="dialog-confirm-link-check">
          <AlertDialogHeader>
            <AlertDialogTitle>Run link health check?</AlertDialogTitle>
            <AlertDialogDescription>
              This checks every resource URL in the catalog against the live web. The job runs
              in the background and can take several minutes to complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-link-check">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmRun(false); runCheckMutation.mutate(); }}
              data-testid="button-confirm-link-check"
            >
              Run check
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
