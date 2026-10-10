import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Radio, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/utils";
import { Stat } from "@/components/admin/AdminOpsPrimitives";
import type { DigestJobStatus } from "@shared/notifications";
import "@/styles/pages/admin-ops-github-links.css";

interface Health {
  transport: { available: boolean; errorCode?: string };
  queue: Record<string, Record<string, number>>;
  recentFailureCodes: { code: string; count: number }[];
  oldestQueuedAt: string | null;
}

const title = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// C3-V5B-07: the health payload counts every digest job by status, including
// finished ones (sent/failed/skipped). Only these are still in the queue.
const IN_QUEUE_STATUSES: ReadonlySet<string> = new Set<DigestJobStatus>(["queued", "processing"]);

// The hourly scheduler and workers change queue state independently of this
// page, so health is polled (the global defaults never refetch on their own).
const DIGEST_HEALTH_POLL_MS = 30_000;

const formatUpdatedAt = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

export default function DigestQueueHealth() {
  const query = useQuery<Health>({
    queryKey: ["/api/admin/digests/health"],
    staleTime: DIGEST_HEALTH_POLL_MS / 2,
    refetchInterval: DIGEST_HEALTH_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });
  // A failed poll after a good load keeps the last snapshot on screen but
  // marks it stale; it never silently pretends to be current.
  const staleSnapshot = query.isError && query.data !== undefined;
  const total = query.data
    ? Object.values(query.data.queue).reduce(
      (sum, statuses) => sum + Object.entries(statuses).reduce(
        (channelTotal, [status, count]) => channelTotal + (IN_QUEUE_STATUSES.has(status) ? count : 0),
        0,
      ),
      0,
    )
    : 0;
  return (
    <Card className="ops-digest-health" data-testid="card-digest-queue-health">
      <CardHeader className="ops-digest-health__header">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--text-2)]" />
          Digest delivery health
        </CardTitle>
        <p className="text-sm text-[color:var(--text-2)]">
          Aggregate transport and queue signals only. No message contents, user
          data, recipient identifiers, or secret tokens are shown.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <p
            className="text-xs text-[color:var(--text-2)]"
            aria-live="polite"
            data-testid="text-digest-health-updated"
          >
            {query.dataUpdatedAt
              ? `${staleSnapshot ? "Last good update" : "Updated"} ${formatUpdatedAt(query.dataUpdatedAt)} · refreshes every ${DIGEST_HEALTH_POLL_MS / 1000}s`
              : `Refreshes every ${DIGEST_HEALTH_POLL_MS / 1000}s`}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => { if (!query.isFetching) void query.refetch(); }}
            aria-disabled={query.isFetching}
            aria-busy={query.isFetching}
            data-testid="button-digest-health-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-28 w-full" />
          </div>
        ) : query.isError && !query.data ? (
          <div className="p-4 text-sm" role="alert">
            <p className="text-destructive">Health data is unavailable.</p>
            <Button
              variant="outline"
              className="mt-3 min-h-[44px]"
              onClick={() => void query.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : query.data ? (
          <div className="space-y-6">
            {staleSnapshot && (
              <div
                className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm"
                role="alert"
                data-testid="alert-digest-health-stale"
              >
                <p className="text-destructive font-medium">
                  Couldn&apos;t refresh health data. Showing the last successful
                  snapshot{query.dataUpdatedAt ? ` from ${formatUpdatedAt(query.dataUpdatedAt)}` : ""}; it may be out of date.
                </p>
              </div>
            )}
            <div className="ops-digest-health__stat-grid">
              <Stat
                label={
                  <span className="ops-digest-health__stat-label-with-icon">
                    <Radio className={`h-5 w-5 ${query.data.transport.available ? "text-[var(--text-2)]" : "text-destructive"}`} />
                    Transport
                  </span>
                }
                value={query.data.transport.available ? "Available" : "Unavailable"}
                sub={
                  query.data.transport.errorCode ? (
                    <span className="ops-digest-health__error-code">
                      {query.data.transport.errorCode}
                    </span>
                  ) : undefined
                }
                className={`ops-digest-health__stat-card ${query.data.transport.available ? "ops-digest-health__stat-card--available" : "ops-digest-health__stat-card--unavailable"}`}
              />
              <Stat
                label={
                  <span className="ops-digest-health__stat-label-with-icon">
                    <Clock3 className="h-5 w-5 text-[var(--text-2)]" />
                    Queue total
                  </span>
                }
                value={total}
                className="ops-digest-health__stat-card"
              />
              <Stat
                label={
                  <span className="ops-digest-health__stat-label-with-icon">
                    <CheckCircle2 className="h-5 w-5 text-[var(--text-2)]" />
                    Oldest queued
                  </span>
                }
                value={query.data.oldestQueuedAt
                  ? formatAdminDateTime(query.data.oldestQueuedAt)
                  : "None"}
                className="ops-digest-health__stat-card"
              />
            </div>

            <section>
              <h2 className="mb-3 text-sm font-semibold">Digest jobs by channel and status</h2>
              {Object.keys(query.data.queue).length === 0 ? (
                <p className="text-sm text-[color:var(--text-2)]">
                  No digest jobs recorded.
                </p>
              ) : (
                <div className="ops-digest-health__queue-grid">
                  {Object.entries(query.data.queue).map(([channel, statuses]) => (
                    <div key={channel} className="ops-digest-health__queue-card">
                      <p className="eyebrow">{title(channel)}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-2">
                        {Object.entries(statuses).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <dt className="text-[color:var(--text-2)]">{title(status)}</dt>
                            <dd className="font-mono">{count}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-[var(--text-2)]" />
                Recent failure codes
              </h2>
              {query.data.recentFailureCodes.length ? (
                <ul className="ops-digest-health__failure-list">
                  {query.data.recentFailureCodes.map((failure) => (
                    <li key={failure.code} className="flex items-center justify-between border-b border-[var(--border)] py-2 text-sm">
                      <span className="font-mono">{failure.code}</span>
                      <span className="text-[color:var(--text-2)]">{failure.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[color:var(--text-2)]">
                  No recent failure codes recorded.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
