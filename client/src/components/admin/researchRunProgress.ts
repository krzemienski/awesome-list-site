import type { AgentEvent, ResearchJob } from "@shared/schema";
import type {
  ResearchPhase,
  ResearchPhaseEventDetail,
  ScoutEndEventDetail,
  ScoutStartEventDetail,
} from "@shared/researcherContract";
import { isActiveJobStatus } from "./researchDisplay";

/** The steps the live timeline shows; "finishing" + outcome collapses into the last one. */
export const TIMELINE_STEPS = ["planning", "scouting", "verifying", "saving", "done"] as const;
export type TimelineStep = (typeof TIMELINE_STEPS)[number];

export type RunOutcome = "completed" | "budget_stopped" | "cancelled" | "failed";

export const STEP_LABEL: Record<TimelineStep, string> = {
  planning: "Planning",
  scouting: "Scouting",
  verifying: "Verifying",
  saving: "Saving",
  done: "Done",
};

export const OUTCOME_LABEL: Record<RunOutcome, string> = {
  completed: "Done",
  budget_stopped: "Stopped at budget",
  cancelled: "Cancelled",
  failed: "Failed",
};

export interface ScoutActivity {
  index: number;
  description: string;
  startedAt: string | null;
  status: "running" | ScoutEndEventDetail["status"];
  durationMs: number | null;
  webSearches: number | null;
  candidateUrls: number | null;
}

export interface RunProgress {
  /** Step the run is on now; null before the first phase event. */
  current: TimelineStep | null;
  /** Steps the run has entered at least once, for the timeline's done marks. */
  visited: ReadonlySet<TimelineStep>;
  /** First time each step was entered (event timestamps). */
  enteredAt: Partial<Record<TimelineStep, string>>;
  /** Terminal outcome, from the job status (authoritative) or the finishing event. */
  outcome: RunOutcome | null;
  /** The finishing event has arrived: the run's last scout_end and usage are written. */
  finished: boolean;
  scouts: ScoutActivity[];
}

const RUN_OUTCOMES: readonly string[] = ["completed", "budget_stopped", "cancelled", "failed"];

function asOutcome(value: unknown): RunOutcome | null {
  return typeof value === "string" && RUN_OUTCOMES.includes(value) ? (value as RunOutcome) : null;
}

function toStep(phase: ResearchPhase): TimelineStep {
  return phase === "finishing" ? "done" : phase;
}

function tsOf(ev: AgentEvent): string | null {
  return ev.ts ? String(ev.ts) : null;
}

/**
 * Folds a run's agent events (ordered by seq) and its job row into what the
 * live view shows. Only typed `phase` / `scout_start` / `scout_end` events
 * are read; everything else stays in the raw event log.
 */
export function deriveRunProgress(events: readonly AgentEvent[], job: ResearchJob | undefined): RunProgress {
  let current: TimelineStep | null = null;
  let finishingOutcome: RunOutcome | null = null;
  let finished = false;
  const visited = new Set<TimelineStep>();
  const enteredAt: Partial<Record<TimelineStep, string>> = {};
  const scouts = new Map<number, ScoutActivity>();

  for (const ev of events) {
    if (ev.eventType === "phase") {
      const d = ev.detail as Partial<ResearchPhaseEventDetail> | null;
      if (!d?.phase) continue;
      const step = toStep(d.phase);
      current = step;
      visited.add(step);
      const at = tsOf(ev);
      if (at && !enteredAt[step]) enteredAt[step] = at;
      if (d.phase === "finishing") {
        finished = true;
        finishingOutcome = asOutcome(d.outcome);
      }
    } else if (ev.eventType === "scout_start") {
      const d = ev.detail as Partial<ScoutStartEventDetail> | null;
      if (typeof d?.scoutIndex !== "number") continue;
      scouts.set(d.scoutIndex, {
        index: d.scoutIndex,
        description: d.description ?? `Scout ${d.scoutIndex}`,
        startedAt: tsOf(ev),
        status: "running",
        durationMs: null,
        webSearches: null,
        candidateUrls: null,
      });
    } else if (ev.eventType === "scout_end") {
      const d = ev.detail as Partial<ScoutEndEventDetail> | null;
      if (typeof d?.scoutIndex !== "number") continue;
      const prev = scouts.get(d.scoutIndex);
      scouts.set(d.scoutIndex, {
        index: d.scoutIndex,
        description: prev?.description ?? `Scout ${d.scoutIndex}`,
        startedAt: prev?.startedAt ?? null,
        status: d.status ?? "completed",
        durationMs: d.durationMs ?? null,
        webSearches: d.webSearches ?? null,
        candidateUrls: d.candidateUrls ?? null,
      });
    }
  }

  // The job row is the source of truth for the ending: an orphan reclaim or a
  // crash can end a run without a finishing event.
  // While the row is still active the run is "finishing", not ended.
  const outcome = !job ? null : isActiveJobStatus(job.status) ? null : asOutcome(job.status) ?? finishingOutcome;
  if (outcome) {
    current = "done";
    visited.add("done");
  }

  return {
    current,
    visited,
    enteredAt,
    outcome,
    finished,
    scouts: [...scouts.values()].sort((a, b) => a.index - b.index),
  };
}
