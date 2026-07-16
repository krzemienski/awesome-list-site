import { db } from "../db";
import { agentEvents, type AgentEvent } from "@shared/schema";
import { and, asc, eq, gt } from "drizzle-orm";

/**
 * Structured, persisted logging for the Claude Agent SDK multi-agent runs
 * (Researcher + Enrichment). Every meaningful step in a run — lifecycle,
 * assistant turns, tool calls/results, delegations to subagents, and the final
 * result — is written to the `agent_events` table with a monotonic per-run
 * sequence number so the admin log viewer and communication graph can replay
 * the run in order and attribute tokens/cost per actor.
 *
 * Persistence is best-effort: an emit failure logs to the console but never
 * throws into the run loop (a dropped log line must not fail a research job).
 */

export type JobType = "research" | "enrichment";

export type ActorType = "orchestrator" | "subagent" | "tool" | "system";

export type AgentEventType =
  | "lifecycle"
  | "message"
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "delegation"
  | "delegation_result"
  | "result"
  | "error";

export interface EmitInput {
  actor: string;
  actorType: ActorType;
  eventType: AgentEventType;
  model?: string | null;
  targetActor?: string | null;
  summary?: string | null;
  detail?: Record<string, any>;
  tokensIn?: number | null;
  tokensOut?: number | null;
  costUsd?: string | null;
  durationMs?: number | null;
}

const MAX_SUMMARY = 4000;

/**
 * Hard cap on how long one event insert may take. A wedged DB pool must never
 * hang a caller awaiting emit() — tool handlers and run loops await emits, and
 * an indefinite hang there reads to the agent as "the tool server is down".
 */
const EMIT_TIMEOUT_MS = 8000;

function withEmitTimeout<T>(p: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`emit timed out after ${EMIT_TIMEOUT_MS}ms`)), EMIT_TIMEOUT_MS);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export class AgentEventEmitter {
  private seq = 0;

  constructor(
    private readonly jobType: JobType,
    private readonly jobId: number,
  ) {}

  /** Next sequence number that will be assigned (for diagnostics). */
  get currentSeq(): number {
    return this.seq;
  }

  /**
   * Persist one event. Sequence numbers are allocated synchronously at call
   * time so ordering follows call order even though the insert is async.
   */
  async emit(e: EmitInput): Promise<void> {
    const seq = this.seq++;
    try {
      await withEmitTimeout(db.insert(agentEvents).values({
        jobType: this.jobType,
        jobId: this.jobId,
        seq,
        actor: e.actor,
        actorType: e.actorType,
        eventType: e.eventType,
        model: e.model ?? null,
        targetActor: e.targetActor ?? null,
        summary: e.summary ? e.summary.slice(0, MAX_SUMMARY) : null,
        detail: e.detail ?? {},
        tokensIn: e.tokensIn ?? null,
        tokensOut: e.tokensOut ?? null,
        costUsd: e.costUsd ?? null,
        durationMs: e.durationMs ?? null,
      }));
    } catch (err: any) {
      console.error(
        `[agentEvents:${this.jobType}:${this.jobId}] emit failed (seq ${seq}, ${e.eventType}):`,
        err?.message || err,
      );
    }
  }
}

/**
 * Read the persisted event stream for one run, ordered by the monotonic per-run
 * sequence. `afterSeq` enables incremental polling (fetch only events newer than
 * the highest seq the client already has) while a run is live.
 */
export async function getAgentEvents(
  jobType: JobType,
  jobId: number,
  afterSeq?: number,
): Promise<AgentEvent[]> {
  const conds = [eq(agentEvents.jobType, jobType), eq(agentEvents.jobId, jobId)];
  if (typeof afterSeq === "number" && Number.isFinite(afterSeq)) {
    conds.push(gt(agentEvents.seq, afterSeq));
  }
  return db
    .select()
    .from(agentEvents)
    .where(and(...conds))
    .orderBy(asc(agentEvents.seq));
}
