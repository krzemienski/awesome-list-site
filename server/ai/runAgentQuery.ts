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
// Delegation (Task*), WebSearch, ToolSearch, SendMessage, ReportFindings and
// mcp__* tools are intentionally NOT in this list.
const BASELINE_DISALLOWED_TOOLS = [
  "Bash",
  "Edit",
  "Write",
  "NotebookEdit",
  "Read",
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
];

// Built-in tool_use blocks we surface as their own tool_call events / graph
// edges. Everything else built-in (e.g. ToolSearch discovery) is noise.
const GRAPHED_BUILTIN_TOOLS = new Set(["WebSearch"]);

export interface AgentDefinitionInput {
  description: string;
  prompt: string;
  tools?: string[];
  model?: string;
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
  maxTurns: number;
  maxBudgetUsd: number;
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

  const q = query({
    prompt,
    options: {
      model,
      systemPrompt,
      maxTurns,
      maxBudgetUsd,
      abortController,
      permissionMode: "bypassPermissions",
      settingSources: [],
      mcpServers: mcpServers as any,
      agents: agents as any,
      allowedTools,
      disallowedTools,
      env: buildAgentEnv(config),
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
              summary: `Run started (model ${model}, maxTurns ${maxTurns}, budget $${maxBudgetUsd})`,
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
            const targetActor = msg.subagent_type || msg.agent_type || null;
            const isStart = msg.subtype === "task_started";
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
              detail: { subtype: msg.subtype, task_id: msg.task_id },
            });
            await mirror("delegation", `[${msg.subtype}] ${targetActor || ""}: ${preview(String(summary), 200)}`);
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

          await emitter.emit({
            actor,
            actorType,
            eventType: "message",
            model: msg.message?.model || model,
            summary:
              combinedText ||
              (toolNames.length ? `→ tools: ${toolNames.join(", ")}` : "(no text)"),
            tokensIn: usage?.input_tokens ?? null,
            tokensOut: usage?.output_tokens ?? null,
            detail: {
              parent_tool_use_id: msg.parent_tool_use_id ?? null,
              tools: toolNames,
              cache_read: usage?.cache_read_input_tokens ?? 0,
              cache_creation: usage?.cache_creation_input_tokens ?? 0,
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

        case "result": {
          result.subtype = msg.subtype;
          result.totalCostUsd = typeof msg.total_cost_usd === "number" ? msg.total_cost_usd : 0;
          result.tokensIn = msg.usage?.input_tokens ?? 0;
          result.tokensOut = msg.usage?.output_tokens ?? 0;
          result.numTurns = msg.num_turns ?? 0;
          result.durationMs = msg.duration_ms ?? 0;
          result.resultText = typeof msg.result === "string" ? msg.result : "";
          result.ok = msg.subtype === "success";
          if (!result.ok) {
            result.errorMessage = msg.subtype;
          }
          await emitter.emit({
            actor: "orchestrator",
            actorType: "system",
            eventType: "result",
            model,
            summary: `Run ${msg.subtype} — ${result.numTurns} turns, $${result.totalCostUsd.toFixed(4)}`,
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
  } catch (err: any) {
    const emsg = err?.message || String(err);
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
    } else if (result.subtype || isBudget || isTurns) {
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
  }

  return result;
}
