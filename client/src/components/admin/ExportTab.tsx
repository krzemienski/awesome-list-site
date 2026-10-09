import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Database,
  Download,
  FileCheck,
  FileJson,
  FileText,
  Link,
  RefreshCw,
  TableProperties,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link as RouterLink } from "wouter";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { formatAdminDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AdminOpsTable as Table,
  AdminOpsScrollArea as ScrollArea,
  StatusChip,
  TableShell,
} from "@/components/admin/AdminOpsPrimitives";
import type { ValidationStatus } from "@/components/admin/types/validation";
import type { LinkHealthJob } from "@shared/schema";
import "./admin-ops-export-database.css";

interface ExportTabProps {
  validationStatus?: ValidationStatus;
}

interface AuditLogEntry {
  id: number;
  action: string;
  performedBy: string | null;
  performedByEmail: string | null;
  changes: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string | null;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
}

const AUDIT_HISTORY_PAGE_SIZE = 50;
const EXPORT_ACTIONS = new Set(["catalog.exported", "database.exported", "resources.exported", "categories.exported"]);

const EXPORT_TITLE = "Awesome Video";
const EXPORT_DESCRIPTION =
  "A curated list of awesome video streaming resources, tools, frameworks, and learning materials.";

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}

function exportFileName(response: Response, fallback: string) {
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? fallback;
}

export default function ExportTab({ validationStatus: propValidationStatus }: ExportTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isJsonExporting, setIsJsonExporting] = useState(false);
  const [isCsvExporting, setIsCsvExporting] = useState(false);
  const [isOpmlExporting, setIsOpmlExporting] = useState(false);
  // ADM-06: synchronous in-flight guard (mirrors the public exporter in
  // components/ui/export-tools.tsx). `isExporting` is React state set
  // asynchronously, so a rapid double-click can land the second click before
  // the re-render disables the button — firing two POSTs, two downloads and
  // two audit-log rows. The ref flips synchronously so the second call bails.
  const exportingRef = useRef(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  // Run23 NB-040: explicit confirmation before starting validation/link-check jobs.
  const [confirmAction, setConfirmAction] = useState<"validate" | "links" | null>(null);
  const [auditHistoryPage, setAuditHistoryPage] = useState(0);

  const { data: fetchedValidationStatus } = useQuery<ValidationStatus>({
    queryKey: ["/api/admin/validation-status"],
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Export history is read from the existing audit endpoint. There is no
  // separate export-history endpoint, so this surface never invents records.
  const {
    data: exportHistoryData,
    isLoading: isExportHistoryLoading,
    isError: isExportHistoryError,
  } = useQuery<AuditLogsResponse>({
    queryKey: ["/api/admin/audit-logs", "export-history", auditHistoryPage],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const auditOffset = auditHistoryPage * AUDIT_HISTORY_PAGE_SIZE;
      const response = await fetch(
        `/api/admin/audit-logs?limit=${AUDIT_HISTORY_PAGE_SIZE}&offset=${auditOffset}`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new ApiError(response.status, "Failed to fetch export history");
      }
      const body: unknown = await response.json();
      return body as AuditLogsResponse;
    },
  });

  const auditHistoryTotal = exportHistoryData?.total ?? 0;
  const auditHistoryOffset = auditHistoryPage * AUDIT_HISTORY_PAGE_SIZE;
  const auditHistoryEnd = Math.min(
    auditHistoryOffset + (exportHistoryData?.logs.length ?? 0),
    auditHistoryTotal,
  );
  const hasPreviousAuditHistoryPage = auditHistoryPage > 0;
  const hasNextAuditHistoryPage =
    auditHistoryEnd < auditHistoryTotal &&
    (exportHistoryData?.logs.length ?? 0) > 0;
  const auditHistoryWindowLabel = isExportHistoryLoading
    ? `Loading audit entries ${auditHistoryOffset + 1}–${auditHistoryOffset + AUDIT_HISTORY_PAGE_SIZE} in a bounded window…`
    : isExportHistoryError
      ? "Export history window unavailable."
      : auditHistoryTotal === 0
        ? "Exports among audit entries 0–0 of 0; no audit entries are available."
        : `Exports among audit entries ${auditHistoryOffset + 1}–${auditHistoryEnd} of ${auditHistoryTotal} (50-entry bounded window); ${
            exportHistoryData?.logs.some(
              (entry) => EXPORT_ACTIONS.has(entry.action),
            )
              ? "exports found on this audit page."
              : hasNextAuditHistoryPage
                ? "no exports on this audit page; use Next to inspect the next window."
                : "no exports on this audit page; this is the final audit page."
          }`;

  const exportHistory = useMemo(
    () =>
      (exportHistoryData?.logs ?? [])
        .filter((entry) => EXPORT_ACTIONS.has(entry.action)),
    [exportHistoryData],
  );

  // R5-040: group lint findings by rule so 100+ repeats of the same rule read
  // as "rule × N" with the individual lines nested under one heading.
  const groupByRule = (items: { line: number; rule: string; message: string }[]) => {
    const groups = new Map<string, { line: number; rule: string; message: string }[]>();
    for (const item of items) {
      const key = item.rule ?? "unknown-rule";
      const list = groups.get(key);
      if (list) list.push(item);
      else groups.set(key, [item]);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  };

  const validationStatus = propValidationStatus ?? fetchedValidationStatus;

  const handleExport = async () => {
    // ADM-06: bail synchronously if an export is already in flight.
    if (exportingRef.current) return;
    exportingRef.current = true;
    try {
      setIsExporting(true);
      const response = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: EXPORT_TITLE,
          description: EXPORT_DESCRIPTION,
          includeContributing: true,
          includeLicense: true,
        }),
      });

      if (!response.ok) throw new ApiError(response.status, "Export failed");

      const blob = await response.blob();
      triggerBlobDownload(blob, "awesome-list.md");

      void queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "Export Successful",
        description: "Awesome list markdown file has been downloaded.",
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "Failed to export awesome list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      exportingRef.current = false;
    }
  };

  const handleJsonExport = async () => {
    try {
      setIsJsonExporting(true);
      const response = await fetch("/api/admin/export-json", {
        credentials: "include",
      });
      if (!response.ok) throw new ApiError(response.status, "JSON export failed");

      triggerBlobDownload(
        await response.blob(),
        exportFileName(response, "awesome-list-catalog-snapshot.json"),
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "JSON Export Successful",
        description: "The catalog snapshot has been downloaded. This is not a restorable database backup.",
      });
    } catch {
      toast({
        title: "JSON Export Failed",
        description: "Failed to export the catalog snapshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJsonExporting(false);
    }
  };

  const handleCsvExport = async () => {
    try {
      setIsCsvExporting(true);
      const response = await fetch("/api/admin/export-csv", {
        credentials: "include",
      });
      if (!response.ok) throw new ApiError(response.status, "CSV export failed");

      triggerBlobDownload(
        await response.blob(),
        exportFileName(response, "resources-export.csv"),
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "CSV Export Successful",
        description: "The resource table has been downloaded.",
      });
    } catch {
      toast({
        title: "CSV Export Failed",
        description: "Failed to export the resource table. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCsvExporting(false);
    }
  };

  const handleOpmlExport = async () => {
    try {
      setIsOpmlExporting(true);
      const response = await fetch("/api/admin/export-opml", {
        credentials: "include",
      });
      if (!response.ok) throw new ApiError(response.status, "OPML export failed");

      triggerBlobDownload(
        await response.blob(),
        exportFileName(response, "categories-export.opml"),
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "OPML Export Successful",
        description: "The category tree has been downloaded.",
      });
    } catch {
      toast({
        title: "OPML Export Failed",
        description: "Failed to export the category tree. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOpmlExporting(false);
    }
  };

  const validateMutation = useMutation({
    mutationFn: async () => {
      const response: unknown = await apiRequest("/api/admin/validate", {
        method: "POST",
        body: JSON.stringify({
          title: EXPORT_TITLE,
          description: EXPORT_DESCRIPTION,
          includeContributing: true,
          includeLicense: true,
        }),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/validation-status"] });
      toast({
        title: "Validation Complete",
        description: "Awesome list validation has been completed.",
      });
    },
    onError: () => {
      toast({
        title: "Validation Failed",
        description: "Failed to validate awesome list. Please try again.",
        variant: "destructive",
      });
    },
  });

  // F11: Run Link Check starts the persistent link-health job (the same job
  // /admin/linkhealth runs) and this tab follows it by polling its status,
  // so the check survives navigation, shows progress and can be cancelled.
  const { data: linkJobData, isError: isLinkJobError, refetch: refetchLinkJob } = useQuery<{ success: boolean; job: LinkHealthJob | null }>({
    queryKey: ["/api/admin/link-health/status"],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const status = query.state.data?.job?.status;
      return status === "pending" || status === "processing" ? 3000 : false;
    },
  });
  const linkJob = linkJobData?.job ?? null;
  const isLinkJobActive = linkJob?.status === "pending" || linkJob?.status === "processing";

  const checkLinksMutation = useMutation({
    mutationFn: async () => {
      try {
        return (await apiRequest("/api/admin/check-links", { method: "POST" })) as { job: LinkHealthJob | null };
      } catch (error) {
        // 409: a scan is already running — follow it instead of failing.
        if (error instanceof ApiError && error.status === 409) {
          return { job: null, alreadyRunning: true };
        }
        throw error;
      }
    },
    onSuccess: (data: { job: LinkHealthJob | null; alreadyRunning?: boolean }) => {
      if (data.job) queryClient.setQueryData(["/api/admin/link-health/status"], { success: true, job: data.job });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/link-health/status"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/link-health/history"] });
      toast({
        title: data.alreadyRunning ? "A link check is already running" : "Link check started",
        description: data.alreadyRunning
          ? "Following the scan that is already in progress."
          : "Progress is shown below and on the Link Health tab.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Link check could not start",
        description: error instanceof Error ? error.message : "Failed to start the link check. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelLinkCheckMutation = useMutation({
    mutationFn: async (jobId: number) =>
      apiRequest(`/api/admin/link-health/jobs/${jobId}`, { method: "DELETE" }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/link-health/status"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/link-health/history"] });
    },
    onSuccess: () => {
      toast({ title: "Link check cancelled", description: "Previous completed results remain available." });
    },
    onError: (error: unknown) => {
      toast({
        title: "Could not cancel the link check",
        description: error instanceof Error ? error.message : "The cancel request failed.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="admin-ops-export">
      <details className="admin-ops-more">
        <summary className="btn ghost">Validation controls</summary>
      <div className="admin-ops-export__intro">
        <h2>Export Awesome List</h2>
        <div className="admin-ops-export__intro-actions">
          {/* C5-V5A-02: these buttons (and the Download / Generate cards below)
              use aria-disabled, not disabled, while working — a disabled button
              drops keyboard focus to <body>. */}
          <Button
            onClick={() => { if (!validateMutation.isPending) setConfirmAction("validate"); }}
            aria-disabled={validateMutation.isPending}
            aria-busy={validateMutation.isPending}
            variant="outline"
          >
            {validateMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4" />
                Run Validation
              </>
            )}
          </Button>
          <Button
            onClick={() => { if (!checkLinksMutation.isPending && !isLinkJobActive) setConfirmAction("links"); }}
            aria-disabled={checkLinksMutation.isPending || isLinkJobActive}
            aria-busy={checkLinksMutation.isPending}
            variant="outline"
            data-testid="button-run-link-check"
          >
            {checkLinksMutation.isPending || isLinkJobActive ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {checkLinksMutation.isPending ? "Starting..." : "Link check running"}
              </>
            ) : (
              <>
                <Link className="h-4 w-4" />
                Run Link Check
              </>
            )}
          </Button>
          {validationStatus?.lastUpdated ? (
            <span className="admin-ops-export__last-validated">
              <Clock className="h-4 w-4" />
              Last validated: {formatAdminDateTime(validationStatus.lastUpdated)}
            </span>
          ) : null}
        </div>
      </div>
      </details>

      {/* F11: the export link check is the persistent link-health job. */}
      {(linkJob || isLinkJobError) && (
        <section className="card admin-ops-export__link-job" data-testid="export-link-check-job" aria-label="Export link check">
          {isLinkJobError && !linkJob ? (
            <div role="alert" className="admin-ops-export__link-job-row">
              <p>Link check status could not be loaded; this is not evidence that links are healthy.</p>
              <Button variant="outline" size="sm" onClick={() => void refetchLinkJob()}>Retry</Button>
            </div>
          ) : linkJob ? (
            <>
              <div className="admin-ops-export__link-job-row">
                <h2>
                  Link check #{linkJob.id}{" "}
                  <StatusChip
                    status={
                      isLinkJobActive ? "Running"
                        : linkJob.status === "completed" ? "Completed"
                          : linkJob.status === "failed" ? "Failed" : "Cancelled"
                    }
                  />
                </h2>
                {isLinkJobActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { if (!cancelLinkCheckMutation.isPending) cancelLinkCheckMutation.mutate(linkJob.id); }}
                    aria-disabled={cancelLinkCheckMutation.isPending}
                    aria-busy={cancelLinkCheckMutation.isPending}
                    data-testid="button-cancel-export-link-check"
                  >
                    {cancelLinkCheckMutation.isPending ? "Cancelling…" : "Cancel link check"}
                  </Button>
                ) : null}
              </div>
              <p className="admin-ops-export__link-job-scope">
                Checks the stored URL of every approved resource — the same URLs the exports write.
              </p>
              <p role="status" data-testid="export-link-check-progress">
                {isLinkJobActive
                  ? `${(linkJob.checkedLinks || 0).toLocaleString()} of ${(linkJob.totalLinks || 0).toLocaleString()} links checked (started ${linkJob.startedAt ? formatAdminDateTime(linkJob.startedAt) : formatAdminDateTime(linkJob.createdAt)}).`
                  : linkJob.status === "completed"
                    ? `Completed ${linkJob.completedAt ? formatAdminDateTime(linkJob.completedAt) : ""}: ${(linkJob.healthyLinks || 0).toLocaleString()} healthy, ${(linkJob.brokenLinks || 0).toLocaleString()} broken, ${(linkJob.redirectLinks || 0).toLocaleString()} redirects, ${(linkJob.timeoutLinks || 0).toLocaleString()} timeouts of ${(linkJob.totalLinks || 0).toLocaleString()}.`
                    : `${linkJob.status === "failed" ? "Failed" : "Cancelled"}${linkJob.completedAt ? ` ${formatAdminDateTime(linkJob.completedAt)}` : ""}: ${linkJob.errorMessage || "No reason was recorded."}`}
              </p>
              {isLinkJobError ? (
                <p role="alert" className="admin-ops-export__link-job-row">
                  Status refresh failed; the progress above may be stale.
                  <Button variant="outline" size="sm" onClick={() => void refetchLinkJob()}>Retry</Button>
                </p>
              ) : null}
              <RouterLink className="admin-ops-export__link-job-link" href="/admin/linkhealth">Open Link Health for problem links</RouterLink>
            </>
          ) : null}
        </section>
      )}

      <div className="admin-ops-export__cards">
        <article className="card admin-ops-export-card hoverable">
          <div className="admin-ops-export-card__icon" aria-hidden="true">
            <FileJson className="h-5 w-5" />
          </div>
          <h3 className="admin-ops-export-card__title">JSON Snapshot</h3>
          <p className="admin-ops-export-card__description">Non-restorable catalog snapshot, not a full database backup. Includes resources, category hierarchy, tags, learning journeys, sync queue and limited user summaries. Omits user identities, favorites, bookmarks, contributions, audit history, AI jobs and discoveries, notification preferences and other application state.</p>
          <Button
            className="admin-ops-export-card__action"
            onClick={() => {
              if (!isJsonExporting) void handleJsonExport();
            }}
            aria-disabled={isJsonExporting}
            aria-busy={isJsonExporting}
            data-testid="button-export-json"
          >
            {isJsonExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isJsonExporting ? "Downloading..." : "Download"}
          </Button>
        </article>

        <article className="card admin-ops-export-card hoverable">
          <div className="admin-ops-export-card__icon" aria-hidden="true">
            <TableProperties className="h-5 w-5" />
          </div>
          <h3 className="admin-ops-export-card__title">CSV (resources)</h3>
          <p className="admin-ops-export-card__description">Flat resource table for spreadsheet workflows.</p>
          <Button
            className="admin-ops-export-card__action"
            onClick={() => {
              if (!isCsvExporting) void handleCsvExport();
            }}
            aria-disabled={isCsvExporting}
            aria-busy={isCsvExporting}
            variant="outline"
            data-testid="button-export-csv"
          >
            {isCsvExporting && <RefreshCw className="h-4 w-4 animate-spin" />}
            {isCsvExporting ? "Downloading..." : "Download"}
          </Button>
        </article>

        <article className="card admin-ops-export-card hoverable">
          <div className="admin-ops-export-card__icon" aria-hidden="true">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="admin-ops-export-card__title">README.md</h3>
          <p className="admin-ops-export-card__description">Awesome-list flavored Markdown for the GitHub repo.</p>
          <Button
            className="admin-ops-export-card__action"
            onClick={() => {
              void handleExport();
            }}
            aria-disabled={isExporting}
            aria-busy={isExporting}
            variant="outline"
            data-testid="button-export-markdown"
          >
            {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? "Generating..." : "Generate"}
          </Button>
        </article>

        <article className="card admin-ops-export-card hoverable">
          <div className="admin-ops-export-card__icon" aria-hidden="true">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="admin-ops-export-card__title">OPML (categories)</h3>
          <p className="admin-ops-export-card__description">Hierarchical export for feed readers.</p>
          <Button
            className="admin-ops-export-card__action"
            onClick={() => {
              if (!isOpmlExporting) void handleOpmlExport();
            }}
            aria-disabled={isOpmlExporting}
            aria-busy={isOpmlExporting}
            variant="outline"
            data-testid="button-export-opml"
          >
            {isOpmlExporting && <RefreshCw className="h-4 w-4 animate-spin" />}
            {isOpmlExporting ? "Downloading..." : "Download"}
          </Button>
        </article>

      </div>

      <details className="admin-ops-more">
        <summary className="btn ghost">Export history &amp; validation results</summary>
      <TableShell
        title="Export history"
        sub={auditHistoryWindowLabel}
        actions={
          <div className="admin-ops-table-shell__pagination" aria-label="Export history pages">
            <Button
              type="button"
              variant="outline"
              size="sm"
              // C7-V5A-02: aria-disabled, never native disabled — while the next
              // window loads its data is undefined, so a native disabled here
              // dropped the pressed button's keyboard focus to <body>.
              aria-disabled={!hasPreviousAuditHistoryPage || isExportHistoryLoading}
              aria-busy={isExportHistoryLoading}
              onClick={() => { if (hasPreviousAuditHistoryPage && !isExportHistoryLoading) setAuditHistoryPage((page) => Math.max(0, page - 1)); }}
              aria-label="Previous audit entries"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-disabled={!hasNextAuditHistoryPage || isExportHistoryLoading}
              aria-busy={isExportHistoryLoading}
              onClick={() => { if (hasNextAuditHistoryPage && !isExportHistoryLoading) setAuditHistoryPage((page) => page + 1); }}
              aria-label="Next audit entries"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        }
      >
        {isExportHistoryLoading ? (
          <p className="admin-ops-table__empty">Loading export history...</p>
        ) : isExportHistoryError ? (
          <p className="admin-ops-table__error" role="alert">
            Export history is unavailable. The audit log endpoint returned an error.
          </p>
        ) : exportHistory.length === 0 ? (
          <p className="admin-ops-table__empty">
            {auditHistoryTotal === 0
              ? "No audit entries are available."
              : hasNextAuditHistoryPage
                ? "No exports on this audit page. Use Next to inspect the next bounded audit window."
                : "No exports on this final audit page. Use Previous to inspect earlier windows."}
          </p>
        ) : (
          <Table className="table admin-ops-table" data-testid="table-export-history">
            <thead>
              <tr>
                <th>Type</th>
                <th>Format</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {exportHistory.map((entry) => {
                const isDatabaseExport = entry.action === "database.exported";
                const format =
                  typeof entry.changes?.format === "string"
                    ? entry.changes.format
                    : isDatabaseExport
                      ? "json"
                      : "markdown";
                const rowCount = entry.changes?.rowCount ?? entry.changes?.resources;
                // F05: name each export by what it actually contains.
                const exportType =
                  entry.action === "database.exported"
                    ? "Catalog snapshot"
                    : entry.action === "resources.exported"
                      ? "Resources"
                      : entry.action === "categories.exported"
                        ? "Category tree"
                        : "Awesome list";
                return (
                  <tr key={entry.id} data-testid={`export-history-row-${entry.id}`} data-export-action={entry.action}>
                    <td>{exportType}</td>
                    <td className="admin-ops-table__mono">{format}</td>
                    <td><StatusChip status="Completed" /></td>
                    <td className="admin-ops-table__mono">
                      {typeof rowCount === "number" ? rowCount.toLocaleString() : "—"}
                    </td>
                    <td className="admin-ops-table__mono">
                      {entry.createdAt ? formatAdminDateTime(entry.createdAt) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </TableShell>

      <div className="admin-ops-export__validation">
        {validationStatus?.awesomeLint && (
          <section className="card admin-ops-validation-panel">
            <header className="admin-ops-validation-panel__header">
              <div>
                <h2>Validation Results</h2>
                <p>Awesome-lint compliance check on exported markdown</p>
              </div>
              <StatusChip status={validationStatus.awesomeLint.valid ? "Passed" : "Failed"} />
            </header>
            <div className="admin-ops-validation-panel__body">
              <div className="admin-ops-validation-summary">
                {/* DS-OK: global semantic status colors for validation outcomes. */}
                {validationStatus.awesomeLint.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--status-ok)]" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4 w-4 text-[var(--status-bad)]" aria-hidden="true" />
                )}
                <span className="admin-ops-validation-meta">
                  {validationStatus.awesomeLint.stats.totalResources} resources,{" "}
                  {validationStatus.awesomeLint.stats.totalCategories} categories
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {validationStatus.awesomeLint.errors.length > 0 && (
                  <div>
                    {/* Run16 BUG-073: expanders get a ≥44px touch target. */}
                    <button
                      type="button"
                      onClick={() => setShowErrors(!showErrors)}
                      aria-expanded={showErrors}
                      className="admin-ops-validation-expander admin-ops-validation-expander--bad"
                    >
                      {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Errors ({validationStatus.awesomeLint.errors.length})
                    </button>
                    {showErrors && (
                      <ScrollArea className="admin-ops-validation-list admin-ops-validation-list--bad h-48">
                        {groupByRule(validationStatus.awesomeLint.errors).map(([rule, items]) => (
                          <div key={rule} className="admin-ops-validation-group" data-testid={`error-group-${rule}`}>
                            <div className="admin-ops-validation-group__heading admin-ops-validation-group__heading--bad">
                              <XCircle className="h-4 w-4 shrink-0" />
                              <span className="font-mono text-xs">{rule}</span>
                              <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                            </div>
                            <div className="admin-ops-validation-group__items">
                              {items.map((error, i) => (
                                <div key={i}>
                                  <span className="font-mono text-xs">Line {error.line}: </span>
                                  {error.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    )}
                  </div>
                )}

                {validationStatus.awesomeLint.warnings.length > 0 && (
                  <div>
                    {/* Run16 BUG-073: 140×20px expander → ≥44px touch target. */}
                    <button
                      type="button"
                      onClick={() => setShowWarnings(!showWarnings)}
                      aria-expanded={showWarnings}
                      className="admin-ops-validation-expander admin-ops-validation-expander--warn"
                    >
                      {showWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Warnings ({validationStatus.awesomeLint.warnings.length})
                    </button>
                    {showWarnings && (
                      <ScrollArea className="admin-ops-validation-list admin-ops-validation-list--warn h-48">
                        {groupByRule(validationStatus.awesomeLint.warnings).map(([rule, items]) => (
                          <div key={rule} className="admin-ops-validation-group" data-testid={`warning-group-${rule}`}>
                            <div className="admin-ops-validation-group__heading admin-ops-validation-group__heading--warn">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span className="font-mono text-xs">{rule}</span>
                              <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                            </div>
                            <div className="admin-ops-validation-group__items">
                              {items.map((warning, i) => (
                                <div key={i}>
                                  <span className="font-mono text-xs">Line {warning.line}: </span>
                                  {warning.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {!validationStatus?.awesomeLint && (
          <section className="card admin-ops-validation-panel">
            <div className="admin-ops-validation-panel__body py-8 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--text-2)]" />
              <p className="mb-2 text-[var(--text-2)]">No validation results yet</p>
              <p className="text-sm text-[var(--text-2)]">
                Run validation above to check the exported Markdown against awesome-lint rules.
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Run23 NB-040: explicit confirmation before starting validation/link-check jobs. */}
      </details>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent data-testid="dialog-confirm-export-job">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "validate" ? "Run awesome-lint validation?" : "Run link check?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "validate"
                ? "This validates the exported markdown against awesome-lint rules. It runs in the background and can take a minute."
                : "This starts a link-health job that checks the stored URL of every approved resource (the URLs the exports write) against the live web. It runs in the background, shows progress here and on the Link Health tab, and can be cancelled."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-export-job">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-export-job"
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action === "validate") validateMutation.mutate();
                else if (action === "links") checkLinksMutation.mutate();
              }}
            >
              {confirmAction === "validate" ? "Run validation" : "Run link check"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}