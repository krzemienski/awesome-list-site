import { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, type LucideIcon } from "lucide-react";
import {
  Card,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";

// Run22 BUG-024: Home and /categories each hand-rolled their own taxonomy
// card (different padding, icon treatment, title row and count placement).
// This is now the ONE card used for taxonomy-level navigation everywhere:
// icon tile top-left, wrapping two-line title with chevron affordance,
// labelled "N resources" count caption (NB-037: clearer than a bare badge),
// plus an optional level-specific extra block (e.g. Home's featured teaser).
interface TaxonomyCardProps {
  name: string;
  href: string;
  count: number;
  icon: LucideIcon;
  /** Optional level-specific content rendered under the count caption. */
  extra?: ReactNode;
  linkTestId?: string;
  countTestId?: string;
  ariaLabel?: string;
}

export function TaxonomyCard({
  name,
  href,
  count,
  icon: Icon,
  extra,
  linkTestId,
  countTestId,
  ariaLabel,
}: TaxonomyCardProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel ?? `View ${name} with ${count} ${count === 1 ? "resource" : "resources"}`}
      data-testid={linkTestId}
      className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-[var(--radius)]"
    >
      <Card className="h-full cursor-pointer hover:border-[var(--accent)] transition-colors" data-ds="card-hover">
        <CardHeader className="p-4 sm:p-5 space-y-1.5">
          <span
            className="flex items-center justify-center shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Icon className="size-4" />
          </span>
          {/* NB-017 (run18): long names wrap to two reserved lines so cards
              stay aligned in the grid instead of truncating mid-word. */}
          {/* BUG-058 (run26): taxonomy names are real <h2> headings (they were
              divs) so AT users can navigate /categories & Home by heading. */}
          <h2 className="font-sans font-semibold text-base tracking-tight flex items-start justify-between gap-2 pt-1">
            {/* BUG-025 (run27): clamped names expose the full text via the
                native title tooltip. */}
            <span className="line-clamp-2 min-h-[2.5em] leading-tight" title={name}>
              {name}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          </h2>
          {/* BUG-036 (run27): singular form for count === 1 ("1 resource"). */}
          <CardDescription data-testid={countTestId}>
            {count.toLocaleString()} {count === 1 ? "resource" : "resources"}
          </CardDescription>
          {extra}
        </CardHeader>
      </Card>
    </Link>
  );
}
