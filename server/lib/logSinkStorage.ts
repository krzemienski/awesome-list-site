import { isPrivateStorageConfigured, resolvePrivateStorage, type PrivateStorage } from "./privateStorage";
import type { LogTransport, SinkNotice } from "./logSink";

export const STORAGE_FLUSH_AT = 500;
export const STORAGE_FLUSH_EVERY_MS = 60_000;
export const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const PRUNE_EVERY_MS = 60 * 60 * 1000;
const PRUNE_MAX_DELETES = 500;
const HOUR_MS = 60 * 60 * 1000;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** `YYYY/MM/DD/HH/` for the UTC hour containing `epochMs`. */
export function hourPath(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${pad(d.getUTCHours())}/`;
}

/** Start of the UTC hour encoded in `<prefix>YYYY/MM/DD/HH/…`, or null when the name does not match. */
export function hourOfObject(name: string, prefix: string): number | null {
  if (!name.startsWith(prefix)) return null;
  const match = /^(\d{4})\/(\d{2})\/(\d{2})\/(\d{2})\//.exec(name.slice(prefix.length));
  return match ? Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4]) : null;
}

/** `{instance}` of a JSONL batch, from its first record; the buffered sink hands the transport only text. */
function instanceOf(jsonl: string): string {
  try {
    const newline = jsonl.indexOf("\n");
    const firstLine = newline === -1 ? jsonl : jsonl.slice(0, newline);
    const instance = (JSON.parse(firstLine) as { instance?: unknown }).instance;
    if (typeof instance === "string") return instance.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64) || "unknown";
  } catch {
    // fall through
  }
  return "unknown";
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message?: string } }, action: string): T {
  if (!result.ok) throw new Error(`log storage ${action} failed: ${result.error?.message ?? "unknown error"}`);
  return result.value;
}

/** Deletes log objects whose hour is older than the retention window. Returns how many were deleted. */
export async function pruneLogObjects(storage: PrivateStorage, now: number): Promise<number> {
  const objects = unwrap(await storage.client.list({ prefix: storage.prefix }), "list");
  const expired = objects
    .map((object) => object.name)
    .filter((name) => {
      const hour = hourOfObject(name, storage.prefix);
      return hour !== null && hour + HOUR_MS < now - LOG_RETENTION_MS;
    })
    .slice(0, PRUNE_MAX_DELETES);
  for (const name of expired) unwrap(await storage.client.delete(name), "delete");
  return expired.length;
}

/**
 * One new object per flush (the SDK cannot append):
 * `<private dir>/logs/YYYY/MM/DD/HH/<instance>-<epochms>-<seq>.jsonl`.
 * After a successful write, expired objects are pruned at most once an hour per instance.
 */
export function createStorageTransportFor(storage: PrivateStorage, notice: SinkNotice, now: () => number = Date.now): LogTransport {
  let seq = 0;
  let lastPrune = 0;
  const pruneIfDue = () => {
    const at = now();
    if (at - lastPrune < PRUNE_EVERY_MS) return;
    lastPrune = at;
    pruneLogObjects(storage, at).catch((error) =>
      notice(`retention prune failed: ${error instanceof Error ? error.message : "unknown"}`));
  };
  return async (jsonl) => {
    const at = now();
    const name = `${storage.prefix}${hourPath(at)}${instanceOf(jsonl)}-${at}-${seq++}.jsonl`;
    unwrap(await storage.client.uploadFromText(name, jsonl), "write");
    pruneIfDue();
  };
}

/** Storage transport for a production deployment with the private bucket configured; undefined otherwise. */
export function createStorageTransport(env: NodeJS.ProcessEnv, notice: SinkNotice): LogTransport | undefined {
  if (env.REPLIT_DEPLOYMENT !== "1" || !isPrivateStorageConfigured()) return undefined;
  return createStorageTransportFor(resolvePrivateStorage("logs"), notice);
}
