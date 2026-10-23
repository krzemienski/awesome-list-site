/**
 * The server's one logging helper.
 *
 * Every line has the same shape so the workflow console and the published
 * app's logs read the same way:
 *
 *   14:02:07 INFO  [github-sync] Export finished queueId=41 added=3 rid=7f3a1c req="POST /api/admin/export"
 *
 *   - time, level (INFO / WARN / ERROR) and area (one per module, from
 *     `createLogger(area)`);
 *   - the message, then `key=value` details. An Error argument becomes
 *     `err="…"` (plus `code`/`status` when it carries them); ERROR lines also
 *     get the scrubbed stack on the following lines;
 *   - inside an HTTP request: a short request id (`rid`) and the method + path,
 *     so every line a request produces can be traced back to it. The request's
 *     own status line is written by `logHttpRequest` when it finishes.
 *
 * Nothing secret or personal is written. Before a line is printed:
 *   - detail keys that name a secret or personal field (password, token,
 *     api key, cookie, email, phone, ip, …) are replaced with [redacted];
 *   - every string is scrubbed: values of the deployment's own secret env
 *     vars, known token shapes (GitHub, Anthropic/OpenAI, Clerk, JWT, Bearer),
 *     credentials inside URLs, sensitive query parameters and email
 *     addresses are replaced;
 *   - path segments that look like opaque tokens or emails are replaced.
 */
import { getRequestLogContext } from "../ops/requestContext";

export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info(message: unknown, ...details: unknown[]): void;
  warn(message: unknown, ...details: unknown[]): void;
  error(message: unknown, ...details: unknown[]): void;
}

const MAX_VALUE_LENGTH = 500;
const MAX_LINE_LENGTH = 20000;
const MAX_STACK_LINES = 8;
const MAX_DEPTH = 4;

// ---------------------------------------------------------------------------
// Scrubbing
// ---------------------------------------------------------------------------

/** Last word of a camelCase / snake_case / kebab-case key, lowercased. */
const keyWords = (key: string): string[] =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const SENSITIVE_LAST_WORD = new Set([
  "password",
  "passwd",
  "pwd",
  "secret",
  "token",
  "apikey",
  "authorization",
  "cookie",
  "cookies",
  "credential",
  "credentials",
  "email",
  "phone",
  "ip",
  "signature",
  "sid",
]);

const isSensitiveKey = (key: string): boolean => {
  const words = keyWords(key);
  if (words.length === 0) return false;
  const last = words[words.length - 1];
  if (SENSITIVE_LAST_WORD.has(last)) return true;
  const joined = words.join("_");
  return /(^|_)(api_key|private_key|reply_to|session_id|ip_address|set_cookie|e_mail)$/.test(joined);
};

let secretValues: string[] | null = null;
/** Values of this deployment's own secret env vars (exact-match redaction). */
const knownSecretValues = (): string[] => {
  if (secretValues) return secretValues;
  secretValues = Object.entries(process.env)
    .filter(
      ([name, value]) =>
        typeof value === "string" &&
        value.length >= 8 &&
        /(SECRET|TOKEN|PASSWORD|API_KEY|_KEY$|DATABASE_URL|PRIVATE|AUTH)/i.test(name),
    )
    .map(([, value]) => value as string)
    // Longest first so a secret containing another is replaced whole.
    .sort((a, b) => b.length - a.length);
  return secretValues;
};

const TOKEN_SHAPES: RegExp[] = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub tokens
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bsk-(?:ant-)?[A-Za-z0-9_-]{16,}\b/g, // Anthropic / OpenAI keys
  /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{10,}\b/g, // Clerk / Stripe-style keys
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, // JWTs
];
const BEARER = /\b(Bearer|Basic|token)\s+[A-Za-z0-9._~+/-]{12,}=*/gi;
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi;
const SENSITIVE_QUERY =
  /([?&](?:token|access_token|refresh_token|id_token|key|api_key|apikey|password|secret|sig|signature|code|session|auth|email)=)[^&\s#"']+/gi;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Drizzle query errors append the bound parameters, which can carry visitor
// input; keep the SQL shape, drop the values.
const QUERY_PARAMS = /(\n\s*params:)[^\n]*/g;

export const scrubText = (input: string): string => {
  let text = input.replace(QUERY_PARAMS, "$1 [redacted]");
  for (const secret of knownSecretValues()) {
    if (text.includes(secret)) text = text.split(secret).join("[redacted]");
  }
  for (const shape of TOKEN_SHAPES) text = text.replace(shape, "[redacted]");
  return text
    .replace(BEARER, "$1 [redacted]")
    .replace(URL_CREDENTIALS, "$1[redacted]@")
    .replace(SENSITIVE_QUERY, "$1[redacted]")
    .replace(EMAIL, "[email]");
};

/**
 * Request path safe for logs: no query, and segments that look like opaque
 * tokens (share links, unsubscribe tokens, external user ids) or emails are
 * replaced. Numeric ids and readable slugs stay, so the item is identifiable.
 */
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A lowercase, hyphenated slug made mostly of words ("this-page-is-missing-2",
 * "video-encoding-tools"). Random tokens have no word structure: they are one
 * long mixed run, or hyphenated hex groups where few parts are letters only.
 */
const isReadableSlug = (segment: string): boolean => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(segment)) return false;
  const parts = segment.split("-");
  if (parts.some((part) => part.length > 20)) return false;
  const wordParts = parts.filter((part) => /^[a-z]{2,}$/.test(part)).length;
  return wordParts * 2 >= parts.length;
};

export const scrubPath = (rawPath: string): string => {
  const path = rawPath.split(/[?#]/, 1)[0] || "/";
  return path
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        // keep the raw segment
      }
      if (decoded.includes("@")) return ":email";
      if (UUID_SEGMENT.test(decoded)) return ":token";
      if (isReadableSlug(decoded)) return clip(segment, 120);
      if (decoded.length > 40) return ":token";
      if (/^[A-Za-z0-9_-]{16,}$/.test(decoded) && /\d/.test(decoded) && /[A-Za-z]/.test(decoded)) {
        return ":token";
      }
      return segment;
    })
    .join("/");
};

const clip = (text: string, max = MAX_VALUE_LENGTH): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

/** Deep copy with sensitive keys redacted and strings scrubbed. */
const scrubValue = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (typeof value === "string") return clip(scrubText(value));
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "invalid-date" : value.toISOString();
  if (value instanceof Error) return clip(scrubText(value.message));
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[circular]";
  if (depth >= MAX_DEPTH) return "[…]";
  seen.add(value);
  if (Array.isArray(value)) {
    const items = value.slice(0, 20).map((item) => scrubValue(item, depth + 1, seen));
    if (value.length > 20) items.push(`…+${value.length - 20}`);
    return items;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = "[redacted]";
      continue;
    }
    const cleaned = scrubValue(item, depth + 1, seen);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
};

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const formatScalar = (value: unknown): string => {
  if (typeof value === "string") {
    return /^[A-Za-z0-9_.:/@+-]+$/.test(value) && value.length > 0 ? value : JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value);
  try {
    return clip(JSON.stringify(value) ?? "undefined");
  } catch {
    return "[unserializable]";
  }
};

const errorDetails = (error: Error): Record<string, unknown> => {
  const details: Record<string, unknown> = { err: error.message || error.name };
  const extra = error as Error & { code?: unknown; status?: unknown; statusCode?: unknown; cause?: unknown };
  if (typeof extra.code === "string" || typeof extra.code === "number") details.code = extra.code;
  const status = extra.status ?? extra.statusCode;
  if (typeof status === "number") details.status = status;
  if (extra.cause instanceof Error && extra.cause.message) details.cause = extra.cause.message;
  return details;
};

const LEVEL_LABEL: Record<LogLevel, string> = { info: "INFO ", warn: "WARN ", error: "ERROR" };

const timestamp = (): string => {
  const now = new Date();
  return now.toISOString().slice(11, 19);
};

const write = (level: LogLevel, line: string) => {
  const clipped = line.length > MAX_LINE_LENGTH ? `${line.slice(0, MAX_LINE_LENGTH)}…` : line;
  if (level === "error") console.error(clipped);
  else if (level === "warn") console.warn(clipped);
  else console.log(clipped);
};

const emit = (
  level: LogLevel,
  area: string,
  args: unknown[],
  options: { requestContext?: boolean } = {},
) => {
  const words: string[] = [];
  const pairs: string[] = [];
  let lineArea = area;
  let stack: string | undefined;

  const addPairs = (record: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(record)) {
      if (value === undefined) continue;
      pairs.push(`${key}=${formatScalar(value)}`);
    }
  };

  args.forEach((arg) => {
    if (arg instanceof Error) {
      addPairs(scrubValue(errorDetails(arg)) as Record<string, unknown>);
      if (level === "error" && !stack && arg.stack) stack = arg.stack;
      return;
    }
    if (typeof arg === "string") {
      let text = scrubText(arg).trim();
      const isFirstWord = words.length === 0;
      if (isFirstWord) {
        // Older call sites prefix their own "[label]" and status symbols;
        // the label becomes a sub-area and the level replaces the symbol.
        const label = /^\[([^\]]{1,40})\]\s*/.exec(text);
        if (label) {
          const sub = label[1].trim().toLowerCase().replace(/\s+/g, "-");
          if (sub && sub !== area) lineArea = `${area}:${sub}`;
          text = text.slice(label[0].length);
        }
        text = text.replace(/^[^\p{L}\p{N}"'`(/.-]+/u, "").replace(/:$/, "");
      }
      if (text) words.push(isFirstWord ? text : clip(text));
      return;
    }
    if (arg && typeof arg === "object" && !Array.isArray(arg)) {
      const record = arg as Record<string, unknown>;
      // A nested error inside a details object is still an error.
      for (const key of ["error", "err"]) {
        if (record[key] instanceof Error) {
          const nested = record[key] as Error;
          if (level === "error" && !stack && nested.stack) stack = nested.stack;
        }
      }
      addPairs(scrubValue(record) as Record<string, unknown>);
      return;
    }
    if (arg !== undefined) words.push(formatScalar(scrubValue(arg)));
  });

  if (options.requestContext !== false) {
    const context = getRequestLogContext();
    if (context) {
      pairs.push(`rid=${context.id}`);
      pairs.push(`req=${JSON.stringify(`${context.method} ${scrubPath(context.path)}`)}`);
    }
  }

  const message = words.join(" ") || "(no message)";
  let line = `${timestamp()} ${LEVEL_LABEL[level]} [${lineArea}] ${message}`;
  if (pairs.length > 0) line += ` ${pairs.join(" ")}`;
  if (stack) {
    const frames = scrubText(stack)
      .split("\n")
      .slice(1, MAX_STACK_LINES + 1)
      .map((frame) => `    ${frame.trim()}`);
    if (frames.length > 0) line += `\n${frames.join("\n")}`;
  }
  write(level, line);
};

/** A logger whose lines are tagged with `area` (e.g. "github-sync"). */
export function createLogger(area: string): Logger {
  return {
    info: (...args: unknown[]) => emit("info", area, args),
    warn: (...args: unknown[]) => emit("warn", area, args),
    error: (...args: unknown[]) => emit("error", area, args),
  };
}

/**
 * One line per finished request: method, scrubbed path, status and duration.
 * 5xx → ERROR, 4xx → WARN (401 stays INFO: anonymous session checks are
 * routine), everything else → INFO.
 */
export function logHttpRequest(entry: {
  id?: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  group?: string;
  /** Pseudonymous account id of a signed-in caller (never an email). */
  userId?: string | number;
}): void {
  const level: LogLevel =
    entry.status >= 500 ? "error" : entry.status >= 400 && entry.status !== 401 ? "warn" : "info";
  const details: Record<string, unknown> = { status: entry.status, ms: entry.durationMs };
  if (entry.group) details.group = entry.group;
  if (entry.userId !== undefined) details.user = entry.userId;
  if (entry.id) details.rid = entry.id;
  emit(level, "http", [`${entry.method} ${scrubPath(entry.path)}`, details], { requestContext: false });
}
