import { useEffect, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, History, Play, RefreshCw, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLoadError } from "@/components/admin/AdminLoadError";
import { AgentCommsGraph } from "@/components/admin/AgentCommsGraph";
import { AgentEventLog } from "@/components/admin/AgentEventLog";
import { focusElement } from "@/hooks/focus-handoff";
import { useToast } from "@/hooks/use-toast";
import { ApiError, apiRequest } from "@/lib/queryClient";
import { describeWriteError } from "@/lib/apiError";
import { sanitizeDisplay } from "@/lib/sanitize-display";
import type { AgentEvent, ResearchDiscovery, ResearchJob } from "@shared/schema";
import { COST_BASIS_NOTE, formatCost, getStatusBadge, humanizeJobError, isActiveJobStatus } from "./researchDisplay";
import { OUTCOME_LABEL, STEP_LABEL, deriveRunProgress, type RunOutcome } from "./researchRunProgress";
import { ResearchPhaseTimeline } from "./ResearchPhaseTimeline";
import { ResearchRunDiscoveries } from "./ResearchRunDiscoveries";
import { CancelResearchRunDialog } from "./CancelResearchRunDialog";

interface ResearchRunViewProps {
  jobId: number;
  /** Move focus to the run heading on mount (right after a launch). */
  focusOnMount: boolean;
  onStartNew: () => void;
  onRelaunchHigherCap: () => void;
  onShowHistory: () => void;
}

type JobWithLiveness = ResearchJob & { isActive: boolean };

const SETTLE_MS = 60_000;

function elapsed(from: Date | string, to: number): string | null {
  const s = Math.round((to - new Date(from).getTime()) / 1000);
  if (!Number.isFinite(s) || s < 0) return null;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** The plain next step for each ending. */
function endingCopy(outcome: RunOutcome, saved: number, job: ResearchJob): string {
  const found = plural(saved, "saved discovery", "saved discoveries");
  switch (outcome) {
    case "completed":
      return saved > 0 ? `Run finished with ${found}. Review them below.` : "Run finished without saving a discovery. Relaunch with a different focus or brief.";
    case "budget_stopped":
      return `Budget cap reached ($${Number(job.maxBudgetUsd ?? 0).toFixed(2)}) — review the ${found}, or relaunch with a higher cap.`;
    case "cancelled":
      return saved > 0 ? `Run cancelled — review the ${found} it made before stopping.` : "Run cancelled before it saved a discovery.";
    case "failed":
      return `Run failed${saved > 0 ? ` — the ${found} are kept; review them, or relaunch` : " — relaunch it"}. ${job.errorMessage ? humanizeJobError(job.errorMessage) : ""}`.trim();
  }
}

/**
 * The live view of one research run: phase timeline, scouts, saved
 * discoveries against the target, limits, and — once the run ends — its
 * discoveries reviewed in place, then onward to the jobs table. Phase,
 * discovery and ending changes are announced in one polite live region.
 */
export function ResearchRunView({ jobId, focusOnMount, onStartNew, onRelaunchHigherCap, onShowHistory }: ResearchRunViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // The run keeps writing for a moment after its status leaves "processing"
  // (aborted scouts' scout_end, the finishing event, final usage), so polling
  // continues until the finishing event arrives — at most SETTLE_MS.
  const [settleExpired, setSettleExpired] = useState(false);
  const [finished, setFinished] = useState(false);
  const pollingOf = (status: string | undefined) =>
    !status || isActiveJobStatus(status) || (!finished && !settleExpired);

  const jobQuery = useQuery<JobWithLiveness>({
    queryKey: ["/api/researcher/jobs", jobId],
    // Explicit queryFn: the default fetcher reads only queryKey[0].
    queryFn: async () => {
      const res = await fetch(`/api/researcher/jobs/${jobId}`, { credentials: "include" });
      if (!res.ok) throw new ApiError(res.status, `Failed to fetch job ${jobId}: ${res.status}`);
      return (await res.json()) as JobWithLiveness;
    },
    refetchInterval: (q) => (pollingOf(q.state.data?.status) ? 2000 : false),
  });
  const job = jobQuery.data;
  const active = !job || isActiveJobStatus(job.status);
  const polling = pollingOf(job?.status);

  const eventsUrl = `/api/researcher/jobs/${jobId}/events`;
  // Same cache entry as AgentEventLog / AgentCommsGraph in the detail view.
  const eventsQuery = useQuery<AgentEvent[]>({ queryKey: [eventsUrl], refetchInterval: polling ? 2000 : false });
  const discoveriesQuery = useQuery<ResearchDiscovery[]>({
    queryKey: ["/api/researcher/discoveries", `?jobId=${jobId}`],
    queryFn: async () => {
      const res = await fetch(`/api/researcher/discoveries?jobId=${jobId}`, { credentials: "include" });
      if (!res.ok) throw new ApiError(res.status, `Failed to fetch discoveries: ${res.status}`);
      return (await res.json()) as ResearchDiscovery[];
    },
    refetchInterval: polling ? 3000 : false,
  });
  const discoveries = discoveriesQuery.data ?? [];
  const progress = deriveRunProgress(eventsQuery.data ?? [], job);
  useEffect(() => {
    if (progress.finished) setFinished(true);
  }, [progress.finished]);
  useEffect(() => {
    if (active || finished) return;
    const id = window.setTimeout(() => setSettleExpired(true), SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [active, finished]);
  const outcome = progress.outcome;
  const saved = discoveries.length;
  const target = job?.targetDiscoveries ?? null;

  const cancel = useMutation({
    mutationFn: async () => { await apiRequest(`/api/researcher/jobs/${jobId}`, { method: "DELETE" }); },
    onSuccess: () => {
      setConfirmCancel(false);
      void queryClient.invalidateQueries({ queryKey: ["/api/researcher/jobs"] });
      toast({ title: `Run #${jobId} cancelled` });
    },
  });

  useEffect(() => {
    if (!focusOnMount) return;
    const id = requestAnimationFrame(() => focusElement(headingRef.current));
    return () => cancelAnimationFrame(id);
  }, [focusOnMount]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  // Announcements: one polite region, fed by phase, discovery and ending
  // changes. The first render only records the starting point.
  const seen = useRef<{ phase: string | null; ids: Set<number>; outcome: RunOutcome | null } | null>(null);
  const eventsData = eventsQuery.data;
  const discoveriesData = discoveriesQuery.data;
  useEffect(() => {
    if (!job || !eventsData || !discoveriesData) return;
    const p = deriveRunProgress(eventsData, job);
    const ids = new Set(discoveriesData.map((d) => d.id));
    const prev = seen.current;
    seen.current = { phase: p.current, ids, outcome: p.outcome };
    if (!prev) return;
    const parts: string[] = [];
    const total = discoveriesData.length;
    const goal = job.targetDiscoveries;
    if (p.outcome && p.outcome !== prev.outcome) {
      parts.push(`Run ${OUTCOME_LABEL[p.outcome].toLowerCase()}. ${plural(total, "discovery", "discoveries")} to review.`);
    } else if (p.current && p.current !== prev.phase && p.current !== "done") {
      const running = p.scouts.filter((s) => s.status === "running").length;
      parts.push(`Phase: ${STEP_LABEL[p.current]}${p.current === "scouting" && running > 0 ? `, ${plural(running, "scout", "scouts")} searching` : ""}.`);
    }
    for (const d of discoveriesData.filter((x) => !prev.ids.has(x.id))) {
      parts.push(`Discovery saved: ${sanitizeDisplay(d.title)}. ${total}${goal ? ` of ${goal}` : ""} saved.`);
    }
    if (parts.length > 0) setAnnouncement(parts.join(" "));
  }, [job, eventsData, discoveriesData]);

  // Ending: one last read of events + discoveries (polling just stopped),
  // refresh the jobs table, and hand focus to the review section.
  const wasActive = useRef<boolean | null>(null);
  useEffect(() => {
    if (!job) return;
    const nowActive = isActiveJobStatus(job.status);
    if (wasActive.current === true && !nowActive) {
      void queryClient.invalidateQueries({ queryKey: ["/api/researcher/jobs"] });
      requestAnimationFrame(() => focusElement(reviewHeadingRef.current));
    }
    wasActive.current = nowActive;
  }, [job, queryClient]);

  const pollTrouble = (jobQuery.isError && !!job) || (eventsQuery.isError && !!eventsQuery.data) || (discoveriesQuery.isError && !!discoveriesQuery.data);
  const budget = job?.maxBudgetUsd != null ? Number(job.maxBudgetUsd) : null;
  const turnsUsed = job?.turnsUsed ?? 0;
  const costNote = job?.costBasis ? COST_BASIS_NOTE[job.costBasis] : null;
  const pending = discoveries.filter((d) => d.status === "pending_review").length;
  // Ended runs: measure between the run's own phase events. started_at and
  // completed_at are stamped on different clocks (see docs/AI-SERVICES.md
  // follow-ups), so their difference is not a duration.
  const ranFor = !job ? null
    : active ? (job.startedAt ? elapsed(job.startedAt, now) : null)
      : progress.enteredAt.planning && progress.enteredAt.done ? elapsed(progress.enteredAt.planning, new Date(progress.enteredAt.done).getTime())
        : null;

  return (
    <MotionConfig reducedMotion="user">
      <section className="research-run" aria-labelledby={`research-run-heading-${jobId}`} data-testid="research-run-view" data-job-id={jobId}>
        <div className="research-run__head">
          <div className="min-w-0">
            <h3 id={`research-run-heading-${jobId}`} ref={headingRef} tabIndex={-1} className="text-base font-semibold">
              Research run #{jobId}
            </h3>
            <p className="text-xs text-muted-foreground">
              {job?.categoryFocus ? `Focus: ${job.categoryFocus}` : "All categories"}
              {ranFor ? ` · ${active ? "running for" : "ran for"} ${ranFor}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {job && getStatusBadge(job.status)}
            {job && active && (
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => { cancel.reset(); setConfirmCancel(true); }} disabled={cancel.isPending} data-testid="button-cancel-run">
                <XCircle className="mr-1 h-3 w-3" />{cancel.isPending ? "Cancelling…" : "Cancel run"}
              </Button>
            )}
          </div>
        </div>

        {/* The one polite live region for this view; deliberately outside every list. */}
        <p className="research-run__latest text-xs" aria-live="polite" aria-atomic="true" data-testid="research-run-live">
          {announcement}
        </p>

        {jobQuery.isError && !job && (
          <AdminLoadError subject={`run #${jobId}`} error={jobQuery.error} onRetry={() => { void jobQuery.refetch(); }}
            retrying={jobQuery.isFetching} testId="error-research-run" retryTestId="button-retry-research-run" />
        )}
        {pollTrouble && (
          <p className="text-xs text-muted-foreground" role="status" data-testid="text-run-poll-trouble">
            <RefreshCw className="mr-1 inline h-3 w-3" aria-hidden="true" />Live updates failed; showing the last good data and retrying.
          </p>
        )}
        <CancelResearchRunDialog
          jobId={confirmCancel && job && active ? jobId : null}
          pending={cancel.isPending}
          error={cancel.isError ? cancel.error : null}
          onConfirm={() => cancel.mutate()}
          onDismiss={() => setConfirmCancel(false)}
        />
        {cancel.isError && !confirmCancel && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{describeWriteError(cancel.error, { outcome: "The run may still be going. Try cancelling again." })}</AlertDescription>
          </Alert>
        )}

        {job && (
          <>
            <ResearchPhaseTimeline progress={progress} active={active} />

            <dl className="research-run__meters" data-testid="research-run-meters">
              <div>
                <dt className="text-xs text-muted-foreground">Discoveries</dt>
                <dd className="text-sm font-medium" data-testid="text-run-saved">
                  {target ? `${saved} of ${target} saved` : `${saved} saved · no target`}
                </dd>
                {target ? <Progress value={(Math.min(saved, target) / target) * 100} className="mt-1 h-1.5" aria-label="Discoveries saved against the target" /> : null}
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Turns</dt>
                <dd className="text-sm font-medium" data-testid="text-run-turns">
                  {active && turnsUsed === 0
                    ? `counted at the end · cap ${job.maxTurns ?? "none"}`
                    : `${turnsUsed} of ${job.maxTurns ?? "∞"}`}
                </dd>
                {!active && job.maxTurns ? <Progress value={(Math.min(turnsUsed, job.maxTurns) / job.maxTurns) * 100} className="mt-1 h-1.5" aria-label="Turns used against the cap" /> : null}
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Spend</dt>
                <dd className="text-sm font-medium" data-testid="text-run-cost">
                  {active && Number(job.estimatedCostUsd ?? 0) === 0
                    ? `reported at the end · cap ${budget !== null ? `$${budget.toFixed(2)}` : "none"}`
                    : `${formatCost(job.estimatedCostUsd)}${costNote ? ` (${costNote})` : ""} of ${budget !== null ? `$${budget.toFixed(2)}` : "no cap"}`}
                </dd>
                {!active && budget ? <Progress value={(Math.min(Number(job.estimatedCostUsd ?? 0), budget) / budget) * 100} className="mt-1 h-1.5" aria-label="Spend against the budget cap" /> : null}
              </div>
            </dl>

            {outcome && (
              // role="note": the polite region above already announces the ending.
              <Alert role="note" variant={outcome === "failed" ? "destructive" : "default"} data-testid="research-run-ending" data-outcome={outcome}>
                {outcome === "completed" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription className="space-y-3 break-words">
                  <p>{endingCopy(outcome, saved, job)}</p>
                  {outcome === "budget_stopped" && (
                    <Button size="sm" className="min-h-11" onClick={onRelaunchHigherCap} data-testid="button-relaunch-higher-cap">
                      <Play className="mr-1 h-3 w-3" />Relaunch with a higher cap
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <section className="research-run__review" aria-labelledby={`research-run-review-${jobId}`} data-testid="research-run-review">
              <h4 id={`research-run-review-${jobId}`} ref={reviewHeadingRef} tabIndex={-1} className="text-sm font-semibold">
                {active ? "Discoveries so far" : `Review discoveries${pending > 0 ? ` · ${pending} pending` : ""}`}
              </h4>
              {discoveriesQuery.isError && !discoveriesQuery.data ? (
                <AdminLoadError subject="this run's discoveries" error={discoveriesQuery.error}
                  onRetry={() => { void discoveriesQuery.refetch(); }} retrying={discoveriesQuery.isFetching}
                  testId="error-run-discoveries" retryTestId="button-retry-run-discoveries" />
              ) : (
                <ResearchRunDiscoveries discoveries={discoveries} active={active} />
              )}
              {!active && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" className="min-h-11" onClick={onShowHistory} data-testid="button-run-to-history">
                    <History className="mr-1 h-3 w-3" />{pending > 0 ? "Review later — go to job history" : "Done — go to job history"}
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-11" onClick={onStartNew} data-testid="button-start-new-run">
                    <Play className="mr-1 h-3 w-3" />Start another run
                  </Button>
                </div>
              )}
            </section>

            <div className="research-run__detail">
              <Button type="button" variant="ghost" className="h-auto min-h-11 w-full justify-between whitespace-normal px-3 text-left text-sm"
                aria-expanded={showDetail} aria-controls={`research-run-detail-${jobId}`}
                onClick={() => setShowDetail((v) => !v)} data-testid="button-toggle-run-detail">
                Run details: raw event log and agent graph
                {showDetail ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              {showDetail && (
                <div id={`research-run-detail-${jobId}`} className="pt-2">
                  <Tabs defaultValue="events">
                    <TabsList>
                      <TabsTrigger value="events" className="min-h-11">Event log</TabsTrigger>
                      <TabsTrigger value="graph" className="min-h-11">Agent graph</TabsTrigger>
                    </TabsList>
                    <TabsContent value="events"><AgentEventLog jobType="research" jobId={jobId} isActive={active} /></TabsContent>
                    <TabsContent value="graph"><AgentCommsGraph jobType="research" jobId={jobId} isActive={active} /></TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </MotionConfig>
  );
}
