import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildAgentEnv, validateBaseUrl, type AgentRunConfig } from "./agentRuntime";
import { AgentEventEmitter } from "./agentEvents";

/**
 * Shared driver for both multi-agent flows (Researcher + Enrichment). It wraps
 * the Claude Agent SDK `query()` generator and:
 *   - applies per-run endpoint/auth (options.env) + model + isolation options
 *   - locks the toolset down (disallowedTools baseline) so a server-side agent
 *     can never touch the filesystem/shell/cron even under bypassPermissions
 *   - enforces cost/turn limits NATIVELY via options.maxBudgetUsd / maxTurns
 *   - translates the SDK message stream into persisted `agent_events` rows
 *     (lifecycle / message / thinking / tool_call / delegation / result) and
 *     mirrors human-readable lines into the caller's legacy log sink
 *   - supports user cancel via a caller-owned AbortController
 *
 * Custom in-process MCP tool handlers emit their own tool_call/tool_result
 * events (they know the exact input/output/duration); this wrapper emits
 * tool_call only for built-in tools (e.g. WebSearch) so custom-tool events are
 * not double-counted.
 */

// Tools that a server-side research/enrichment agent must never be able to run,
// even though permissionMode:"bypassPermissions" auto-approves everything.
// IMPORTANT: under bypassPermissions, `allowedTools` does NOT restrict the
// toolset — only this disallow list does (verified via the init event's
// exposed-tools list, July 24, 2026). The async task-management set
// (TaskCreate/TaskGet/TaskList/TaskOutput/TaskStop/TaskUpdate) is disallowed
// for BOTH flows: async delegation lets the orchestrator end its turn while
// subagents still run, which the SDK treats as run completion (premature
// "success") and its auto-resume kills the in-process MCP bridge. Only the
// blocking Task/Agent delegation tool, WebSearch, ToolSearch and mcp__* stay
// available (flows further restrict via extraDisallowedTools).
const BASELINE_DISALLOWED_TOOLS = [
  "Bash",
  "Edit",
  "Write",
  "NotebookEdit",
  "Read",
  "Glob",
  "Grep",
  "WebFetch",
  "CronCreate",
  "CronDelete",
  "CronList",
  "DesignSync",
  "EnterWorktree",
  "ExitWorktree",
  "Monitor",
  "PushNotification",
  "ScheduleWakeup",
  "Workflow",
  "Skill",
  "TaskCreate",
  "TaskGet",
  "TaskList",
  "TaskOutput",
  "TaskStop",
  "TaskUpdate",
  "SendMessage",
  "ReportFindings",
];

// The delegation tool is named "Task" in the SDK today but has surfaced as
// "Agent" in newer CLI builds — match both so the sync-delegation hook below
// keeps working across SDK upgrades.
const DELEGATION_TOOL_NAMES = new Set(["Task", "Agent"]);

// Built-in tool_use blocks we surface as their own tool_call events / graph
// edges. Everything else built-in (e.g. ToolSearch discovery) is noise.
const GRAPHED_BUILTIN_TOOLS = new Set(["WebSearch"]);

/**
 * Circuit breaker (rewritten July 25, 2026). The old design counted mcp__
 * tool_use blocks "without a result" — but the SDK emits ONE assistant
 * message PER CONTENT BLOCK (same message id + usage repeated), so a single
 * turn batching ≥12 parallel mcp calls tripped the breaker while the bridge
 * was alive (proven on prod job 49: 16 identical-usage check_duplicate
 * messages → false abort; results kept flowing right through it).
 *
 * The breaker now aborts on two genuine dead-bridge signals only:
 *  1. MCP_BRIDGE_DEAD_STRIKES consecutive is_error tool_results matching
 *     BRIDGE_DEAD_RE ("no such tool" etc. — the signature after a spurious
 *     SDK auto-resume detaches the in-process bridge).
 *  2. Stall: ≥ MCP_STALL_PENDING_THRESHOLD calls pending AND no mcp
 *     tool_result of any kind for MCP_STALL_SILENCE_MS. Block-batching can
 *     never trip this — a turn's block messages arrive within milliseconds,
 *     and in-process handlers answer in well under the silence window.
 */
const MCP_BRIDGE_DEAD_STRIKES = 6;
const MCP_STALL_PENDING_THRESHOLD = 12;
const MCP_STALL_SILENCE_MS = 120_000;
/**
 * Regex-drift backstop: if the model receives the SAME is_error text on
 * mcp__ calls this many times in a row (whatever the text — a future
 * dead-bridge wording BRIDGE_DEAD_RE misses, or the model stuck re-sending
 * identical invalid input), the run is looping uselessly. With budget/turns
 * unlimited by default, nothing else bounds the burn — abort.
 */
const MCP_IDENTICAL_ERROR_STRIKES = 10;
/** How often the timer backstop re-runs the stall check (stream may be idle). */
const MCP_STALL_TIMER_MS = 30_000;

export interface AgentDefinitionInput {
  description: string;
  prompt: string;
  tools?: string[];
  model?: string;
  /** Belt-and-braces: false pins this subagent to foreground execution. */
  background?: boolean;
}

export interface RunAgentQueryParams {
  jobType: "research" | "enrichment";
  jobId: number;
  emitter: AgentEventEmitter;
  /** The user/kickoff message that starts the run. */
  prompt: string;
  /** Full custom system prompt (replaces the harness coding-assistant preamble). */
  systemPrompt: string;
  /** Resolved orchestrator model (already merged with per-run override). */
  model: string;
  /** Per-run endpoint/auth config → options.env. */
  config: AgentRunConfig;
  /** In-process MCP servers (custom tools) keyed by server name. */
  mcpServers?: Record<string, any>;
  /** Subagent definitions keyed by agent name (e.g. { scout: {...} }). */
  agents?: Record<string, AgentDefinitionInput>;
  /** Allowlist of tools the orchestrator may call (mcp__* + WebSearch + Task…). */
  allowedTools?: string[];
  /** null => unlimited turns (option omitted from the SDK call entirely). */
  maxTurns: number | null;
  /** null => unlimited budget (option omitted from the SDK call entirely). */
  maxBudgetUsd: number | null;
  /** Caller-owned controller; abort() → graceful user cancel. */
  abortController: AbortController;
  /** Extra tools to disallow on top of the baseline. */
  extraDisallowedTools?: string[];
  /** Optional mirror of human-readable lines into a legacy log sink (agentLog UI). */
  log?: (role: string, content: string) => void | Promise<void>;
}

export interface RunAgentQueryResult {
  ok: boolean;
  /** true when the run was cancelled by the caller's AbortController. */
  aborted: boolean;
  /** SDK result subtype: success | error_max_turns | error_max_budget_usd | error_during_execution | ... */
  subtype?: string;
  resultText: string;
  totalCostUsd: number;
  tokensIn: number;
  tokensOut: number;
  numTurns: number;
  durationMs: number;
  webSearchCount: number;
  errorMessage?: string;
}

function actorFromMessage(msg: any): { actor: string; actorType: "orchestrator" | "subagent" } {
  const sub = msg?.subagent_type;
  if (sub) return { actor: String(sub), actorType: "subagent" };
  return { actor: "orchestrator", actorType: "orchestrator" };
}

function preview(text: string, n = 500): string {
  const t = (text || "").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function isNativeCapSubtype(subtype?: string): boolean {
  return subtype === "error_max_turns" || subtype === "error_max_budget_usd";
}

export async function runAgentQuery(params: RunAgentQueryParams): Promise<RunAgentQueryResult> {
  const {
    emitter,
    prompt,
    systemPrompt,
    model,
    config,
    mcpServers,
    agents,
    allowedTools,
    maxTurns,
    maxBudgetUsd,
    abortController,
    extraDisallowedTools = [],
    log,
  } = params;

  // Re-resolve any custom base URL at run start (not just at job-creation time)
  // to shrink the DNS-rebinding TOCTOU window before the endpoint is handed to
  // the SDK subprocess. Fails closed: a host that now resolves private throws.
  if (config.baseUrl) {
    await validateBaseUrl(config.baseUrl);
  }

  const disallowedTools = Array.from(
    new Set([...BASELINE_DISALLOWED_TOOLS, ...extraDisallowedTools]),
  );

  const mirror = async (role: string, content: string) => {
    if (log) {
      try {
        await log(role, content);
      } catch {
        /* legacy log sink must never break the run */
      }
    }
  };

  const result: RunAgentQueryResult = {
    ok: false,
    aborted: false,
    resultText: "",
    totalCostUsd: 0,
    tokensIn: 0,
    tokensOut: 0,
    numTurns: 0,
    durationMs: 0,
    webSearchCount: 0,
  };

  // ── Circuit breaker state (see MCP_BRIDGE_DEAD_STRIKES doc above).
  // pendingMcpCalls tracks in-flight mcp__ tool_use ids so incoming user-side
  // tool_results can be classified (SDK-side zod rejection ≠ dead bridge —
  // the loop is alive and the model got feedback). lastMcpResultAt feeds the
  // stall detector; bridgeDeadStrikes counts consecutive dead-bridge-signature
  // error results only.
  const pendingMcpCalls = new Map<string, { name: string; at: number }>();
  let lastMcpResultAt = Date.now();
  let bridgeDeadStrikes = 0;
  let lastMcpErrorText = "";
  let identicalMcpErrorStreak = 0;
  const BRIDGE_DEAD_RE = /no such tool|not connected|not available|mcp server .*(failed|closed|disconnect)/i;
  emitter.setAfterEmitHook((e) => {
    if (e.eventType === "tool_result") {
      // Handler answered (success or handler-level error) — bridge is alive.
      lastMcpResultAt = Date.now();
      bridgeDeadStrikes = 0;
    }
  });

  // Shared stall test used by both the in-loop check (fires when a new mcp__
  // block arrives) and the timer backstop below (fires even when the stream
  // has gone completely silent, which the in-loop check can never see).
  const mcpStallDetected = (): { pending: number; silenceMs: number } | null => {
    const now = Date.now();
    if (pendingMcpCalls.size < MCP_STALL_PENDING_THRESHOLD) return null;
    if (now - lastMcpResultAt < MCP_STALL_SILENCE_MS) return null;
    let oldestAt = now;
    for (const p of pendingMcpCalls.values()) {
      if (p.at < oldestAt) oldestAt = p.at;
    }
    if (now - oldestAt < MCP_STALL_SILENCE_MS) return null;
    return { pending: pendingMcpCalls.size, silenceMs: now - lastMcpResultAt };
  };
  const abortForStall = async (stall: { pending: number; silenceMs: number }, via: string) => {
    const cbMsg =
      `MCP tool bridge appears dead: ${stall.pending} mcp__ tool calls pending ` +
      `with no handler response for ${Math.round(stall.silenceMs / 1000)}s. ` +
      `Aborting run to stop burning budget on futile retries.`;
    await emitter.emit({
      actor: "orchestrator",
      actorType: "system",
      eventType: "error",
      summary: cbMsg,
      detail: {
        circuit_breaker: true,
        reason: "stall",
        via,
        pendingCalls: stall.pending,
        silenceMs: stall.silenceMs,
      },
    });
    await mirror("error", cbMsg);
    abortController.abort();
  };
  const stallTimer = setInterval(() => {
    if (abortController.signal.aborted) return;
    const stall = mcpStallDetected();
    if (stall) void abortForStall(stall, "timer").catch(() => {});
  }, MCP_STALL_TIMER_MS);

  // API message ids whose usage has already been attributed to an event —
  // block-split assistant messages repeat the same usage per block.
  const seenUsageMessageIds = new Set<string>();

  // ── Task attribution: map task_id → actor name so task_updated /
  // task_notification events resolve the real subagent name instead of null.
  const taskActorMap = new Map<string, string>();
  // Track how many delegations are currently in-flight so we can warn if the
  // SDK emits a result message while scouts are still running.
  let outstandingDelegations = 0;

  const stderrLines: string[] = [];
  let terminalSdkError = false;
  const q = query({
    prompt,
    options: {
      model,
      systemPrompt,
      // Unlimited (null) => omit the cap so the SDK enforces nothing.
      ...(maxTurns != null ? { maxTurns } : {}),
      ...(maxBudgetUsd != null ? { maxBudgetUsd } : {}),
      abortController,
      permissionMode: "bypassPermissions",
      settingSources: [],
      mcpServers: mcpServers as any,
      agents: agents as any,
      allowedTools,
      disallowedTools,
      env: buildAgentEnv(config),
      // ── Force SYNCHRONOUS delegation. Since SDK ~0.3.2xx the Task/Agent
      // delegation tool runs subagents IN THE BACKGROUND BY DEFAULT
      // (run_in_background defaults to true). A background delegation lets the
      // orchestrator end its turn while scouts are still running; the SDK then
      // treats that turn end as run completion (premature "success" with
      // delegations in-flight) and its auto-resume spawns a second session in
      // which the in-process MCP bridge is dead — every mcp__ call goes
      // unanswered until the circuit breaker aborts. Rewriting the tool input
      // here guarantees run_in_background:false no matter what the model
      // passes, keeping the whole run inside one SDK lifecycle.
      hooks: {
        PreToolUse: [
          {
            hooks: [
              async (input: any) => {
                if (
                  input?.hook_event_name === "PreToolUse" &&
                  DELEGATION_TOOL_NAMES.has(input.tool_name)
                ) {
                  const raw: Record<string, unknown> =
                    typeof input.tool_input === "object" && input.tool_input !== null
                      ? (input.tool_input as Record<string, unknown>)
                      : {};
                  const needsRewrite =
                    raw.run_in_background !== false ||
                    raw.isolation !== undefined ||
                    raw.model !== undefined;
                  if (needsRewrite) {
                    const updatedInput: Record<string, unknown> = {
                      ...raw,
                      run_in_background: false,
                    };
                    // isolation:"remote" always runs in the background regardless
                    // of run_in_background — strip it so it can't reintroduce the
                    // detached-delegation lifecycle.
                    delete updatedInput.isolation;
                    // Per-call model overrides break custom endpoints: some
                    // models pass an Anthropic alias (e.g. "haiku") that a
                    // custom base URL 404s on. The agent definition already
                    // pins the subagent model — strip the override.
                    delete updatedInput.model;
                    return {
                      continue: true,
                      hookSpecificOutput: {
                        hookEventName: "PreToolUse" as const,
                        updatedInput,
                      },
                    };
                  }
                }
                return { continue: true };
              },
            ],
          },
        ],
      },
      stderr: (data) => {
        const redacted = data.replace(
          /((?:token|key|secret|authorization|password|bearer|api.?key|credential)\s*[=:]\s*)\S+/gi,
          "$1[REDACTED]",
        );
        const line = preview(redacted, 1000);
        if (!line) return;
        stderrLines.push(line);
        if (stderrLines.length > 20) stderrLines.shift();
      },
    },
  });

  try {
    for await (const msg of q as any) {
      switch (msg.type) {
        case "system": {
          if (msg.subtype === "init") {
            await emitter.emit({
              actor: "orchestrator",
              actorType: "system",
              eventType: "lifecycle",
              model,
              summary: `Run started (model ${model}, maxTurns ${maxTurns ?? 'unlimited'}, budget ${maxBudgetUsd != null ? `$${maxBudgetUsd}` : 'unlimited'})`,
              detail: {
                tools: msg.tools,
                agents: msg.agents,
                mcp_servers: msg.mcp_servers,
                maxTurns,
                maxBudgetUsd,
                disallowedTools,
              },
            });
          } else if (
            msg.subtype === "task_started" ||
            msg.subtype === "task_updated" ||
            msg.subtype === "task_notification"
          ) {
            // Resolve actor name: task_started carries the subagent type; later
            // events carry only task_id — look up the name from the start event.
            const rawActor = msg.subagent_type || msg.agent_type || null;
            const taskId: string | null = msg.task_id ? String(msg.task_id) : null;

            let targetActor: string | null = rawActor;
            if (msg.subtype === "task_started") {
              if (taskId && rawActor) taskActorMap.set(taskId, rawActor);
              outstandingDelegations++;
            } else {
              // For updates/notifications prefer the stored name (rawActor may be null).
              if (taskId && taskActorMap.has(taskId)) targetActor = taskActorMap.get(taskId)!;
            }

            const isStart = msg.subtype === "task_started";
            // A task_notification arriving after we already emitted delegation_result
            // for this task_id is a duplicate placeholder — suppress it.
            const isDuplicateResult =
              !isStart && taskId && !taskActorMap.has(taskId);
            // Mark task done when we see a completion/result notification so we
            // can track outstanding delegations accurately.
            const looksLikeCompletion =
              !isStart &&
              (msg.subtype === "task_notification" ||
                (typeof msg.summary === "string" && /complet|finish|done|result/i.test(msg.summary)));
            if (looksLikeCompletion && taskId) {
              taskActorMap.delete(taskId);
              outstandingDelegations = Math.max(0, outstandingDelegations - 1);
            }

            if (!isDuplicateResult) {
              const summary =
                msg.description ||
                msg.summary ||
                (isStart ? `Delegating to ${targetActor}` : `Update from ${targetActor}`);
              await emitter.emit({
                actor: "orchestrator",
                actorType: "orchestrator",
                eventType: isStart ? "delegation" : "delegation_result",
                targetActor,
                summary: preview(String(summary)),
                tokensIn: msg.usage?.input_tokens ?? null,
                tokensOut: msg.usage?.output_tokens ?? null,
                detail: { subtype: msg.subtype, task_id: taskId },
              });
              await mirror("delegation", `[${msg.subtype}] ${targetActor || ""}: ${preview(String(msg.description || msg.summary || ""), 200)}`);
            }
          }
          break;
        }

        case "assistant": {
          const { actor, actorType } = actorFromMessage(msg);
          const usage = msg.message?.usage;
          const blocks: any[] = msg.message?.content || [];

          const textBlocks = blocks.filter((b) => b.type === "text" && b.text?.trim());
          const thinkingBlocks = blocks.filter((b) => b.type === "thinking" && b.thinking?.trim());
          const toolUseBlocks = blocks.filter((b) => b.type === "tool_use");

          const combinedText = textBlocks.map((b) => b.text).join("\n").trim();
          const toolNames = toolUseBlocks.map((b) => b.name);

          // Token accounting: include cache read + creation tokens in tokensIn so
          // the event log shows total input consumption, not just non-cached tokens.
          // (Without this, most rows appear as "in 2 / out 2" due to cache hits.)
          //
          // Dedupe by API message id: one API turn can produce several SDK
          // assistant messages sharing a message.id (one per content block),
          // each repeating the SAME usage — attribute tokens only to the first
          // block-message or event-log totals inflate by the block count
          // (job 49: 16× for one batched turn).
          const apiMessageId: string | null = msg.message?.id ?? null;
          const usageAlreadyCounted = apiMessageId !== null && seenUsageMessageIds.has(apiMessageId);
          if (apiMessageId !== null) seenUsageMessageIds.add(apiMessageId);
          const cacheRead = usage?.cache_read_input_tokens ?? 0;
          const cacheCreation = usage?.cache_creation_input_tokens ?? 0;
          const rawIn = usage?.input_tokens ?? null;
          const totalTokensIn = rawIn !== null ? rawIn + cacheRead + cacheCreation : null;

          await emitter.emit({
            actor,
            actorType,
            eventType: "message",
            model: msg.message?.model || model,
            summary:
              combinedText ||
              (toolNames.length ? `→ tools: ${toolNames.join(", ")}` : "(no text)"),
            tokensIn: usageAlreadyCounted ? null : totalTokensIn,
            tokensOut: usageAlreadyCounted ? null : (usage?.output_tokens ?? null),
            detail: {
              parent_tool_use_id: msg.parent_tool_use_id ?? null,
              tools: toolNames,
              cache_read: cacheRead,
              cache_creation: cacheCreation,
              input_tokens_raw: rawIn,
              ...(usageAlreadyCounted ? { usage_deduped: true } : {}),
            },
          });
          if (combinedText) await mirror(actor === "orchestrator" ? "assistant" : `assistant:${actor}`, combinedText);

          for (const tb of thinkingBlocks) {
            await emitter.emit({
              actor,
              actorType,
              eventType: "thinking",
              summary: preview(tb.thinking),
            });
          }

          for (const tb of toolUseBlocks) {
            const name: string = tb.name;
            if (name === "WebSearch") result.webSearchCount++;

            // Circuit breaker (stall arm): register the in-flight call, then
            // abort only if a large backlog of calls has gone completely
            // unanswered for a long time. NOTE: the SDK emits one assistant
            // message per content block, so a batched turn legitimately
            // produces many of these before any tool_result — that alone is
            // NOT a dead bridge (prod job 49 false-abort).
            if (name.startsWith("mcp__")) {
              if (tb.id && !pendingMcpCalls.has(String(tb.id))) {
                pendingMcpCalls.set(String(tb.id), { name, at: Date.now() });
              }
              const stall = mcpStallDetected();
              if (stall) await abortForStall(stall, "message_loop");
            }

            // Custom mcp__ tools emit their own richer tool_call/result from the
            // handler; only surface graphed built-ins here to avoid duplicates.
            if (GRAPHED_BUILTIN_TOOLS.has(name)) {
              await emitter.emit({
                actor,
                actorType,
                eventType: "tool_call",
                targetActor: name,
                summary: preview(JSON.stringify(tb.input)),
                detail: { tool_use_id: tb.id, builtin: true },
              });
              await mirror(
                "web_search",
                `${actor} → ${name}(${preview(JSON.stringify(tb.input), 200)})`,
              );
            }
          }
          break;
        }

        case "user": {
          // Classify tool_results flowing back for in-flight mcp__ calls.
          // Handler-emitted results already reset the breaker via the emitter
          // hook, but SDK-side rejections (zod validation failed before the
          // handler ran) produce is_error tool_results that were previously
          // invisible AND miscounted as a dead bridge.
          const userBlocks: any[] = Array.isArray(msg.message?.content) ? msg.message.content : [];
          for (const ub of userBlocks) {
            if (ub?.type !== "tool_result" || !ub.tool_use_id) continue;
            const pending = pendingMcpCalls.get(String(ub.tool_use_id));
            if (!pending) continue;
            const toolName = pending.name;
            pendingMcpCalls.delete(String(ub.tool_use_id));
            lastMcpResultAt = Date.now();

            const text = typeof ub.content === "string"
              ? ub.content
              : Array.isArray(ub.content)
                ? ub.content.filter((c: any) => c?.type === "text").map((c: any) => c.text).join("\n")
                : "";
            const shortName = toolName.replace(/^mcp__[^_]+(?:__)?/, "") || toolName;

            if (ub.is_error === true) {
              // Regex-drift backstop: identical error text repeating on mcp__
              // calls means the run is looping uselessly (dead bridge with
              // unrecognized wording, or model stuck re-sending the same bad
              // input). Counted across BOTH classification branches below.
              if (text && text === lastMcpErrorText) {
                identicalMcpErrorStreak++;
              } else {
                lastMcpErrorText = text;
                identicalMcpErrorStreak = 1;
              }
              if (identicalMcpErrorStreak >= MCP_IDENTICAL_ERROR_STRIKES) {
                const cbMsg =
                  `MCP tool loop is stuck: ${identicalMcpErrorStreak} consecutive identical ` +
                  `error results on mcp__ tool calls ("${preview(text, 120)}"). ` +
                  `Aborting run to stop burning budget on futile retries.`;
                await emitter.emit({
                  actor: "orchestrator",
                  actorType: "system",
                  eventType: "error",
                  summary: cbMsg,
                  detail: { circuit_breaker: true, reason: "identical_errors", strikes: identicalMcpErrorStreak, tool: toolName },
                });
                await mirror("error", cbMsg);
                abortController.abort();
              }
              if (BRIDGE_DEAD_RE.test(text)) {
                // Genuine dead-bridge signature — a run of these in a row
                // means the in-process bridge detached (spurious SDK resume).
                bridgeDeadStrikes++;
                await mirror("error", `MCP tool ${shortName} unreachable (strike ${bridgeDeadStrikes}/${MCP_BRIDGE_DEAD_STRIKES}): ${preview(text, 200)}`);
                if (bridgeDeadStrikes >= MCP_BRIDGE_DEAD_STRIKES) {
                  const cbMsg =
                    `MCP tool bridge is dead: ${bridgeDeadStrikes} consecutive mcp__ ` +
                    `tool calls answered with dead-bridge errors (e.g. "${preview(text, 120)}"). ` +
                    `Aborting run to stop burning budget on futile retries.`;
                  await emitter.emit({
                    actor: "orchestrator",
                    actorType: "system",
                    eventType: "error",
                    summary: cbMsg,
                    detail: { circuit_breaker: true, reason: "bridge_dead", strikes: bridgeDeadStrikes, tool: toolName },
                  });
                  await mirror("error", cbMsg);
                  abortController.abort();
                }
              } else {
                // SDK-level input rejection: the loop is alive (the model got
                // feedback) — reset the breaker and make the rejection visible
                // in the event stream, since the handler never ran to emit it.
                bridgeDeadStrikes = 0;
                await emitter.emit({
                  actor: shortName,
                  actorType: "tool",
                  eventType: "tool_result",
                  targetActor: "orchestrator",
                  summary: `INPUT REJECTED before handler (SDK schema validation): ${preview(text, 300)}`,
                  detail: { sdk_rejection: true, tool: toolName, tool_use_id: ub.tool_use_id },
                });
                await mirror("error", `${shortName} input rejected by SDK validation (handler never ran): ${preview(text, 300)}`);
              }
            } else {
              // Answered without error — handler ran (and emitted its own
              // event). Defensive reset in case the emitter hook missed it.
              bridgeDeadStrikes = 0;
              lastMcpErrorText = "";
              identicalMcpErrorStreak = 0;
            }
          }
          break;
        }

        case "result": {
          result.subtype = msg.subtype;
          terminalSdkError = msg.is_error === true;
          result.totalCostUsd = typeof msg.total_cost_usd === "number" ? msg.total_cost_usd : 0;
          result.tokensIn = msg.usage?.input_tokens ?? 0;
          result.tokensOut = msg.usage?.output_tokens ?? 0;
          result.numTurns = msg.num_turns ?? 0;
          result.durationMs = msg.duration_ms ?? 0;
          result.resultText = typeof msg.result === "string" ? msg.result : "";
          result.ok = msg.subtype === "success" && msg.is_error !== true;
          if (!result.ok) {
            const rawErrors = (msg as { errors?: unknown }).errors;
            const upstreamErrors = Array.isArray(rawErrors)
              ? rawErrors.filter((error): error is string => typeof error === "string").join("; ")
              : "";
            if (result.resultText) {
              result.errorMessage = result.resultText;
            } else if (upstreamErrors) {
              result.errorMessage = upstreamErrors;
            } else {
              result.errorMessage =
                msg.is_error === true ? "Agent SDK returned an error result" : result.subtype;
            }
          }

          // Warn if the SDK signals completion while delegations are still tracked
          // as in-flight. This is the "premature end" pattern: the orchestrator
          // ended its turn while scouts were still running, so the SDK treated it
          // as run completion. Removing async task tools (TaskCreate etc.) from
          // allowedTools prevents this, but log it for observability if it occurs.
          if (outstandingDelegations > 0 && msg.subtype === "success") {
            await emitter.emit({
              actor: "orchestrator",
              actorType: "system",
              eventType: "lifecycle",
              summary: `WARNING: run completed with ${outstandingDelegations} delegation(s) still marked in-flight. ` +
                `This may indicate premature SDK termination — check that only the blocking Task tool is enabled.`,
              detail: { outstanding_delegations: outstandingDelegations, subtype: msg.subtype },
            });
          }

          await emitter.emit({
            actor: "orchestrator",
            actorType: "system",
            eventType: "result",
            model,
            summary: msg.is_error === true
              ? `Run error: ${preview(result.errorMessage ?? result.subtype ?? "unknown")}`
              : `Run ${msg.subtype} — ${result.numTurns} turns, $${result.totalCostUsd.toFixed(4)}`,
            costUsd: result.totalCostUsd.toFixed(4),
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
            durationMs: result.durationMs,
            detail: {
              subtype: msg.subtype,
              num_turns: result.numTurns,
              duration_api_ms: msg.duration_api_ms,
              is_error: msg.is_error,
            },
          });
          break;
        }

        default:
          break;
      }
    }

    if (
      terminalSdkError ||
      (!result.ok && !result.aborted && !isNativeCapSubtype(result.subtype))
    ) {
      throw new Error(result.errorMessage || `Agent run failed: ${result.subtype || "unknown"}`);
    }
  } catch (err: any) {
    const processDetail = stderrLines.length > 0
      ? `\nClaude process stderr:\n${stderrLines.join("\n")}`
      : "";
    const emsg = `${err?.message || String(err)}${processDetail}`;
    const isBudget = /maximum budget|max budget|budget \(\$/i.test(emsg);
    const isTurns = /maximum (number of )?turns|max turns/i.test(emsg);
    if (abortController.signal.aborted) {
      // Controlled user cancel: abort makes the generator throw a generic Error.
      // Persisted side-effects already survived; treat as a clean stop.
      result.aborted = true;
      result.subtype = result.subtype || "cancelled";
      await emitter.emit({
        actor: "orchestrator",
        actorType: "system",
        eventType: "lifecycle",
        summary: "Run cancelled by user",
        detail: { reason: "aborted" },
      });
      await mirror("system", "Run cancelled by user");
    } else if (!terminalSdkError && (isNativeCapSubtype(result.subtype) || isBudget || isTurns)) {
      // Native cap hit: the SDK emits a result message with an `error_max_*`
      // subtype AND THEN throws. Hitting a configured budget/turn cap is a
      // normal termination, not a failure — the result was already captured
      // and any persisted side-effects survived. Do not emit an error / rethrow.
      if (!result.subtype) result.subtype = isTurns ? "error_max_turns" : "error_max_budget_usd";
      result.ok = result.subtype === "success";
      await mirror("system", `Run stopped: ${result.subtype}`);
    } else {
      result.errorMessage = emsg;
      await emitter.emit({
        actor: "orchestrator",
        actorType: "system",
        eventType: "error",
        summary: preview(emsg),
        detail: { name: err?.name },
      });
      await mirror("error", emsg);
      throw err;
    }
  } finally {
    clearInterval(stallTimer);
  }

  return result;
}
