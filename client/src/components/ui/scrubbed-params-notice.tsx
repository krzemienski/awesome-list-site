import { useState } from "react";
import { X } from "lucide-react";

declare global {
  interface Window {
    /** Set by the pre-boot XSS param scrubber in index.html (BUG-021 run24). */
    __scrubbedParams?: string[];
  }
}

/**
 * BUG-032/BUG-064 (run27): the pre-boot scrubber in index.html removes query
 * params carrying XSS-shaped payloads (q, tags, …) BEFORE React boots — the
 * right security call, but it used to be silent: /search?q=<img…> rendered
 * the full catalog and /?tags=<script>… rendered the unfiltered home page
 * with no hint the link had been altered. This banner makes the drop
 * explicit ("query ignored" state) on whatever page the visitor landed.
 *
 * Renders once per full page load (the scrubber only runs on document boot,
 * never on SPA navigations) and is dismissible.
 */
export default function ScrubbedParamsNotice() {
  const [dismissed, setDismissed] = useState(false);
  const scrubbed =
    typeof window !== "undefined" ? window.__scrubbedParams : undefined;

  if (dismissed || !scrubbed || scrubbed.length === 0) return null;

  const names = scrubbed.map((n) => `“${n}”`).join(", ");

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm"
      role="status"
      data-testid="banner-scrubbed-params"
    >
      <span>
        Part of the link you followed was ignored: the {names}{" "}
        {scrubbed.length === 1 ? "parameter" : "parameters"} contained unsafe
        content and {scrubbed.length === 1 ? "was" : "were"} removed.
      </span>
      <button
        type="button"
        className="inline-flex min-h-8 items-center gap-1 underline underline-offset-2"
        onClick={() => setDismissed(true)}
        data-testid="button-dismiss-scrubbed-params"
        aria-label="Dismiss notice"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        Dismiss
      </button>
    </div>
  );
}
