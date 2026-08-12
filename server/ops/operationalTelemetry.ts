type MetricAggregate = {
  count: number;
  errors: number;
  slow: number;
  totalMs: number;
  maxMs: number;
};

const queryMetrics = new Map<string, MetricAggregate>();
const endpointMetrics = new Map<string, MetricAggregate>();
let poolErrors = 0;
let peakPoolActive = 0;
let peakPoolWaiting = 0;

function emptyAggregate(): MetricAggregate {
  return { count: 0, errors: 0, slow: 0, totalMs: 0, maxMs: 0 };
}

function updateAggregate(
  target: Map<string, MetricAggregate>,
  label: string,
  durationMs: number,
  failed: boolean,
  slowThresholdMs: number,
): void {
  const aggregate = target.get(label) ?? emptyAggregate();
  aggregate.count++;
  aggregate.totalMs += durationMs;
  aggregate.maxMs = Math.max(aggregate.maxMs, durationMs);
  if (failed) aggregate.errors++;
  if (durationMs >= slowThresholdMs) aggregate.slow++;
  target.set(label, aggregate);
}

function snapshotMap(source: Map<string, MetricAggregate>) {
  return Object.fromEntries(
    [...source.entries()].map(([label, value]) => [
      label,
      {
        ...value,
        averageMs:
          value.count === 0 ? 0 : Math.round((value.totalMs / value.count) * 10) / 10,
      },
    ]),
  );
}

const QUERY_COMMANDS = new Set([
  "begin",
  "commit",
  "delete",
  "insert",
  "rollback",
  "select",
  "set",
  "update",
  "with",
]);

export function queryCommand(query: unknown): string {
  const text =
    typeof query === "string"
      ? query
      : query && typeof query === "object" && "text" in query
        ? String((query as { text?: unknown }).text ?? "")
        : "";
  const command = text.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
  return QUERY_COMMANDS.has(command) ? command : "other";
}

export function classifyDatabaseError(error: unknown): string {
  const err = error as any;
  const code = String(err?.code ?? err?.cause?.code ?? "");
  if (/^[0-9A-Z]{5}$/.test(code)) return `sqlstate_${code.slice(0, 2)}`;
  const message = String(err?.message ?? err?.cause?.message ?? "").toLowerCase();
  if (message.includes("timeout")) return "timeout";
  if (
    message.includes("connection") ||
    message.includes("econnreset") ||
    message.includes("socket")
  ) {
    return "connection";
  }
  return "other";
}

export function recordDatabaseQuery(
  command: string,
  durationMs: number,
  error?: unknown,
): void {
  const safeCommand = QUERY_COMMANDS.has(command) ? command : "other";
  updateAggregate(queryMetrics, safeCommand, durationMs, !!error, 500);
  if (durationMs >= 500 || error) {
    console.log(
      JSON.stringify({
        event: "ops.db_query",
        command: safeCommand,
        durationMs,
        outcome: error ? "error" : "ok",
        ...(error ? { errorClass: classifyDatabaseError(error) } : {}),
      }),
    );
  }
}

export function recordPoolSnapshot(snapshot: {
  total: number;
  idle: number;
  waiting: number;
}): void {
  peakPoolActive = Math.max(peakPoolActive, Math.max(0, snapshot.total - snapshot.idle));
  peakPoolWaiting = Math.max(peakPoolWaiting, snapshot.waiting);
}

export function recordPoolError(): void {
  poolErrors++;
}

export type EndpointGroup =
  | "admin-heavy"
  | "auth-session"
  | "catalog"
  | "github-sync"
  | "health"
  | "link-health"
  | "public-api"
  | "resources"
  | "other";

export function endpointGroup(path: string): EndpointGroup {
  if (path.startsWith("/api/health")) return "health";
  if (
    path === "/api/awesome-list" ||
    path === "/api/awesome-list/nav" ||
    path === "/api/categories" ||
    path === "/api/subcategories" ||
    path === "/api/sub-subcategories" ||
    path === "/api/tags"
  ) {
    return "catalog";
  }
  if (path.startsWith("/api/admin/link-health")) return "link-health";
  if (
    path === "/api/admin/export" ||
    path === "/api/admin/export-json" ||
    path === "/api/admin/validate" ||
    path === "/api/admin/check-links" ||
    path === "/api/admin/seed-database"
  ) {
    return "admin-heavy";
  }
  if (path.startsWith("/api/github")) return "github-sync";
  if (path.startsWith("/api/auth") || path === "/api/login" || path === "/api/logout") {
    return "auth-session";
  }
  if (path.startsWith("/api/resources") || path.startsWith("/api/resource")) {
    return "resources";
  }
  if (path.startsWith("/api/public")) return "public-api";
  return "other";
}

export function recordEndpointLatency(
  method: string,
  group: EndpointGroup,
  statusCode: number,
  durationMs: number,
): void {
  const safeMethod = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
    method,
  )
    ? method
    : "OTHER";
  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  const label = `${safeMethod}:${group}:${statusClass}`;
  updateAggregate(endpointMetrics, label, durationMs, statusCode >= 500, 1_000);
}

export function getOperationalTelemetrySnapshot() {
  return {
    databaseQueries: snapshotMap(queryMetrics),
    endpoints: snapshotMap(endpointMetrics),
    pool: {
      errors: poolErrors,
      peakActive: peakPoolActive,
      peakWaiting: peakPoolWaiting,
    },
  };
}