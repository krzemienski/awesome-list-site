import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parsePageInput } from "@/lib/page-param";

/**
 * audit2 BUG-032 — shared numbered paginator for every listing surface.
 *
 * Previous/Next-only meant page 30 took 29 clicks (and 29 rate-limited
 * fetches). This renders windowed page-number LINKS with real hrefs (so
 * copy-link / cmd-click / middle-click work and any page is one click away
 * within the window) plus a "Go to page" jump input on long listings, so ANY
 * page is reachable in ≤2 interactions. Plain clicks are intercepted for SPA
 * navigation via onNavigate; modified clicks fall through to the real href.
 *
 * The jump input applies the shared page rule (lib/page-param.ts): "1e3" and
 * "1000" land on the same clamped page (BUG-022); whole numbers clamp into
 * [1, totalPages]; anything else shows inline validation feedback instead of
 * silently resetting.
 */

const JUMP_INPUT_THRESHOLD = 7;

export interface PaginatorTestIds {
  container?: string;
  prev?: string;
  next?: string;
  indicator?: string;
  jump?: string;
  jumpError?: string;
}

const DEFAULT_TEST_IDS: Required<PaginatorTestIds> = {
  container: "pagination-controls",
  prev: "button-prev-page",
  next: "button-next-page",
  indicator: "text-page-indicator",
  jump: "input-page-jump",
  jumpError: "text-page-jump-error",
};

interface PaginatorProps {
  currentPage: number;
  totalPages: number;
  /** Real href for a page link (merge ?page=N into the current URL). */
  makeHref: (page: number) => string;
  /** SPA navigation — setPage + history integration owned by the page. */
  onNavigate: (page: number) => void;
  className?: string;
  testIds?: PaginatorTestIds;
  pageLinkTestId?: (page: number) => string;
}

/**
 * Windowed page list: first/last always visible, ±1 around the current page,
 * "…" for gaps (a gap of exactly one page renders that page instead of an
 * ellipsis that would hide a single number).
 */
export function pageWindow(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= JUMP_INPUT_THRESHOLD) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const wanted = new Set<number>([1, total, current - 1, current, current + 1]);
  const pages = Array.from(wanted)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const p of pages) {
    if (prev) {
      if (p - prev === 2) out.push(prev + 1);
      else if (p - prev > 2) out.push("ellipsis");
    }
    out.push(p);
    prev = p;
  }
  return out;
}

export function Paginator({
  currentPage,
  totalPages,
  makeHref,
  onNavigate,
  className,
  testIds,
  pageLinkTestId = (page) => `link-page-${page}`,
}: PaginatorProps) {
  const ids = { ...DEFAULT_TEST_IDS, ...testIds };
  const [jumpValue, setJumpValue] = useState(String(currentPage));
  const [jumpError, setJumpError] = useState<string | null>(null);

  // Mirror the effective page into the jump box whenever it changes.
  useEffect(() => {
    setJumpValue(String(currentPage));
    setJumpError(null);
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const go = (page: number) => (e: React.MouseEvent) => {
    // Modified clicks (new tab/window) use the real href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (page !== currentPage) onNavigate(page);
  };

  const commitJump = () => {
    const n = parsePageInput(jumpValue);
    if (n == null) {
      // BUG-022: visible validation feedback — never a silent reset.
      setJumpError(`Enter a whole number between 1 and ${totalPages}.`);
      return;
    }
    const clamped = Math.min(Math.max(n, 1), totalPages);
    setJumpError(null);
    if (clamped !== currentPage) onNavigate(clamped);
    else setJumpValue(String(currentPage));
  };

  const linkBase =
    "inline-flex h-8 min-w-8 items-center justify-center px-2 text-sm tabular-nums rounded-[var(--radius)] border transition-colors";

  const items = pageWindow(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-col items-center gap-2 pt-6", className)}
      data-testid={ids.container}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {currentPage > 1 ? (
          <a
            href={makeHref(currentPage - 1)}
            onClick={go(currentPage - 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
            rel="prev"
            data-testid={ids.prev}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1 pointer-events-none opacity-50",
            )}
            data-testid={ids.prev}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </span>
        )}

        {items.map((item, i) =>
          item === "ellipsis" ? (
            <span
              key={`e-${i}`}
              aria-hidden="true"
              className="px-1 text-sm text-muted-foreground select-none"
            >
              …
            </span>
          ) : (
            <a
              key={item}
              href={makeHref(item)}
              onClick={go(item)}
              aria-label={item === currentPage ? `Page ${item}, current page` : `Go to page ${item}`}
              aria-current={item === currentPage ? "page" : undefined}
              className={cn(
                linkBase,
                item === currentPage
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast,white)] font-medium"
                  : "border-[var(--border)] bg-transparent text-foreground hover:border-[var(--accent)] hover:text-[var(--accent)]",
              )}
              data-testid={pageLinkTestId(item)}
            >
              {item}
            </a>
          ),
        )}

        {currentPage < totalPages ? (
          <a
            href={makeHref(currentPage + 1)}
            onClick={go(currentPage + 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
            rel="next"
            data-testid={ids.next}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </a>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1 pointer-events-none opacity-50",
            )}
            data-testid={ids.next}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <span className="tabular-nums" data-testid={ids.indicator}>
          Page {currentPage} of {totalPages}
        </span>
        {totalPages > JUMP_INPUT_THRESHOLD && (
          <span className="flex items-center gap-1.5">
            <label htmlFor={ids.jump} className="sr-only">
              Go to page
            </label>
            <Input
              id={ids.jump}
              type="text"
              inputMode="numeric"
              value={jumpValue}
              onChange={(e) => {
                setJumpValue(e.target.value);
                setJumpError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitJump();
              }}
              onBlur={commitJump}
              className="h-8 w-16 text-center tabular-nums"
              aria-label={`Page number, 1 to ${totalPages}`}
              aria-invalid={jumpError ? true : undefined}
              aria-describedby={jumpError ? `${ids.jump}-error` : undefined}
              data-testid={ids.jump}
            />
            <span aria-hidden="true">/ {totalPages}</span>
          </span>
        )}
      </div>
      <p
        id={`${ids.jump}-error`}
        role="status"
        aria-live="polite"
        className={cn("text-xs text-[var(--accent)]", !jumpError && "sr-only")}
        data-testid={ids.jumpError}
      >
        {jumpError ?? ""}
      </p>
    </nav>
  );
}
