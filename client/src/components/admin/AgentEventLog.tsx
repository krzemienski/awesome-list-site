import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { AgentEvent } from "@shared/schema";

const ACTOR_TYPE_STYLES: Record<string, string> = {
  orchestrator: "border-blue-500/50 text-blue-300",
  subagent: "border-purple-500/50 text-purple-300",
  tool: "border-cyan-500/50 text-cyan-300",
  system: "border-yellow-500/50 text-yellow-300",
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  lifecycle: "border-yellow-500/50 text-yellow-400",
  message: "border-blue-500/50 text-blue-300",
  thinking: "border-muted-foreground/40 text-muted-foreground",
  tool_call: "border-cyan-500/50 text-cyan-400",
  tool_result: "border-green-500/50 text-green-400",
  delegation: "border-purple-500/50 text-purple-400",
  delegation_result: "border-purple-400/30 text-purple-300",
  result: "border-green-600/60 text-green-400",
  error: "border-red-500/50 text-red-400",
};

interface AgentEventLogProps {
  jobType: "research" | "enrichment";
  jobId: number;
  isActive?: boolean;
  height?: string;
}

/**
 * Structured, persisted agent-event stream viewer for a single Agent SDK run.
 * Reads from GET /api/{researcher|enrichment}/jobs/:id/events (ordered by the
 * per-run seq) and renders per-actor / per-tool attribution with tokens, cost,
 * timing, and expandable raw detail. Polls every 2s while the run is active.
 */
export function AgentEventLog({ jobType, jobId, isActive, height = "360px" }: AgentEventLogProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const apiBase = jobType === "research" ? "/api/researcher" : "/api/enrichment";
  const url = `${apiBase}/jobs/${jobId}/events`;

  const { data: events = [], isLoading } = useQuery<AgentEvent[]>({
    queryKey: [url],
    enabled: !!jobId,
    refetchInterval: isActive ? 2000 : false,
  });

  const toggle = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const hasDetail = (d: AgentEvent["detail"]) =>
    !!d && typeof d === "object" && Object.keys(d).length > 0;

  // R4-078: event payloads can arrive as raw stderr / minified source / stack
  // dumps. Strip ANSI colour codes + non-printable control chars so they can't
  // smuggle escape sequences into the DOM, then clamp the length so a single
  // huge line can't blow out the layout (full text stays in the title attr /
  // is reachable via the expand affordance).
  const sanitizeText = (raw: unknown): string => {
    if (raw == null) return "";
    const s = typeof raw === "string" ? raw : String(raw);
    return s
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-9;]*m/g, "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  };
  const SUMMARY_MAX = 280;
  const DETAIL_MAX = 2000;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Agent Events (structured)</Label>
        <Label className="text-xs text-muted-foreground" data-testid="text-event-count">
          {events.length} event{events.length === 1 ? "" : "s"}
        </Label>
      </div>

      {isLoading && events.length === 0 ? (
        <div className="h-[120px] border rounded p-4 flex items-center justify-center text-xs text-muted-foreground">
          Loading events…
        </div>
      ) : events.length === 0 ? (
        <div className="h-[120px] border rounded p-4 flex items-center justify-center text-xs text-muted-foreground">
          {isActive ? "Waiting for first event…" : "No events recorded."}
        </div>
      ) : (
        <ScrollArea className="border rounded p-2 bg-black/40" style={{ height }}>
          <div className="space-y-1.5 font-mono text-xs">
            {events.map((ev) => {
              const showDetail = hasDetail(ev.detail);
              const isOpen = !!expanded[ev.id];
              return (
                <div key={ev.id} className="border-b border-border/30 pb-1.5 last:border-0" data-testid={`row-event-${ev.seq}`}>
                  <div className="flex gap-2 items-start">
                    <span className="text-muted-foreground shrink-0 w-[64px]">
                      {ev.ts ? new Date(ev.ts).toLocaleTimeString() : ""}
                    </span>
                    <Badge
                      variant="outline"
                      className={"shrink-0 h-5 text-[10px] " + (ACTOR_TYPE_STYLES[ev.actorType] || "")}
                    >
                      {ev.actor}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={"shrink-0 h-5 text-[10px] " + (EVENT_TYPE_STYLES[ev.eventType] || "")}
                    >
                      {ev.eventType}
                    </Badge>
                    {ev.targetActor && (
                      <span className="text-purple-300 shrink-0">→ {ev.targetActor}</span>
                    )}
                    {(() => {
                      const clean = sanitizeText(ev.summary);
                      const isLong = clean.length > SUMMARY_MAX;
                      return (
                        <span
                          className="whitespace-pre-wrap break-words flex-1 text-foreground/90"
                          title={isLong ? clean : undefined}
                        >
                          {isLong ? `${clean.slice(0, SUMMARY_MAX)}…` : clean}
                        </span>
                      );
                    })()}
                    {showDetail && (
                      <button
                        type="button"
                        onClick={() => toggle(ev.id)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={isOpen ? `Hide detail for event ${ev.seq}` : `Show detail for event ${ev.seq}`}
                        data-testid={`button-toggle-detail-${ev.seq}`}
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {(ev.model || ev.tokensIn != null || ev.tokensOut != null || ev.costUsd || ev.durationMs != null) && (
                    <div className="flex gap-3 pl-[72px] mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                      {ev.model && <span>{ev.model}</span>}
                      {ev.tokensIn != null && (
                        <span title={
                          (ev.detail && typeof ev.detail === "object" && (ev.detail as any).cache_read != null)
                            ? `raw: ${(ev.detail as any).input_tokens_raw ?? "?"} + cache_read: ${(ev.detail as any).cache_read ?? 0} + cache_creation: ${(ev.detail as any).cache_creation ?? 0}`
                            : undefined
                        }>
                          in {ev.tokensIn.toLocaleString()}
                          {ev.detail && typeof ev.detail === "object" && ((ev.detail as any).cache_read > 0 || (ev.detail as any).cache_creation > 0) && (
                            <span className="opacity-60 ml-1">
                              ({(ev.detail as any).cache_read > 0 ? `↩${((ev.detail as any).cache_read as number).toLocaleString()} ` : ""}{(ev.detail as any).cache_creation > 0 ? `⊕${((ev.detail as any).cache_creation as number).toLocaleString()}` : ""})
                            </span>
                          )}
                        </span>
                      )}
                      {ev.tokensOut != null && <span>out {ev.tokensOut.toLocaleString()}</span>}
                      {ev.costUsd && <span>${ev.costUsd}</span>}
                      {ev.durationMs != null && <span>{ev.durationMs}ms</span>}
                    </div>
                  )}

                  {showDetail && isOpen && (() => {
                    const raw = sanitizeText(JSON.stringify(ev.detail, null, 2));
                    const truncated = raw.length > DETAIL_MAX;
                    return (
                      <pre className="pl-[72px] mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap break-all">
                        {truncated ? raw.slice(0, DETAIL_MAX) : raw}
                        {truncated && (
                          <span className="text-yellow-500/80">
                            {`\n… (truncated ${(raw.length - DETAIL_MAX).toLocaleString()} more characters)`}
                          </span>
                        )}
                      </pre>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
