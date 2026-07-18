// BUG-007 (run14): apiRequest throws Error("STATUS: rawBody") — surfacing that
// raw string in toasts shows users things like '409: {"error":"duplicate"}'.
// This shared mapper turns those errors into human-readable copy. Keep every
// mutation toast routed through humanizeApiError() instead of error.message.

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

/**
 * Convert an apiRequest/fetch error into a message safe to show users.
 * Handles the `"STATUS: rawBody"` format thrown by throwIfResNotOk:
 * - JSON bodies: prefers `message`, then `error` when human-readable.
 * - Plain text bodies: used when human-readable.
 * - Otherwise: a friendly per-status fallback.
 */
export function humanizeApiError(error: unknown, fallback = "Something went wrong. Please try again."): string {
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

  const status = parseInt(match[1], 10);
  const body = match[2].trim();

  if (body.startsWith("{")) {
    try {
      const parsed = JSON.parse(body) as { message?: unknown; error?: unknown };
      const candidate =
        (typeof parsed.message === "string" && parsed.message) ||
        (typeof parsed.error === "string" && parsed.error) ||
        "";
      if (looksHumanReadable(candidate)) return candidate;
    } catch {
      // fall through to status fallback
    }
  } else if (looksHumanReadable(body) && !/^[A-Za-z ]*Error/.test(body)) {
    return body;
  }

  return STATUS_FALLBACKS[status] ?? fallback;
}

/**
 * BUG-005 (run19): extract the server's structured per-field validation
 * messages from an ApiError so forms can render them at the offending fields
 * instead of discarding them behind a generic toast. Returns null when the
 * error carries no usable `fieldErrors` object (non-400, non-JSON, etc.).
 */
export function extractFieldErrors(error: unknown): Record<string, string> | null {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const match = raw.match(/^(\d{3}):\s*([\s\S]*)$/);
  if (!match) return null;
  const body = match[2].trim();
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
