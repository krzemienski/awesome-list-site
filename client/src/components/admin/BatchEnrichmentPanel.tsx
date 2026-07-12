import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Play, 
  XCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Info,
  Eye,
  Activity,
  Settings2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Server,
  KeyRound
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AgentEventLog } from "@/components/admin/AgentEventLog";
import { AgentCommsGraph } from "@/components/admin/AgentCommsGraph";
import type { EnrichmentJob } from "@shared/schema";

interface JobsResponse {
  success: boolean;
  jobs: EnrichmentJob[];
}

interface JobStatusResponse {
  success: boolean;
  job: EnrichmentJob;
}

export default function BatchEnrichmentPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filter, setFilter] = useState<'all' | 'unenriched'>('unenriched');
  const [batchSize, setBatchSize] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  // R2-H04 companion: cancel-job confirmation via AlertDialog, not confirm().
  const [jobToCancel, setJobToCancel] = useState<number | null>(null);

  const [isPolling, setIsPolling] = useState(false);

  const { data: jobsData, isLoading } = useQuery<JobsResponse>({
    queryKey: ['/api/enrichment/jobs'],
    refetchInterval: isPolling ? 3000 : false
  });

  const { data: selectedJobData } = useQuery<JobStatusResponse>({
    queryKey: ['/api/enrichment/jobs', selectedJobId],
    enabled: !!selectedJobId && isDetailsModalOpen,
    // Explicit queryFn — the default fetcher only reads queryKey[0] and would
    // hit the LIST endpoint, leaving selectedJobData.job undefined (stats +
    // config would all render defaults).
    queryFn: async () => {
      const res = await fetch(`/api/enrichment/jobs/${selectedJobId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch enrichment job ${selectedJobId}: ${res.status}`);
      return res.json();
    },
    refetchInterval: isDetailsModalOpen ? 5000 : false
  });

  const startMutation = useMutation({
    mutationFn: async (config: {
      filter: 'all' | 'unenriched';
      batchSize: number;
      model?: string;
      baseUrl?: string;
      authToken?: string;
    }) => {
      return await apiRequest('/api/enrichment/start', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },
    onSuccess: () => {
      setIsPolling(true);
      setAuthToken("");
      queryClient.invalidateQueries({ queryKey: ['/api/enrichment/jobs'] });
      toast({
        title: "Batch enrichment started",
        description: "AI enrichment job has been queued successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start enrichment",
        description: error.message || "An error occurred while starting the job.",
        variant: "destructive"
      });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest(`/api/enrichment/jobs/${jobId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enrichment/jobs'] });
      toast({
        title: "Job cancelled",
        description: "Enrichment job has been cancelled."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel job",
        description: error.message || "An error occurred while cancelling the job.",
        variant: "destructive"
      });
    }
  });

  const jobs = jobsData?.jobs || [];
  const activeJob = jobs.find(job => job.status === 'processing');
  const hasActiveJob = !!activeJob;

  useEffect(() => {
    setIsPolling(hasActiveJob);
  }, [hasActiveJob]);

  const handleStartEnrichment = () => {
    if (batchSize < 1 || batchSize > 50) {
      toast({
        title: "Invalid batch size",
        description: "Batch size must be between 1 and 50.",
        variant: "destructive"
      });
      return;
    }
    startMutation.mutate({
      filter,
      batchSize,
      model: model.trim() || undefined,
      baseUrl: baseUrl.trim() || undefined,
      authToken: authToken.trim() || undefined,
    });
  };

  const handleViewDetails = (jobId: number) => {
    setSelectedJobId(jobId);
    setIsDetailsModalOpen(true);
  };

  const handleCancelJob = (jobId: number) => {
    setJobToCancel(jobId);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'outline';
    }
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
        return 'bg-gray-600 text-white hover:bg-gray-700'; /* WP-6 a11y: gray-500 + --text was ~4.4:1; gray-600 + white is ~7.6:1 */
      default:
        return '';
    }
  };

  const calculateSuccessRate = (job: EnrichmentJob) => {
    const total = job.processedResources || 0;
    if (total === 0) return 0;
    return Math.round(((job.successfulResources || 0) / total) * 100);
  };

  const calculateProgress = (job: EnrichmentJob) => {
    if (!job.totalResources || job.totalResources === 0) return 0;
    return Math.round(((job.processedResources || 0) / job.totalResources) * 100);
  };

  // R2-M04: some legacy jobs recorded processed > total (retries were counted
  // twice). Clamp the DISPLAYED processed count so the table never shows
  // impossible "49 / 32" style figures; the raw values stay in the DB.
  const displayProcessed = (job: EnrichmentJob) => {
    const total = job.totalResources || 0;
    const processed = job.processedResources || 0;
    return total > 0 ? Math.min(processed, total) : processed;
  };

  // R2-M06: a "completed" job in which every processed resource failed is a
  // failure from the operator's perspective — badge it as failed.
  const effectiveStatus = (job: EnrichmentJob) => {
    if (
      job.status === 'completed' &&
      (job.processedResources || 0) > 0 &&
      (job.successfulResources || 0) === 0
    ) {
      return 'failed';
    }
    return job.status;
  };

  const estimateTimeRemaining = (job: EnrichmentJob) => {
    if (!job.startedAt || !job.processedResources || job.processedResources === 0) {
      return 'Calculating...';
    }
    
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    const avgTimePerResource = elapsed / job.processedResources;
    const remaining = (job.totalResources || 0) - job.processedResources;
    const estimatedMs = avgTimePerResource * remaining;
    
    const minutes = Math.floor(estimatedMs / 60000);
    const seconds = Math.floor((estimatedMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s`;
    }
    return `~${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Job Control
          </CardTitle>
          <CardDescription>
            Configure and start a new batch enrichment job
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter">Filter</Label>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as 'all' | 'unenriched')}
                disabled={hasActiveJob}
              >
                <SelectTrigger id="filter" data-testid="select-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  <SelectItem value="unenriched">Unenriched Only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose which resources to enrich
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-size">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                min={1}
                max={50}
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                disabled={hasActiveJob}
                data-testid="input-batch-size"
              />
              <p className="text-xs text-muted-foreground">
                Resources per batch (1-50)
              </p>
            </div>
          </div>

          <div className="rounded-md border">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50"
              disabled={hasActiveJob}
              data-testid="button-toggle-advanced-enrichment"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                Custom Model &amp; Endpoint (optional)
              </span>
              {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="space-y-3 border-t px-3 py-3">
                <div className="space-y-2">
                  <Label htmlFor="enrich-model" className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-muted-foreground" />Model
                  </Label>
                  <Input
                    id="enrich-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="claude-haiku-4-5 (default)"
                    className="font-mono text-xs"
                    disabled={hasActiveJob}
                    data-testid="input-enrich-model"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enrich-baseurl" className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-muted-foreground" />Base URL
                  </Label>
                  <Input
                    id="enrich-baseurl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.anthropic.com (default)"
                    className="font-mono text-xs"
                    disabled={hasActiveJob}
                    data-testid="input-enrich-baseurl"
                  />
                  <p className="text-[11px] text-muted-foreground">Must be https and requires an auth token below. Leave blank to use the platform endpoint.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enrich-token" className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />Auth Token
                  </Label>
                  <Input
                    id="enrich-token"
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Required if a base URL is set (blank = platform key)"
                    className="font-mono text-xs"
                    autoComplete="off"
                    disabled={hasActiveJob}
                    data-testid="input-enrich-token"
                  />
                  <p className="text-[11px] text-muted-foreground">Encrypted at rest (AES-256-GCM). Only the last 4 characters are ever shown afterwards.</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Button
              onClick={handleStartEnrichment}
              disabled={hasActiveJob || startMutation.isPending}
             
              data-testid="button-start-enrichment"
            >
              {startMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Enrichment
                </>
              )}
            </Button>
            
            {hasActiveJob && (
              <Alert className="flex-1 ml-4 border-yellow-500/20 bg-yellow-500/5">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A job is currently running. Please wait for it to complete.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {activeJob && (
        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                Active Job Monitor
              </span>
              <Badge className="bg-blue-500 hover:bg-blue-600 animate-pulse">
                Processing
              </Badge>
            </CardTitle>
            <CardDescription>
              Job #{activeJob.id} - Real-time progress tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-mono font-semibold">
                  {calculateProgress(activeJob)}%
                </span>
              </div>
              <Progress 
                value={calculateProgress(activeJob)} 
                className="h-2"
                data-testid="progress-bar"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold font-mono">
                  {activeJob.processedResources || 0} / {activeJob.totalResources || 0}
                </div>
                <div className="text-xs text-muted-foreground">Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-green-500">
                  {activeJob.successfulResources || 0}
                </div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-red-500">
                  {activeJob.failedResources || 0}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-yellow-500">
                  {activeJob.skippedResources || 0}
                </div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Estimated time remaining: {estimateTimeRemaining(activeJob)}
              </div>
              <Button
                onClick={() => handleCancelJob(activeJob.id)}
                variant="destructive"
                size="sm"
                disabled={cancelMutation.isPending}
                data-testid={`button-cancel-job-${activeJob.id}`}
              >
                {cancelMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Job
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Job History
            </span>
            {jobs.length > 0 && (
              <Badge variant="outline">
                {jobs.length} total jobs
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Complete history of all enrichment jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No enrichment jobs found. Start your first job above.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-center">Processed</TableHead>
                    <TableHead className="text-center">Success Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono">#{job.id}</TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(effectiveStatus(job))}
                          className={getStatusBadgeClassName(effectiveStatus(job))}
                          data-testid={`status-badge-${job.id}`}
                        >
                          {effectiveStatus(job) === 'processing' && (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          {effectiveStatus(job) === 'completed' && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {effectiveStatus(job) === 'failed' && (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {effectiveStatus(job)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {job.startedAt 
                          ? new Date(job.startedAt).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {job.completedAt 
                          ? new Date(job.completedAt).toLocaleString()
                          : job.status === 'processing' ? 'In progress...' : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {displayProcessed(job)} / {job.totalResources || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {(job.processedResources || 0) === 0 ? (
                          /* R2-M05: no resources processed → no meaningful rate. */
                          <Badge variant="outline" className="text-muted-foreground">
                            N/A
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={
                            calculateSuccessRate(job) >= 90 ? 'border-green-500 text-green-500' :
                            calculateSuccessRate(job) >= 70 ? 'border-yellow-500 text-yellow-500' :
                            'border-red-500 text-red-500'
                          }>
                            {calculateSuccessRate(job)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleViewDetails(job.id)}
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-details-${job.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Job Details #{selectedJobId}
            </DialogTitle>
          </DialogHeader>
          
          {selectedJobData?.job && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Configuration
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Filter</div>
                      <div className="font-mono">{selectedJobData.job.filter || 'all'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Batch Size</div>
                      <div className="font-mono">{selectedJobData.job.batchSize || 10}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Model</div>
                      <div className="font-mono">{selectedJobData.job.model || 'claude-haiku-4-5 (default)'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Base URL</div>
                      <div className="font-mono break-all">{selectedJobData.job.baseUrl || 'Platform default'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Auth Token</div>
                      <div className="font-mono">{selectedJobData.job.authTokenLast4 ? `••••${selectedJobData.job.authTokenLast4}` : 'Platform key'}</div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold font-mono">
                        {selectedJobData.job.totalResources || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold font-mono">
                        {selectedJobData.job.processedResources || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Processed</div>
                    </div>
                    <div className="text-center p-3 border rounded border-green-500/20">
                      <div className="text-2xl font-bold font-mono text-green-500">
                        {selectedJobData.job.successfulResources || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Successful</div>
                    </div>
                    <div className="text-center p-3 border rounded border-red-500/20">
                      <div className="text-2xl font-bold font-mono text-red-500">
                        {selectedJobData.job.failedResources || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-3 border rounded border-yellow-500/20">
                      <div className="text-2xl font-bold font-mono text-yellow-500">
                        {selectedJobData.job.skippedResources || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    </div>
                  </div>
                </div>

                {selectedJobData.job.processedResourceIds && selectedJobData.job.processedResourceIds.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Processed Resources ({selectedJobData.job.processedResourceIds.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJobData.job.processedResourceIds.slice(0, 50).map((id) => (
                          <Badge key={id} variant="outline" className="font-mono">
                            #{id}
                          </Badge>
                        ))}
                        {selectedJobData.job.processedResourceIds.length > 50 && (
                          <Badge variant="secondary">
                            +{selectedJobData.job.processedResourceIds.length - 50} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedJobData.job.failedResourceIds && selectedJobData.job.failedResourceIds.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Failed Resources ({selectedJobData.job.failedResourceIds.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJobData.job.failedResourceIds.slice(0, 50).map((id) => (
                          <Badge key={id} variant="destructive" className="font-mono">
                            #{id}
                          </Badge>
                        ))}
                        {selectedJobData.job.failedResourceIds.length > 50 && (
                          <Badge variant="secondary">
                            +{selectedJobData.job.failedResourceIds.length - 50} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedJobData.job.errorMessage && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-500">
                        <AlertCircle className="h-4 w-4" />
                        Error Message
                      </h3>
                      <Alert variant="destructive">
                        <AlertDescription className="font-mono text-sm">
                          {selectedJobData.job.errorMessage}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </>
                )}

                {selectedJobId && (
                  <>
                    <Separator />
                    <AgentCommsGraph
                      jobType="enrichment"
                      jobId={selectedJobId}
                      isActive={selectedJobData.job.status === 'processing' || selectedJobData.job.status === 'pending'}
                    />
                    <Separator />
                    <AgentEventLog
                      jobType="enrichment"
                      jobId={selectedJobId}
                      isActive={selectedJobData.job.status === 'processing' || selectedJobData.job.status === 'pending'}
                    />
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={jobToCancel !== null} onOpenChange={(open) => { if (!open) setJobToCancel(null); }}>
        <AlertDialogContent data-testid="dialog-cancel-job">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this enrichment job?</AlertDialogTitle>
            <AlertDialogDescription>
              Job #{jobToCancel} will stop processing. Resources already enriched
              keep their metadata; unprocessed resources stay unchanged. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-job-dismiss">Keep running</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (jobToCancel !== null) { cancelMutation.mutate(jobToCancel); setJobToCancel(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-cancel-job-confirm"
            >
              Cancel job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
