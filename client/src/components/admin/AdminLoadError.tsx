import type { MouseEvent, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describeLoadError } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { handoffFocusOnUnmount } from "@/hooks/focus-handoff";

const OFFLINE_MESSAGE = "You're offline; this will load when your connection returns.";
const BUSY_CAP_MS = 10000;
const POLL_MS = 100;

/**
 * Some callers unmount the alert while the retry runs, and a failed retry
 * re-renders it only when the refetch settles. Once the trigger has left the
 * DOM, mark its slot busy until no query is fetching, so
 * handoffFocusOnUnmount waits for the outcome. A caller that keeps the alert
 * mounted never sets the flag.
 */
function holdBusyWhileRefetching(host: HTMLElement, trigger: HTMLElement, isFetching: () => boolean): void {
  let poll: number | undefined;
  let flagged = false;
  const stop = () => {
    observer.disconnect();
    window.clearTimeout(cap);
    window.clearTimeout(poll);
    if (flagged) host.removeAttribute("aria-busy");
  };
  const waitForSettle = () => {
    poll = window.setTimeout(() => (isFetching() ? waitForSettle() : stop()), POLL_MS);
  };
  const observer = new MutationObserver(() => {
    if (trigger.isConnected) return;
    observer.disconnect();
    flagged = true;
    host.setAttribute("aria-busy", "true");
    waitForSettle();
  });
  observer.observe(host, { childList: true, subtree: true });
  const cap = window.setTimeout(stop, BUSY_CAP_MS);
}

export interface AdminLoadErrorProps {
  /** What failed to load, phrased to follow "Couldn't load" — e.g. "the audit log". */
  subject: string;
  /** The query error; 5xx responses get the shared server-failure copy. */
  error: unknown;
  /** True when the request is paused because the browser is offline; shows the offline copy and no Retry (refetch stays paused offline). */
  offline?: boolean;
  /** Re-runs the failed request(s). Omit only when the parent owns the retry. */
  onRetry?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** True while the retry is in flight. */
  retrying?: boolean;
  /** Extra context after the message, e.g. that stale rows are still shown. */
  note?: ReactNode;
  testId?: string;
  retryTestId?: string;
  className?: string;
}

/**
 * Shared load-error state for admin tables, cards and panels.
 *
 * Every /api 500 body is masked to "Internal Server Error", so each surface
 * used to pick its own vague wording. This renders one consistent
 * "Couldn't load <subject>" title, the describeLoadError explanation, and a
 * Retry action. The button stays focusable while retrying (aria-disabled,
 * not disabled) so keyboard focus is not dropped mid-retry.
 */
export function AdminLoadError({
  subject,
  error,
  offline = false,
  onRetry,
  retrying = false,
  note,
  testId,
  retryTestId,
  className,
}: AdminLoadErrorProps) {
  const queryClient = useQueryClient();
  return (
    <Alert
      variant="destructive"
      className={cn("admin-load-error", className)}
      data-testid={testId}
    >
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <p className="mb-1 font-medium leading-none tracking-tight" data-load-error-title="">
        Couldn&apos;t load {subject}
      </p>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span data-load-error-message="">
          {offline ? OFFLINE_MESSAGE : describeLoadError(error)}
          {note ? <> {note}</> : null}
        </span>
        {onRetry && !offline ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              if (retrying) return;
              const trigger = event.currentTarget;
              const host = trigger.closest(".admin-load-error")?.parentElement ?? null;
              if (host) holdBusyWhileRefetching(host, trigger, () => queryClient.isFetching() > 0);
              onRetry(event);
              // The alert unmounts while the retry runs. If it fails again the
              // alert re-renders in the same place: refocus its new Retry,
              // otherwise the page heading. Registered after onRetry so a
              // caller's own handoff target fires first and wins.
              handoffFocusOnUnmount(trigger, () =>
                host?.isConnected
                  ? host.querySelector<HTMLElement>(":scope > .admin-load-error button")
                  : null,
              );
            }}
            aria-disabled={retrying || undefined}
            aria-busy={retrying || undefined}
            data-testid={retryTestId}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", retrying && "animate-spin")} aria-hidden="true" />
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
