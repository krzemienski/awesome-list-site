import { cn } from "@/lib/utils";
import "@/styles/pages/system-overlays.css";

/**
 * Presentational loading placeholder. Renders a span (valid inside inline
 * contexts like the sidebar count labels) displayed as a block by default —
 * pass `inline-block` to keep it inline. Deliberately aria-hidden: skeletons
 * are decoration; the page-level container announces loading via
 * aria-busy/aria-live instead of dozens of live status regions.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={cn("skeleton system-skeleton block", className)}
      {...props}
    />
  );
}

export { Skeleton };
