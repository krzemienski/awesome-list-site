import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/utils";
import { Stat } from "@/components/admin/AdminOpsPrimitives";
import "@/styles/pages/admin-ops-github-links.css";

interface Health {
  transport: { available: boolean; errorCode?: string };
  queue: Record<string, Record<string, number>>;
  recentFailureCodes: { code: string; count: number }[];
  oldestQueuedAt: string | null;
}

const title = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function DigestQueueHealth() {
  const query = useQuery<Health>({ queryKey: ["/api/admin/digests/health"] });
  const total = query.data
    ? Object.values(query.data.queue).reduce(
      (sum, statuses) => sum + Object.values(statuses).reduce((channelTotal, count) => channelTotal + count, 0),
      0,
    )
    : 0;
  return (
    <Card className="ops-digest-health" data-testid="card-digest-queue-health">
      <CardHeader className="ops-digest-health__header">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--accent)]" />
          Digest delivery health
        </CardTitle>
        <p className="text-sm text-[color:var(--text-2)]">
          Aggregate transport and queue signals only. No message contents, user
          data, recipient identifiers, or secret tokens are shown.
        </p>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-28 w-full" />
          </div>
        ) : query.isError ? (
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
            <div className="ops-digest-health__stat-grid">
              <Stat
                label={
                  <span className="ops-digest-health__stat-label-with-icon">
                    <Radio className={`h-5 w-5 ${query.data.transport.available ? "text-[var(--accent)]" : "text-destructive"}`} />
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
                    <Clock3 className="h-5 w-5 text-[var(--accent)]" />
                    Queue total
                  </span>
                }
                value={total}
                className="ops-digest-health__stat-card"
              />
              <Stat
                label={
                  <span className="ops-digest-health__stat-label-with-icon">
                    <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
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
              <h3 className="mb-3 text-sm font-semibold">Queue by channel and status</h3>
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
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-[var(--accent)]" />
                Recent failure codes
              </h3>
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