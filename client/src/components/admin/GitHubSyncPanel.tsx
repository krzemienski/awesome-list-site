import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Download, Upload, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, ExternalLink, Activity } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importMessage, setImportMessage] = useState<string>('');
  const [deviations, setDeviations] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch sync history
  const { data: syncHistory } = useQuery<SyncHistory[]>({
    queryKey: ['/api/github/sync-history'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch sync queue status
  const { data: syncQueueResponse } = useQuery<SyncQueueResponse>({
    queryKey: ['/api/github/sync-status'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });
  const syncQueue = syncQueueResponse?.items;

  // SSE Import with progress
  const startStreamingImport = async () => {
    setIsStreaming(true);
    setImportProgress(0);
    setImportStatus('fetching');
    setDeviations([]);
    setWarnings([]);

    try {
      const response = await fetch('/api/github/import-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl: repoUrl.startsWith('http') ? repoUrl : `https://github.com/${repoUrl}`,
          options: { forceOverwrite: false }
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            setImportProgress(data.progress || 0);
            setImportStatus(data.status || '');
            setImportMessage(data.message || '');

            if (data.deviations) setDeviations(data.deviations);
            if (data.warnings) setWarnings(data.warnings);

            if (data.status === 'complete') {
              queryClient.invalidateQueries({ queryKey: ['/api/github/sync-history'] });
              queryClient.invalidateQueries({ queryKey: ['/api/github/sync-status'] });
              toast({
                title: 'Import Complete!',
                description: `Imported: ${data.imported}, Updated: ${data.updated}, Skipped: ${data.skipped}`,
              });
              setIsStreaming(false);
            } else if (data.status === 'error') {
              toast({
                title: 'Import Failed',
                description: data.message,
                variant: 'destructive',
              });
              setIsStreaming(false);
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to start import',
        variant: 'destructive',
      });
      setIsStreaming(false);
    }
  };

  // Import mutation (legacy, keep for backward compatibility)
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/github/sync-status'] });
      toast({
        title: "Import Started",
        description: `Importing resources from ${repoUrl}`,
      });
    },
    onError: (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to start import",
        variant: "destructive"
      });
    }
  });

  // Export mutation
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/github/sync-status'] });
      toast({
        title: "Export Started",
        description: `Exporting resources to ${repoUrl}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to start export",
        variant: "destructive"
      });
    }
  });

  const lastSync = syncHistory?.[0];
  const pendingJobs = syncQueue?.filter(item => item.status === 'pending' || item.status === 'processing').length || 0;

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            GitHub Repository Configuration
          </CardTitle>
          <CardDescription>
            Configure the awesome list repository for bidirectional synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repo-url">Repository URL</Label>
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

          {/* Sync Actions */}
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
                onClick={() => startStreamingImport()}
                disabled={isStreaming || !repoUrl}
                className="w-full"
                data-testid="button-import-github"
              >
                {isStreaming ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing... {importProgress}%
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import Resources
                  </>
                )}
              </Button>

              {/* Progress Bar */}
              {isStreaming && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{importMessage}</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Status: {importStatus}</p>
                </div>
              )}

              {/* Deviation Warnings */}
              {(deviations.length > 0 || warnings.length > 0) && (
                <Card className="mt-4 border-yellow-500 bg-yellow-500/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Format Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {deviations.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1">Deviations:</p>
                        <ul className="text-xs space-y-1">
                          {deviations.map((dev, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-yellow-500">⚠️</span>
                              <span>{dev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {warnings.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1">Warnings:</p>
                        <ul className="text-xs space-y-1">
                          {warnings.map((warn, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-blue-500">ℹ️</span>
                              <span>{warn}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
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
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending || !repoUrl}
                className="w-full"
                variant="default"
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

      {/* Sync Status Card */}
      {(pendingJobs > 0 || lastSync) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sync Status
              </span>
              {pendingJobs > 0 && (
                <Badge variant="secondary" className="animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  {pendingJobs} in progress
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                      {new Date(lastSync.createdAt).toLocaleString()}
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
                      <div className="text-cyan-500 font-semibold">{lastSync.totalResources}</div>
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

            {/* Sync Queue */}
            {syncQueue && syncQueue.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Recent Sync Jobs</h4>
                <ScrollArea className="h-[200px] rounded border">
                  <div className="p-2 space-y-2">
                    {syncQueue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {item.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {item.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          {(item.status === 'pending' || item.status === 'processing') && (
                            <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
                          )}
                          <span className="font-medium capitalize">{item.action}</span>
                        </div>
                        <Badge variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'failed' ? 'destructive' :
                          'secondary'
                        }>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync History Card */}
      {syncHistory && syncHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sync History
            </CardTitle>
            <CardDescription>
              Complete history of all GitHub synchronizations
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
                          <Upload className="h-4 w-4 text-cyan-500" />
                        ) : (
                          <Download className="h-4 w-4 text-pink-500" />
                        )}
                        <span className="font-semibold capitalize">{sync.direction}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sync.createdAt).toLocaleString()}
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
    </div>
  );
}
