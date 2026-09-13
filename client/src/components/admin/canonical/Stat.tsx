import type { KeyboardEvent, ReactNode } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  loading?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
  nestedInteractive?: boolean;
  testId?: string;
  titleTestId?: string;
  valueTestId?: string;
  className?: string;
}

/**
 * Canonical admin metric card. The optional nestedInteractive flag keeps a
 * card that contains its own links out of the nested-interactive role/button
 * pattern while retaining the title link as its keyboard affordance.
 */
export default function Stat({
  label,
  value,
  sub,
  accent = false,
  loading = false,
  onNavigate,
  navigateLabel,
  nestedInteractive = false,
  testId,
  titleTestId,
  valueTestId,
  className,
}: StatProps) {
  const clickable = Boolean(onNavigate);
  const containerInteractive = clickable && !nestedInteractive;
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!containerInteractive || !onNavigate) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onNavigate();
    }
  };

  return (
    <div
      className={cn(
        "card admin-canonical-stat",
        clickable && "admin-canonical-stat--interactive",
        clickable && "focus-ring",
        className,
      )}
      data-ds={clickable ? "card-hover" : undefined}
      data-testid={testId}
      role={containerInteractive ? "button" : undefined}
      tabIndex={containerInteractive ? 0 : undefined}
      aria-label={containerInteractive ? navigateLabel : undefined}
      title={containerInteractive ? navigateLabel : undefined}
      onClick={containerInteractive ? onNavigate : undefined}
      onKeyDown={containerInteractive ? handleKeyDown : undefined}
    >
      <CardHeader className="admin-canonical-stat__header">
        <CardTitle
          className="admin-canonical-stat__label eyebrow"
          data-testid={nestedInteractive ? undefined : titleTestId}
        >
          {clickable && nestedInteractive ? (
            <button
              type="button"
              className="admin-canonical-stat__title-link"
              onClick={(event) => {
                event.stopPropagation();
                onNavigate?.();
              }}
              aria-label={navigateLabel}
              data-testid={titleTestId}
            >
              {label}
            </button>
          ) : (
            label
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="admin-canonical-stat__content">
        <div
          className={cn(
            "admin-canonical-stat__value",
            accent && "admin-canonical-stat__value--accent",
          )}
          data-testid={valueTestId ?? (testId ? `${testId}-value` : undefined)}
        >
          {loading ? "—" : value}
        </div>
        {!loading && sub ? (
          <div className="admin-canonical-stat__sub">{sub}</div>
        ) : null}
      </CardContent>
    </div>
  );
}