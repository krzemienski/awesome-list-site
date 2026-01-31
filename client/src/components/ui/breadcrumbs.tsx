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
    <nav
      aria-label="Breadcrumb"
      className="flex items-center space-x-1 text-sm text-muted-foreground mb-4"
    >
      <Link href="/" className="hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Home">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors px-1">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-foreground px-1">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
