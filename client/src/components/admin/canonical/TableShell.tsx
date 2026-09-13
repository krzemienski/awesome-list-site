import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TableShellProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}

/**
 * Shared canonical admin panel shell. It intentionally leaves the body slot
 * generic because the overview uses a table, health rows, and category bars
 * with the same panel anatomy.
 */
export default function TableShell({
  title,
  subtitle,
  actions,
  children,
  className,
  testId,
}: TableShellProps) {
  return (
    <section
      className={cn("card admin-canonical-table-shell", className)}
      data-testid={testId}
    >
      <div className="admin-canonical-table-shell__heading">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="admin-canonical-table-shell__actions">{actions}</div> : null}
      </div>
      <div className="admin-canonical-table-shell__body">{children}</div>
    </section>
  );
}