import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

// Run16 BUG-050/051: list + compact renderers shared by Subcategory and
// SubSubcategory so their ViewModeToggle matches Category's behavior without
// duplicating the markup in both pages. Title is a REAL stretched-link anchor
// (middle-click / cmd-click / crawlers work); action buttons sit above the
// overlay via relative z-10.

export interface ViewModeResource {
  id: string;
  title: string;
  url: string;
  description?: string;
}

function titleAnchor(resource: ViewModeResource, testId: string, clampClass = "") {
  const isDb = resource.id !== "";
  // BUG-049: inline-block + py/-my so the anchor's own hit-box is ≥24px
  // tall without shifting the text layout.
  // BUG-003 (run22): clamped callers pass clampClass (replacing inline-block)
  // because an inline-block child inside a -webkit-box wrapper defeats
  // -webkit-line-clamp; the clamp's block-level box keeps the hit-box.
  const className = `${clampClass || "inline-block"} py-1 -my-1 hover:text-primary transition-colors after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[var(--accent)]`;
  return isDb ? (
    <Link href={`/resource/${resource.id}`} className={className} data-testid={testId}>
      {resource.title}
    </Link>
  ) : (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      data-testid={testId}
    >
      {resource.title}
      {/* Run25 F-003: external title anchor — announce the new tab. */}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

export function ResourceListRow({ resource }: { resource: ViewModeResource }) {
  return (
    <div
      className="relative flex items-center gap-4 p-3 rounded-lg border border-border bg-transparent hover:border-[var(--accent)]/30 hover:shadow-md transition-all min-w-0"
      data-testid={`row-resource-${resource.id || resource.url}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">
            {titleAnchor(resource, `link-resource-row-${resource.id || resource.url}`)}
          </span>
          {resource.id !== "" && (
            <Badge
              variant="outline"
              className="text-xs border-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-[var(--accent)] shrink-0"
            >
              Details
            </Badge>
          )}
        </div>
        {resource.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{resource.description}</p>
        )}
      </div>
      <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 min-h-[44px] min-w-[44px] touch-manipulation"
        >
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-external-row-${resource.id || resource.url}`}
            title="Open in new tab"
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export function ResourceCompactCard({ resource }: { resource: ViewModeResource }) {
  return (
    <Card
      className="relative hover:border-[var(--accent)]/30 hover:shadow-md transition-all border border-border bg-card p-2.5 sm:p-3 min-w-0 touch-manipulation"
      data-testid={`compact-resource-${resource.id || resource.url}`}
    >
      <div className="flex items-start gap-1.5 min-w-0">
        <span className="font-medium text-xs sm:text-sm flex-1 min-w-0" title={resource.title}>
          {titleAnchor(resource, `link-resource-compact-${resource.id || resource.url}`, "line-clamp-2 break-words")}
        </span>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="relative z-10 h-8 w-8 p-0 shrink-0 touch-manipulation min-h-[44px] min-w-[44px] -mr-1.5"
        >
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-external-compact-${resource.id || resource.url}`}
            title="Open in new tab"
            aria-label="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </Card>
  );
}
