/**
 * DOMAIN ROUTER: Production log query (admin only, #283)
 *
 *   GET /api/admin/logs?since=<ISO|-60m>&until=<ISO|-5m>&level=&area=&q=&limit=
 *
 * Reads the JSONL objects the storage log sink wrote to the private App Storage
 * bucket (`logs/YYYY/MM/DD/HH/<instance>-<epochms>-<seq>.jsonl`), filters them
 * and returns `{records, instances, scanned, truncated}`, newest first.
 * `level` is a minimum severity (warn returns warn + error); `area` is exact;
 * `q` is a case-insensitive substring of message + fields. Records were scrubbed
 * before they were buffered, so nothing here re-reads env values.
 * Bounds: window <= 7 days, limit <= 2000, objects scanned <= 200 (whole hours).
 * A truncated result carries `nextUntil`; repeat the query with `until=<nextUntil>`
 * to page back through the whole 7 days.
 */
import type { Express, RequestHandler } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { BadRequestError } from "../../middleware/errors";
import type { LogRecord } from "../../lib/logSink";
import { hourPath, LOG_RETENTION_MS } from "../../lib/logSinkStorage";
import { PrivateStorageError, resolvePrivateStorage, type PrivateStorage } from "../../lib/privateStorage";

interface AdminLogsContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
}

export const DEFAULT_LIMIT = 200;
export const MAX_LIMIT = 2000;
export const MAX_OBJECTS = 200;
const HOUR_MS = 60 * 60 * 1000;
const READ_CONCURRENCY = 10;
const LIST_CONCURRENCY = 8;
const SEVERITY = { info: 0, warn: 1, error: 2 } as const;
type Level = keyof typeof SEVERITY;
const RELATIVE = /^-(\d+)([mhd])$/;
const UNIT_MS = { m: 60_000, h: HOUR_MS, d: 24 * HOUR_MS } as const;

export interface LogQuery {
  since: number;
  until: number;
  level?: Level;
  area?: string;
  q?: string;
  limit: number;
}

export interface LogQueryResult {
  records: LogRecord[];
  instances: string[];
  scanned: number;
  /** Objects that could not be read; their records are missing from the result. */
  failedReads: number;
  truncated: boolean;
  /** When truncated: pass as `until` to read the next (older) page. A record at exactly this time may repeat. */
  nextUntil?: string;
}

/** `-60m` / `-2h` / `-1d` relative to `now`, or an ISO timestamp. */
export function parseTime(value: string, now: number): number {
  const relative = RELATIVE.exec(value);
  const parsed = relative ? now - Number(relative[1]) * UNIT_MS[relative[2] as keyof typeof UNIT_MS] : Date.parse(value);
  if (Number.isNaN(parsed)) throw new BadRequestError(`"${value}" is neither an ISO time nor a relative time like -60m.`);
  return parsed;
}

const single = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

export function parseLogQuery(query: Record<string, unknown>, now: number): LogQuery {
  const until = Math.min(now, single(query.until) ? parseTime(single(query.until)!, now) : now);
  const since = Math.max(single(query.since) ? parseTime(single(query.since)!, now) : now - HOUR_MS, now - LOG_RETENTION_MS);
  if (since > until) throw new BadRequestError("since is after until.");
  const level = single(query.level);
  if (level !== undefined && !Object.hasOwn(SEVERITY, level)) throw new BadRequestError("level must be info, warn or error.");
  const limit = single(query.limit) === undefined ? DEFAULT_LIMIT : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) throw new BadRequestError("limit must be a positive integer.");
  return { since, until, level: level as Level | undefined, area: single(query.area), q: single(query.q)?.toLowerCase(), limit: Math.min(limit, MAX_LIMIT) };
}

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: { message?: string } }, action: string): T => {
  if (!result.ok) throw new Error(`log storage ${action} failed: ${result.error?.message ?? "unknown error"}`);
  return result.value;
};

/**
 * Object names in the hours covering [since, until], newest hour first, newest object first.
 * Whole hours are taken until MAX_OBJECTS would be exceeded (always at least one), so the
 * unread remainder starts at an hour boundary: `resumeUntil` is the end of the first skipped hour.
 */
async function listWindowObjects(storage: PrivateStorage, since: number, until: number): Promise<{ names: string[]; resumeUntil?: number }> {
  const hours: number[] = [];
  for (let hour = Math.floor(until / HOUR_MS) * HOUR_MS; hour >= Math.floor(since / HOUR_MS) * HOUR_MS; hour -= HOUR_MS) hours.push(hour);
  const perHour: string[][] = [];
  for (let i = 0; i < hours.length; i += LIST_CONCURRENCY) {
    perHour.push(...await Promise.all(hours.slice(i, i + LIST_CONCURRENCY).map(async (hour) =>
      unwrap(await storage.client.list({ prefix: `${storage.prefix}${hourPath(hour)}` }), "list")
        .map((object) => object.name)
        .sort((a, b) => b.localeCompare(a)))));
  }
  const names: string[] = [];
  for (const [i, hourNames] of perHour.entries()) {
    if (names.length > 0 && names.length + hourNames.length > MAX_OBJECTS) return { names, resumeUntil: hours[i] + HOUR_MS - 1 };
    names.push(...hourNames);
  }
  return { names };
}

function matches(record: LogRecord, query: LogQuery): boolean {
  const time = Date.parse(record._time);
  if (Number.isNaN(time) || time < query.since || time > query.until) return false;
  if (query.level && SEVERITY[record.level] < SEVERITY[query.level]) return false;
  if (query.area && record.area !== query.area) return false;
  return !query.q || `${record.message} ${record.fields ?? ""}`.toLowerCase().includes(query.q);
}

function parseLines(jsonl: string): LogRecord[] {
  const records: LogRecord[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line) continue;
    try {
      records.push(JSON.parse(line) as LogRecord);
    } catch {
      // a torn or foreign line is skipped, not fatal
    }
  }
  return records;
}

export async function queryLogs(storage: PrivateStorage, query: LogQuery): Promise<LogQueryResult> {
  const { names, resumeUntil } = await listWindowObjects(storage, query.since, query.until);
  const found: LogRecord[] = [];
  let failedReads = 0;
  for (let i = 0; i < names.length; i += READ_CONCURRENCY) {
    const settled = await Promise.allSettled(names.slice(i, i + READ_CONCURRENCY).map(async (name) =>
      unwrap(await storage.client.downloadAsText(name), "read")));
    for (const result of settled) {
      if (result.status === "rejected") failedReads++;
      else found.push(...parseLines(result.value).filter((record) => matches(record, query)));
    }
  }
  found.sort((a, b) => b._time.localeCompare(a._time));
  const records = found.slice(0, query.limit);
  const limited = found.length > query.limit;
  const nextUntil = limited ? records[records.length - 1]._time : resumeUntil === undefined ? undefined : new Date(resumeUntil).toISOString();
  return {
    records,
    instances: [...new Set(found.map((record) => record.instance))].sort(),
    scanned: names.length,
    failedReads,
    truncated: nextUntil !== undefined,
    nextUntil,
  };
}

export function registerAdminLogsRoutes(app: Express, { isAuthenticated, isAdmin }: AdminLogsContext): void {
  app.get("/api/admin/logs", isAuthenticated, isAdmin, asyncHandler(async (req, res) => {
    const query = parseLogQuery(req.query, Date.now());
    let storage: PrivateStorage;
    try {
      storage = resolvePrivateStorage("logs");
    } catch (error) {
      if (error instanceof PrivateStorageError) return void res.status(503).json({ message: error.message });
      throw error;
    }
    res.set("Cache-Control", "no-store").json(await queryLogs(storage, query));
  }));
}
