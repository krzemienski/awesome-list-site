import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    // Run22 BUG-023: this (mobile-only) trail was a non-wrapping flex row —
    // deep trails with long labels clipped the current item at 375px. The
    // trail now wraps onto extra lines so every crumb (incl. the current
    // page) stays fully readable with zero horizontal page overflow.
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted-foreground mb-4"
    >
      <Link href="/" className="hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0" aria-label="Home">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center min-w-0 max-w-full">
          <ChevronRight className="h-4 w-4 mx-1 shrink-0" aria-hidden="true" />
          {/* Run17 BUG-048: ≥24px tap target for breadcrumb links. */}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors px-1 inline-flex items-center min-h-[24px] min-w-0 break-words">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-foreground px-1 min-w-0 break-words">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
