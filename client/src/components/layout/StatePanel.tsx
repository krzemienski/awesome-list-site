import { forwardRef, type MouseEvent, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handoffFocusOnUnmount } from "@/hooks/focus-handoff";
import { cn } from "@/lib/utils";
import "@/styles/pages/system.css";

/**
 * The design system's empty / error composition (docs/11-patterns.md):
 * an eyebrow (empty) or a `chip bad` (error), a display title, one line of
 * copy and the actions. `inline` drops the full-page height for states that
 * sit under a page header or inside a results column.
 */
const StatePanel = forwardRef<HTMLDivElement, {
  tone: "error" | "empty";
  label: string;
  title: string;
  headingLevel?: 1 | 2 | 3;
  children?: ReactNode;
  actions?: ReactNode;
  inline?: boolean;
  className?: string;
  testId?: string;
}>(function StatePanel({
  tone,
  label,
  title,
  headingLevel = 2,
  children,
  actions,
  inline = false,
  className,
  testId,
}, ref) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      ref={ref}
      className={cn("system-state", inline && "system-state--inline", className)}
      role={tone === "error" ? "alert" : undefined}
      data-testid={testId}
    >
      <div className="system-state-panel">
        {tone === "error" ? (
          <span className="chip bad system-state-code">{label}</span>
        ) : (
          <p className="system-state-kicker" aria-hidden="true">── {label.toUpperCase()}</p>
        )}
        <Heading className="display-h system-state-title">{title}</Heading>
        {children && <div className="system-state-copy">{children}</div>}
        {actions && <div className="system-state-actions">{actions}</div>}
      </div>
    </div>
  );
});
export default StatePanel;

/**
 * The one retry control every failed-fetch state uses. The state unmounts
 * once the refetch succeeds, so focus is handed on by default; callers that
 * place focus themselves pass handoffFocus={false}.
 */
export function RetryButton({ onRetry, testId, label = "Retry", handoffFocus = true, busy = false }: {
  onRetry: (e: MouseEvent<HTMLButtonElement>) => void;
  testId?: string;
  label?: string;
  handoffFocus?: boolean;
  /** A refetch is in flight: further clicks are ignored. */
  busy?: boolean;
}) {
  return (
    <Button
      variant="outline"
      onClick={(e) => {
        if (busy) return;
        if (handoffFocus) handoffFocusOnUnmount(e.currentTarget);
        onRetry(e);
      }}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      data-testid={testId}
    >
      <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden="true" />
      {busy ? "Retrying…" : label}
    </Button>
  );
}
