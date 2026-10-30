import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatAdminDateTime, formatRelativeAgo, maskEmail } from "@/lib/utils";
import { AdminLoadError } from "@/components/admin/AdminLoadError";
import { queryUnavailableReason } from "@/lib/query-availability";
import { useHorizontalScrollCue } from "@/hooks/use-horizontal-scroll-cue";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResolvedResourceEdit } from "@shared/schema";

const OUTCOME: Record<ResolvedResourceEdit["status"], { label: string; chip: string }> = {
  approved: { label: "Approved", chip: "chip ok" },
  rejected: { label: "Rejected", chip: "chip bad" },
  withdrawn: { label: "Withdrawn", chip: "chip" },
  superseded: { label: "Superseded", chip: "chip warn" },
};

export const RECENT_EDITS_KEY = "/api/admin/resource-edits/recent";

/**
 * AC-10: a rejection reason wraps to three lines and offers "Show full
 * reason" when it runs longer, so the whole text is readable on touch, where
 * a title tooltip never appears.
 */
function RejectionReason({ editId, reason }: { editId: number; reason: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, reason]);

  const textId = `recent-edit-reason-${editId}`;
  return (
    <>
      <span
        ref={textRef}
        id={textId}
        className="queue-review-sub queue-review-reason"
        data-expanded={expanded}
        data-testid={`text-recent-edit-reason-${editId}`}
      >
        {reason}
      </span>
      {(overflows || expanded) && (
        <button
          type="button"
          className="queue-review-reason-toggle"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((open) => !open)}
          data-testid={`button-recent-edit-reason-${editId}`}
        >
          {expanded ? "Show less" : "Show full reason"}
        </button>
      )}
    </>
  );
}

/**
 * AC-04: the Edits tab promised "Pending and recent edits", but an edit
 * vanished the moment it was approved or rejected. This lists the latest
 * resolved edits with their outcome under the pending queue.
 */
export function RecentResourceEdits() {
  const recentQuery = useQuery<ResolvedResourceEdit[]>({ queryKey: [RECENT_EDITS_KEY] });
  const scrollCue = useHorizontalScrollCue();
  const { data: edits, isLoading, isFetching, refetch } = recentQuery;
  // A fetch started offline is paused, not failed (sweep NEW-002).
  const unavailable = queryUnavailableReason(recentQuery);

  return (
    <section className="queue-review-recent" aria-labelledby="recent-edits-heading" data-testid="section-recent-edits">
      <div className="queue-review-shell-heading queue-review-recent-heading">
        <h3 id="recent-edits-heading">Recently resolved</h3>
        <p>The last 10 edits that were approved, rejected, withdrawn or superseded</p>
      </div>
      {unavailable && !edits ? (
        <AdminLoadError
          subject="recent edits"
          error={recentQuery.error}
          note={unavailable === "offline" ? "You're offline; it will load when your connection returns." : undefined}
          onRetry={() => { void refetch(); }}
          retrying={isFetching}
          testId="recent-edits-load-error"
          retryTestId="recent-edits-retry"
        />
      ) : isLoading ? (
        <div className="queue-review-loading-table" aria-label="Loading recent edits">
          {Array.from({ length: 3 }, (_, i) => (
            <div className="queue-review-loading-row" key={i}>
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative">
          {scrollCue.showCue && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10"
            />
          )}
          <div
            ref={scrollCue.ref}
            className="admin-table-wrap queue-review-table-wrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            tabIndex={0}
            role="region"
            aria-label="Recently resolved edits table, scrollable"
            onKeyDown={scrollCue.onKeyDown}
          >
            <table className="table queue-review-table queue-review-table--edits">
              <colgroup>
                <col />
                <col className="queue-review-col-field" />
                <col className="queue-review-col-submitter" />
                <col className="queue-review-col-outcome" />
                <col className="queue-review-col-when" />
              </colgroup>
              <thead>
                <tr><th>Resource</th><th>Field</th><th>Editor</th><th>Outcome</th><th>Resolved</th></tr>
              </thead>
              <tbody>
                {!edits?.length && (
                  <tr><td colSpan={5} className="queue-review-empty-row">No resolved edits yet.</td></tr>
                )}
                {edits?.map((edit) => {
                  const title = edit.resourceTitle ?? `Resource #${edit.resourceId}`;
                  const outcome = OUTCOME[edit.status];
                  return (
                    <tr key={edit.id} data-testid={`row-recent-edit-${edit.id}`}>
                      <td>
                        <span className="queue-review-item-title" title={title}>
                          <Link href={`/resource/${edit.resourceId}`}>{title}</Link>
                        </span>
                      </td>
                      <td className="mono queue-review-mono">
                        <span className="queue-review-truncate" title={edit.fields.join(", ")}>
                          {edit.fields.length > 0 ? edit.fields.join(", ") : "—"}
                        </span>
                      </td>
                      <td className="mono queue-review-mono">
                        {edit.submittedByEmail ? maskEmail(edit.submittedByEmail) : "—"}
                      </td>
                      <td>
                        <span className={outcome.chip} data-testid={`status-recent-edit-${edit.id}`}>
                          {outcome.label}
                        </span>
                        {edit.rejectionReason && (
                          <RejectionReason editId={edit.id} reason={edit.rejectionReason} />
                        )}
                      </td>
                      <td className="mono queue-review-mono queue-review-when">
                        <time dateTime={new Date(edit.resolvedAt).toISOString()} title={formatAdminDateTime(edit.resolvedAt)}>
                          {formatRelativeAgo(edit.resolvedAt)}
                        </time>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {scrollCue.showCue && (
            <p className="admin-ops-scroll-hint mt-2 text-xs text-muted-foreground" data-testid="text-swipe-hint-recent-edits">
              Swipe the table sideways to see the outcome and when it was resolved.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
