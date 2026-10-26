import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { useHorizontalScrollCue } from "@/hooks/use-horizontal-scroll-cue";
import "./admin-ops-primitives.css";

const AdminOpsScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
AdminOpsScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

const DEFAULT_SCROLL_HINT = "Swipe the table sideways to see all columns.";

/**
 * Operations-owned equivalent of the shared Table primitive. The viewport
 * wrapper intentionally owns the focus target so every operations table has
 * one keyboard-discoverable horizontal scroll region without changing the
 * shared UI contract. `scrollLabel` names that focus target as a region so a
 * screen reader announces what Tab landed on. Whenever the table is wider
 * than its viewport, at any screen width, a hint above it and a right-edge
 * fade say that more columns sit off-screen.
 */
export const AdminOpsTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & { scrollLabel: string; scrollHint?: string }
>(({ className, scrollLabel, scrollHint = DEFAULT_SCROLL_HINT, ...props }, ref) => {
  const scrollCue = useHorizontalScrollCue();
  return (
    <>
      {scrollCue.overflows ? (
        <p className="admin-ops-table-scroll-hint text-xs text-muted-foreground">{scrollHint}</p>
      ) : null}
      <div className="relative w-full">
        {scrollCue.showCue ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-card to-transparent"
          />
        ) : null}
        <div
          ref={scrollCue.ref}
          className="relative w-full overflow-auto"
          tabIndex={0}
          role="region"
          aria-label={scrollLabel}
          onKeyDown={scrollCue.onKeyDown}
        >
          <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
        </div>
      </div>
    </>
  );
});
AdminOpsTable.displayName = "Table";

type AdminOpsScrollAreaProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  viewportClassName?: string;
  /** The viewport is always a tab stop, so it always needs a region name. */
  scrollLabel: string;
};

/**
 * Operations-owned equivalent of the shared Radix ScrollArea. The Radix
 * viewport is the actual scrolling element, so tabindex belongs here rather
 * than on an additional wrapper around the component.
 */
export const AdminOpsScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  AdminOpsScrollAreaProps
>(({ className, viewportClassName, scrollLabel, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      className={cn("h-full w-full", viewportClassName)}
      tabIndex={0}
      role="region"
      aria-label={scrollLabel}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <AdminOpsScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
AdminOpsScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export interface TableShellProps {
  title: ReactNode;
  sub?: ReactNode;
  /** Alias used by newer operations surfaces. */
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The small, intentionally operations-scoped table primitive translated from
 * the canonical admin TableShell. It is kept separate from the catalog tables
 * because those tables have their own density and interaction contracts.
 */
export function TableShell({
  title,
  sub,
  description,
  actions,
  children,
  className,
}: TableShellProps) {
  const supportingCopy = description ?? sub;

  return (
    <section className={cn("card", "admin-ops-table-shell", className)}>
      <header className="admin-ops-table-shell__header">
        <div>
          <h2 className="admin-ops-table-shell__title">{title}</h2>
          {supportingCopy ? (
            <p className="admin-ops-table-shell__description">{supportingCopy}</p>
          ) : null}
        </div>
        {actions ? <div className="admin-ops-table-shell__actions">{actions}</div> : null}
      </header>
      <div className="admin-ops-table-shell__content">
        {children}
      </div>
    </section>
  );
}

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  status: string;
}

const STATUS_VARIANTS: Record<string, string> = {
  completed: "ok",
  complete: "ok",
  success: "ok",
  passed: "ok",
  healthy: "ok",
  up: "ok",
  approved: "ok",
  pending: "warn",
  running: "warn",
  warning: "warn",
  stale: "warn",
  partial: "warn",
  budget_stopped: "warn",
  admin: "accent",
  moderator: "warn",
  user: "muted",
  accent: "accent",
  ok: "ok",
  warn: "warn",
  bad: "bad",
  failed: "bad",
  error: "bad",
  rejected: "bad",
  cancelled: "muted",
  canceled: "muted",
  unavailable: "muted",
  disabled: "muted",
};

// Machine status values whose raw form reads badly as a chip label.
const STATUS_LABELS: Record<string, string> = {
  budget_stopped: "stopped at budget",
};

export function StatusChip({ status, className, children, ...props }: StatusChipProps) {
  const normalizedStatus = status.trim().toLowerCase();
  const variant = STATUS_VARIANTS[normalizedStatus] ?? "muted";

  return (
    <span
      {...props}
      className={cn(
        "chip",
        "admin-ops-status-chip",
        variant,
        `admin-ops-status-chip--${variant}`,
        className,
      )}
    >
      {children ?? STATUS_LABELS[normalizedStatus] ?? status}
    </span>
  );
}

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  /** Alias used by newer operations surfaces. */
  description?: ReactNode;
  accent?: boolean;
  className?: string;
}

export function Stat({
  label,
  value,
  sub,
  description,
  accent = false,
  className,
}: StatProps) {
  return (
    <article className={cn("card", "admin-ops-stat", className)}>
      <div className="eyebrow admin-ops-stat__label">{label}</div>
      <div className={cn("admin-ops-stat__value", accent && "admin-ops-stat__value--accent")}>
        {value}
      </div>
      {(description ?? sub) ? (
        <div className="admin-ops-stat__description">{description ?? sub}</div>
      ) : null}
    </article>
  );
}
