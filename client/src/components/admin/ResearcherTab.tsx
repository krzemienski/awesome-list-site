import { useState, useEffect, Fragment } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentEventLog } from "@/components/admin/AgentEventLog";
import { AgentCommsGraph } from "@/components/admin/AgentCommsGraph";
import {
  Search,
  Play,
  XCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Brain,
  ExternalLink,
  Activity,
  Zap,
  Settings2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Server,
  KeyRound,
} from "lucide-react";
import { formatAdminDate } from "@/lib/utils";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ResearchJob, ResearchDiscovery } from "@shared/schema";

function getStatusBadge(status: string) {
  switch (status) {
    case "processing":
      return <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Activity className="w-3 h-3 mr-1 animate-pulse" />Running</Badge>;
    case "completed":
      return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    case "failed":
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
    default:
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
  }
}

// Run16 BUG-026: raw SDK failures like "Claude Code process exited with code 1"
// are meaningless to an admin. Map known patterns to a plain-language
// explanation while keeping the raw text for debugging.
function humanizeJobError(msg: string): string {
  if (/exited with code \d+/i.test(msg) || /process exited/i.test(msg)) {
    return `The research agent crashed before finishing. This is usually transient — try launching the job again; if it keeps happening, lower the budget/turn limits. (Technical detail: ${msg})`;
  }
  if (/abort/i.test(msg)) {
    return `The job was stopped before it could finish. (Technical detail: ${msg})`;
  }
  return msg;
}

// NB-033 (run18): one cost formatter — always $X.XXXX (4 decimals) so the cost
// column/detail never mixes $0.00 / $0.0000 / $12.3801 representations.
function formatCost(value: string | number | null | undefined): string {
  return `$${Number(value ?? 0).toFixed(4)}`;
}

function getDiscoveryStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "approved":
      return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30"><ThumbsUp className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive"><ThumbsDown className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ResearcherTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState("Find new, high-quality video streaming and development resources that aren't already in our database. Focus on recently launched tools, libraries, and platforms.");
  const [categoryFocus, setCategoryFocus] = useState("");
  const [maxBudget, setMaxBudget] = useState("1.00");
  // R4-052: keep the raw input string (like maxBudget) instead of a number so
  // typing "5.5" or "0" is never silently rewritten to 5 / 30 — validation
  // feedback is shown instead (see the hint below the field + handleLaunch).
  const [maxTurns, setMaxTurns] = useState("30");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [rejectDialogId, setRejectDialogId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  // Run23 NB-040: launching a paid research job needs an explicit confirmation
  // step (same AlertDialog pattern as GitHub import/export).
  const [confirmLaunch, setConfirmLaunch] = useState(false);

  const [isPolling, setIsPolling] = useState(false);

  // Run23 NB-039: the endpoint returns { jobs, total } so the history table
  // can say "showing latest 20 of N" instead of silently truncating.
  const { data: jobsData, isLoading: jobsLoading } = useQuery<{ jobs: ResearchJob[]; total: number }>({
    queryKey: ['/api/researcher/jobs'],
    refetchInterval: isPolling ? 3000 : false,
  });
  const jobs = jobsData?.jobs;
  const jobsTotal = jobsData?.total ?? 0;

  const { data: selectedJob } = useQuery<ResearchJob & { isActive: boolean }>({
    queryKey: ['/api/researcher/jobs', selectedJobId],
    enabled: !!selectedJobId,
    // Explicit queryFn — the default fetcher only reads queryKey[0] and would
    // hit the LIST endpoint instead of /jobs/:id, leaving the popover bound
    // to an array (everything undefined → "No log entries" forever).
    queryFn: async () => {
      const res = await fetch(`/api/researcher/jobs/${selectedJobId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch job ${selectedJobId}: ${res.status}`);
      return res.json();
    },
    refetchInterval: (query) => {
      const j = query.state.data as ResearchJob | undefined;
      // Stream while job is still running, even if dialog is closed.
      if (j && j.status === 'processing') return 2000;
      if (showJobDetails) return 3000;
      return false;
    },
  });

  const { data: pendingDiscoveries } = useQuery<ResearchDiscovery[]>({
    queryKey: ['/api/researcher/discoveries'],
    refetchInterval: isPolling ? 10000 : false,
  });

  const { data: jobDiscoveries } = useQuery<ResearchDiscovery[]>({
    queryKey: ['/api/researcher/discoveries', selectedJobId ? `?jobId=${selectedJobId}` : ''],
    enabled: !!selectedJobId && showJobDetails,
    queryFn: async () => {
      const res = await fetch(`/api/researcher/discoveries?jobId=${selectedJobId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  // R4-033 (run21): same cache entry as App.tsx — no second catalog download.
  const { data: categoriesData } = useQuery<any>({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });

  const categoryNames = categoriesData?.categories
    ? categoriesData.categories.map((c: any) => c.name || c.title)
    : [];

  const startMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/researcher/start', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          categoryFocus: categoryFocus && categoryFocus !== 'all' ? categoryFocus : undefined,
          maxBudgetUsd: maxBudget,
          maxTurns: Number(maxTurns),
          model: model.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
          authToken: authToken.trim() || undefined,
        }),
      });
    },
    onSuccess: (data: any) => {
      setIsPolling(true);
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/discoveries'] });
      // Auto-open the live log so the admin can see exactly what's happening.
      if (data?.jobId) {
        setSelectedJobId(data.jobId);
        setShowJobDetails(true);
      }
      setAuthToken("");
      toast({ title: `Research job #${data?.jobId ?? ''} started`, description: "Live log opened — streaming updates every 2s." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start research", description: error.message, variant: "destructive" });
    },
  });

  // Run16 BUG-008: the launch button used to fire even while the native
  // number inputs were flagged invalid (budget $0 jobs got created). Block
  // submission client-side, mirroring the server's min-$0.25 / 5–100 ranges
  // (Run20: no upper budget cap per user request).
  const handleLaunch = () => {
    // R4-051: the min-length rule used to only manifest as a disabled button
    // with no explanation — clicking a short prompt now yields explicit feedback
    // (a hint under the field covers the before-submit case).
    if (prompt.trim().length < 10) {
      toast({
        title: "Prompt too short",
        description: "The research prompt must be at least 10 characters.",
        variant: "destructive",
      });
      return;
    }
    const budget = Number(maxBudget);
    if (!Number.isFinite(budget) || budget < 0.25) {
      toast({
        title: "Invalid budget",
        description: "Budget must be at least $0.25.",
        variant: "destructive",
      });
      return;
    }
    // R4-052: reject out-of-range / non-integer turns with a message instead of
    // silently coercing them (5.5 → 5, 0 → 30).
    const turns = Number(maxTurns);
    if (maxTurns.trim() === "" || !Number.isInteger(turns) || turns < 5 || turns > 100) {
      toast({
        title: "Invalid max turns",
        description: "Max turns must be a whole number between 5 and 100.",
        variant: "destructive",
      });
      return;
    }
    // Run23 NB-040: don't fire the job from the raw click — open an explicit
    // confirmation dialog first.
    setConfirmLaunch(true);
  };

  const cancelMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest(`/api/researcher/jobs/${jobId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      toast({ title: "Job cancelled" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (discoveryId: number) => {
      return await apiRequest(`/api/researcher/discoveries/${discoveryId}/approve`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/discoveries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      toast({ title: "Resource approved", description: "Discovery added to the database." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      return await apiRequest(`/api/researcher/discoveries/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/discoveries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      setRejectDialogId(null);
      setRejectReason("");
      toast({ title: "Discovery rejected" });
    },
  });

  const activeJobs = jobs?.filter(j => j.status === 'processing') || [];

  useEffect(() => {
    const hasActive = activeJobs.length > 0;
    if (hasActive !== isPolling) {
      setIsPolling(hasActive);
    }
  }, [activeJobs.length]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="launch" className="w-full">
        {/* Run16 BUG-030: wrap at narrow widths — the fixed inline-flex bar
            was 465px wide and pushed "Job History" off-screen at 375px. */}
        <TabsList className="mb-4 flex flex-wrap h-auto w-full justify-start gap-1">
          <TabsTrigger value="launch"><Brain className="w-4 h-4 mr-1" />Launch Research</TabsTrigger>
          <TabsTrigger value="review">
            <Search className="w-4 h-4 mr-1" />Review Discoveries
            {pendingDiscoveries && pendingDiscoveries.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{pendingDiscoveries.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history"><Clock className="w-4 h-4 mr-1" />Job History</TabsTrigger>
        </TabsList>

        <TabsContent value="launch">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />New Research Job</CardTitle>
                <CardDescription>Configure and launch an AI researcher to discover new video streaming resources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Research Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what types of resources to search for..."
                    className="mt-1 min-h-[100px]"
                  />
                  {/* R4-051: surface the ≥10-char rule up front instead of only
                      as a mysteriously disabled Launch button. */}
                  <p
                    className={`text-xs mt-1 ${prompt.trim().length < 10 ? "text-yellow-500" : "text-muted-foreground"}`}
                    data-testid="text-prompt-hint"
                  >
                    {prompt.trim().length < 10
                      ? `At least 10 characters required (${prompt.trim().length}/10).`
                      : `${prompt.trim().length} characters`}
                  </p>
                </div>

                <div>
                  <Label>Category Focus (Optional)</Label>
                  <Select value={categoryFocus} onValueChange={setCategoryFocus}>
                    <SelectTrigger className="mt-1" aria-label="Category focus">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categoryNames.map((name: string) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget (USD)</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="budget"
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(e.target.value)}
                      />
                    </div>
                    {(() => {
                      const b = Number(maxBudget);
                      if (!Number.isFinite(b) || b < 0.25) return null;
                      const cap = Math.max(10, Math.min(1000, Math.round(b * 5)));
                      return (
                        <p className="text-xs text-muted-foreground mt-1" data-testid="text-discovery-cap">
                          Up to {cap} discoveries this run{cap === 1000 ? " (maximum per run)" : ""}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <Label htmlFor="turns">Max Turns</Label>
                    <Input
                      id="turns"
                      type="number"
                      min={5}
                      max={100}
                      step={1}
                      value={maxTurns}
                      /* R4-052: store the raw text; do NOT silently coerce. */
                      onChange={(e) => setMaxTurns(e.target.value)}
                      className="mt-1"
                    />
                    {(() => {
                      const t = Number(maxTurns);
                      const invalid =
                        maxTurns.trim() === "" || !Number.isInteger(t) || t < 5 || t > 100;
                      return (
                        <p
                          className={`text-xs mt-1 ${invalid ? "text-yellow-500" : "text-muted-foreground"}`}
                          data-testid="text-turns-hint"
                        >
                          {invalid
                            ? "Enter a whole number between 5 and 100."
                            : "Whole number, 5–100."}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="rounded-md border">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(v => !v)}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50"
                    data-testid="button-toggle-advanced-researcher"
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                      Custom Model &amp; Endpoint (optional)
                    </span>
                    {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {showAdvanced && (
                    <div className="space-y-3 border-t px-3 py-3">
                      <div>
                        <Label htmlFor="research-model" className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-muted-foreground" />Model
                        </Label>
                        <Input
                          id="research-model"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="claude-sonnet-4-5 (default)"
                          className="mt-1 font-mono text-xs"
                          data-testid="input-research-model"
                        />
                      </div>
                      <div>
                        <Label htmlFor="research-baseurl" className="flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-muted-foreground" />Base URL
                        </Label>
                        <Input
                          id="research-baseurl"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder="https://api.anthropic.com (default)"
                          className="mt-1 font-mono text-xs"
                          data-testid="input-research-baseurl"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Must be https and requires an auth token below. Leave blank to use the platform endpoint.</p>
                      </div>
                      <div>
                        <Label htmlFor="research-token" className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />Auth Token
                        </Label>
                        <Input
                          id="research-token"
                          type="password"
                          value={authToken}
                          onChange={(e) => setAuthToken(e.target.value)}
                          placeholder="Required if a base URL is set (blank = platform key)"
                          className="mt-1 font-mono text-xs"
                          autoComplete="off"
                          data-testid="input-research-token"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">Encrypted at rest (AES-256-GCM). Only the last 4 characters are ever shown afterwards.</p>
                      </div>
                    </div>
                  )}
                </div>

                <Alert>
                  <Zap className="w-4 h-4" />
                  <AlertDescription>
                    Uses Claude Sonnet 4 (~$3/M input, $15/M output tokens). Recent jobs have cost roughly $2.50-$27 depending on scope and duration (see Job History below). The researcher automatically deduplicates against {categoriesData?.resources?.length ? `the ${categoriesData.resources.length.toLocaleString()} existing resources` : 'the existing catalog'}.
                  </AlertDescription>
                </Alert>

                {/* R4-051: NB-022 — don't hard-disable on the min-length rule
                    (that's the "silently disabled" bug). Only the one-shot
                    pending state disables; short prompts get a toast on click. */}
                <Button
                  onClick={handleLaunch}
                  disabled={startMutation.isPending}
                  className="w-full"
                >
                  {startMutation.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Starting...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" />Launch Researcher</>
                  )}
                </Button>

                {/* Run23 NB-040: explicit confirmation before starting a paid job. */}
                <AlertDialog open={confirmLaunch} onOpenChange={(open) => { if (!open) setConfirmLaunch(false); }}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Launch research job?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This starts a Claude research agent with a budget of up to ${maxBudget} and {maxTurns} turns. The job runs in the background and incurs real API cost.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-launch">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        data-testid="button-confirm-launch"
                        onClick={() => { setConfirmLaunch(false); startMutation.mutate(); }}
                      >
                        Launch
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Active Jobs</CardTitle>
                <CardDescription>Currently running research jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {activeJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No active research jobs</p>
                ) : (
                  <div className="space-y-3">
                    {activeJobs.map(job => {
                      // Run16 BUG-027: the list endpoint now ships only the
                      // latest log entry (agentLogLast) instead of the full
                      // agentLog; fall back to the old shape defensively.
                      const log = (job.agentLog as Array<{ role: string; content: string; timestamp: string }> | null) || [];
                      const last = ((job as any).agentLogLast as { role: string; content: string; timestamp: string } | null) ?? log[log.length - 1];
                      return (
                        <Card key={job.id} className="border-blue-500/20">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Job #{job.id}</span>
                              {getStatusBadge(job.status)}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{job.prompt}</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Found:</span>{' '}
                                <span className="font-medium">{job.totalDiscoveries || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Turns:</span>{' '}
                                <span className="font-medium">{job.turnsUsed || 0}/{job.maxTurns}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cost:</span>{' '}
                                <span className="font-medium">${job.estimatedCostUsd || '0.00'}</span>
                              </div>
                            </div>
                            {job.maxTurns && (
                              <Progress value={((job.turnsUsed || 0) / job.maxTurns) * 100} className="h-1" />
                            )}
                            {last && (
                              <div
                                className="text-[10px] font-mono p-2 rounded border bg-muted/30 line-clamp-2"
                                title={last.content}
                              >
                                <Badge variant="outline" className="h-4 text-[9px] mr-1.5 align-middle">{last.role}</Badge>
                                {last.content}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setSelectedJobId(job.id); setShowJobDetails(true); }}
                                data-testid={`button-research-details-${job.id}`}
                              >
                                <Eye className="w-3 h-3 mr-1" />Live Log
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => cancelMutation.mutate(job.id)}
                              >
                                <XCircle className="w-3 h-3 mr-1" />Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Pending Discoveries
                {pendingDiscoveries && pendingDiscoveries.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingDiscoveries.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Review and approve or reject AI-discovered resources</CardDescription>
            </CardHeader>
            <CardContent>
              {!pendingDiscoveries || pendingDiscoveries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pending discoveries to review</p>
              ) : (
                <div className="space-y-3">
                  {pendingDiscoveries.map(d => (
                    <Card key={d.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm line-clamp-1 break-words" title={d.title}>{d.title}</h4>
                              {d.confidence && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {d.confidence}% confident
                                </Badge>
                              )}
                            </div>
                            <a href={d.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                              {d.url} <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            {d.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {d.suggestedCategory && <Badge variant="secondary" className="text-xs">{d.suggestedCategory}</Badge>}
                              {d.suggestedSubcategory && <Badge variant="outline" className="text-xs">{d.suggestedSubcategory}</Badge>}
                              <span>Job #{d.jobId}</span>
                            </div>
                            {d.reasoning && (
                              <p className="text-xs text-muted-foreground italic mt-1">"{d.reasoning}"</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approveMutation.mutate(d.id)}
                              disabled={approveMutation.isPending}
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectDialogId(d.id)}
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Research Job History</CardTitle>
              <CardDescription data-testid="text-job-history-range">
                {/* Run23 NB-039: say when the list is truncated instead of
                    silently capping at the latest 20. */}
                {jobs && jobsTotal > jobs.length
                  ? `Showing latest ${jobs.length} of ${jobsTotal} research jobs`
                  : 'All past research jobs and their results'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                /* Run16 BUG-077: skeleton rows instead of a bare text node. */
                <div className="space-y-3 py-2" aria-label="Loading research jobs">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !jobs || jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No research jobs yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead>Found</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Turns</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map(job => (
                      <Fragment key={job.id}>
                        <TableRow>
                          <TableCell className="font-medium">#{job.id}</TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">{job.prompt}</TableCell>
                          {/* NB-031 (run18): a cancelled run can't have accrued
                              metrics it never reached — show "—" for zeroed
                              approved/cost/turns; keep a real "found" count but
                              annotate that it was found before cancellation. */}
                          <TableCell>
                            {job.status === 'cancelled' && (job.totalDiscoveries || 0) > 0 ? (
                              <span title="found before cancellation">{job.totalDiscoveries}</span>
                            ) : (
                              job.totalDiscoveries || 0
                            )}
                          </TableCell>
                          <TableCell>
                            {job.status === 'cancelled' && (job.approvedDiscoveries || 0) === 0 && (job.rejectedDiscoveries || 0) === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <>
                                <span className="text-green-400">{job.approvedDiscoveries || 0}</span>
                                {' / '}
                                <span className="text-red-400">{job.rejectedDiscoveries || 0}</span>
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            {job.status === 'cancelled' && (!job.estimatedCostUsd || Number(job.estimatedCostUsd) === 0) ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              formatCost(job.estimatedCostUsd)
                            )}
                          </TableCell>
                          {/* NB-032 (run18): turnsUsed accumulates across
                              continuation runs while maxTurns is per-run, so used
                              can exceed the cap — annotate instead of hiding. */}
                          <TableCell>
                            {job.status === 'cancelled' && (job.turnsUsed || 0) === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (job.turnsUsed || 0) > (job.maxTurns || 0) ? (
                              <span title={`used across continuation runs (cap ${job.maxTurns}/run)`}>
                                {job.turnsUsed}/{job.maxTurns}
                              </span>
                            ) : (
                              <>{job.turnsUsed || 0}/{job.maxTurns}</>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {job.createdAt ? formatAdminDate(job.createdAt) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setSelectedJobId(job.id); setShowJobDetails(true); }}
                                aria-label={`View details for job #${job.id}`}
                                data-testid={`button-research-details-${job.id}`}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              {job.status === 'processing' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => cancelMutation.mutate(job.id)}
                                  aria-label={`Cancel job #${job.id}`}
                                >
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {(job.status === 'failed' || (job.status === 'completed' && (job.totalDiscoveries || 0) === 0)) && job.errorMessage && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
                                <AlertCircle className="w-4 h-4" />
                                <AlertDescription className="text-xs break-all">
                                  Job #{job.id}: {humanizeJobError(job.errorMessage)}
                                </AlertDescription>
                              </Alert>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Research Job #{selectedJob?.id}
              {selectedJob && getStatusBadge(selectedJob.status)}
              {selectedJob?.isActive && (
                <Badge variant="outline" className="text-[10px]">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Streaming
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Live agent log, token usage, cost, and discovery results for this research run.
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{selectedJob.totalDiscoveries || 0}</div>
                  <div className="text-xs text-muted-foreground">Discovered</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold text-green-400">{selectedJob.approvedDiscoveries || 0}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{selectedJob.duplicatesSkipped || 0}</div>
                  <div className="text-xs text-muted-foreground">Duplicates</div>
                </div>
                <div className="text-center p-2 border rounded">
                  {/* NB-033 (run18): same 4-decimal formatter as the table. */}
                  <div className="text-lg font-bold">{formatCost(selectedJob.estimatedCostUsd)}</div>
                  <div className="text-xs text-muted-foreground">Cost</div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Prompt</Label>
                <p className="text-sm mt-1">{selectedJob.prompt}</p>
              </div>

              {selectedJob.categoryFocus && (
                <div>
                  <Label className="text-xs text-muted-foreground">Focus</Label>
                  <p className="text-sm mt-1">{selectedJob.categoryFocus}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p className="text-xs font-mono mt-1">{selectedJob.model || 'claude-sonnet-4-5 (default)'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Base URL</Label>
                  <p className="text-xs font-mono mt-1 break-all">{selectedJob.baseUrl || 'Platform default'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Auth Token</Label>
                  <p className="text-xs font-mono mt-1">{selectedJob.authTokenLast4 ? `••••${selectedJob.authTokenLast4}` : 'Platform key'}</p>
                </div>
              </div>

              {selectedJob.errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  {/* NB-018 (run18): long unbroken tokens/URLs in agent errors
                      blew the banner to ~1,786px inside the dialog — force the
                      text to wrap and clip within the modal width. */}
                  <AlertDescription className="max-w-full overflow-hidden break-all whitespace-pre-wrap">
                    {humanizeJobError(selectedJob.errorMessage)}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  {/* NB-032 (run18): annotate turns that exceed the per-run cap. */}
                  Turns:{' '}
                  {(selectedJob.turnsUsed || 0) > (selectedJob.maxTurns || 0) ? (
                    <span title={`used across continuation runs (cap ${selectedJob.maxTurns}/run)`}>
                      {selectedJob.turnsUsed}/{selectedJob.maxTurns}
                    </span>
                  ) : (
                    <>{selectedJob.turnsUsed || 0}/{selectedJob.maxTurns}</>
                  )}{' '}·
                  In: {(selectedJob.totalInputTokens || 0).toLocaleString()} ·
                  Out: {(selectedJob.totalOutputTokens || 0).toLocaleString()} tok
                </Label>
                <Label className="text-xs text-muted-foreground">
                  Agent Log
                  {selectedJob.agentLog && (
                    <span className="ml-1">
                      ({(selectedJob.agentLog as any[]).length} entries)
                    </span>
                  )}
                </Label>
              </div>

              {selectedJob.agentLog && (selectedJob.agentLog as any[]).length > 0 ? (
                <ScrollArea className="h-[420px] border rounded p-2 bg-black/40">
                  <div className="space-y-1 font-mono text-xs">
                    {(selectedJob.agentLog as Array<{ role: string; content: string; timestamp: string }>).map((entry, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-muted-foreground shrink-0 w-[68px]">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            "shrink-0 h-5 text-[10px] " +
                            (entry.role === 'error' || entry.role === 'tool_error'
                              ? 'border-red-500/50 text-red-400'
                              : entry.role === 'system'
                              ? 'border-yellow-500/50 text-yellow-400'
                              : entry.role === 'tool_call'
                              ? 'border-cyan-500/50 text-cyan-400'
                              : entry.role === 'tool_result'
                              ? 'border-green-500/50 text-green-400'
                              : entry.role === 'web_search'
                              ? 'border-purple-500/50 text-purple-400'
                              : entry.role === 'web_search_result'
                              ? 'border-purple-400/30 text-purple-300'
                              : entry.role === 'assistant'
                              ? 'border-blue-500/50 text-blue-300'
                              : '')
                          }
                        >
                          {entry.role}
                        </Badge>
                        <span
                          className={
                            'whitespace-pre-wrap break-words flex-1 ' +
                            (entry.role === 'error' || entry.role === 'tool_error' ? 'text-red-400' :
                             entry.role === 'system' ? 'text-yellow-300' :
                             entry.role === 'tool_call' ? 'text-cyan-300' :
                             entry.role === 'tool_result' ? 'text-green-300' :
                             entry.role === 'web_search' ? 'text-purple-300' :
                             entry.role === 'web_search_result' ? 'text-purple-200' :
                             entry.role === 'assistant' ? 'text-blue-200' :
                             'text-foreground')
                          }
                        >
                          {entry.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[120px] border rounded p-4 flex items-center justify-center text-xs text-muted-foreground">
                  {selectedJob.isActive ? 'Waiting for first log entry…' : 'No log entries recorded.'}
                </div>
              )}

              <Separator />
              <AgentCommsGraph jobType="research" jobId={selectedJob.id} isActive={selectedJob.isActive} />

              <Separator />
              <AgentEventLog jobType="research" jobId={selectedJob.id} isActive={selectedJob.isActive} />

              {jobDiscoveries && jobDiscoveries.length > 0 && (
                <>
                  <Separator />
                  <Label className="text-xs text-muted-foreground">Discoveries from this job</Label>
                  <div className="space-y-2">
                    {jobDiscoveries.map(d => (
                      <div key={d.id} className="flex items-center justify-between border rounded p-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium line-clamp-1 break-words min-w-0" title={d.title}>{d.title}</span>
                            {getDiscoveryStatusBadge(d.status)}
                          </div>
                          <a href={d.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate block">
                            {d.url}
                          </a>
                        </div>
                        {d.status === 'pending_review' && (
                          <div className="flex gap-1 ml-2">
                            <Button size="sm" variant="ghost" className="text-green-400 h-7"
                              onClick={() => approveMutation.mutate(d.id)}>
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400 h-7"
                              onClick={() => setRejectDialogId(d.id)}>
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialogId} onOpenChange={(open) => { if (!open) { setRejectDialogId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Discovery</DialogTitle>
            <DialogDescription>
              Mark this discovered resource as rejected. Optionally include a reason for the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why is this resource being rejected?"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => rejectDialogId && rejectMutation.mutate({ id: rejectDialogId, reason: rejectReason || undefined })}
                disabled={rejectMutation.isPending}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
