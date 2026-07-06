import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import type { AgentEvent } from "@shared/schema";

type NodeType = "orchestrator" | "subagent" | "tool" | "system";

const TYPE_RANK: Record<NodeType, number> = {
  orchestrator: 3,
  subagent: 2,
  tool: 1,
  system: 0,
};

// Row 0 = orchestrator (system events fold in here), 1 = subagents, 2 = tools.
const TYPE_LAYER: Record<NodeType, number> = {
  orchestrator: 0,
  system: 0,
  subagent: 1,
  tool: 2,
};

const TYPE_STROKE: Record<NodeType, string> = {
  orchestrator: "#60a5fa",
  system: "#60a5fa",
  subagent: "#c084fc",
  tool: "#22d3ee",
};

const TYPE_LABEL: Record<NodeType, string> = {
  orchestrator: "orchestrator",
  system: "orchestrator",
  subagent: "subagent",
  tool: "tool",
};

const EDGE_DELEGATION = "#c084fc";
const EDGE_TOOL = "#22d3ee";

interface GNode {
  id: string;
  type: NodeType;
  model?: string;
  x: number;
  y: number;
  row: number;
}
interface GEdge {
  source: string;
  target: string;
  kind: "delegation" | "tool";
  count: number;
}

const NODE_W = 160;
const NODE_H = 56;
const MARGIN = 24;
const TOP = 34;
const ROW_GAP = 128;
const SLOT_MIN = 184;

function buildGraph(events: AgentEvent[]): { nodes: GNode[]; edges: GEdge[]; width: number; height: number } {
  const typeCandidates = new Map<string, NodeType>();
  const models = new Map<string, string>();
  const edgeMap = new Map<string, GEdge>();

  const consider = (id: string, t: NodeType) => {
    const cur = typeCandidates.get(id);
    if (cur === undefined || TYPE_RANK[t] > TYPE_RANK[cur]) typeCandidates.set(id, t);
  };

  for (const ev of events) {
    consider(ev.actor, ev.actorType as NodeType);
    if (ev.model && !models.has(ev.actor)) models.set(ev.actor, ev.model);

    if (ev.targetActor) {
      if (ev.eventType === "delegation") {
        consider(ev.targetActor, "subagent");
        const k = `${ev.actor}->${ev.targetActor}:delegation`;
        const e = edgeMap.get(k) || { source: ev.actor, target: ev.targetActor, kind: "delegation" as const, count: 0 };
        e.count++;
        edgeMap.set(k, e);
      } else if (ev.eventType === "tool_call") {
        consider(ev.targetActor, "tool");
        const k = `${ev.actor}->${ev.targetActor}:tool`;
        const e = edgeMap.get(k) || { source: ev.actor, target: ev.targetActor, kind: "tool" as const, count: 0 };
        e.count++;
        edgeMap.set(k, e);
      }
    }
  }

  const nodeList = Array.from(typeCandidates.entries()).map(([id, type]) => ({
    id,
    type,
    model: models.get(id),
  }));

  // Compact present layers so an absent subagent row doesn't leave a gap.
  const presentLayers = Array.from(new Set(nodeList.map((n) => TYPE_LAYER[n.type]))).sort((a, b) => a - b);
  const rowIndex = new Map<number, number>();
  presentLayers.forEach((l, i) => rowIndex.set(l, i));

  const byRow = new Map<number, typeof nodeList>();
  for (const n of nodeList) {
    const r = rowIndex.get(TYPE_LAYER[n.type])!;
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r)!.push(n);
  }
  for (const arr of byRow.values()) arr.sort((a, b) => a.id.localeCompare(b.id));

  const maxCount = Math.max(1, ...Array.from(byRow.values()).map((a) => a.length));
  const width = Math.max(680, MARGIN * 2 + maxCount * SLOT_MIN);
  const rows = presentLayers.length;
  const height = TOP + (rows - 1) * ROW_GAP + NODE_H + TOP;

  const positioned = new Map<string, GNode>();
  for (const [r, arr] of byRow.entries()) {
    const slot = (width - MARGIN * 2) / arr.length;
    arr.forEach((n, i) => {
      positioned.set(n.id, {
        ...n,
        x: MARGIN + slot * (i + 0.5),
        y: TOP + r * ROW_GAP + NODE_H / 2,
        row: r,
      });
    });
  }

  return {
    nodes: Array.from(positioned.values()),
    edges: Array.from(edgeMap.values()),
    width,
    height,
  };
}

interface AgentCommsGraphProps {
  jobType: "research" | "enrichment";
  jobId: number;
  isActive?: boolean;
}

/**
 * Directed acyclic communication graph for a single Agent SDK run, derived from
 * the same persisted agent_events stream as AgentEventLog (shared react-query
 * cache key). Orchestrator → subagent (delegation) and orchestrator/subagent →
 * tool (tool_call) edges are aggregated from real events; each node is labeled
 * with its model. Layered top-down: orchestrator, subagents, tools.
 */
export function AgentCommsGraph({ jobType, jobId, isActive }: AgentCommsGraphProps) {
  const apiBase = jobType === "research" ? "/api/researcher" : "/api/enrichment";
  const url = `${apiBase}/jobs/${jobId}/events`;

  const { data: events = [] } = useQuery<AgentEvent[]>({
    queryKey: [url],
    enabled: !!jobId,
    refetchInterval: isActive ? 2000 : false,
  });

  const graph = useMemo(() => buildGraph(events), [events]);

  const summary = useMemo(() => {
    const subs = graph.nodes.filter((n) => n.type === "subagent").length;
    const tools = graph.nodes.filter((n) => n.type === "tool").length;
    const delegations = graph.edges.filter((e) => e.kind === "delegation").reduce((a, e) => a + e.count, 0);
    const toolCalls = graph.edges.filter((e) => e.kind === "tool").reduce((a, e) => a + e.count, 0);
    return `Agent communication graph: 1 orchestrator, ${subs} subagent${subs === 1 ? "" : "s"}, ${tools} tool${tools === 1 ? "" : "s"}; ${delegations} delegation${delegations === 1 ? "" : "s"}, ${toolCalls} tool call${toolCalls === 1 ? "" : "s"}.`;
  }, [graph]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Communication Graph</Label>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_STROKE.orchestrator }} />orchestrator</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_STROKE.subagent }} />subagent</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TYPE_STROKE.tool }} />tool</span>
        </div>
      </div>

      {graph.nodes.length === 0 ? (
        <div className="h-[100px] border rounded p-4 flex items-center justify-center text-xs text-muted-foreground">
          {isActive ? "Waiting for agent activity…" : "No agent activity recorded."}
        </div>
      ) : (
        <div className="border rounded bg-black/40 overflow-x-auto" data-testid="agent-comms-graph">
          <svg
            viewBox={`0 0 ${graph.width} ${graph.height}`}
            width="100%"
            style={{ minWidth: graph.width, height: graph.height }}
            role="img"
            aria-label={summary}
          >
            <title>{summary}</title>
            <defs>
              <marker id="arrow-delegation" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={EDGE_DELEGATION} />
              </marker>
              <marker id="arrow-tool" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={EDGE_TOOL} />
              </marker>
            </defs>

            {graph.edges.map((e, i) => {
              const s = graph.nodes.find((n) => n.id === e.source);
              const t = graph.nodes.find((n) => n.id === e.target);
              if (!s || !t) return null;
              const x1 = s.x;
              const y1 = s.y + NODE_H / 2;
              const x2 = t.x;
              const y2 = t.y - NODE_H / 2;
              const my = (y1 + y2) / 2;
              // Edges spanning >1 row (e.g. orchestrator→tool while a subagent row
              // sits between) get bowed sideways when near-collinear, so they route
              // AROUND the intermediate node instead of passing behind it and reading
              // as if that node made the call.
              const dx = x2 - x1;
              const needsBow = t.row - s.row >= 2 && Math.abs(dx) < NODE_W;
              const bow = needsBow ? (dx <= 0 ? -1 : 1) * (NODE_W / 2 + 60) : 0;
              // Keep control points inside the canvas so a leftward bow on the
              // leftmost column can't push the curve off-screen.
              const clampX = (x: number) => Math.max(MARGIN / 2, Math.min(graph.width - MARGIN / 2, x));
              const cx1 = clampX(x1 + bow);
              const cx2 = clampX(x2 + bow);
              const stroke = e.kind === "delegation" ? EDGE_DELEGATION : EDGE_TOOL;
              const marker = e.kind === "delegation" ? "url(#arrow-delegation)" : "url(#arrow-tool)";
              return (
                <g key={i}>
                  <path
                    d={`M ${x1} ${y1} C ${cx1} ${my}, ${cx2} ${my}, ${x2} ${y2}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={e.kind === "delegation" ? 1.75 : 1.25}
                    strokeOpacity={0.55}
                    strokeDasharray={e.kind === "delegation" ? undefined : "4 3"}
                    markerEnd={marker}
                  />
                  {e.count > 1 && (
                    <text x={(x1 + x2) / 2 + bow * 0.75} y={my - 3} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                      ×{e.count}
                    </text>
                  )}
                </g>
              );
            })}

            {graph.nodes.map((n) => {
              const stroke = TYPE_STROKE[n.type];
              return (
                <g key={n.id} data-testid={`graph-node-${n.id}`}>
                  <rect
                    x={n.x - NODE_W / 2}
                    y={n.y - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={7}
                    fill="rgba(0,0,0,0.55)"
                    stroke={stroke}
                    strokeWidth={1.5}
                  />
                  <text x={n.x} y={n.y - 8} textAnchor="middle" className="fill-foreground" fontSize={12} fontWeight={600}>
                    {n.id.length > 20 ? n.id.slice(0, 19) + "…" : n.id}
                  </text>
                  <text x={n.x} y={n.y + 7} textAnchor="middle" fontSize={9} fill={stroke} opacity={0.85}>
                    {TYPE_LABEL[n.type]}
                  </text>
                  {n.model && (
                    <text x={n.x} y={n.y + 19} textAnchor="middle" className="fill-muted-foreground" fontSize={8.5}>
                      {n.model.length > 22 ? n.model.slice(0, 21) + "…" : n.model}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
