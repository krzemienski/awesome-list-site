import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, Download, Upload, RefreshCw, CheckCircle2, XCircle, Clock, ExternalLink, Activity } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useContactConfig } from "@/lib/contact";
import {
  AdminOpsScrollArea as ScrollArea,
  AdminOpsTable as Table,
  StatusChip,
  TableShell,
} from "@/components/admin/AdminOpsPrimitives";
// Run15 BUG-030: one explicit date format for the whole admin surface —
// shared formatter keeps every admin table's timestamps identical.
import { formatAdminDateTime as formatSyncDate } from "@/lib/utils";
import { normalizeGithubRepoInput } from "@shared/validation";
import "@/styles/pages/admin-ops-github-links.css";

interface SyncHistory {
  id: number;
  direction: string;
  // ADM-03/04: sync-history rows now carry their outcome so failed/orphaned
  // syncs are badged honestly instead of rendered as successes.
  status?: string;
  commitSha?: string;
  commitMessage?: string;
  commitUrl?: string;
  repositoryUrl?: string;
  errorMessage?: string;
  resourcesAdded: number;
  resourcesUpdated: number;
  resourcesRemoved: number;
  totalResources: number;
  createdAt: string;
}

interface SyncQueueItem {
  id: number;
  repositoryUrl: string;
  action: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}

interface SyncQueueResponse {
  total: number;
  items: SyncQueueItem[];
}

export default function GitHubSyncPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // The public config is the single source of truth for the deployment's
  // repository. Keep the field empty until it arrives rather than falling
  // back to a repository that could send an export to the wrong destination.
  const { data: publicConfig, isLoading: configIsLoading, isError: configIsError } = useContactConfig(true);
  const configuredRepo = useMemo(
    () => normalizeGithubRepoInput(publicConfig?.site?.repoUrl),
    [publicConfig?.site?.repoUrl],
  );
  const configuredBranch = publicConfig?.site?.repoBranch?.trim() || "branch unavailable";
  const [repoUrl, setRepoUrl] = useState("");
  const [repoUrlTouched, setRepoUrlTouched] = useState(false);
  useEffect(() => {
    if (!repoUrlTouched && configuredRepo) setRepoUrl(configuredRepo);
  }, [configuredRepo, repoUrlTouched]);
  // Run16 BUG-039: import rewrites the local catalog and export pushes a real
  // commit — both need an explicit confirmation step before firing.
  const [confirmAction, setConfirmAction] = useState<"import" | "export" | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<SyncHistory | null>(null);

  // BUG-042 (run25): validate the repo reference BEFORE queueing a sync job —
  // "not a repo!!" used to be accepted and fail minutes later in the queue.
  const normalizedRepo = normalizeGithubRepoInput(repoUrl);
  const repoInvalid = repoUrl.trim().length > 0 && !normalizedRepo;
  const repositoryExample = configuredRepo ?? "owner/repository";

  const resetRepository = () => {
    if (configuredRepo) {
      setRepoUrlTouched(false);
      setRepoUrl(configuredRepo);
    }
  };

  const {
    data: syncHistory,
    isLoading: syncHistoryIsLoading,
    isError: syncHistoryIsError,
    isFetching: syncHistoryIsFetching,
    refetch: refetchSyncHistory,
  } = useQuery<SyncHistory[]>({
    queryKey: ['/api/github/sync-history'],
  });

  const {
    data: syncQueueData,
    isLoading: syncQueueIsLoading,
    isError: syncQueueIsError,
    isFetching: syncQueueIsFetching,
    refetch: refetchSyncQueue,
  } = useQuery<SyncQueueResponse>({
    queryKey: ['/api/github/sync-status'],
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/github/import', {
        method: 'POST',
        body: JSON.stringify({
          repositoryUrl: normalizedRepo ?? repoUrl,
          options: { forceOverwrite: false }
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/github/sync-status'] });
      toast({
        title: "Import Started",
        description: `Importing resources from ${repoUrl}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to start import",
        variant: "destructive"
      });
    }
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/github/export', {
        method: 'POST',
        body: JSON.stringify({
          repositoryUrl: normalizedRepo ?? repoUrl,
          options: { createPullRequest: false }
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/github/sync-status'] });
      toast({
        title: "Export Started",
        description: `Exporting resources to ${repoUrl}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to start export",
        variant: "destructive"
      });
    }
  });

  const orderedHistory = useMemo(
    () => [...(syncHistory ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    [syncHistory],
  );
  const lastSync = orderedHistory[0];
  const visibleHistory = showDetails ? orderedHistory : orderedHistory.slice(0, 5);
  const syncQueue = syncQueueData?.items || [];
  const pendingJobs = syncQueue.filter(item => item.status === 'pending' || item.status === 'processing').length;
  // Run16 BUG-015: a broken integration must be VISIBLE. Surface failed jobs
  // (e.g. "Bad credentials") prominently instead of hiding them — previously a
  // panel with 37 of 43 failed jobs looked perfectly healthy.
  const failedJobs = syncQueue.filter(item => item.status === 'failed');
  const latestFailure = failedJobs
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Run17 BUG-031: repeated retries of the same action/status/error read as
  // duplicate rows — collapse them into one entry with a ×N counter (most
  // recent occurrence shown).
  const dedupedQueue = useMemo(() => {
    const map = new Map<string, { item: SyncQueueItem; count: number }>();
    for (const item of syncQueue) {
      const key = [item.action, item.status, item.repositoryUrl, item.errorMessage || ""].join("|");
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (new Date(item.createdAt) > new Date(existing.item.createdAt)) {
          existing.item = item;
        }
      } else {
        map.set(key, { item, count: 1 });
      }
    }
    // Run23 NB-037: the queue endpoint returns rows oldest-first, and the
    // dedup map preserves insertion order — sort the collapsed entries
    // newest→oldest so "Recent Sync Jobs" actually leads with recent jobs.
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.item.processedAt || b.item.createdAt).getTime() -
      new Date(a.item.processedAt || a.item.createdAt).getTime()
    );
  }, [syncQueue]);

  return (
    <div className="ops-github-panel">
      <Card className="ops-github-panel__repository-card">
        <CardContent className="ops-github-panel__repository-content">
          <div className="ops-github-panel__repository-heading">
            <div className="ops-github-panel__repository-mark" aria-hidden="true">
              <Folder className="h-5 w-5" />
            </div>
            <div className="ops-github-panel__repository-copy">
              <CardTitle className="ops-github-panel__repository-name">
                {repoUrl || (configIsLoading ? "Loading repository…" : "Repository not configured")}
              </CardTitle>
              <p className="ops-github-panel__repository-meta">
                {configuredBranch} · {lastSync ? `last sync ${formatSyncDate(lastSync.createdAt)}` : "not synced yet"} · {syncQueueData?.total ?? 0} sync jobs
              </p>
            </div>
            <div className="ops-github-panel__repository-actions">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction("import")}
                  disabled={importMutation.isPending || !normalizedRepo}
                  data-testid="button-import-github"
                >
                  {importMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {importMutation.isPending ? "Importing..." : "Pull"}
                </Button>
                <Button
                  onClick={() => setConfirmAction("export")}
                  disabled={exportMutation.isPending || !normalizedRepo}
                  data-testid="button-export-github"
                >
                  {exportMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {exportMutation.isPending ? "Exporting..." : "Sync now"}
                </Button>
              </div>
            </div>
          </div>
          {configIsError && !repoUrl && (
            <Alert variant="destructive" data-testid="alert-github-config-error">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                The configured repository is unavailable. Pull and export are disabled until the site repository is configured.
              </AlertDescription>
            </Alert>
          )}
          {showDetails && <div className="ops-github-panel__repository-editor">
            <Label htmlFor="repo-url">Target Repository</Label>
            <div className="flex gap-2">
              <Input
                id="repo-url"
                placeholder={repositoryExample}
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrlTouched(true);
                  setRepoUrl(e.target.value);
                }}
                className={`font-mono text-sm ${repoInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                aria-invalid={repoInvalid}
                aria-describedby={repoInvalid ? "repo-url-error" : undefined}
                data-testid="input-repo-url"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={resetRepository}
                disabled={!configuredRepo}
                title={configuredRepo ? "Reset to configured repository" : "No configured repository available"}
                data-testid="button-reset-repo"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {repoInvalid ? (
              <p id="repo-url-error" className="text-xs text-destructive" role="alert" data-testid="text-repo-url-error">
                Not a valid repository. Use owner/repository (e.g., {repositoryExample}) or a github.com URL.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Format: owner/repository{configuredRepo ? ` (configured: ${configuredRepo})` : ""}
              </p>
            )}
          </div>}
        </CardContent>
      </Card>

      {showDetails && <Card className="ops-github-panel__status-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sync Status
              </span>
              <span className="flex items-center gap-2">
                {failedJobs.length > 0 && (
                  <StatusChip status="failed" data-testid="badge-failed-jobs">
                    <XCircle className="h-3 w-3 mr-1" />
                    {failedJobs.length} failed
                  </StatusChip>
                )}
                {pendingJobs > 0 && (
                  <StatusChip status="pending" className="animate-pulse">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    {pendingJobs} in progress
                  </StatusChip>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!syncQueue.length && !lastSync && (
              <div className="ops-github-panel__empty-state">
                <Clock className="h-5 w-5" aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    {syncQueueIsLoading || syncHistoryIsLoading ? "Loading sync activity…" : "No sync activity yet"}
                  </p>
                  {!syncQueueIsLoading && !syncHistoryIsLoading && (
                    <p className="text-sm text-muted-foreground">Start a pull or sync to see its progress here.</p>
                  )}
                </div>
              </div>
            )}
            {failedJobs.length > 0 && (
              <Alert variant="destructive" data-testid="alert-sync-failures">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="space-y-1">
                  <p className="font-semibold">
                    {failedJobs.length} of {syncQueue.length} recent sync job{syncQueue.length !== 1 ? 's' : ''} failed
                  </p>
                  {latestFailure?.errorMessage && (
                    <p className="text-sm font-mono break-words">
                      Latest error: {latestFailure.errorMessage}
                    </p>
                  )}
                   <p className="text-xs">
                     Review the latest error before retrying the sync.
                   </p>
                </AlertDescription>
              </Alert>
            )}
            {lastSync && (() => {
              // ADM-03: badge the Last Import/Export by its real outcome — a
              // failed/orphaned sync must not render a green success checkmark.
              const lastSyncFailed = lastSync.status === 'failed';
              return (
              <Alert variant={lastSyncFailed ? 'destructive' : undefined} data-testid="alert-last-sync">
                {lastSyncFailed ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                        Last {lastSync.direction === 'export' ? 'Export' : 'Import'}
                    </span>
                    {lastSyncFailed && (
                      <StatusChip status="failed" data-testid="badge-last-sync-failed">
                        <XCircle className="h-3 w-3 mr-1" />
                        failed
                      </StatusChip>
                    )}
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatSyncDate(lastSync.createdAt)}
                    </Badge>
                  </div>
                  
                  {lastSync.commitMessage && (
                    <p className="text-sm font-mono bg-muted p-2 rounded">
                      {lastSync.commitMessage}
                    </p>
                  )}
                  {lastSyncFailed && lastSync.errorMessage && (
                    <p className="text-sm font-mono text-destructive break-words">
                      Error: {lastSync.errorMessage}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <div className={"text-[#34d08c] font-semibold" /* DS-OK: status ok */}>+{lastSync.resourcesAdded}</div>
                      <div className="text-xs text-muted-foreground">Added</div>
                    </div>
                    <div className="text-center">
                      <div className={"text-[#ffb84d] font-semibold" /* DS-OK: status warn */}>~{lastSync.resourcesUpdated}</div>
                      <div className="text-xs text-muted-foreground">Updated</div>
                    </div>
                    <div className="text-center">
                      <div className={"text-[#ff5c7a] font-semibold" /* DS-OK: status bad */}>-{lastSync.resourcesRemoved}</div>
                      <div className="text-xs text-muted-foreground">Removed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-primary font-semibold">{lastSync.totalResources}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>

                  {lastSync.commitUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      asChild
                      data-testid="button-view-commit"
                    >
                      <a href={lastSync.commitUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View Commit on GitHub
                      </a>
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
              );
            })()}

             {syncQueueIsError ? (
               <Alert variant="destructive" data-testid="alert-sync-queue-error">
                 <XCircle className="h-4 w-4" />
                 <AlertDescription className="flex flex-wrap items-center gap-3">
                   <span>Sync queue status is unavailable.</span>
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={() => { void refetchSyncQueue(); }}
                     disabled={syncQueueIsFetching}
                     data-testid="button-retry-sync-queue"
                   >
                     {syncQueueIsFetching ? "Retrying…" : "Retry"}
                   </Button>
                 </AlertDescription>
               </Alert>
             ) : syncQueue && syncQueue.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Recent Sync Jobs</h4>
                <ScrollArea className="h-[200px] rounded border">
                  <div className="p-2 space-y-2">
                    {dedupedQueue.map(({ item, count }) => (
                      <div
                        key={item.id}
                        className="p-2 rounded bg-muted/50 text-sm space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.status === 'completed' && <CheckCircle2 className={"h-4 w-4 text-[#34d08c]" /* DS-OK: status ok */} />}
                            {item.status === 'failed' && <XCircle className={"h-4 w-4 text-[#ff5c7a]" /* DS-OK: status bad */} />}
                            {(item.status === 'pending' || item.status === 'processing') && (
                              <RefreshCw className={"h-4 w-4 text-[#ffb84d] animate-spin" /* DS-OK: status warn */} />
                            )}
                            <span className="font-medium capitalize">{item.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatSyncDate(item.processedAt || item.createdAt)}
                            </span>
                            {count > 1 && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-repeat-${item.id}`}>
                                ×{count}
                              </Badge>
                            )}
                          </div>
                          <StatusChip status={item.status}>
                            {item.status}
                          </StatusChip>
                        </div>
                        {/* Run16 BUG-015: failed jobs must show WHY they failed. */}
                        {item.status === 'failed' && item.errorMessage && (
                          <p className="text-xs font-mono text-destructive break-words pl-6">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>}

       {syncHistoryIsError ? (
         <TableShell
           title="Sync jobs"
           sub="The sync history could not be loaded."
           className="ops-github-panel__history-shell"
         >
           <div className="flex flex-wrap items-center gap-3" role="alert">
             <span className="text-sm text-muted-foreground">Try again to inspect previous import/export operations.</span>
             <Button
               type="button"
               variant="outline"
               size="sm"
               onClick={() => { void refetchSyncHistory(); }}
               disabled={syncHistoryIsFetching}
               data-testid="button-retry-sync-history"
             >
               {syncHistoryIsFetching ? "Retrying…" : "Retry"}
             </Button>
           </div>
         </TableShell>
       ) : syncHistory && syncHistory.length > 0 ? (
        <TableShell
          title="Sync jobs"
          sub={`Last ${Math.min(5, orderedHistory.length)} import/export operations`}
          className="ops-github-panel__history-shell"
        >
            <div className="ops-github-panel__history-table-wrap">
              <Table className="table">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                {visibleHistory.map((sync) => {
                  return (
                  <TableRow key={sync.id} data-testid={`sync-history-row-${sync.id}`}>
                       <TableCell className="font-mono text-xs">#{sync.id}</TableCell>
                       <TableCell className="ops-github-panel__history-direction">
                         {sync.direction}
                      </TableCell>
                      <TableCell>
                         {sync.status && (
                           <span
                             className={`chip ${sync.status === "completed" ? "ok" : sync.status === "failed" ? "bad" : sync.status === "pending" ? "warn" : ""}`}
                             title={sync.errorMessage}
                             data-testid={`badge-sync-history-status-${sync.id}`}
                           >
                             {sync.status}
                           </span>
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                         <button
                           type="button"
                           className="btn ghost ops-github-panel__logs"
                           onClick={() => setSelectedHistory(sync)}
                           aria-label={`View details for sync job ${sync.id}`}
                           data-testid={`button-sync-details-${sync.id}`}
                         >
                           Logs
                         </button>
                      </TableCell>
                  </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>
         </TableShell>
       ) : (
         <TableShell
           title="Sync jobs"
           sub="No import/export operations have been recorded yet."
           className="ops-github-panel__history-shell"
         >
           <p className="text-sm text-muted-foreground" role="status">Start a pull or sync to see job details here.</p>
         </TableShell>
       )}

      <details className="admin-ops-more">
        <summary
          className="btn ghost"
          onClick={(event) => {
            event.preventDefault();
            setShowDetails((visible) => !visible);
          }}
          aria-expanded={showDetails}
          data-testid="button-github-more"
        >
          {showDetails ? "Less" : "More"}
        </summary>
      </details>

      {/* Run16 BUG-039: confirm before firing import (rewrites local catalog)
          or export (pushes a real commit to the repository). */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "import" ? "Import from GitHub?" : "Export to GitHub?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "import" ? (
                <>
                  This pulls the resource list from{" "}
                  <span className="font-medium text-foreground">{repoUrl}</span>{" "}
                  and updates the database to match — new resources are added and
                  existing ones may be updated.
                </>
              ) : (
                <>
                  This pushes the approved catalog as a commit to{" "}
                  <span className="font-medium text-foreground">{repoUrl}</span>,
                  rewriting its README resource list.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-sync-action">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction === "import") importMutation.mutate();
                if (confirmAction === "export") exportMutation.mutate();
                setConfirmAction(null);
              }}
              data-testid="button-confirm-sync-action"
            >
              {confirmAction === "import" ? "Start Import" : "Start Export"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={selectedHistory !== null} onOpenChange={(open) => { if (!open) setSelectedHistory(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sync job #{selectedHistory?.id}</DialogTitle>
            <DialogDescription>
              {selectedHistory
                ? `${selectedHistory.direction === "export" ? "Export" : "Import"} · ${formatSyncDate(selectedHistory.createdAt)}`
                : "Sync job details"}
            </DialogDescription>
          </DialogHeader>
          {selectedHistory && (
            <dl className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd><StatusChip status={selectedHistory.status ?? "recorded"} /></dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Resources added</dt>
                <dd className="font-mono">+{selectedHistory.resourcesAdded}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Resources updated</dt>
                <dd className="font-mono">~{selectedHistory.resourcesUpdated}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Resources removed</dt>
                <dd className="font-mono">-{selectedHistory.resourcesRemoved}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Total resources</dt>
                <dd className="font-mono">{selectedHistory.totalResources}</dd>
              </div>
              {selectedHistory.commitMessage && (
                <div>
                  <dt className="mb-1 text-muted-foreground">Commit message</dt>
                  <dd className="break-words rounded border p-2 font-mono text-xs">{selectedHistory.commitMessage}</dd>
                </div>
              )}
              {selectedHistory.errorMessage && (
                <div role="alert">
                  <dt className="mb-1 text-destructive">Error</dt>
                  <dd className="break-words rounded border border-destructive/40 bg-destructive/10 p-2 font-mono text-xs">
                    {selectedHistory.errorMessage}
                  </dd>
                </div>
              )}
              {selectedHistory.commitUrl && (
                <a
                  href={selectedHistory.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn ghost inline-flex w-fit items-center gap-2"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  View commit on GitHub
                </a>
              )}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
