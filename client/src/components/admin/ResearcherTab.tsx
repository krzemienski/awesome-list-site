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
import { StatusChip, TableShell } from "@/components/admin/AdminOpsPrimitives";
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
  Wand2,
  Star,
  Archive,
} from "lucide-react";
import { formatAdminDate } from "@/lib/utils";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAiDefaults } from "@/hooks/useAiDefaults";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { sanitizeDisplay } from "@/lib/sanitize-display";
import { useToast } from "@/hooks/use-toast";
import type { ResearchJob, ResearchDiscovery } from "@shared/schema";
import "./queues-agent.css";
import { useState, useEffect } from "react";

const INFO_STATUS_BADGE = "bg-[#5eddf2]/20 text-[#5eddf2] border-[#5eddf2]/30"; // DS-OK: cyan info (DS chart/info constant)
const OK_STATUS_BADGE = "bg-[#34d08c]/20 text-[#34d08c] border-[#34d08c]/30"; // DS-OK: status ok
const WARN_OUTLINE = "border-[#ffb84d]/30 text-[#ffb84d]"; // DS-OK: status warn
const OK_OUTLINE = "text-xs shrink-0 text-[#34d08c] border-[#34d08c]/30"; // DS-OK: status ok
const WARN_TEXT = "text-[#ffb84d]"; // DS-OK: status warn
const INFO_BORDER = "border-[#5eddf2]/20"; // DS-OK: cyan info (DS chart/info constant)
const OK_SOLID_BUTTON = "bg-[#34d08c] text-black hover:bg-[#34d08c]/90"; // DS-OK: status ok
const OK_TEXT = "text-[#34d08c]"; // DS-OK: status ok
const BAD_TEXT = "text-[#ff5c7a]"; // DS-OK: status bad

/**
 * Agent roles use the global DS status/info constants. Related role variants
 * retain hierarchy through opacity rather than separate palette shades.
 */
const AGENT_ROLE_BADGE_STYLES: Record<string, string> = {
  error: "border-[#ff5c7a]/50 text-[#ff5c7a]", // DS-OK: status bad
  tool_error: "border-[#ff5c7a]/50 text-[#ff5c7a]", // DS-OK: status bad
  system: "border-[#ffb84d]/50 text-[#ffb84d]", // DS-OK: status warn
  tool_call: "border-[#5eddf2]/50 text-[#5eddf2]", // DS-OK: cyan info (DS chart/info constant)
  tool_result: "border-[#34d08c]/50 text-[#34d08c]", // DS-OK: status ok
  web_search: "border-[#9d4edd]/50 text-[#9d4edd]", // DS-OK: violet info (DS chart/info constant)
  web_search_result: "border-[#9d4edd]/30 text-[#9d4edd]/80", // DS-OK: violet info (DS chart/info constant)
  assistant: "border-[#5eddf2]/50 text-[#5eddf2]/80", // DS-OK: cyan info (DS chart/info constant)
};

const AGENT_ROLE_TEXT_STYLES: Record<string, string> = {
  error: "text-[#ff5c7a]", // DS-OK: status bad
  tool_error: "text-[#ff5c7a]", // DS-OK: status bad
  system: "text-[#ffb84d]", // DS-OK: status warn
  tool_call: "text-[#5eddf2]", // DS-OK: cyan info (DS chart/info constant)
  tool_result: "text-[#34d08c]", // DS-OK: status ok
  web_search: "text-[#9d4edd]", // DS-OK: violet info (DS chart/info constant)
  web_search_result: "text-[#9d4edd]/80", // DS-OK: violet info (DS chart/info constant)
  assistant: "text-[#5eddf2]/80", // DS-OK: cyan info (DS chart/info constant)
};

function getStatusBadge(status: string) {
  const statusClass =
    status === "completed" || status === "approved"
      ? "queues-agent__status--ok"
      : status === "failed" || status === "rejected"
        ? "queues-agent__status--bad"
        : status === "processing" || status === "pending" || status === "pending_review"
          ? "queues-agent__status--warn"
          : "queues-agent__status--muted";
  switch (status) {
    case "processing":
      return <Badge variant="default" className={`queues-agent__status ${statusClass} ${INFO_STATUS_BADGE}`}><Activity className="w-3 h-3 mr-1 animate-pulse" />Running</Badge>;
    case "completed":
      return <Badge variant="default" className={`queues-agent__status ${statusClass} ${OK_STATUS_BADGE}`}><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    case "failed":
      return <Badge variant="destructive" className={`queues-agent__status ${statusClass}`}><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className={`queues-agent__status ${statusClass}`}><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
    default:
      return <Badge variant="outline" className={`queues-agent__status ${statusClass}`}><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
  }
}

// Run16 BUG-026: raw SDK failures like "Claude Code process exited with code 1"
// are meaningless to an admin. Map known patterns to a plain-language
// explanation while keeping the raw text for debugging.
function humanizeJobError(msg: string): string {
  if (/exited with code \d+/i.test(msg) || /process exited/i.test(msg)) {
    return `The research agent crashed before finishing. This is usually transient — try launching the job again; if it keeps happening, try setting explicit budget/turn limits. (Technical detail: ${msg})`;
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

function mutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The request could not be completed. Please try again.";
}

function getDiscoveryStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return <Badge variant="outline" className={`queues-agent__status queues-agent__status--warn ${WARN_OUTLINE}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "approved":
      return <Badge variant="default" className={`queues-agent__status queues-agent__status--ok ${OK_STATUS_BADGE}`}><ThumbsUp className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="queues-agent__status queues-agent__status--bad"><ThumbsDown className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline" className="queues-agent__status queues-agent__status--muted">{status}</Badge>;
  }
}

/**
 * WS3 (July 30, 2026): verification badges from the async post-save verifier.
 * Shows liveness (dead link / verified) and GitHub repo signals (stars,
 * archived). No badge at all = verification still pending or predates WS3.
 */
function getVerificationBadges(d: ResearchDiscovery) {
  const v = d.verification;
  if (!v) return null;
  const badges: JSX.Element[] = [];
  if (v.liveness === "dead") {
    badges.push(
      <Badge key="dead" variant="destructive" className="text-xs shrink-0" title={v.suspicion || v.error || undefined} data-testid={`badge-verification-dead-${d.id}`}>
        <XCircle className="w-3 h-3 mr-1" />{v.suspicion ? "Suspicious link" : "Link check failed"}
      </Badge>
    );
  } else if (v.liveness === "ok") {
    badges.push(
      <Badge key="ok" variant="outline" className={OK_OUTLINE} data-testid={`badge-verification-ok-${d.id}`}>
        <CheckCircle2 className="w-3 h-3 mr-1" />Link OK
      </Badge>
    );
  }
  if (v.github && !v.github.unavailable) {
    if (typeof v.github.stars === "number") {
      badges.push(
        <Badge key="stars" variant="secondary" className="text-xs shrink-0" title={v.github.pushedAt ? `Last push ${new Date(v.github.pushedAt).toLocaleDateString()}` : undefined}>
          <Star className="w-3 h-3 mr-1" />{v.github.stars.toLocaleString()}
        </Badge>
      );
    }
    if (v.github.archived) {
      badges.push(
        <Badge key="archived" variant="outline" className={`text-xs shrink-0 ${WARN_OUTLINE}`}>
          <Archive className="w-3 h-3 mr-1" />Archived repo
        </Badge>
      );
    }
  }
  return badges.length > 0 ? badges : null;
}

export type ResearcherInitialTab = "launch" | "review" | "history";

interface ResearcherTabProps {
  initialTab?: ResearcherInitialTab;
}

export default function ResearcherTab({ initialTab = "launch" }: ResearcherTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const aiDefaults = useAiDefaults();
  const defaultOrchestratorModel = aiDefaults.flowModel("researchOrchestrator");
  const defaultScoutModel = aiDefaults.flowModel("researchScout");
  const defaultBaseUrl = aiDefaults.config?.baseUrl;

  // WS1 (July 30, 2026): empty by default — an empty prompt tells the server
  // to auto-generate a gap-aware, history-aware brief at launch. The
  // "Auto-generate brief" button previews the same brief for editing.
  const [prompt, setPrompt] = useState("");
  const [categoryFocus, setCategoryFocus] = useState("");
  // Blank = unlimited (owner request July 24, 2026): budget and turns are
  // unbounded by default; entering a number opts INTO a cap.
  // BUG-045 (run25): default to a sane spending cap instead of UNLIMITED —
  // the operator can clear the field deliberately if they want no cap.
  const [maxBudget, setMaxBudget] = useState("1.00");
  // R4-052: keep the raw input string (like maxBudget) instead of a number so
  // typing "5.5" or "0" is never silently rewritten — validation feedback is
  // shown instead (see the hint below the field + handleLaunch).
  const [maxTurns, setMaxTurns] = useState("15");
  // Stop condition: end the run automatically after N NEW saved discoveries.
  // Raw string like maxTurns so typing is never silently rewritten.
  const [targetDiscoveries, setTargetDiscoveries] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState("");
  // Explicit scout (subagent) model. Blank = auto: default scout model on the
  // platform endpoint, or the orchestrator model when a custom model is set.
  const [scoutModel, setScoutModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [rejectDialogId, setRejectDialogId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);
  // Run23 NB-040: launching a paid research job needs an explicit confirmation
  // step (same AlertDialog pattern as GitHub import/export).
  const [confirmLaunch, setConfirmLaunch] = useState(false);

  const [isPolling, setIsPolling] = useState(false);

  // Run23 NB-039: the endpoint returns { jobs, total } so the history table
  // can say "showing latest 20 of N" instead of silently truncating.
  // R5-011 (run24): "Load more" grows the requested window past the default
  // 20 (server caps at 200). Key stays prefixed by '/api/researcher/jobs' so
  // existing prefix invalidations keep working.
  const [jobsLimit, setJobsLimit] = useState(20);
  const {
    data: jobsData,
    error: jobsError,
    isError: jobsIsError,
    isLoading: jobsLoading,
    isFetching: jobsFetching,
    refetch: refetchJobs,
  } = useQuery<{ jobs: ResearchJob[]; total: number }>({
    queryKey: ['/api/researcher/jobs', { limit: jobsLimit }],
    queryFn: async () => {
      const res = await fetch(`/api/researcher/jobs?limit=${jobsLimit}`, { credentials: 'include' });
      if (!res.ok) throw new ApiError(res.status, `${res.status}: ${await res.text()}`);
      return res.json();
    },
    refetchInterval: isPolling ? 3000 : false,
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const jobs = jobsData?.jobs;
  const jobsTotal = jobsData?.total ?? 0;
  // A failed or still-loading job list cannot establish whether a research
  // job is active. Keep paid launches disabled until that state is known.
  const activeJobStateKnown =
    !jobsLoading &&
    !jobsFetching &&
    !jobsIsError &&
    Array.isArray(jobsData?.jobs);

  // BUG-045 (run25): cost guidance is DERIVED from actual job history instead
  // of a hardcoded range that drifts stale as models/scopes change.
  const finishedCosts = (jobs || [])
    .map((j) => Number(j.estimatedCostUsd))
    .filter((c) => Number.isFinite(c) && c > 0);
  const costMin = finishedCosts.length > 0 ? Math.min(...finishedCosts) : null;
  const costMax = finishedCosts.length > 0 ? Math.max(...finishedCosts) : null;

  const {
    data: selectedJob,
    error: selectedJobError,
    isError: selectedJobIsError,
  } = useQuery<ResearchJob & { isActive: boolean }>({
    queryKey: ['/api/researcher/jobs', selectedJobId],
    enabled: !!selectedJobId,
    // Explicit queryFn — the default fetcher only reads queryKey[0] and would
    // hit the LIST endpoint instead of /jobs/:id, leaving the popover bound
    // to an array (everything undefined → "No log entries" forever).
    queryFn: async () => {
      const res = await fetch(`/api/researcher/jobs/${selectedJobId}`, { credentials: 'include' });
      if (!res.ok) throw new ApiError(res.status, `Failed to fetch job ${selectedJobId}: ${res.status}`);
      return res.json();
    },
    refetchInterval: (query) => {
      const j = query.state.data as ResearchJob | undefined;
      // Stream while job is still running, even if dialog is closed.
      if (j && (j.status === 'processing' || j.status === 'pending')) return 2000;
      if (showJobDetails) return 3000;
      return false;
    },
  });

  const {
    data: pendingDiscoveries,
    error: pendingDiscoveriesError,
    isError: pendingDiscoveriesIsError,
    isLoading: pendingDiscoveriesLoading,
    isFetching: pendingDiscoveriesFetching,
    refetch: refetchPendingDiscoveries,
  } = useQuery<ResearchDiscovery[]>({
    queryKey: ['/api/researcher/discoveries'],
    refetchInterval: isPolling ? 10000 : false,
  });

  const {
    data: jobDiscoveries,
    error: jobDiscoveriesError,
    isError: jobDiscoveriesIsError,
  } = useQuery<ResearchDiscovery[]>({
    queryKey: ['/api/researcher/discoveries', selectedJobId ? `?jobId=${selectedJobId}` : ''],
    enabled: !!selectedJobId && showJobDetails,
    queryFn: async () => {
      const res = await fetch(`/api/researcher/discoveries?jobId=${selectedJobId}`, { credentials: 'include' });
      if (!res.ok) throw new ApiError(res.status, 'Failed to fetch');
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
          // R5-021 made the server require real number types; sending the raw
          // input string here made every launch 400 with a budget error even
          // when a valid budget was set. Blank = unlimited => omit the field.
          maxBudgetUsd: maxBudget.trim() === "" ? undefined : Number(maxBudget),
          maxTurns: maxTurns.trim() === "" ? undefined : Number(maxTurns),
          targetDiscoveries: targetDiscoveries.trim() === "" ? undefined : Number(targetDiscoveries),
          model: model.trim() || undefined,
          scoutModel: scoutModel.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
          authToken: authToken.trim() || undefined,
        }),
      });
    },
    onSuccess: (data: any) => {
      setConfirmLaunch(false);
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
    // The confirmation dialog stays mounted on failure so its inline error
    // remains visible and the operator can retry without a toast remount.
  });

  // Run16 BUG-008: the launch button used to fire even while the native
  // number inputs were flagged invalid (budget $0 jobs got created). Block
  // submission client-side, mirroring the server's min-$0.25 / 5–100 ranges
  // (Run20: no upper budget cap per user request).
  const handleLaunch = () => {
    if (!activeJobStateKnown) {
      toast({
        title: jobsIsError ? "Unable to check active jobs" : "Checking active jobs",
        description: jobsIsError
          ? "Retry Job History before starting a paid research job."
          : "Please wait until the current job status is known.",
        variant: jobsIsError ? "destructive" : undefined,
      });
      return;
    }
    // R4-051: the min-length rule used to only manifest as a disabled button
    // with no explanation — clicking a short prompt now yields explicit feedback
    // (a hint under the field covers the before-submit case).
    // WS1: an EMPTY prompt is valid — the server auto-generates the brief.
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length > 0 && trimmedPrompt.length < 10) {
      toast({
        title: "Prompt too short",
        description: "Write at least 10 characters, or clear the field to auto-generate a brief.",
        variant: "destructive",
      });
      return;
    }
    // Blank = unlimited (no cap). A provided value must still be a sane
    // positive number so garbage can't silently start a run.
    if (maxBudget.trim() !== "") {
      const budget = Number(maxBudget);
      if (!Number.isFinite(budget) || budget <= 0) {
        toast({
          title: "Invalid budget",
          description: "Budget must be a positive number, or leave blank for unlimited.",
          variant: "destructive",
        });
        return;
      }
    }
    // R4-052: reject non-integer turns with a message instead of silently
    // coercing them (5.5 → 5).
    if (maxTurns.trim() !== "") {
      const turns = Number(maxTurns);
      if (!Number.isInteger(turns) || turns <= 0) {
        toast({
          title: "Invalid max turns",
          description: "Max turns must be a positive whole number, or leave blank for unlimited.",
          variant: "destructive",
        });
        return;
      }
    }
    if (targetDiscoveries.trim() !== "") {
      const target = Number(targetDiscoveries);
      if (!Number.isInteger(target) || target <= 0 || target > 1000) {
        toast({
          title: "Invalid discovery target",
          description: "Stop-after must be a whole number from 1 to 1000, or leave blank for no target.",
          variant: "destructive",
        });
        return;
      }
    }
    // Run23 NB-040: don't fire the job from the raw click — open an explicit
    // confirmation dialog first.
    setConfirmLaunch(true);
  };

  // WS1: preview the server-generated brief into the textarea for editing.
  const briefMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/researcher/brief', { credentials: 'include' });
      if (!res.ok) throw new ApiError(res.status, `${res.status}: ${await res.text()}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.brief) {
        setPrompt(data.brief);
        toast({ title: "Brief generated", description: data.angle ? `Campaign angle: ${data.angle}. Edit freely before launching.` : "Edit freely before launching." });
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to generate brief", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest(`/api/researcher/jobs/${jobId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      toast({ title: "Job cancelled" });
    },
  });

  // Bulk approve every pending discovery (server auto-rejects exact-URL
  // duplicates instead of double-inserting them as resources).
  const approveAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/researcher/discoveries/approve-all', { method: 'POST', body: JSON.stringify({}) });
    },
    onSuccess: (data: any) => {
      setConfirmApproveAll(false);
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/discoveries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      const parts = [`${data?.approved ?? 0} approved`];
      if (data?.skippedDuplicates) parts.push(`${data.skippedDuplicates} skipped as duplicates`);
      if (data?.failed?.length) parts.push(`${data.failed.length} failed`);
      toast({
        title: "Bulk approval finished",
        description: parts.join(', ') + '.',
        variant: data?.failed?.length ? "destructive" : undefined,
      });
    },
    // The confirmation dialog stays mounted on failure so its inline error
    // remains visible and the operator can retry without a toast remount.
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
    // The rejection dialog stays mounted on failure so its inline error remains
    // visible and the operator can retry without a toast remount.
  });

  const activeJobs = jobs?.filter(j => j.status === 'processing' || j.status === 'pending') || [];

  useEffect(() => {
    const hasActive = activeJobs.length > 0;
    if (hasActive !== isPolling) {
      setIsPolling(hasActive);
    }
  }, [activeJobs.length]);

  return (
    <div className="queues-agent queues-agent--research">
      <div className="queues-agent__canonical">
        <section className="card queues-agent__research-form">
          <h3>Run a research task</h3>
          <p>The agent will scour the web for new resources matching your prompt.</p>
          <div className="queues-agent__research-fields">
            <div className="field">
              <label htmlFor="canonical-research-prompt">Prompt</label>
              <textarea
                id="canonical-research-prompt"
                className="textarea"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="e.g. Find 5 new open-source AV1 encoders not yet in the index"
              />
            </div>
            <div className="queues-agent__research-limits">
              <div className="field">
                <label htmlFor="canonical-max-turns">Max turns</label>
                <input
                  id="canonical-max-turns"
                  className="input"
                  value={maxTurns}
                  onChange={(event) => setMaxTurns(event.target.value)}
                  placeholder="15"
                  inputMode="numeric"
                />
              </div>
              <div className="field">
                <label htmlFor="canonical-budget">Budget</label>
                <input
                  id="canonical-budget"
                  className="input"
                  value={`$${maxBudget}`}
                  onChange={(event) => setMaxBudget(event.target.value.replace(/^\$/, ""))}
                  inputMode="decimal"
                />
              </div>
              <div className="field">
                <label htmlFor="canonical-auto-approve">Auto-approve</label>
                <select id="canonical-auto-approve" className="select" defaultValue="no">
                  <option value="no">No</option>
                  <option value="confidence">If confidence &gt; 0.8</option>
                </select>
              </div>
            </div>
            <div className="queues-agent__research-actions">
              <Button
                type="button"
                className="btn ghost"
                variant="ghost"
                onClick={() => toast({ title: "Preset saved", description: "Research settings are preserved for this session." })}
              >
                Save preset
              </Button>
              <Button
                type="button"
                className="btn primary"
                onClick={handleLaunch}
                disabled={!activeJobStateKnown || activeJobs.length > 0 || startMutation.isPending}
                data-testid="button-launch-researcher-canonical"
              >
                Run job
              </Button>
            </div>
          </div>
        </section>
        <TableShell title="Researcher jobs" sub="Recent agentic research runs">
          <div
            className="queues-agent__canonical-table queues-agent__canonical-table--research focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            tabIndex={0}
            role="region"
            aria-label="Researcher jobs table, scrollable"
          >
            <table className="table">
              <thead>
                <tr><th>Status</th><th>Prompt</th><th>Found</th><th>Approved</th><th>Cost</th><th>Turns</th><th>Created</th></tr>
              </thead>
              <tbody>
                {(jobs || []).slice(0, 2).map((job) => (
                  <tr key={job.id}>
                    <td><StatusChip status={job.status} /></td>
                    <td className="prompt">{job.prompt || "Auto-generated research brief"}</td>
                    <td className="mono queues-agent__cell-mono">{job.totalDiscoveries || 0}</td>
                    <td className="mono queues-agent__cell-mono">{job.approvedDiscoveries || 0}/{job.rejectedDiscoveries || 0}</td>
                    <td className="mono accent queues-agent__cell-mono">{formatCost(job.estimatedCostUsd)}</td>
                    <td className="mono queues-agent__cell-mono">{job.turnsUsed || 0}/{job.maxTurns || 0}</td>
                    <td className="mono muted queues-agent__cell-mono queues-agent__cell-muted queues-agent__cell-created">{job.createdAt ? formatAdminDate(job.createdAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!jobsLoading && (jobs || []).length === 0 ? <p className="queues-agent__empty">No research jobs found.</p> : null}
          </div>
        </TableShell>
      </div>
      <details className="queues-agent__more">
        <summary className="btn ghost">Advanced research controls &amp; discoveries</summary>
      <Tabs defaultValue={initialTab} className="w-full queues-agent__tabs">
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
            <Card className="queues-agent__control-shell">
              <CardHeader>
                <CardTitle className="queues-agent__section-title flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />New Research Job</CardTitle>
                <CardDescription className="queues-agent__section-description">Configure and launch an AI researcher to discover new video streaming resources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="prompt">Research Prompt</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => briefMutation.mutate()}
                      disabled={briefMutation.isPending}
                      data-testid="button-generate-brief"
                    >
                      {briefMutation.isPending
                        ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Generating…</>
                        : <><Wand2 className="w-3 h-3 mr-1" />Auto-generate brief</>}
                    </Button>
                  </div>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Leave empty to auto-generate a gap-aware brief at launch, or describe what to search for..."
                    className="mt-1 min-h-[100px]"
                  />
                  {/* R4-051: surface the ≥10-char rule up front instead of only
                      as a mysteriously disabled Launch button. WS1: empty is
                      valid (server auto-generates the brief). */}
                  <p
                    className={`text-xs mt-1 ${prompt.trim().length > 0 && prompt.trim().length < 10 ? WARN_TEXT : "text-muted-foreground"}`}
                    data-testid="text-prompt-hint"
                  >
                    {prompt.trim().length === 0
                      ? "Empty = a gap-aware brief is auto-generated at launch."
                      : prompt.trim().length < 10
                        ? `At least 10 characters required (${prompt.trim().length}/10) — or clear the field to auto-generate.`
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
                        min="0"
                        placeholder="Unlimited"
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(e.target.value)}
                      />
                    </div>
                    {(() => {
                      if (maxBudget.trim() === "") {
                        return (
                          <p className="text-xs text-muted-foreground mt-1" data-testid="text-discovery-cap">
                            Unlimited budget — no discovery cap
                          </p>
                        );
                      }
                      const b = Number(maxBudget);
                      if (!Number.isFinite(b) || b <= 0) return null;
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
                      min={1}
                      step={1}
                      placeholder="Unlimited"
                      value={maxTurns}
                      /* R4-052: store the raw text; do NOT silently coerce. */
                      onChange={(e) => setMaxTurns(e.target.value)}
                      className="mt-1"
                    />
                    {(() => {
                      if (maxTurns.trim() === "") {
                        return (
                          <p className="text-xs mt-1 text-muted-foreground" data-testid="text-turns-hint">
                            Unlimited turns
                          </p>
                        );
                      }
                      const t = Number(maxTurns);
                      const invalid = !Number.isInteger(t) || t <= 0;
                      return (
                        <p
                          className={`text-xs mt-1 ${invalid ? WARN_TEXT : "text-muted-foreground"}`}
                          data-testid="text-turns-hint"
                        >
                          {invalid
                            ? "Enter a positive whole number, or leave blank for unlimited."
                            : "Positive whole number (blank = unlimited)."}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <Label htmlFor="target-discoveries">Stop After (discoveries)</Label>
                    <Input
                      id="target-discoveries"
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      placeholder="No target"
                      value={targetDiscoveries}
                      onChange={(e) => setTargetDiscoveries(e.target.value)}
                      className="mt-1"
                      data-testid="input-target-discoveries"
                    />
                    {(() => {
                      if (targetDiscoveries.trim() === "") {
                        return (
                          <p className="text-xs mt-1 text-muted-foreground" data-testid="text-target-hint">
                            No target — runs until budget/turns end
                          </p>
                        );
                      }
                      const t = Number(targetDiscoveries);
                      const invalid = !Number.isInteger(t) || t <= 0 || t > 1000;
                      return (
                        <p
                          className={`text-xs mt-1 ${invalid ? WARN_TEXT : "text-muted-foreground"}`}
                          data-testid="text-target-hint"
                        >
                          {invalid
                            ? "Enter a whole number from 1 to 1000, or leave blank for no target."
                            : `Run stops automatically after ${t} new ${t === 1 ? "discovery" : "discoveries"}.`}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <div className="rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAdvanced(v => !v)}
                    className="flex h-auto w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50"
                    data-testid="button-toggle-advanced-researcher"
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                      Custom Model &amp; Endpoint (optional)
                    </span>
                    {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>
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
                          placeholder={defaultOrchestratorModel ? `${defaultOrchestratorModel} (default)` : "Default model"}
                          className="mt-1 font-mono text-xs"
                          data-testid="input-research-model"
                        />
                      </div>
                      <div>
                        <Label htmlFor="research-scout-model" className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-muted-foreground" />Scout Model
                        </Label>
                        <Input
                          id="research-scout-model"
                          value={scoutModel}
                          onChange={(e) => setScoutModel(e.target.value)}
                          placeholder={defaultScoutModel ? `Auto (${defaultScoutModel})` : "Auto (recommended)"}
                          className="mt-1 font-mono text-xs"
                          data-testid="input-research-scout-model"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Model for the search scout subagents. Blank = auto: a cheaper Claude scout on the platform endpoint, or the same model as above when a custom model is set. With a custom endpoint, a non-Claude scout model only works if it matches the model above.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="research-baseurl" className="flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-muted-foreground" />Base URL
                        </Label>
                        <Input
                          id="research-baseurl"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder={defaultBaseUrl ? `${defaultBaseUrl} (default)` : "Default endpoint"}
                          className="mt-1 font-mono text-xs"
                          data-testid="input-research-baseurl"
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">http or https; requires an auth token below (over plain http the token is sent unencrypted). Leave blank to use the server's configured endpoint.</p>
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
                          placeholder="Required if a base URL is set (blank = server default credentials)"
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
                    Uses Claude Sonnet 4 (~$3/M input, $15/M output tokens).{" "}
                    {costMin !== null && costMax !== null
                      ? `Your past jobs have cost $${costMin.toFixed(2)}–$${costMax.toFixed(2)} depending on scope and duration (see Job History below).`
                      : "Cost depends on scope and duration — check Job History after your first run."}{" "}
                    Jobs without a Max Budget run until you cancel them, so set a cap for a hard stop. The researcher automatically deduplicates against {categoriesData?.resources?.length ? `the ${categoriesData.resources.length.toLocaleString()} existing resources` : 'the existing catalog'}.
                  </AlertDescription>
                </Alert>

                {/* R4-051: NB-022 — don't hard-disable on the min-length rule
                    (that's the "silently disabled" bug). Only the one-shot
                    pending state disables; short prompts get a toast on click. */}
                <Button
                  onClick={handleLaunch}
                  disabled={startMutation.isPending || !activeJobStateKnown}
                  className="w-full"
                >
                  {startMutation.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Starting...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" />Launch Researcher</>
                  )}
                </Button>

                {/* Run23 NB-040: explicit confirmation before starting a paid job. */}
                <AlertDialog open={confirmLaunch} onOpenChange={(open) => { if (!open && !startMutation.isPending) setConfirmLaunch(false); }}>
                  <AlertDialogContent className="queues-agent__dialog">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Launch research job?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This starts a Claude research agent with {maxBudget.trim() === "" ? "an UNLIMITED budget" : `a budget of up to $${maxBudget}`} and {maxTurns.trim() === "" ? "unlimited turns" : `${maxTurns} turns`}.{targetDiscoveries.trim() !== "" ? ` It will stop automatically after ${targetDiscoveries} new ${Number(targetDiscoveries) === 1 ? "discovery" : "discoveries"}.` : ""} The job runs in the background and incurs real API cost{maxBudget.trim() === "" && targetDiscoveries.trim() === "" ? " with no spending cap — cancel it manually when you're satisfied" : ""}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    {startMutation.isError && (
                      <Alert variant="destructive" className="queues-agent__inline-error" role="alert">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>{mutationErrorMessage(startMutation.error)}</AlertDescription>
                      </Alert>
                    )}
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-launch" disabled={startMutation.isPending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        data-testid="button-confirm-launch"
                        onClick={(event) => {
                          event.preventDefault();
                          if (!activeJobStateKnown) return;
                          startMutation.mutate();
                        }}
                        disabled={startMutation.isPending || !activeJobStateKnown}
                      >
                        {startMutation.isPending ? "Launching…" : "Launch"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card className="queues-agent__active-shell">
              <CardHeader>
                <CardTitle className="queues-agent__section-title flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Active Jobs</CardTitle>
                <CardDescription className="queues-agent__section-description">Currently running research jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Checking for active research jobs…
                  </div>
                ) : jobsIsError ? (
                  <Alert variant="destructive" className="queues-agent__inline-error" role="alert" data-testid="error-research-jobs">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="flex flex-wrap items-center gap-3">
                      <span>Unable to load research jobs: {mutationErrorMessage(jobsError)}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { void refetchJobs(); }}
                        disabled={jobsFetching}
                        data-testid="button-retry-research-jobs"
                      >
                        {jobsFetching ? "Retrying…" : "Retry"}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : activeJobs.length === 0 ? (
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
                        <Card key={job.id} className={INFO_BORDER}>
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
                                <span className="font-medium">{job.turnsUsed || 0}/{job.maxTurns ?? '∞'}</span>
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
          <Card className="queues-agent__table-shell" data-testid="research-review-panel">
            <CardHeader className="queues-agent__table-heading">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="queues-agent__table-title flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Pending Discoveries
                    {pendingDiscoveries && pendingDiscoveries.length > 0 && (
                      <Badge variant="destructive" className="queues-agent__status queues-agent__status--bad ml-2">{pendingDiscoveries.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="queues-agent__table-description mt-1.5">Review and approve or reject AI-discovered resources</CardDescription>
                </div>
                {pendingDiscoveries && pendingDiscoveries.length > 0 && (
                  <Button
                    size="sm"
                    className={`${OK_SOLID_BUTTON} shrink-0`}
                    onClick={() => setConfirmApproveAll(true)}
                    disabled={approveAllMutation.isPending}
                    data-testid="button-approve-all"
                  >
                    {approveAllMutation.isPending ? (
                      <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Approving...</>
                    ) : (
                      <><ThumbsUp className="w-3.5 h-3.5 mr-1.5" />Approve All ({pendingDiscoveries.length})</>
                    )}
                  </Button>
                )}
              </div>
              {/* Explicit confirmation — bulk approval creates real resources. */}
              <AlertDialog open={confirmApproveAll} onOpenChange={(open) => { if (!open && !approveAllMutation.isPending) setConfirmApproveAll(false); }}>
                <AlertDialogContent className="queues-agent__dialog">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve all pending discoveries?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This approves all {pendingDiscoveries?.length ?? 0} pending discoveries and publishes them as live resources. Discoveries whose URL already exists in the database are skipped as duplicates. This cannot be undone in bulk — each resource would need to be removed individually.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {approveAllMutation.isError && (
                    <Alert variant="destructive" className="queues-agent__inline-error" role="alert">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{mutationErrorMessage(approveAllMutation.error)}</AlertDescription>
                    </Alert>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-approve-all" disabled={approveAllMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      data-testid="button-confirm-approve-all"
                      onClick={(event) => {
                        event.preventDefault();
                        approveAllMutation.mutate();
                      }}
                      disabled={approveAllMutation.isPending}
                    >
                      {approveAllMutation.isPending ? "Approving…" : "Approve All"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent className="queues-agent__table-body">
              {pendingDiscoveriesLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading pending discoveries…
                </div>
              ) : pendingDiscoveriesIsError ? (
                <Alert variant="destructive" className="queues-agent__inline-error" role="alert" data-testid="error-research-discoveries">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="flex flex-wrap items-center gap-3">
                    <span>Unable to load pending discoveries: {mutationErrorMessage(pendingDiscoveriesError)}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { void refetchPendingDiscoveries(); }}
                      disabled={pendingDiscoveriesFetching}
                      data-testid="button-retry-research-discoveries"
                    >
                      {pendingDiscoveriesFetching ? "Retrying…" : "Retry"}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : !pendingDiscoveries || pendingDiscoveries.length === 0 ? (
                <p className="admin-empty text-center">No pending discoveries to review</p>
              ) : (
                <div className="overflow-auto" role="region" aria-label="Pending discoveries table, scrollable" tabIndex={0}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDiscoveries.map(d => (
                        <TableRow key={d.id} data-testid={`row-research-discovery-${d.id}`}>
                          <TableCell className="max-w-[320px]">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium line-clamp-1 break-words" title={sanitizeDisplay(d.title)}>{sanitizeDisplay(d.title)}</span>
                                {getVerificationBadges(d)}
                              </div>
                              <a href={d.url} target="_blank" rel="noopener noreferrer"
                                className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-primary hover:underline">
                                <span className="truncate">{sanitizeDisplay(d.url)}</span><ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                              {d.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={sanitizeDisplay(d.description)}>{sanitizeDisplay(d.description)}</p>}
                              {d.reasoning && <p className="mt-1 line-clamp-1 text-xs italic text-muted-foreground" title={sanitizeDisplay(d.reasoning)}>"{sanitizeDisplay(d.reasoning)}"</p>}
                            </div>
                          </TableCell>
                          <TableCell>{getDiscoveryStatusBadge(d.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {d.suggestedCategory && <Badge variant="secondary" className="w-fit text-xs">{d.suggestedCategory}</Badge>}
                              {d.suggestedSubcategory && <Badge variant="outline" className="w-fit text-xs">{d.suggestedSubcategory}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="queues-agent__mono">{d.confidence ? `${d.confidence}%` : "—"}</TableCell>
                          <TableCell className="queues-agent__mono">#{d.jobId}</TableCell>
                          <TableCell className="text-right">
                            {d.status === "pending_review" ? (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="default" className={OK_SOLID_BUTTON} onClick={() => approveMutation.mutate(d.id)} disabled={approveMutation.isPending}>
                                  <ThumbsUp className="h-3 w-3 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setRejectDialogId(d.id)}>
                                  <ThumbsDown className="h-3 w-3 mr-1" />Reject
                                </Button>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">Reviewed</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="queues-agent__table-shell">
            <CardHeader className="queues-agent__table-heading">
              <CardTitle className="queues-agent__table-title">Research Job History</CardTitle>
              <CardDescription className="queues-agent__table-description" data-testid="text-job-history-range">
                {/* Run23 NB-039: say when the list is truncated instead of
                    silently capping at the latest 20. */}
                {jobs && jobsTotal > jobs.length
                  ? `Showing latest ${jobs.length} of ${jobsTotal} research jobs`
                  : 'All past research jobs and their results'}
              </CardDescription>
            </CardHeader>
            <CardContent className="queues-agent__table-body">
              {jobsLoading ? (
                /* Run16 BUG-077: skeleton rows instead of a bare text node. */
                <div className="space-y-3 py-2" aria-label="Loading research jobs">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : jobsIsError ? (
                <Alert variant="destructive" className="queues-agent__inline-error" role="alert" data-testid="error-research-jobs">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="flex flex-wrap items-center gap-3">
                    <span>Unable to load research jobs: {mutationErrorMessage(jobsError)}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { void refetchJobs(); }}
                      disabled={jobsFetching}
                      data-testid="button-retry-research-jobs"
                    >
                      {jobsFetching ? "Retrying…" : "Retry"}
                    </Button>
                  </AlertDescription>
                </Alert>
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
                      {/* BUG-017 (run25): "Approved" alone read as one number
                          and 173 found / "0" looked like lost discoveries —
                          name both halves and surface the pending remainder. */}
                      <TableHead>Approved / Rejected</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Turns</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map(job => ([
                        <TableRow key={`${job.id}-main`}>
                          <TableCell className="font-medium">#{job.id}</TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">{job.prompt}</TableCell>
                          {/* NB-031 (run18): a cancelled run can't have accrued
                              metrics it never reached — show "—" for zeroed
                              approved/cost/turns; keep a real "found" count but
                              annotate that it was found before cancellation. */}
                          <TableCell>
                            {job.status === 'cancelled' && (job.totalDiscoveries || 0) > 0 ? (
                              /* NB-031: visible annotation (was tooltip-only). */
                              <span title="found before cancellation">
                                {job.totalDiscoveries}
                                <span className="block text-[10px] text-muted-foreground whitespace-nowrap">
                                  pre-cancel
                                </span>
                              </span>
                            ) : (
                              job.totalDiscoveries || 0
                            )}
                          </TableCell>
                          <TableCell>
                            {job.status === 'cancelled' && (job.approvedDiscoveries || 0) === 0 && (job.rejectedDiscoveries || 0) === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <>
                                <span className={OK_TEXT}>{job.approvedDiscoveries || 0}</span>
                                {' / '}
                                <span className={BAD_TEXT}>{job.rejectedDiscoveries || 0}</span>
                                {/* BUG-017 (run25): found = approved + rejected
                                    + pending must reconcile VISIBLY. */}
                                {(() => {
                                  const pending = Math.max(
                                    0,
                                    (job.totalDiscoveries || 0) - (job.approvedDiscoveries || 0) - (job.rejectedDiscoveries || 0)
                                  );
                                  return pending > 0 ? (
                                    <span className="block text-[10px] text-muted-foreground whitespace-nowrap">
                                      {pending} awaiting review
                                    </span>
                                  ) : null;
                                })()}
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
                            ) : job.maxTurns == null ? (
                              /* Unlimited-turns job: no cap to annotate against. */
                              <>{job.turnsUsed || 0}/∞</>
                            ) : (job.turnsUsed || 0) > (job.maxTurns || 0) ? (
                              /* NB-032: visible continuation annotation (was
                                 tooltip-only) — turns accrue across runs while
                                 the cap is per-run. */
                              <span title={`used across continuation runs (cap ${job.maxTurns}/run)`}>
                                {job.turnsUsed}/{job.maxTurns}
                                <span className="block text-[10px] text-muted-foreground whitespace-nowrap">
                                  over cap: continued runs
                                </span>
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
                              {(job.status === 'processing' || job.status === 'pending') && (
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
                        </TableRow>,
                        (job.status === 'failed' || (job.status === 'completed' && (job.totalDiscoveries || 0) === 0)) && job.errorMessage ? (
                          <TableRow key={`${job.id}-error`}>
                            <TableCell colSpan={9} className="p-0">
                              <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
                                <AlertCircle className="w-4 h-4" />
                                <AlertDescription className="text-xs break-all">
                                  Job #{job.id}: {humanizeJobError(job.errorMessage)}
                                </AlertDescription>
                              </Alert>
                            </TableCell>
                          </TableRow>
                        ) : null,
                    ]))}
                  </TableBody>
                </Table>
              )}
              {/* R5-011 (run24): reach jobs older than the latest window. */}
              {!jobsLoading && jobs && jobsTotal > jobs.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setJobsLimit((l) => Math.min(l + 20, 200))}
                    data-testid="button-load-more-jobs"
                  >
                    Load more ({jobs.length} of {jobsTotal})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="queues-agent__dialog max-w-4xl max-h-[90vh] overflow-auto">
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
          {selectedJobIsError && (
            <Alert variant="destructive" className="queues-agent__inline-error" role="alert">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{mutationErrorMessage(selectedJobError)}</AlertDescription>
            </Alert>
          )}
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{selectedJob.totalDiscoveries || 0}</div>
                  <div className="text-xs text-muted-foreground">Discovered</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className={`text-lg font-bold ${OK_TEXT}`}>{selectedJob.approvedDiscoveries || 0}</div>
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
                  <p className="text-xs font-mono mt-1">{selectedJob.model || (defaultOrchestratorModel ? `${defaultOrchestratorModel} (default)` : 'default')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Scout Model</Label>
                  <p className="text-xs font-mono mt-1">{selectedJob.scoutModel || (selectedJob.model ? 'Auto (inherit)' : defaultScoutModel ? `Auto (${defaultScoutModel})` : 'Auto')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Discovery Target</Label>
                  <p className="text-xs font-mono mt-1">{selectedJob.targetDiscoveries != null ? `Stop after ${selectedJob.targetDiscoveries}` : 'None'}</p>
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
                  {selectedJob.maxTurns == null ? (
                    /* Unlimited-turns job: no cap to annotate against. */
                    <>{selectedJob.turnsUsed || 0}/∞</>
                  ) : (selectedJob.turnsUsed || 0) > (selectedJob.maxTurns || 0) ? (
                    /* NB-032: visible continuation annotation. */
                    <span title={`used across continuation runs (cap ${selectedJob.maxTurns}/run)`}>
                      {selectedJob.turnsUsed}/{selectedJob.maxTurns} (continued runs; cap {selectedJob.maxTurns}/run)
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

              {/* NB-018: min-w-0 down the flex chain so a single long unbroken
                  log token wraps inside the dialog instead of blowing the row
                  out to >1,600px. */}
              {selectedJob.agentLog && (selectedJob.agentLog as any[]).length > 0 ? (
                <ScrollArea
                  className="h-[420px] max-w-full border rounded p-2 bg-black/40"
                  viewportClassName="[&>div]:!block [&>div]:!w-full [&>div]:!min-w-0"
                >
                  <div className="space-y-1 font-mono text-xs min-w-0 max-w-full w-full">
                    {(selectedJob.agentLog as Array<{ role: string; content: string; timestamp: string }>).map((entry, i) => (
                      <div key={i} className="flex gap-2 items-start min-w-0 max-w-full">
                        <span className="text-muted-foreground shrink-0 w-[68px]">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge
                          variant="outline"
                          className={"shrink-0 h-5 text-[10px] " + (AGENT_ROLE_BADGE_STYLES[entry.role] || '')}
                        >
                          {entry.role}
                        </Badge>
                        <span
                          className={'whitespace-pre-wrap break-words break-all flex-1 min-w-0 ' + (AGENT_ROLE_TEXT_STYLES[entry.role] || 'text-foreground')}
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
                            <span className="font-medium line-clamp-1 break-words min-w-0" title={sanitizeDisplay(d.title)}>{sanitizeDisplay(d.title)}</span>
                            {getDiscoveryStatusBadge(d.status)}
                            {getVerificationBadges(d)}
                          </div>
                          <a href={d.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate block">
                            {sanitizeDisplay(d.url)}
                          </a>
                        </div>
                        {d.status === 'pending_review' && (
                          <div className="flex gap-1 ml-2">
                            <Button size="sm" variant="ghost" className={`${OK_TEXT} h-7`}
                              onClick={() => approveMutation.mutate(d.id)}>
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className={`${BAD_TEXT} h-7`}
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
              {jobDiscoveriesIsError && (
                <Alert variant="destructive" className="queues-agent__inline-error" role="alert">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{mutationErrorMessage(jobDiscoveriesError)}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </details>

      <Dialog open={!!rejectDialogId} onOpenChange={(open) => { if (!open && !rejectMutation.isPending) { setRejectDialogId(null); setRejectReason(""); } }}>
        <DialogContent className="queues-agent__dialog">
          <DialogHeader>
            <DialogTitle>Reject Discovery</DialogTitle>
            <DialogDescription>
              Mark this discovered resource as rejected. Optionally include a reason for the audit trail.
            </DialogDescription>
          </DialogHeader>
          {rejectMutation.isError && (
            <Alert variant="destructive" className="queues-agent__inline-error" role="alert">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{mutationErrorMessage(rejectMutation.error)}</AlertDescription>
            </Alert>
          )}
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
              <Button variant="outline" onClick={() => setRejectDialogId(null)} disabled={rejectMutation.isPending}>Cancel</Button>
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
