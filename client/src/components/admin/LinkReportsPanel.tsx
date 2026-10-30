import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLoadError } from "@/components/admin/AdminLoadError";
import { apiRequest } from "@/lib/queryClient";
import { formatAdminDateTime, maskEmail } from "@/lib/utils";

type ReportStatus = "open" | "resolved" | "dismissed";

interface AdminLinkReport {
  resourceId: number;
  userId: string;
  status: ReportStatus;
  note: string | null;
  createdAt: string;
  handledAt: string | null;
  resourceTitle: string;
  resourceUrl: string;
  reporterEmail: string | null;
  reporterFirstName: string | null;
  reporterLastName: string | null;
}

interface LinkReportsResponse {
  reports: AdminLinkReport[];
  openCount: number;
}

function reporterLabel(report: AdminLinkReport): string {
  const name = [report.reporterFirstName, report.reporterLastName].filter(Boolean).join(" ");
  const email = report.reporterEmail ? maskEmail(report.reporterEmail) : "";
  return [name, email].filter(Boolean).join(" · ") || "Member";
}

/** Member dead-link reports, triaged next to the scan results. */
export default function LinkReportsPanel() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>("open");
  const [actionError, setActionError] = useState<string | null>(null);
  const reportsQuery = useQuery<LinkReportsResponse>({
    queryKey: ["/api/admin/link-reports", status],
    queryFn: () => apiRequest(`/api/admin/link-reports?status=${status}`),
  });

  const handle = useMutation({
    mutationFn: (args: { report: AdminLinkReport; status: "resolved" | "dismissed" }) =>
      apiRequest(
        `/api/admin/link-reports/${args.report.resourceId}/${encodeURIComponent(args.report.userId)}`,
        { method: "PATCH", body: JSON.stringify({ status: args.status }) },
      ),
    onMutate: () => setActionError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/link-reports"] }),
    onError: (error) =>
      setActionError(error instanceof Error ? error.message : "The report could not be updated."),
  });

  const reports = reportsQuery.data?.reports ?? [];
  const openCount = reportsQuery.data?.openCount;

  return (
    <Card className="ops-link-health__reports-card" data-testid="link-reports-panel">
      <CardHeader>
        <CardTitle role="heading" aria-level={2} className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap">
            <Flag className="h-5 w-5" aria-hidden="true" />
            Member reports
            {typeof openCount === "number" && (
              <span className="mono text-sm text-muted-foreground" data-testid="link-reports-open-count">
                {openCount.toLocaleString()} open
              </span>
            )}
          </span>
          <Select value={status} onValueChange={(value) => setStatus(value as ReportStatus)}>
            <SelectTrigger className="w-[140px]" aria-label="Report status" data-testid="select-link-report-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
        <CardDescription>Links that signed-in members reported as broken from a resource page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reportsQuery.isError && (
          <AdminLoadError
            subject="member link reports"
            error={reportsQuery.error}
            onRetry={() => { void reportsQuery.refetch(); }}
            retrying={reportsQuery.isFetching}
            testId="alert-link-reports-error"
          />
        )}
        {actionError && (
          <p role="alert" className="text-sm text-destructive" data-testid="link-reports-action-error">
            {actionError}
          </p>
        )}
        {reportsQuery.isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">Loading reports…</p>
        ) : !reportsQuery.isError && reports.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="link-reports-empty">
            {status === "open" ? "No open reports." : `No ${status} reports.`}
          </p>
        ) : (
          <ul className="divide-y divide-border" aria-label={`${status} member reports`}>
            {reports.map((report) => {
              const key = `${report.resourceId}-${report.userId}`;
              const pending = handle.isPending && handle.variables?.report === report;
              return (
                <li key={key} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between" data-testid={`link-report-${key}`}>
                  <div className="min-w-0 space-y-1">
                    <Link href={`/resource/${report.resourceId}`} className="inline-flex min-h-6 max-lg:min-h-11 items-center font-medium underline-offset-4 hover:underline">
                      {report.resourceTitle}
                    </Link>
                    <a
                      href={report.resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono flex min-h-6 max-lg:min-h-11 items-center text-xs text-muted-foreground break-all hover:underline"
                    >
                      {report.resourceUrl}
                    </a>
                    {report.note && <p className="text-sm break-words">“{report.note}”</p>}
                    <p className="text-xs text-muted-foreground">
                      {reporterLabel(report)} · reported {formatAdminDateTime(report.createdAt)}
                      {report.handledAt ? ` · ${report.status} ${formatAdminDateTime(report.handledAt)}` : ""}
                    </p>
                  </div>
                  {report.status === "open" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="min-h-[44px]"
                        aria-disabled={pending}
                        aria-busy={pending}
                        onClick={() => { if (!handle.isPending) handle.mutate({ report, status: "resolved" }); }}
                        data-testid={`button-resolve-link-report-${key}`}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[44px]"
                        aria-disabled={pending}
                        onClick={() => { if (!handle.isPending) handle.mutate({ report, status: "dismissed" }); }}
                        data-testid={`button-dismiss-link-report-${key}`}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
