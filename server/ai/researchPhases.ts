import type {
  ResearchPhase,
  ResearchPhaseEventDetail,
  ScoutEndEventDetail,
  ScoutStartEventDetail,
} from "@shared/researcherContract";
import type { AgentEventEmitter } from "./agentEvents";
import type { DelegationEnded, DelegationStarted } from "./delegationTracker";

/**
 * Emits the Researcher's typed progress events into agent_events:
 *   - "phase" on every phase change (planning → scouting → verifying → saving
 *     → … → finishing), detail ResearchPhaseEventDetail;
 *   - "scout_start" / "scout_end" once per scout delegation, detail
 *     ScoutStartEventDetail / ScoutEndEventDetail.
 * The contract is documented in docs/AI-SERVICES.md.
 */
export class ResearchPhaseTracker {
  private phase: ResearchPhase | null = null;
  private scoutsStarted = 0;
  private readonly running = new Map<string, { scoutIndex: number; toolUseId: string | null; startedAt: number }>();

  constructor(private readonly emitter: AgentEventEmitter) {}

  get current(): ResearchPhase | null {
    return this.phase;
  }

  async enter(phase: ResearchPhase, trigger: string, outcome?: string): Promise<void> {
    if (phase === this.phase) return;
    const detail: ResearchPhaseEventDetail = { phase, previous: this.phase, trigger, ...(outcome ? { outcome } : {}) };
    this.phase = phase;
    await this.emitter.emit({
      actor: "orchestrator",
      actorType: "system",
      eventType: "phase",
      summary: `Phase: ${phase}${outcome ? ` (${outcome})` : ""}`,
      detail: { ...detail },
    });
  }

  async scoutStarted(e: DelegationStarted): Promise<void> {
    const scoutIndex = ++this.scoutsStarted;
    this.running.set(e.taskId, { scoutIndex, toolUseId: e.toolUseId, startedAt: Date.now() });
    const detail: ScoutStartEventDetail = {
      scoutIndex,
      taskId: e.taskId,
      toolUseId: e.toolUseId,
      description: e.description,
      concurrent: e.concurrent,
    };
    await this.emitter.emit({
      actor: "orchestrator",
      actorType: "orchestrator",
      eventType: "scout_start",
      targetActor: e.subagentType ?? "scout",
      summary: `Scout #${scoutIndex} started: ${e.description}`.slice(0, 500),
      detail: { ...detail },
    });
    await this.enter("scouting", "scout_started");
  }

  async scoutEnded(e: DelegationEnded, candidateUrls: number): Promise<void> {
    const run = this.running.get(e.taskId);
    if (!run) return;
    this.running.delete(e.taskId);
    await this.emitEnd(e.taskId, run, e.status, e.durationMs, e.webSearches, candidateUrls, e.subagentType);
  }

  /** Close scouts still running when the run stops (cancel, abort, crash). */
  async abortRunningScouts(): Promise<void> {
    for (const [taskId, run] of [...this.running]) {
      this.running.delete(taskId);
      await this.emitEnd(taskId, run, "aborted", Date.now() - run.startedAt, 0, 0, null);
    }
  }

  private async emitEnd(
    taskId: string,
    run: { scoutIndex: number; toolUseId: string | null },
    status: ScoutEndEventDetail["status"],
    durationMs: number,
    webSearches: number,
    candidateUrls: number,
    subagentType: string | null,
  ): Promise<void> {
    const detail: ScoutEndEventDetail = {
      scoutIndex: run.scoutIndex,
      taskId,
      toolUseId: run.toolUseId,
      status,
      durationMs,
      webSearches,
      candidateUrls,
    };
    await this.emitter.emit({
      actor: subagentType ?? "scout",
      actorType: "subagent",
      eventType: "scout_end",
      targetActor: "orchestrator",
      summary: `Scout #${run.scoutIndex} ${status}: ${webSearches} searches, ${candidateUrls} candidate URLs`,
      durationMs,
      detail: { ...detail },
    });
  }
}

const URL_RE = /https?:\/\/[^\s<>()[\]{}"'`|\\^]+/gi;

/** URLs mentioned in a scout report, trailing punctuation trimmed. */
export function extractUrls(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.match(URL_RE) ?? []) out.add(m.replace(/[.,;:!?*_]+$/, ""));
  return [...out];
}
