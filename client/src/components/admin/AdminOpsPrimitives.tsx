import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
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

/**
 * Operations-owned equivalent of the shared Table primitive. The viewport
 * wrapper intentionally owns the focus target so every operations table has
 * one keyboard-discoverable horizontal scroll region without changing the
 * shared UI contract.
 */
export const AdminOpsTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto" tabIndex={0}>
    <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
));
AdminOpsTable.displayName = "Table";

type AdminOpsScrollAreaProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  viewportClassName?: string;
};

/**
 * Operations-owned equivalent of the shared Radix ScrollArea. The Radix
 * viewport is the actual scrolling element, so tabindex belongs here rather
 * than on an additional wrapper around the component.
 */
export const AdminOpsScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  AdminOpsScrollAreaProps
>(({ className, viewportClassName, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      className={cn("h-full w-full", viewportClassName)}
      tabIndex={0}
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
  admin: "accent",
  moderator: "warn",
  user: "muted",
  accent: "accent",
  failed: "bad",
  error: "bad",
  rejected: "bad",
  cancelled: "muted",
  canceled: "muted",
  unavailable: "muted",
  disabled: "muted",
};

export function StatusChip({ status, className, children, ...props }: StatusChipProps) {
  const normalizedStatus = status.trim().toLowerCase();
  const variant = STATUS_VARIANTS[normalizedStatus] ?? "muted";

  return (
    <span
      data-ds="chip"
      {...props}
      className={cn(
        "chip",
        "admin-ops-status-chip",
        variant,
        `admin-ops-status-chip--${variant}`,
        className,
      )}
    >
      {children ?? status}
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
