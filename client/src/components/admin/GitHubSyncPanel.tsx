import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Download, Upload, RefreshCw, CheckCircle2, XCircle, Clock, ExternalLink, Activity } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Run15 BUG-030: one explicit date format for the whole admin surface —
// shared formatter keeps every admin table's timestamps identical.
import { formatAdminDateTime as formatSyncDate } from "@/lib/utils";

interface SyncHistory {
  id: number;
  direction: string;
  commitSha?: string;
  commitMessage?: string;
  commitUrl?: string;
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
  const [repoUrl, setRepoUrl] = useState("krzemienski/awesome-video");
  // Run16 BUG-039: import rewrites the local catalog and export pushes a real
  // commit — both need an explicit confirmation step before firing.
  const [confirmAction, setConfirmAction] = useState<"import" | "export" | null>(null);

  const { data: syncHistory } = useQuery<SyncHistory[]>({
    queryKey: ['/api/github/sync-history'],
  });

  const { data: syncQueueData } = useQuery<SyncQueueResponse>({
    queryKey: ['/api/github/sync-status'],
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/github/import', {
        method: 'POST',
        body: JSON.stringify({
          repositoryUrl: repoUrl,
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
          repositoryUrl: repoUrl,
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

  const lastSync = syncHistory?.[0];
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
    return Array.from(map.values());
  }, [syncQueue]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            GitHub Sync
          </CardTitle>
          <CardDescription>
            Import resources from and export to GitHub repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">Target Repository</Label>
            <div className="flex gap-2">
              <Input
                id="repo-url"
                placeholder="owner/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="font-mono text-sm"
                data-testid="input-repo-url"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRepoUrl("krzemienski/awesome-video")}
                title="Reset to default"
                data-testid="button-reset-repo"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: owner/repository (e.g., krzemienski/awesome-video)
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Download className="h-4 w-4" />
                Import from GitHub
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Pull resources from the GitHub repository and update the database
              </p>
              <Button
                onClick={() => setConfirmAction("import")}
                disabled={importMutation.isPending || !repoUrl}
                className="w-full"
                data-testid="button-import-github"
              >
                {importMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import Resources
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Export to GitHub
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Push approved resources to GitHub README with smart commit message
              </p>
              <Button
                onClick={() => setConfirmAction("export")}
                disabled={exportMutation.isPending || !repoUrl}
                className="w-full"
                data-testid="button-export-github"
              >
                {exportMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Export to GitHub
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {(syncQueue.length > 0 || lastSync) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sync Status
              </span>
              <span className="flex items-center gap-2">
                {failedJobs.length > 0 && (
                  <Badge variant="destructive" data-testid="badge-failed-jobs">
                    <XCircle className="h-3 w-3 mr-1" />
                    {failedJobs.length} failed
                  </Badge>
                )}
                {pendingJobs > 0 && (
                  <Badge variant="secondary" className="animate-pulse">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    {pendingJobs} in progress
                  </Badge>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  {/* Run17 BUG-031: failure state gives concrete next steps. */}
                  <p className="text-xs">
                    Next steps: if errors mention credentials or tokens, reconnect
                    the GitHub connection. "Timeout exceeded when trying to
                    connect" came from an export bookkeeping bug that has been
                    fixed — start a new export to confirm; older failed jobs can
                    be ignored.
                  </p>
                </AlertDescription>
              </Alert>
            )}
            {lastSync && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                        Last {lastSync.direction === 'export' ? 'Export' : 'Import'}
                    </span>
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
                  
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-green-500 font-semibold">+{lastSync.resourcesAdded}</div>
                      <div className="text-xs text-muted-foreground">Added</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-500 font-semibold">~{lastSync.resourcesUpdated}</div>
                      <div className="text-xs text-muted-foreground">Updated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-500 font-semibold">-{lastSync.resourcesRemoved}</div>
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
            )}

            {syncQueue && syncQueue.length > 0 && (
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
                            {item.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {item.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                            {(item.status === 'pending' || item.status === 'processing') && (
                              <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
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
                          <Badge variant={
                            item.status === 'completed' ? 'default' :
                            item.status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {item.status}
                          </Badge>
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
        </Card>
      )}

      {syncHistory && syncHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sync History
            </CardTitle>
            <CardDescription>
              Complete history of GitHub synchronizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {syncHistory.map((sync) => (
                  <div key={sync.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {sync.direction === 'export' ? (
                          <Upload className="h-4 w-4 text-primary" />
                        ) : (
                          <Download className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-semibold capitalize">{sync.direction}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatSyncDate(sync.createdAt)}
                      </span>
                    </div>
                    
                    {sync.commitMessage && (
                      <p className="text-sm font-mono bg-muted p-2 rounded">
                        {sync.commitMessage}
                      </p>
                    )}
                    
                    <div className="flex gap-4 text-xs">
                      <span className="text-green-500">+{sync.resourcesAdded}</span>
                      <span className="text-yellow-500">~{sync.resourcesUpdated}</span>
                      <span className="text-red-500">-{sync.resourcesRemoved}</span>
                      <span className="text-muted-foreground">{sync.totalResources} total</span>
                    </div>

                    {sync.commitUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs"
                        asChild
                      >
                        <a href={sync.commitUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on GitHub
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
