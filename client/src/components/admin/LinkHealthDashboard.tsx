import { lazy, Suspense, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { LinkHealthJob, LinkHealthCheck } from "@shared/schema";
import { AdminOpsTable as Table, StatusChip, TableShell } from "@/components/admin/AdminOpsPrimitives";
import "@/styles/pages/admin-ops-github-links.css";
import type { LinkHealthTrendPoint } from "@/components/admin/LinkHealthTrendChart";

const LinkHealthTrendChart = lazy(() => import("@/components/admin/LinkHealthTrendChart"));

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

/**
 * Link-health colors use the global DS status constants:
 * DS-OK: #34d08c ok / #ffb84d warn / #ff5c7a bad / #5eddf2 info / #9d4edd info-2.
 */
const JOB_PROCESSING_CLASS = 'bg-[#5eddf2] text-black hover:bg-[#5eddf2]/90 animate-pulse'; // DS-OK: cyan info (DS chart/info constant)
const JOB_COMPLETED_CLASS = 'bg-[#34d08c] text-black hover:bg-[#34d08c]/90'; // DS-OK: status ok
const JOB_FAILED_CLASS = 'bg-[#ff5c7a] text-black hover:bg-[#ff5c7a]/90'; // DS-OK: status bad
const OK_TEXT_CLASS = 'text-[#34d08c]'; // DS-OK: status ok
const WARN_TEXT_CLASS = 'text-[#ffb84d]'; // DS-OK: status warn
const BAD_TEXT_CLASS = 'text-[#ff5c7a]'; // DS-OK: status bad
const INFO_TEXT_CLASS = 'text-[#5eddf2]'; // DS-OK: cyan info (DS chart/info constant)
const INFO2_TEXT_CLASS = 'text-[#9d4edd]'; // DS-OK: violet info (DS chart/info constant)
const INFO_PANEL_CLASS = 'border-[#5eddf2]/20 bg-[#5eddf2]/5'; // DS-OK: cyan info (DS chart/info constant)
const OK_OUTLINE_CLASS = 'border-[#34d08c] text-[#34d08c]'; // DS-OK: status ok
const WARN_OUTLINE_CLASS = 'border-[#ffb84d] text-[#ffb84d]'; // DS-OK: status warn
const BAD_OUTLINE_CLASS = 'border-[#ff5c7a] text-[#ff5c7a]'; // DS-OK: status bad
const INFO2_OUTLINE_CLASS = 'border-[#9d4edd] text-[#9d4edd]'; // DS-OK: violet info (DS chart/info constant)

export default function LinkHealthDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<'all' | 'broken' | 'timeout' | 'redirect' | 'suspect'>('all');
  const [isPolling, setIsPolling] = useState(false);
  // Run23 NB-040: explicit confirmation before starting a link-check job.
  const [confirmRun, setConfirmRun] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  // BUG-014 (run25): current approved-catalog size, used to state the check's
  // honest scope (a completed job's totalLinks snapshots the catalog at check
  // start and goes stale as the catalog grows).
  const { data: coverageData } = useQuery<{ approvedTotal: number }>({
    queryKey: ['/api/admin/enrichment/coverage'],
    staleTime: 60_000,
  });
  const approvedTotal = coverageData?.approvedTotal;

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
  // R4-043: a job can sit in 'pending' before it starts 'processing' — treat
  // both as in-progress so the panel never presents a stale all-clear/last-run
  // summary while a sweep is queued or running.
  const isJobInProgress = latestJob?.status === 'processing' || latestJob?.status === 'pending';
  const isActiveJob = isJobInProgress;
  const isTerminalWithoutResults = latestJob?.status === 'failed' || latestJob?.status === 'cancelled';
  // R4-044: one source of truth. The table filters this client-side; the
  // summary counters tally the same API array. The recent-failures table
  // includes problem statuses and review flags, while the residual problem
  // table intentionally keeps every problem record available to its filters.
  const allProblemLinks = brokenLinksData?.checks ?? [];
  const recentFailures = allProblemLinks.filter(
    (check) =>
      check.flaggedForReview ||
      check.status === 'broken' ||
      check.status === 'dns_failure' ||
      check.status === 'timeout',
  );
  const brokenLinks = statusFilter === 'all'
    ? allProblemLinks
    : allProblemLinks.filter((c) =>
        statusFilter === 'broken'
          ? c.status === 'broken' || c.status === 'dns_failure'
          : c.status === statusFilter
      );

  // R4-044: summary counters tally the SAME array the table renders, so the
  // numbers always reconcile with the visible rows (dns_failure folds into
  // Broken, matching the table's badge semantics). Healthy is derived as
  // total − problems from the same set. While a job is still running we fall
  // back to the job record's live progress counts.
  const countByStatus = (statuses: string[]) =>
    allProblemLinks.filter((c) => statuses.includes(c.status)).length;
  // R5-009 (run24): while a check runs, the in-progress job's counters are all
  // zero — binding the summary cards to it read as "0 healthy / 0% health" for
  // the whole ~20-minute sweep. Keep showing the LAST COMPLETED job's results
  // (with a "last completed" note) until the new run lands.
  const lastCompletedJob = jobs
    .filter((job) => job.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const summaryJob = isJobInProgress || isTerminalWithoutResults ? lastCompletedJob : latestJob;
  const summaryCounts = !isJobInProgress && !isTerminalWithoutResults && brokenLinksData
    ? {
        total: latestJob?.totalLinks || 0,
        broken: countByStatus(['broken', 'dns_failure']),
        redirect: countByStatus(['redirect']),
        timeout: countByStatus(['timeout']),
        suspect: countByStatus(['suspect']),
        healthy: Math.max(0, (latestJob?.totalLinks || 0) - allProblemLinks.length),
      }
    : {
        total: summaryJob?.totalLinks || 0,
        broken: summaryJob?.brokenLinks || 0,
        redirect: summaryJob?.redirectLinks || 0,
        timeout: summaryJob?.timeoutLinks || 0,
        suspect: summaryJob?.suspectLinks || 0,
        healthy: summaryJob?.healthyLinks || 0,
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
        return JOB_PROCESSING_CLASS;
      case 'completed':
        return JOB_COMPLETED_CLASS;
      case 'failed':
        return JOB_FAILED_CLASS;
      case 'cancelled':
        return 'bg-muted text-foreground hover:bg-muted/80';
      default:
        return '';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className={`h-4 w-4 ${OK_TEXT_CLASS}`} />;
      case 'redirect':
        return <TrendingUp className={`h-4 w-4 ${WARN_TEXT_CLASS}`} />;
      case 'broken':
        return <XCircle className={`h-4 w-4 ${BAD_TEXT_CLASS}`} />;
      case 'timeout':
        return <Clock className={`h-4 w-4 ${WARN_TEXT_CLASS}`} />;
      case 'dns_failure':
        return <AlertCircle className={`h-4 w-4 ${BAD_TEXT_CLASS}`} />;
      case 'suspect':
        return <AlertTriangle className={`h-4 w-4 ${INFO2_TEXT_CLASS}`} />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return OK_OUTLINE_CLASS;
      case 'redirect':
        return WARN_OUTLINE_CLASS;
      case 'broken':
        return BAD_OUTLINE_CLASS;
      case 'timeout':
        return WARN_OUTLINE_CLASS;
      case 'dns_failure':
        return BAD_OUTLINE_CLASS;
      case 'suspect':
        return INFO2_OUTLINE_CLASS;
      default:
        return '';
    }
  };

  // Prepare trend chart data from last 10 jobs
  const trendData: LinkHealthTrendPoint[] = jobs.slice(0, 10).reverse().map((job) => ({
    date: formatAdminDate(job.createdAt),
    healthy: ((job.healthyLinks || 0) / (job.totalLinks || 1)) * 100,
    broken: ((job.brokenLinks || 0) / (job.totalLinks || 1)) * 100,
    redirect: ((job.redirectLinks || 0) / (job.totalLinks || 1)) * 100,
    timeout: ((job.timeoutLinks || 0) / (job.totalLinks || 1)) * 100,
  }));

  return (
    <div className="ops-link-health">
      <div className="ops-link-health__stat-grid" aria-label="Link health status summary">
        {[
          ["200 OK", summaryCounts.healthy, "ok"],
          ["301/302", summaryCounts.redirect, "warn"],
          ["404", summaryCounts.broken, "bad"],
          ["Timeout", summaryCounts.timeout, "bad"],
        ].map(([label, value, tone]) => (
          <div key={label} className={`card ops-link-health__stat-card ops-link-health__stat-card--${tone}`}>
            <div className="mono ops-link-health__stat-label">{label}</div>
            <div>{value}</div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      {showDetails && <Card className="ops-link-health__summary-card">
        <CardHeader>
          <CardTitle role="heading" aria-level={2} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Link Health Summary
            </span>
            {latestJob && (
              <StatusChip status={latestJob.status} className={getStatusBadgeClassName(latestJob.status)}>
                {latestJob.status === 'processing' && (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                )}
                {latestJob.status}
              </StatusChip>
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

              {isJobInProgress && lastCompletedJob && (
                <p className="text-xs text-muted-foreground" data-testid="text-summary-last-completed">
                  Showing results from the last completed check ({formatAdminDateTime(lastCompletedJob.createdAt)}) while the current check runs.
                </p>
              )}
              {approvedTotal != null && summaryCounts.total > 0 && (
                <p className="text-xs text-muted-foreground" data-testid="text-linkhealth-scope">
                  Scope: this check covered {summaryCounts.total.toLocaleString()} approved resource URLs
                  {summaryCounts.total < approvedTotal
                    ? ` — the catalog has since grown to ${approvedTotal.toLocaleString()} approved resources, so run a new check for full coverage.`
                    : " (the full approved catalog at check time)."}
                </p>
              )}
              <div className="ops-link-health__summary-meta" aria-label="Detailed link counts">
                <span data-testid="counter-total-links">Total {summaryCounts.total}</span>
                <span className={OK_TEXT_CLASS} data-testid="counter-healthy-links">
                  Healthy {summaryCounts.healthy}
                </span>
                <span className={BAD_TEXT_CLASS} data-testid="counter-broken-links">
                  Broken {summaryCounts.broken}
                </span>
                <span className={WARN_TEXT_CLASS} data-testid="counter-redirect-links">
                  Redirects {summaryCounts.redirect}
                </span>
                <span className={WARN_TEXT_CLASS} data-testid="counter-timeout-links">
                  Timeouts {summaryCounts.timeout}
                </span>
                <span className={INFO2_TEXT_CLASS} data-testid="counter-suspect-links">
                  Suspect {summaryCounts.suspect}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Health Percentage</div>
                  {/* R4-044: derived from the same summaryCounts dataset. */}
                  <div className="text-3xl font-bold font-mono">
                    {summaryCounts.total > 0
                      ? Math.round((summaryCounts.healthy / summaryCounts.total) * 100)
                      : calculateHealthPercentage(summaryJob)}%
                  </div>
                </div>
                {/* BUG-024 (run19): default themed Button — the hardcoded
                    blue palette override was off-theme against the DS accent. */}
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
                <Alert className={INFO_PANEL_CLASS}>
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
      </Card>}

      {showDetails && trendData.length > 0 && (
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Link Health Trends
                </CardTitle>
                <CardDescription>
                  Health status trends across the last {trendData.length}{" "}
                  {trendData.length === 1 ? "check" : "checks"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground" aria-busy="true">
                  Loading trend chart…
                </div>
              </CardContent>
            </Card>
          }
        >
          <LinkHealthTrendChart data={trendData} />
        </Suspense>
      )}

      <TableShell
        title="Recent failures"
        sub="404s and timeouts from last sweep"
        className="ops-link-health__flagged-card"
      >
          {recentFailures.length === 0 ? (
            <div className="ops-link-health__flagged-table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Resource</th><th>URL</th><th>Status</th><th>Last checked</th><th /></tr>
                </thead>
              </table>
              <p className="ops-link-health__empty" role="status">
                {isJobInProgress
                  ? "Recent failures will appear when the current check completes."
                  : latestJob
                    ? "No recent failures or review flags were found."
                    : "No link check has been run yet."}
              </p>
            </div>
          ) : (
            <div className="ops-link-health__flagged-table-wrap">
              <Table className="table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last checked</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentFailures.map((check) => (
                    <TableRow key={`flagged-${check.id}`}>
                      <TableCell className="font-medium">
                        {check.resource?.title ?? `Resource #${check.resourceId}`}
                        {check.resource?.category && (
                          <span className="mt-1 block text-xs text-muted-foreground">{check.resource.category}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[24rem]">
                        <a
                          href={check.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block truncate font-mono text-xs hover:underline ${INFO_TEXT_CLASS}`}
                          title={check.url}
                        >
                          {check.url}
                        </a>
                        {check.errorMessage && (
                          <span className="mt-1 block truncate text-xs text-muted-foreground" title={check.errorMessage}>
                            {check.errorMessage}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={check.status} className={getHealthStatusBadge(check.status)}>
                          {getHealthStatusIcon(check.status)}
                          <span className="ml-1">{check.status}</span>
                        </StatusChip>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatAdminDateTime(check.lastCheckedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmRun(true)}>
                          Recheck
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </TableShell>

      <details className="admin-ops-more ops-link-health__more-row">
        <summary
          className="btn ghost"
          onClick={(event) => {
            event.preventDefault();
            setShowDetails((visible) => !visible);
          }}
          aria-expanded={showDetails}
          data-testid="button-link-health-more"
        >
          {showDetails ? "Less" : "More"}
        </summary>
      </details>

      {showDetails && <Card className="ops-link-health__problem-card">
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
            Links that require attention from the latest sweep.
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
            // R5-004 (run24): plain two-axis overflow-auto scroller — the
            // Radix ScrollArea viewport clipped horizontal overflow, making
            // right-hand columns unreachable at ≤768px.
            <div className="max-h-[400px] overflow-auto" data-testid="scroller-link-health-table">
              <Table className="table">
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
                        <StatusChip status={check.status} className={getHealthStatusBadge(check.status)}>
                          {getHealthStatusIcon(check.status)}
                          <span className="ml-1">{check.status}</span>
                        </StatusChip>
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
                            className={`hover:underline ${INFO_TEXT_CLASS}`}
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
            </div>
          )}
        </CardContent>
      </Card>}

      {/* Run23 NB-040: explicit confirmation before starting a link-check job. */}
      <AlertDialog open={confirmRun} onOpenChange={(open) => { if (!open) setConfirmRun(false); }}>
        <AlertDialogContent data-testid="dialog-confirm-link-check">
          <AlertDialogHeader>
            <AlertDialogTitle>Run link health check?</AlertDialogTitle>
            <AlertDialogDescription>
              This checks the URL of every approved resource in the catalog
              {approvedTotal != null ? ` (currently ${approvedTotal.toLocaleString()})` : ""} against the
              live web. The job runs in the background and can take several minutes to complete.
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
