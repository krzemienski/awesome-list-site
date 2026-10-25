/**
 * Follows subagent delegations through the Agent SDK message stream so the
 * caller gets one start and one end per delegation, plus per-delegation web
 * search counts, and so a concurrency cap can be enforced in the PreToolUse
 * hook.
 *
 * A delegation is a blocking Task/Agent tool call: it starts with a
 * `system/task_started` message and ends when the orchestrator receives the
 * tool_result for that tool_use_id. Subagent assistant messages carry the
 * delegation's tool_use_id as `parent_tool_use_id`.
 */

export interface DelegationStarted {
  kind: "started";
  taskId: string;
  toolUseId: string | null;
  subagentType: string | null;
  description: string;
  /** Delegations running now, including this one. */
  concurrent: number;
}

export interface DelegationEnded {
  kind: "ended";
  taskId: string;
  toolUseId: string | null;
  subagentType: string | null;
  status: "completed" | "failed";
  durationMs: number;
  webSearches: number;
  /** Text of the subagent's report (the delegation tool_result). */
  output: string;
}

export type DelegationEvent = DelegationStarted | DelegationEnded;

interface ActiveDelegation {
  taskId: string;
  toolUseId: string | null;
  subagentType: string | null;
  startedAt: number;
  webSearches: number;
}

export class DelegationTracker {
  /** Delegation tool calls the model issued, keyed by tool_use_id, not yet matched to a task. */
  private readonly calls = new Map<string, { subagentType: string | null; description: string }>();
  /** Started delegations keyed by tool_use_id (or `task:<id>` when the SDK omits it). */
  private readonly active = new Map<string, ActiveDelegation>();
  /** tool_use_ids the PreToolUse hook admitted that have not returned yet. */
  private readonly admitted = new Set<string>();

  constructor(private readonly maxConcurrent: number | null) {}

  /** PreToolUse gate: false when the cap is already full. */
  admit(toolUseId: string): boolean {
    if (this.maxConcurrent != null && this.admitted.size >= this.maxConcurrent) return false;
    this.admitted.add(toolUseId);
    return true;
  }

  get cap(): number | null {
    return this.maxConcurrent;
  }

  noteToolUse(toolUseId: string, input: unknown): void {
    const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    this.calls.set(toolUseId, {
      subagentType: typeof i.subagent_type === "string" ? i.subagent_type : null,
      description: typeof i.description === "string" ? i.description : "",
    });
  }

  taskStarted(msg: { task_id?: string | number | null; tool_use_id?: unknown; subagent_type?: unknown; description?: unknown }): DelegationStarted | null {
    if (msg.task_id == null) return null;
    const taskId = String(msg.task_id);
    let toolUseId = typeof msg.tool_use_id === "string" ? msg.tool_use_id : null;
    // Older payloads omit tool_use_id: pair with the oldest unmatched call.
    toolUseId ??= this.calls.keys().next().value ?? null;
    const call = toolUseId ? this.calls.get(toolUseId) : undefined;
    if (toolUseId) this.calls.delete(toolUseId);
    const key = toolUseId ?? `task:${taskId}`;
    if (this.active.has(key)) return null;
    const subagentType = typeof msg.subagent_type === "string" ? msg.subagent_type : call?.subagentType ?? null;
    this.active.set(key, { taskId, toolUseId, subagentType, startedAt: Date.now(), webSearches: 0 });
    return {
      kind: "started",
      taskId,
      toolUseId,
      subagentType,
      description: typeof msg.description === "string" && msg.description ? msg.description : call?.description ?? "",
      concurrent: this.active.size,
    };
  }

  noteSubagentWebSearch(parentToolUseId: string | null | undefined): void {
    if (!parentToolUseId) return;
    const d = this.active.get(parentToolUseId);
    if (d) d.webSearches++;
  }

  /** Call for every tool_result the orchestrator receives. */
  toolResult(toolUseId: string, isError: boolean, output: string): DelegationEnded | null {
    this.admitted.delete(toolUseId);
    this.calls.delete(toolUseId);
    const d = this.active.get(toolUseId);
    if (!d) return null;
    this.active.delete(toolUseId);
    return {
      kind: "ended",
      taskId: d.taskId,
      toolUseId,
      subagentType: d.subagentType,
      status: isError ? "failed" : "completed",
      durationMs: Date.now() - d.startedAt,
      webSearches: d.webSearches,
      output,
    };
  }

  /** Delegations still running (for the caller to close out after an abort). */
  get inFlight(): number {
    return this.active.size;
  }
}
