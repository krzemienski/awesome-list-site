import type { CostBasis } from "@shared/researcherContract";

/**
 * Lower-bound cost for an Agent SDK run that ended without a result message
 * (user cancel, discovery-target backstop, circuit breaker). The SDK's
 * total_cost_usd stays authoritative whenever a result arrives; this exists so
 * an aborted run never records $0 next to real, paid work.
 *
 * It prices the agents' own streamed turns only. Model calls a tool makes
 * internally (WebSearch) never reach the stream, and cache writes use the
 * 5-minute rate, so the true cost is higher: on research job 6 the stream
 * priced to $0.52 against the SDK's reported $1.14 for the same run.
 *
 * USD per million tokens from https://platform.claude.com/docs/en/about-claude/pricing
 * (read 2026-10-25).
 */
interface Rates {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
}

const DATED = "(-\\d{8})?$";
const PRICES: [RegExp, Rates][] = [
  [new RegExp(`fable-5-1${DATED}`), { input: 10, cacheWrite: 12.5, cacheRead: 0.25, output: 50 }],
  [new RegExp(`fable-5${DATED}`), { input: 10, cacheWrite: 12.5, cacheRead: 1, output: 50 }],
  [new RegExp(`opus-5-5${DATED}`), { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 }],
  [new RegExp(`opus-(5|4-[5-8])${DATED}`), { input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25 }],
  [new RegExp(`opus-4(-[01])?${DATED}`), { input: 15, cacheWrite: 18.75, cacheRead: 1.5, output: 75 }],
  [new RegExp(`sonnet-5-5${DATED}`), { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 }],
  [new RegExp(`sonnet-5${DATED}`), { input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 10 }],
  [new RegExp(`sonnet-4(-[56])?${DATED}`), { input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 }],
  [new RegExp(`haiku-5-5${DATED}`), { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 }],
  [new RegExp(`haiku-4-5${DATED}`), { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 }],
];

export interface ModelUsageTotals {
  turns: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

function ratesFor(model: string): Rates | null {
  // Router ids carry a provider prefix ("cc/claude-opus-5"); the router echoes the bare id.
  const id = model.toLowerCase().replace(/^.*\//, "");
  for (const [re, rates] of PRICES) if (re.test(id)) return rates;
  return null;
}

export function estimateUsageCost(byModel: Map<string, ModelUsageTotals>): { usd: number; basis: CostBasis; unpricedModels: string[] } {
  let usd = 0;
  let priced = 0;
  const unpricedModels: string[] = [];
  for (const [model, u] of byModel) {
    const rates = ratesFor(model);
    if (!rates) {
      if (u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheCreationTokens > 0) unpricedModels.push(model);
      continue;
    }
    priced++;
    usd += (u.inputTokens * rates.input + u.cacheCreationTokens * rates.cacheWrite
      + u.cacheReadTokens * rates.cacheRead + u.outputTokens * rates.output) / 1_000_000;
  }
  // Streamed usage never includes the model calls tools make internally
  // (WebSearch), so even a fully priced sum is only a lower bound.
  const basis: CostBasis = priced === 0 && unpricedModels.length > 0 ? "unknown" : "lower_bound";
  return { usd, basis, unpricedModels };
}

interface MessageUsage {
  model: string;
  /** Sent by the orchestrator itself (no parent_tool_use_id), not by a subagent. */
  orchestrator: boolean;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

interface RawUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/**
 * Per-API-message usage observed in an Agent SDK stream, keyed by message id
 * so the per-content-block assistant messages (which repeat one usage) count
 * once. Assistant messages only carry the message_start snapshot, where
 * output_tokens is a handful of tokens; the final count arrives in the
 * message_delta partial event (options.includePartialMessages), which this
 * class pairs with its message by agent stream (parent_tool_use_id).
 *
 * Turns count the orchestrator's API messages only: maxTurns limits the
 * orchestrator's turns, so a scout's turns must not push "turns used" past it.
 */
export class StreamedUsage {
  private readonly messages = new Map<string, MessageUsage>();
  private readonly openMessageByStream = new Map<string, string>();

  private upsert(parentToolUseId: string | null, id: string, model: string, usage: RawUsage): void {
    const cur = this.messages.get(id) ?? { model, orchestrator: parentToolUseId === null, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
    // Values are cumulative per message, so the largest seen is the final one.
    cur.inputTokens = Math.max(cur.inputTokens, usage.input_tokens ?? 0);
    cur.outputTokens = Math.max(cur.outputTokens, usage.output_tokens ?? 0);
    cur.cacheReadTokens = Math.max(cur.cacheReadTokens, usage.cache_read_input_tokens ?? 0);
    cur.cacheCreationTokens = Math.max(cur.cacheCreationTokens, usage.cache_creation_input_tokens ?? 0);
    this.messages.set(id, cur);
  }

  noteAssistant(parentToolUseId: string | null, id: string, model: string, usage: RawUsage): void {
    this.upsert(parentToolUseId, id, model, usage);
  }

  noteStreamEvent(parentToolUseId: string | null, event: { type?: string; message?: { id?: string; model?: string; usage?: RawUsage }; usage?: RawUsage }, fallbackModel: string): void {
    const stream = parentToolUseId ?? "";
    if (event.type === "message_start" && event.message?.id) {
      this.openMessageByStream.set(stream, event.message.id);
      this.upsert(parentToolUseId, event.message.id, event.message.model ?? fallbackModel, event.message.usage ?? {});
    } else if (event.type === "message_delta" && event.usage) {
      const id = this.openMessageByStream.get(stream);
      const cur = id ? this.messages.get(id) : undefined;
      if (id && cur) this.upsert(parentToolUseId, id, cur.model, event.usage);
    }
  }

  totals(): { turns: number; apiMessages: number; inputTokens: number; outputTokens: number; byModel: Map<string, ModelUsageTotals> } {
    const byModel = new Map<string, ModelUsageTotals>();
    let turns = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    for (const m of this.messages.values()) {
      if (m.orchestrator) turns++;
      inputTokens += m.inputTokens;
      outputTokens += m.outputTokens;
      const t = byModel.get(m.model) ?? { turns: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 };
      t.turns++;
      t.inputTokens += m.inputTokens;
      t.outputTokens += m.outputTokens;
      t.cacheReadTokens += m.cacheReadTokens;
      t.cacheCreationTokens += m.cacheCreationTokens;
      byModel.set(m.model, t);
    }
    return { turns, apiMessages: this.messages.size, inputTokens, outputTokens, byModel };
  }
}
