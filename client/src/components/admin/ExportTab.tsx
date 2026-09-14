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
  TerminalSquare,
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
              (entry) => entry.action === "catalog.exported" || entry.action === "database.exported",
            )
              ? "exports found on this audit page."
              : hasNextAuditHistoryPage
                ? "no exports on this audit page; use Next to inspect the next window."
                : "no exports on this audit page; this is the final audit page."
          }`;

  const exportHistory = useMemo(
    () =>
      (exportHistoryData?.logs ?? [])
        .filter((entry) => entry.action === "catalog.exported" || entry.action === "database.exported"),
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
        exportFileName(response, "awesome-list-backup.json"),
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "JSON Export Successful",
        description: "The database backup has been downloaded.",
      });
    } catch {
      toast({
        title: "JSON Export Failed",
        description: "Failed to export the database backup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJsonExporting(false);
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

  const checkLinksMutation = useMutation({
    mutationFn: async () => {
      const response: unknown = await apiRequest("/api/admin/check-links", {
        method: "POST",
        body: JSON.stringify({
          timeout: 10000,
          concurrent: 5,
          retryCount: 1,
        }),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/validation-status"] });
      toast({
        title: "Link Check Complete",
        description: "All resource links have been checked.",
      });
    },
    onError: () => {
      toast({
        title: "Link Check Failed",
        description: "Failed to check links. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="admin-ops-export">
      <div className="admin-ops-export__intro">
        <h2>Export Awesome List</h2>
        <div className="admin-ops-export__intro-actions">
          <Button onClick={() => setConfirmAction("validate")} disabled={validateMutation.isPending}>
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
            onClick={() => setConfirmAction("links")}
            disabled={checkLinksMutation.isPending}
            variant="outline"
          >
            {checkLinksMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking Links...
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

      <div className="admin-ops-export__cards">
        <article className="card admin-ops-export-card hoverable">
          <div className="admin-ops-export-card__icon" aria-hidden="true">
            <FileJson className="h-5 w-5" />
          </div>
          <h3 className="admin-ops-export-card__title">JSON Snapshot</h3>
          <p className="admin-ops-export-card__description">
            Complete database backup as a single JSON file, including sanitized admin data.
          </p>
          <Button
            className="admin-ops-export-card__action"
            onClick={() => {
              void handleJsonExport();
            }}
            disabled={isJsonExporting}
            data-testid="button-export-json"
          >
            {isJsonExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isJsonExporting ? "Downloading..." : "Download"}
          </Button>
        </article>

        <article className="card admin-ops-export-card admin-ops-export-card--unsupported">
          <div className="admin-ops-export-card__icon" aria-hidden="true">
            <TableProperties className="h-5 w-5" />
          </div>
          <h3 className="admin-ops-export-card__title">CSV (resources)</h3>
          <p className="admin-ops-export-card__description">
            Flat resource table for spreadsheet workflows.
          </p>
          <div className="eyebrow admin-ops-export-card__availability">
            <StatusChip status="Unavailable" />
            <span className="sr-only">No supported admin endpoint is available.</span>
          </div>
        </article>

        <article className="card admin-ops-export-card hoverable">
          <div className="admin-ops-export-card__icon" aria-hidden="true">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="admin-ops-export-card__title">README.md</h3>
          <p className="admin-ops-export-card__description">
            Awesome-list flavored Markdown generated from the live public catalog.
          </p>
          <Button
            className="admin-ops-export-card__action"
            onClick={() => {
              void handleExport();
            }}
            disabled={isExporting}
            data-testid="button-export-markdown"
          >
            {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? "Generating..." : "Export Markdown"}
          </Button>
        </article>

        {[
          {
            title: "OPML (categories)",
            description: "Hierarchical export for feed readers.",
            icon: <Database className="h-5 w-5" />,
          },
          {
            title: "SQL dump",
            description: "PostgreSQL-compatible schema and data.",
            icon: <TerminalSquare className="h-5 w-5" />,
          },
          {
            title: "API token",
            description: "Generate a personal access token.",
            icon: <FileCheck className="h-5 w-5" />,
          },
        ].map((format) => (
          <article className="card admin-ops-export-card admin-ops-export-card--unsupported" key={format.title}>
            <div className="admin-ops-export-card__icon" aria-hidden="true">
              {format.icon}
            </div>
            <h3 className="admin-ops-export-card__title">{format.title}</h3>
            <p className="admin-ops-export-card__description">{format.description}</p>
            <div className="eyebrow admin-ops-export-card__availability">
              <StatusChip status="Unavailable" />
              <span className="sr-only">No supported admin endpoint is available.</span>
            </div>
          </article>
        ))}
      </div>

      <TableShell
        title="Export history"
        sub={auditHistoryWindowLabel}
        actions={
          <div className="admin-ops-table-shell__pagination" aria-label="Export history pages">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPreviousAuditHistoryPage || isExportHistoryLoading}
              onClick={() => setAuditHistoryPage((page) => Math.max(0, page - 1))}
              aria-label="Previous audit entries"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNextAuditHistoryPage || isExportHistoryLoading}
              onClick={() => setAuditHistoryPage((page) => page + 1)}
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
                ? "No catalog exports on this audit page. Use Next to inspect the next bounded audit window."
                : "No catalog exports on this final audit page. Use Previous to inspect earlier windows."}
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
                return (
                  <tr key={entry.id}>
                    <td>{isDatabaseExport ? "Database snapshot" : "Catalog"}</td>
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
                  <CheckCircle2 className="h-4 w-4 text-[#34d08c]" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4 w-4 text-[#ff5c7a]" aria-hidden="true" />
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
                      onClick={() => setShowErrors(!showErrors)}
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
                      onClick={() => setShowWarnings(!showWarnings)}
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

        {validationStatus?.linkCheck && (
          <section className="card admin-ops-validation-panel">
            <header className="admin-ops-validation-panel__header">
              <div>
                <h2>Link Check Results</h2>
                <p>Live resource link health from the last check</p>
              </div>
              <StatusChip status={validationStatus.linkCheck.brokenLinks > 0 ? "Warning" : "Healthy"} />
            </header>
            <div className="admin-ops-validation-panel__body space-y-4">
              <div className="admin-ops-validation-counts">
                <div className="admin-ops-validation-count admin-ops-validation-count--ok">
                  <strong>{validationStatus.linkCheck.validLinks}</strong>
                  <span>Valid links</span>
                </div>
                <div className="admin-ops-validation-count admin-ops-validation-count--bad">
                  <strong>{validationStatus.linkCheck.brokenLinks}</strong>
                  <span>Broken links</span>
                </div>
                <div className="admin-ops-validation-count admin-ops-validation-count--warn">
                  <strong>{validationStatus.linkCheck.redirects}</strong>
                  <span>Redirects</span>
                </div>
                <div className="admin-ops-validation-count">
                  <strong>{validationStatus.linkCheck.errors}</strong>
                  <span>Errors</span>
                </div>
              </div>

              {validationStatus.linkCheck.brokenResources &&
                validationStatus.linkCheck.brokenResources.length > 0 && (
                  <div className="space-y-2">
                    {/* DS-OK: global semantic status color for broken-link headings. */}
                    <h3 className="text-sm font-semibold text-[#ff5c7a]">
                      Broken links ({validationStatus.linkCheck.brokenResources.length})
                    </h3>
                    <ScrollArea className="admin-ops-validation-list admin-ops-validation-list--bad h-64">
                      <div className="space-y-3">
                        {validationStatus.linkCheck.brokenResources.map((link, i) => (
                          <div key={i} className="border-b border-[var(--border)] pb-3 last:border-0">
                            <div className="flex items-start gap-2">
                              {/* DS-OK: global semantic status color for broken-link icons. */}
                              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff5c7a]" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-[var(--text)]">
                                  {link.resourceTitle ?? "Unknown Resource"}
                                </div>
                                <div className="break-all font-mono text-xs text-[var(--text-2)]">{link.url}</div>
                                {/* DS-OK: global semantic status color for broken-link messages. */}
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#ff5c7a]">
                                  <StatusChip status={link.status >= 500 ? "Failed" : "Warning"} />
                                  <span>
                                    {link.status} {link.statusText}
                                    {link.error && ` - ${link.error}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

              {validationStatus.linkCheck.summary && (
                <div className="text-xs text-[var(--text-2)]">
                  Average response time: {validationStatus.linkCheck.summary.averageResponseTime.toFixed(0)}ms
                </div>
              )}
            </div>
          </section>
        )}

        {!validationStatus?.awesomeLint && !validationStatus?.linkCheck && (
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
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent data-testid="dialog-confirm-export-job">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "validate" ? "Run awesome-lint validation?" : "Run link check?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "validate"
                ? "This validates the exported markdown against awesome-lint rules. It runs in the background and can take a minute."
                : "This checks the links in the exported markdown against the live web. It runs in the background and can take several minutes."}
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