// BUG-007 (run14): apiRequest throws errors whose raw server body — surfaced
// straight into toasts — shows users things like '409: {"error":"duplicate"}'.
// This shared mapper turns those errors into human-readable copy.
// Run22 BUG-039: ApiError now humanizes its own `message` at construction
// (via humanizeStatusBody below) and keeps the raw server body on `.body`,
// so even toast sites that render error.message directly never show raw JSON.

const STATUS_FALLBACKS: Record<number, string> = {
  400: "Some of the submitted information is invalid. Please review the form and try again.",
  401: "You need to be signed in to do that. Please sign in and try again.",
  403: "You don't have permission to do that.",
  404: "The requested item could not be found. It may have been removed.",
  409: "This appears to be a duplicate of an existing entry.",
  413: "The submission is too large. Please shorten it and try again.",
  422: "Some of the submitted information is invalid. Please review the form and try again.",
  423: "This account is temporarily locked. Please try again later.",
  429: "You're doing that too quickly. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "The server is temporarily unavailable. Please try again in a moment.",
  503: "The server is temporarily unavailable. Please try again in a moment.",
};

/** True when the string already reads like prose meant for people. */
function looksHumanReadable(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.startsWith("{") || t.startsWith("[") || t.startsWith("<")) return false;
  // Reject internal-ish snake_case/error-code strings like "invalid_sort".
  if (/^[a-z0-9_.-]+$/i.test(t) && !t.includes(" ")) return false;
  return true;
}

/** HTTP status lines ("Internal Server Error", "Bad Gateway") carry no guidance. */
function isBareStatusText(text: string): boolean {
  return /^(internal server error|bad gateway|service unavailable|gateway timeout)\.?$/i.test(text.trim());
}

/**
 * Generic outage wording the server sends with 503s (operational request
 * context, central error handler). Accurate, but it does not tell an admin
 * whether their change landed — the write helper below replaces it.
 */
function isGenericOutageText(text: string): boolean {
  return /^(service|database) is temporarily unavailable\.?$/i.test(text.trim());
}

/**
 * Run22 BUG-039: core status+body → human copy mapper. Used by ApiError's
 * constructor (queryClient.ts) so error.message is ALWAYS user-safe, and by
 * humanizeApiError below for legacy "STATUS: body" strings.
 * - JSON bodies: prefers `message`, then `error` when human-readable.
 * - Plain text bodies: used when human-readable.
 * - Otherwise: a friendly per-status fallback.
 */
export function humanizeStatusBody(
  status: number,
  body: string,
  fallback = "Something went wrong. Please try again.",
): string {
  const trimmed = (body || "").trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { message?: unknown; error?: unknown };
      const candidate =
        (typeof parsed.message === "string" && parsed.message) ||
        (typeof parsed.error === "string" && parsed.error) ||
        "";
      // The API contract rewrites every 500 body to the bare
      // {"message":"Internal Server Error"}; that is a status line, not
      // guidance, so fall through to the friendly per-status copy.
      if (looksHumanReadable(candidate) && !isBareStatusText(candidate)) return candidate;
    } catch {
      // fall through to status fallback
    }
  } else if (looksHumanReadable(trimmed) && !/^[A-Za-z ]*Error/.test(trimmed) && !isBareStatusText(trimmed)) {
    return trimmed;
  }
  return STATUS_FALLBACKS[status] ?? fallback;
}

/**
 * Convert an apiRequest/fetch error into a message safe to show users.
 * Prefers structured ApiError props (`status` + `body`); falls back to the
 * legacy `"STATUS: rawBody"` message format, then network-error heuristics.
 */
export function humanizeApiError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  // Structured path: ApiError carries status + raw body as real properties.
  if (
    error && typeof error === "object" &&
    typeof (error as any).status === "number" &&
    typeof (error as any).body === "string"
  ) {
    return humanizeStatusBody((error as any).status, (error as any).body, fallback);
  }

  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!raw) return fallback;

  const match = raw.match(/^(\d{3}):\s*([\s\S]*)$/);
  if (!match) {
    // Network-level failures ("Failed to fetch") and other non-HTTP errors.
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
      return "Could not reach the server. Please check your connection and try again.";
    }
    return looksHumanReadable(raw) ? raw : fallback;
  }

  return humanizeStatusBody(parseInt(match[1], 10), match[2], fallback);
}

/** Status of a structured ApiError-like value, or undefined. */
function errorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const { status } = error as { status?: unknown };
    if (typeof status === "number") return status;
  }
  return undefined;
}

/** Raw response body of a structured ApiError-like value, or "". */
function errorBody(error: unknown): string {
  if (error && typeof error === "object") {
    const { body } = error as { body?: unknown };
    if (typeof body === "string") return body;
  }
  return "";
}

/** True when the error is an HTTP 5xx response from our API. */
export function isServerError(error: unknown): boolean {
  const status = errorStatus(error);
  return status !== undefined && status >= 500 && status <= 599;
}

/**
 * Default outcome for a failed write. Deliberately uncertain: most admin
 * routes commit the write before a separate audit-log insert, so a 500 can
 * arrive after the change landed. Retrying on a false "nothing was saved"
 * creates duplicates or conflicts.
 */
const DEFAULT_WRITE_OUTCOME = "Your change may not have been saved. Refresh to check before trying again.";

export interface WriteErrorOptions {
  /** Copy for non-5xx errors whose body has no human-readable message. */
  fallback?: string;
  /**
   * Sentence telling the admin what happened to their change and what to do
   * next. Defaults to an uncertain "may not have been saved" sentence:
   * many routes commit the write and then fail on a follow-up step (audit
   * log, cache), so a 500 does not prove nothing changed. Claim "nothing
   * changed" only for routes whose write and audit share one transaction. Pass a specific
   * one when the default is not accurate — e.g. bulk actions that are not
   * all-or-nothing, or actions that start a job rather than save data.
   */
  outcome?: string;
}

/**
 * Message for a failed admin write (toast description or inline error).
 *
 * The API contract rewrites every 500 body to a bare "Internal Server
 * Error" so internals never leak, which leaves the admin with no next step.
 * For 5xx responses this returns a clear sentence that says the server
 * failed, what that means for the change, and to try again. A specific,
 * human-readable message on a non-500 5xx (e.g. a 502 "Could not delete the
 * sign-in identity. Nothing was deleted; try again.") is kept as-is.
 * Everything else (4xx, network errors) goes through humanizeApiError.
 */
export function describeWriteError(error: unknown, options: WriteErrorOptions = {}): string {
  const fallback = options.fallback ?? "Something went wrong. Please try again.";
  const outcome = options.outcome ?? DEFAULT_WRITE_OUTCOME;
  const status = errorStatus(error);
  if (status === undefined || status < 500 || status > 599) {
    return humanizeApiError(error, fallback);
  }
  if (status !== 500) {
    const specific = humanizeStatusBody(status, errorBody(error), "");
    if (specific && specific !== STATUS_FALLBACKS[status] && !isGenericOutageText(specific)) {
      return specific;
    }
    if (status === 502 || status === 503 || status === 504) {
      return `The server is temporarily unavailable. ${outcome}`;
    }
  }
  return `The server hit an error. ${outcome}`;
}

/**
 * BUG-005 (run19): extract the server's structured per-field validation
 * messages from an ApiError so forms can render them at the offending fields
 * instead of discarding them behind a generic toast. Returns null when the
 * error carries no usable `fieldErrors` object (non-400, non-JSON, etc.).
 */
export function extractFieldErrors(error: unknown): Record<string, string> | null {
  // Run22 BUG-039: ApiError.message is humanized now — read the raw server
  // body from the structured `.body` property first; legacy "STATUS: body"
  // message parsing kept for non-ApiError callers.
  let body = "";
  if (
    error && typeof error === "object" &&
    typeof (error as any).status === "number" &&
    typeof (error as any).body === "string"
  ) {
    body = ((error as any).body as string).trim();
  } else {
    const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    const match = raw.match(/^(\d{3}):\s*([\s\S]*)$/);
    if (!match) return null;
    body = match[2].trim();
  }
  if (!body.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(body) as { fieldErrors?: unknown };
    if (!parsed.fieldErrors || typeof parsed.fieldErrors !== "object") return null;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.fieldErrors as Record<string, unknown>)) {
      if (typeof value === "string" && value) out[key] = value;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}
