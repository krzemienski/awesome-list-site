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
import { apiRequest, ApiError } from "@/lib/queryClient";
import { describeWriteError } from "@/lib/apiError";
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
import { AdminLoadError } from "@/components/admin/AdminLoadError";
import "@/styles/pages/admin-ops-github-links.css";

interface SyncHistory {
  id: number;
  /** Display id: "Run #n" for history rows, "Job #n" for queue rows. */
  label: string;
  direction: string;
  // ADM-03/04: sync-history rows now carry their outcome so failed/orphaned
  // syncs are badged honestly instead of rendered as successes.
  status?: string;
  commitSha?: string;
  commitMessage?: string;
  commitUrl?: string;
  repositoryUrl?: string;
  errorMessage?: string;
  /** F13: every per-item error of a partial/failed import. */
  errorMessages?: string[];
  resourcesAdded: number;
  resourcesUpdated: number;
  resourcesRemoved: number;
  totalResources: number;
  createdAt: string;
}

interface SyncQueueItem {
  id: number;
  repositoryUrl: string;
  branch?: string | null;
  action: string;
  status: string;
  errorMessage?: string;
  /** The export's commit landed on GitHub; only post-commit bookkeeping failed. */
  committedDespiteError?: boolean;
  commitSha?: string;
  importResult?: { imported?: number; updated?: number; skipped?: number; errors?: number; outcome?: string; errorMessages?: string[] };
  createdAt: string;
  processedAt?: string;
}

interface SyncQueueResponse {
  total: number;
  items: SyncQueueItem[];
}

type TaxonomyLevel = "category" | "subcategory" | "sub-subcategory";

/** Body of POST /api/admin/import-github with dryRun: true. */
interface ImportPlan {
  outcome: "completed" | "partial" | "failed";
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  wouldCreateTaxonomy: { level: TaxonomyLevel; name: string; parent?: string }[];
}

interface ImportPreview {
  repo: string;
  previewedAt: string;
  plan: ImportPlan;
}

const TAXONOMY_LEVELS: TaxonomyLevel[] = ["category", "subcategory", "sub-subcategory"];

/** "2 categories, 1 subcategory", or null when the import creates none. */
function describeTaxonomyPlan(nodes: ImportPlan["wouldCreateTaxonomy"]): string | null {
  const parts = TAXONOMY_LEVELS
    .map((level) => [level, nodes.filter((node) => node.level === level).length] as const)
    .filter(([, count]) => count > 0)
    .map(([level, count]) => `${count} ${count === 1 ? level : level.replace(/y$/, "ies")}`);
  return parts.length ? parts.join(", ") : null;
}

export default function GitHubSyncPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // The public config is the single source of truth for the deployment's
  // repository. Keep the field empty until it arrives rather than falling
  // back to a repository that could send an export to the wrong destination.
  const {
    data: publicConfig,
    isLoading: configIsLoading,
    isError: configIsError,
    error: configError,
    isFetching: configIsFetching,
    refetch: refetchConfig,
  } = useContactConfig(true);
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
  const repoMissing = repoUrlTouched && repoUrl.trim().length === 0;
  const repositoryExample = configuredRepo ?? "owner/repository";
  // Pull and Sync now act on the edited target, so the header says so
  // whenever that target is not the configured repository, or is unusable.
  const targetNote = repoUrlTouched && !normalizedRepo
    ? "Pull and Sync now stay off until Target Repository holds a repository (owner/repository)."
    : normalizedRepo && configuredRepo && normalizedRepo !== configuredRepo
      ? `Pull and Sync now target ${normalizedRepo}, not the configured repository.`
      : null;

  // A preview describes one repository; editing the target retires it.
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const currentPreview = preview && preview.repo === normalizedRepo ? preview : null;

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
    error: syncHistoryError,
    isFetching: syncHistoryIsFetching,
    refetch: refetchSyncHistory,
  } = useQuery<SyncHistory[]>({
    queryKey: ['/api/github/sync-history'],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const {
    data: syncQueueData,
    isLoading: syncQueueIsLoading,
    isError: syncQueueIsError,
    error: syncQueueError,
    isFetching: syncQueueIsFetching,
    refetch: refetchSyncQueue,
  } = useQuery<SyncQueueResponse>({
    queryKey: ['/api/github/sync-status'],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => query.state.data?.items.some(
      (item) => item.status === 'pending' || item.status === 'processing'
    ) ? 3000 : false,
  });

  useEffect(() => {
    if (syncQueueData) {
      void queryClient.invalidateQueries({ queryKey: ['/api/github/sync-history'] });
    }
  }, [syncQueueData, queryClient]);

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
      setPreview(null);
      void queryClient.invalidateQueries({ queryKey: ['/api/github/sync-history'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/github/sync-status'] });
      toast({
        title: "Import Started",
        description: `Importing resources from ${repoUrl}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: describeWriteError(error, { fallback: "Failed to start import", outcome: "The import may not have started. Check the sync history before trying again." }),
        variant: "destructive"
      });
    }
  });

  // The synchronous dry run writes nothing and answers with the plan. A plan
  // in which every item would fail comes back as 422 and is still a plan.
  const previewMutation = useMutation({
    mutationFn: async (repo: string): Promise<ImportPreview> => {
      const body = JSON.stringify({ repoUrl: repo, dryRun: true });
      let plan: ImportPlan;
      try {
        plan = await apiRequest('/api/admin/import-github', { method: 'POST', body }) as ImportPlan;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 422) throw error;
        plan = JSON.parse(error.body) as ImportPlan;
      }
      return { repo, previewedAt: new Date().toISOString(), plan };
    },
    onSuccess: (result) => setPreview(result),
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
      void queryClient.invalidateQueries({ queryKey: ['/api/github/sync-history'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/github/sync-status'] });
      toast({
        title: "Export Started",
        description: `Exporting resources to ${repoUrl}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: describeWriteError(error, { fallback: "Failed to start export", outcome: "The export may not have started. Check the sync history before trying again." }),
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
  const syncQueue = useMemo(() => syncQueueData?.items || [], [syncQueueData]);
  const pendingJobs = syncQueue.filter(item => item.status === 'pending' || item.status === 'processing').length;
  // Run16 BUG-015: a broken integration must be VISIBLE. Surface failed jobs
  // (e.g. "Bad credentials") prominently instead of hiding them — previously a
  // panel with 37 of 43 failed jobs looked perfectly healthy.
  const failedJobs = syncQueue.filter(item => item.status === 'failed');
  const latestFailure = failedJobs
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  // Only a failure that is still the newest finished job needs action; a
  // later success means the integration works again.
  const latestFinished = syncQueue
    .filter(item => item.status === 'completed' || item.status === 'failed')
    .sort((a, b) => new Date(b.processedAt ?? b.createdAt).getTime() - new Date(a.processedAt ?? a.createdAt).getTime())[0];
  const failureIsCurrent = latestFinished?.status === 'failed';

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
                {/* C4-V5B-01: the card describes the configured repository (its
                    branch, last sync and job count below), not the draft target. */}
                {configuredRepo || (configIsLoading ? "Loading repository…" : "Repository not configured")}
              </CardTitle>
              <p className="ops-github-panel__repository-meta">
                {configuredBranch} · {lastSync ? `last sync ${formatSyncDate(lastSync.createdAt)}` : "not synced yet"} · {syncQueueData?.total ?? 0} sync jobs
              </p>
              {targetNote && (
                <p
                  id="repo-target-note"
                  className={`ops-github-panel__repository-target${normalizedRepo ? "" : " ops-github-panel__repository-target--blocked"}`}
                  data-testid="text-repo-target"
                >
                  {targetNote}
                </p>
              )}
            </div>
            <div className="ops-github-panel__repository-actions">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => { if (normalizedRepo) previewMutation.mutate(normalizedRepo); }}
                  disabled={previewMutation.isPending || !normalizedRepo}
                  aria-describedby={targetNote ? "repo-target-note" : undefined}
                  data-testid="button-preview-import"
                >
                  {previewMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {previewMutation.isPending ? "Previewing..." : "Preview import"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmAction("import")}
                  disabled={importMutation.isPending || !normalizedRepo}
                  aria-describedby={targetNote ? "repo-target-note" : undefined}
                  data-testid="button-import-github"
                >
                  {importMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {importMutation.isPending ? "Importing..." : "Pull"}
                </Button>
                <Button
                  onClick={() => setConfirmAction("export")}
                  disabled={exportMutation.isPending || !normalizedRepo}
                  aria-describedby={targetNote ? "repo-target-note" : undefined}
                  data-testid="button-export-github"
                >
                  {exportMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {exportMutation.isPending ? "Exporting..." : "Sync now"}
                </Button>
              </div>
            </div>
          </div>
          {configIsError && !repoUrl && (
            <AdminLoadError
              subject="the repository settings"
              error={configError}
              note="Pull and export stay disabled until they load."
              onRetry={() => { void refetchConfig(); }}
              retrying={configIsFetching}
              testId="alert-github-config-error"
              retryTestId="button-retry-github-config"
            />
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
                className={`font-mono text-sm ${repoInvalid || repoMissing ? "border-destructive focus-visible:ring-destructive" : ""}`}
                aria-invalid={repoInvalid || repoMissing}
                aria-describedby={repoInvalid || repoMissing ? "repo-url-error" : undefined}
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
            {repoInvalid || repoMissing ? (
              <p id="repo-url-error" className="text-xs text-destructive" role="alert" data-testid="text-repo-url-error">
                {repoMissing ? "Enter a repository to pull from or sync to." : "Not a valid repository."}{" "}
                Use owner/repository (e.g., {repositoryExample}) or a github.com URL.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Format: owner/repository{configuredRepo ? ` (configured: ${configuredRepo})` : ""}
              </p>
            )}
          </div>}
          {(previewMutation.isPending || previewMutation.isError || preview) && (
            <section className="ops-github-panel__preview" aria-labelledby="import-preview-title" data-testid="import-preview">
              <h3 id="import-preview-title" className="ops-github-panel__preview-title">
                Import preview{currentPreview ? ` · ${currentPreview.repo}` : ""}
              </h3>
              <p role="status" className="ops-github-panel__preview-status" data-testid="text-import-preview-status">
                {previewMutation.isPending
                  ? `Reading ${previewMutation.variables} and planning the import. Nothing is written. This takes about 15 seconds.`
                  : currentPreview
                    ? `Dry run at ${formatSyncDate(currentPreview.previewedAt)}. Nothing was written. Pulling now would:`
                    : preview && !previewMutation.isError
                      ? `This preview was for ${preview.repo}. Preview ${normalizedRepo ?? "the new target"} to see its plan.`
                      : null}
              </p>
              {previewMutation.isError && !previewMutation.isPending && (
                <p role="alert" className="text-sm text-destructive" data-testid="text-import-preview-error">
                  The preview did not run. {describeWriteError(previewMutation.error, { fallback: "Failed to preview the import", outcome: "Nothing was written. Try the preview again." })}
                </p>
              )}
              {currentPreview && !previewMutation.isPending && (() => {
                const { plan } = currentPreview;
                const taxonomy = describeTaxonomyPlan(plan.wouldCreateTaxonomy);
                return (
                  <>
                    <dl className="ops-github-panel__preview-counts" data-testid="import-preview-counts">
                      <div><dt>Add</dt><dd>{plan.imported.toLocaleString()}</dd></div>
                      <div><dt>Update</dt><dd>{plan.updated.toLocaleString()}</dd></div>
                      <div><dt>Skip</dt><dd>{plan.skipped.toLocaleString()}</dd></div>
                      <div><dt>Fail</dt><dd>{plan.errors.length.toLocaleString()}</dd></div>
                    </dl>
                    <p className="text-sm" data-testid="text-import-preview-taxonomy">
                      {taxonomy ? `Create ${taxonomy}.` : "Create no new categories, subcategories or sub-subcategories."}
                    </p>
                    {plan.wouldCreateTaxonomy.length > 0 && (
                      <details className="ops-github-panel__preview-details">
                        <summary>Taxonomy it would create ({plan.wouldCreateTaxonomy.length})</summary>
                        <ul
                          className="ops-github-panel__preview-list ops-github-panel__preview-scroll"
                          tabIndex={0}
                          aria-label={`Taxonomy the import would create, ${plan.wouldCreateTaxonomy.length}, scrollable`}
                        >
                          {plan.wouldCreateTaxonomy.map((node) => (
                            <li key={`${node.level}|${node.parent ?? ""}|${node.name}`}>
                              {node.level} “{node.name}”{node.parent ? ` under “${node.parent}”` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {plan.errors.length > 0 && (
                      <details className="ops-github-panel__preview-details">
                        <summary>Items that would fail ({plan.errors.length})</summary>
                        <ul className="ops-github-panel__preview-list ops-github-panel__error-list">
                          {plan.errors.map((message, i) => <li key={i}>{message}</li>)}
                        </ul>
                      </details>
                    )}
                    {plan.warnings.length > 0 && (
                      <details className="ops-github-panel__preview-details">
                        <summary>Warnings ({plan.warnings.length})</summary>
                        <ul
                          className="ops-github-panel__preview-list ops-github-panel__preview-scroll"
                          tabIndex={0}
                          aria-label={`Import preview warnings, ${plan.warnings.length}, scrollable`}
                        >
                          {plan.warnings.map((message, i) => <li key={i}>{message}</li>)}
                        </ul>
                      </details>
                    )}
                  </>
                );
              })()}
            </section>
          )}
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
            {!syncQueue.length && !lastSync && !syncQueueIsError && !syncHistoryIsError && (
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
            {failedJobs.length > 0 && !failureIsCurrent && (
              <p className="text-sm text-muted-foreground" data-testid="note-earlier-sync-failures">
                {failedJobs.length} earlier sync job{failedJobs.length !== 1 ? 's' : ''} failed; the latest sync completed.
              </p>
            )}
            {failureIsCurrent && (
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
              const lastSyncPartial = lastSync.status === 'partial';
              return (
              <Alert variant={lastSyncFailed ? 'destructive' : undefined} data-testid="alert-last-sync">
                {lastSyncFailed || lastSyncPartial ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
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
                    {lastSync.status === 'partial' && (
                      <StatusChip status="partial" data-testid="badge-last-sync-partial">
                        partial · {lastSync.errorMessages?.length ?? 0} failed
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
                  {(lastSyncFailed || lastSyncPartial) && lastSync.errorMessage && (
                    <p className="text-sm font-mono text-destructive break-words">
                      Error: {lastSync.errorMessage}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <div className={"text-[var(--status-ok)] font-semibold" /* DS-OK: status ok */}>+{lastSync.resourcesAdded}</div>
                      <div className="text-xs text-muted-foreground">Added</div>
                    </div>
                    <div className="text-center">
                      <div className={"text-[var(--status-warn)] font-semibold" /* DS-OK: status warn */}>~{lastSync.resourcesUpdated}</div>
                      <div className="text-xs text-muted-foreground">Updated</div>
                    </div>
                    <div className="text-center">
                      <div className={"text-[var(--status-bad)] font-semibold" /* DS-OK: status bad */}>-{lastSync.resourcesRemoved}</div>
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
               <AdminLoadError
                 subject="the sync queue"
                 error={syncQueueError}
                 onRetry={() => { void refetchSyncQueue(); }}
                 retrying={syncQueueIsFetching}
                 testId="alert-sync-queue-error"
                 retryTestId="button-retry-sync-queue"
               />
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
                            {item.status === 'completed' && <CheckCircle2 className={"h-4 w-4 text-[var(--status-ok)]" /* DS-OK: status ok */} />}
                            {item.status === 'failed' && <XCircle className={"h-4 w-4 text-[var(--status-bad)]" /* DS-OK: status bad */} />}
                            {(item.status === 'pending' || item.status === 'processing') && (
                              <RefreshCw className={"h-4 w-4 text-[var(--status-warn)] animate-spin" /* DS-OK: status warn */} />
                            )}
                            <span className="font-medium capitalize">{item.action}</span>
                            {item.branch && (
                              <span className="font-mono text-xs text-muted-foreground" title="Branch recorded for this job">
                                {item.branch}
                              </span>
                            )}
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
                        {item.importResult && (
                          <p data-testid={`sync-queue-counts-${item.id}`}>
                            Imported: {item.importResult.imported ?? 0}; updated: {item.importResult.updated ?? 0}; skipped: {item.importResult.skipped ?? 0}; failed: {item.importResult.errors ?? 0}.
                          </p>
                        )}
                        {item.committedDespiteError && item.errorMessage && (
                          <p className="text-xs text-muted-foreground break-words pl-6" data-testid={`sync-queue-committed-note-${item.id}`}>
                            {item.errorMessage}
                          </p>
                        )}
                        {(item.status === 'failed' || item.status === 'partial') && (
                          item.importResult?.errorMessages && item.importResult.errorMessages.length > 0 ? (
                            <ul className="ops-github-panel__error-list" data-testid={`sync-queue-errors-${item.id}`}>
                              {item.importResult.errorMessages.map((message, i) => <li key={i}>{message}</li>)}
                            </ul>
                          ) : item.errorMessage ? (
                            <p className="text-xs font-mono text-destructive break-words pl-6">
                              {item.errorMessage}
                            </p>
                          ) : null
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
           <AdminLoadError
             subject="sync history"
             error={syncHistoryError}
             onRetry={() => { void refetchSyncHistory(); }}
             retrying={syncHistoryIsFetching}
             testId="alert-sync-history-error"
             retryTestId="button-retry-sync-history"
           />
         </TableShell>
       ) : syncHistory && syncHistory.length > 0 ? (
        <TableShell
          title="Sync jobs"
          sub={`${showDetails ? "All" : "Last"} ${visibleHistory.length} import/export operation${visibleHistory.length === 1 ? "" : "s"}`}
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
                       <TableCell className="font-mono text-xs">{sync.label}</TableCell>
                       <TableCell className="ops-github-panel__history-direction">
                         {sync.direction}
                      </TableCell>
                      <TableCell>
                         {sync.status && (
                           <StatusChip
                             status={sync.status}
                             title={sync.errorMessage}
                             data-testid={`badge-sync-history-status-${sync.id}`}
                           />
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                         <button
                           type="button"
                           className="btn ghost ops-github-panel__logs"
                           onClick={() => setSelectedHistory(sync)}
                           aria-label={`View logs for ${sync.direction} ${sync.label}`}
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
           sub="No import/export operations yet."
           className="ops-github-panel__history-shell"
         >
           <p className="ops-github-panel__history-empty" role="status">Start a pull or sync to see job details here.</p>
         </TableShell>
       )}

      <div className="admin-ops-more">
        <button
          type="button"
          className="btn ghost"
          onClick={() => setShowDetails((visible) => !visible)}
          aria-expanded={showDetails}
          data-testid="button-github-more"
        >
          {showDetails ? "Less" : "More"}
        </button>
      </div>

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
                  <span className="font-medium text-foreground">{normalizedRepo}</span>{" "}
                  and updates the database to match.{" "}
                  {currentPreview ? (
                    <span data-testid="text-import-plan">
                      The preview at {formatSyncDate(currentPreview.previewedAt)} found it would add{" "}
                      {currentPreview.plan.imported.toLocaleString()}, update {currentPreview.plan.updated.toLocaleString()} and
                      skip {currentPreview.plan.skipped.toLocaleString()} resources
                      {currentPreview.plan.errors.length ? `, with ${currentPreview.plan.errors.length.toLocaleString()} failing` : ""}
                      {describeTaxonomyPlan(currentPreview.plan.wouldCreateTaxonomy)
                        ? `, and create ${describeTaxonomyPlan(currentPreview.plan.wouldCreateTaxonomy)}`
                        : ", creating no new categories"}.
                      {" "}Edits since then can change these numbers.
                    </span>
                  ) : (
                    <span data-testid="text-import-plan">
                      New resources are added and existing ones may be updated. Cancel and
                      use Preview import to see how many before pulling.
                    </span>
                  )}
                </>
              ) : (
                <>
                  This pushes the approved catalog as a commit to{" "}
                  <span className="font-medium text-foreground">{normalizedRepo}</span>,
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
            <DialogTitle>Sync {selectedHistory?.label}</DialogTitle>
            <DialogDescription>
              {selectedHistory
                ? `${selectedHistory.direction === "export" ? "Export" : "Import"} · ${formatSyncDate(selectedHistory.createdAt)}${
                    // Name the repository: older runs may have targeted a
                    // different repo than the one configured today.
                    selectedHistory.repositoryUrl ? ` · ${normalizeGithubRepoInput(selectedHistory.repositoryUrl) ?? selectedHistory.repositoryUrl}` : ""
                  }`
                : "Sync job details"}
            </DialogDescription>
          </DialogHeader>
          {selectedHistory && (
            <dl className="grid grid-cols-1 gap-3 text-sm">
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
                  <dd className="whitespace-pre-wrap rounded border p-2 font-mono text-xs [overflow-wrap:anywhere]">{selectedHistory.commitMessage}</dd>
                </div>
              )}
              {selectedHistory.errorMessages && selectedHistory.errorMessages.length > 0 ? (
                <div role="alert">
                  <dt className="mb-1 text-destructive">
                    {selectedHistory.status === "partial"
                      ? `Failed items (${selectedHistory.errorMessages.length})`
                      : `Errors (${selectedHistory.errorMessages.length})`}
                  </dt>
                  <dd className="rounded border border-destructive/40 bg-destructive/10 p-2 font-mono text-xs [overflow-wrap:anywhere]">
                    <ul className="ops-github-panel__error-list" data-testid="sync-history-error-list">
                      {selectedHistory.errorMessages.map((message, i) => <li key={i}>{message}</li>)}
                    </ul>
                  </dd>
                </div>
              ) : selectedHistory.errorMessage ? (
                <div role="alert">
                  <dt className="mb-1 text-destructive">Error</dt>
                  <dd className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded border border-destructive/40 bg-destructive/10 p-2 font-mono text-xs [overflow-wrap:anywhere]">
                    {selectedHistory.errorMessage}
                  </dd>
                </div>
              ) : null}
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
