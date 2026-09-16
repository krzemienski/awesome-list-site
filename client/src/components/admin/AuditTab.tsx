import { useState } from "react";
import { ApiError } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Search, RefreshCw, AlertCircle } from "lucide-react";
import { parseIntInRange, PG_INT4_MAX } from "@shared/validation";
import {
  AdminOpsScrollArea as ScrollArea,
  AdminOpsTable as Table,
  StatusChip,
  TableShell,
} from "@/components/admin/AdminOpsPrimitives";
import ContactSubmissions from "@/components/admin/ContactSubmissions";
import "@/styles/pages/admin-ops-users-audit.css";

interface AuditLogEntry {
  id: number;
  resourceId: number | null;
  originalResourceId: number | null;
  action: string;
  performedBy: string | null;
  performedByEmail: string | null;
  changes: Record<string, any> | null;
  notes: string | null;
  createdAt: string | null;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
}

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return `${email[0]}•••${email.slice(at)}`;
}

/* A log entry is recorded after the operation it describes. Keep this
   translation explicit: rejected operations are not failed requests, a
   deletion is not a failure, and an unknown action is not silently reported
   as successful. */
const ACTION_STATUS: Record<string, string> = {
  create: "completed",
  created: "completed",
  update: "completed",
  updated: "completed",
  approved: "approved",
  rejected: "rejected",
  deleted: "completed",
  synced: "completed",
  imported: "completed",
  exported: "completed",
  import: "completed",
  export: "completed",
  skip: "completed",
  ai_enriched: "completed",
  ai_enrichment_failed: "failed",
  edit_suggested: "pending",
  edit_approved: "approved",
  edit_rejected: "rejected",
  edit_superseded: "completed",
  edit_withdrawn: "completed",
  bulk_import: "completed",
  status_changed: "completed",
  withdrawn: "completed",
  category_created: "completed",
  category_updated: "completed",
  category_deleted: "completed",
  subcategory_created: "completed",
  subcategory_updated: "completed",
  subcategory_deleted: "completed",
  sub_subcategory_created: "completed",
  sub_subcategory_updated: "completed",
  sub_subcategory_deleted: "completed",
  "users.exported": "completed",
  "catalog.exported": "completed",
  "catalog.exported_github": "pending",
  "database.exported": "completed",
  maintenance_backfill_approved_at: "completed",
  maintenance_canonicalize_tags: "completed",
};

const LIMIT_OPTIONS = ["25", "50", "100", "200"];

export default function AuditTab() {
  const [resourceIdFilter, setResourceIdFilter] = useState("");
  const [limit, setLimit] = useState("50");
  const [appliedFilter, setAppliedFilter] = useState<string>("");
  const [appliedLimit, setAppliedLimit] = useState("50");
  // Run16 BUG-083: clicking a row opens a detail view with the full payload.
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showTools, setShowTools] = useState(false);

  // Run17 BUG-010: real pagination — the tab used to silently cap at the row
  // limit with no way to reach older entries.
  const [offset, setOffset] = useState(0);

  // Run23 NB-041: surface fetch failures as a distinct error state instead of
  // letting them render as the "No audit log entries found" empty state.
  const { data, isLoading, isError, refetch, isFetching } = useQuery<AuditLogsResponse>({
    queryKey: ['/api/admin/audit-logs', appliedFilter, appliedLimit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: appliedLimit, offset: String(offset) });
      if (appliedFilter) params.set('resourceId', appliedFilter);
      const response = await fetch(`/api/admin/audit-logs?${params}`, { credentials: 'include' });
      if (!response.ok) throw new ApiError(response.status, 'Failed to fetch audit logs');
      return response.json();
    },
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // ADM-08: validate the Resource ID filter client-side against the SAME rule
  // the server enforces (positive integer within int4). An out-of-range value
  // (99999999999) or 0 used to reach the API, 400, and surface a misleading
  // "server error — try again" alert that failed identically on every retry.
  // A blank filter is valid (means "no filter").
  const trimmedFilter = resourceIdFilter.trim();
  const resourceIdInvalid =
    trimmedFilter.length > 0 &&
    parseIntInRange(trimmedFilter, { min: 1, max: PG_INT4_MAX }) === null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side gate: never send an out-of-range/invalid id to the server.
    if (resourceIdInvalid) return;
    setAppliedFilter(trimmedFilter);
    setAppliedLimit(limit);
    setOffset(0);
  };

  const clearFilter = () => {
    setResourceIdFilter("");
    setAppliedFilter("");
    setOffset(0);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatRelativeDate = (date: string | null) => {
    if (!date) return "—";
    const elapsed = Date.now() - new Date(date).getTime();
    if (!Number.isFinite(elapsed)) return "—";
    const minutes = Math.max(0, Math.floor(elapsed / 60_000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const targetLabel = (log: AuditLogEntry): string => {
    const title = log.changes?.title;
    if (typeof title === "string" && title.trim()) return title;
    return log.originalResourceId || log.resourceId
      ? `#${log.originalResourceId || log.resourceId}`
      : "System";
  };

  const actorLabel = (log: AuditLogEntry): string => {
    if (log.performedByEmail) return maskEmail(log.performedByEmail);
    if (log.performedBy) return log.performedBy.slice(0, 12);
    return "system";
  };

  if (isLoading) {
    return (
      <div className="admin-ops-audit-stack">
        <TableShell
          title={<Skeleton className="h-5 w-32" />}
          className="admin-ops-audit-shell"
        >
          <div className="admin-ops-loading space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </TableShell>
      </div>
    );
  }

  return (
    <div className="admin-ops-audit-stack">
    <TableShell
      title={
        <span className="admin-ops-audit-title">
          <span>Audit log</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTools((visible) => !visible)}
            aria-expanded={showTools}
            data-testid="button-audit-tools"
          >
            {showTools ? "Hide tools" : "Tools"}
          </Button>
        </span>
      }
      description="Append-only · last 100 events"
      className="admin-ops-audit-shell"
    >
      <div className="space-y-4">
        {showTools && <form onSubmit={handleSearch} className="admin-ops-audit-toolbar flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-2)]" />
            <Input
              placeholder="Filter by Resource ID..."
              value={resourceIdFilter}
              onChange={(e) => setResourceIdFilter(e.target.value)}
              className="pl-10"
              type="number"
              min={1}
              max={PG_INT4_MAX}
              aria-invalid={resourceIdInvalid}
              aria-describedby={resourceIdInvalid ? "audit-resource-id-error" : undefined}
              data-testid="input-audit-resource-id"
            />
            {/* ADM-08: honest inline validation instead of a misleading
                server-error alert after a failed request. */}
            {resourceIdInvalid && (
              <p
                id="audit-resource-id-error"
                role="alert"
                className="mt-1 text-xs font-medium text-destructive"
                data-testid="error-audit-resource-id"
              >
                Enter a Resource ID between 1 and {PG_INT4_MAX.toLocaleString()}.
              </p>
            )}
          </div>
          {/* Run16 BUG-040: apply the row limit immediately on change — it
              previously only took effect after also pressing Search. */}
          <Select
            value={limit}
            onValueChange={(v) => { setLimit(v); setAppliedLimit(v); setOffset(0); }}
          >
            <SelectTrigger className="w-32" aria-label="Rows to show">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>{opt} rows</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="icon" aria-label="Search" disabled={resourceIdInvalid}>
            <Search className="h-4 w-4" />
          </Button>
          {appliedFilter && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilter}>
              Clear
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </form>}

        {/* Run23 NB-041: fetch failures render a distinct, retryable error
            state — never the "No audit log entries found" empty state. */}
        {isError ? (
          <div
            className="border border-destructive/40 bg-destructive/10 rounded p-8 text-center"
            role="alert"
            data-testid="alert-audit-error"
          >
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
            <p className="font-medium mb-1">Couldn't load the audit log</p>
            <p className="text-sm text-muted-foreground mb-4">
              The server returned an error while fetching entries. Your filter is still applied — try again.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-audit-retry"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Try again
            </Button>
          </div>
        ) : (
        <>
        {/* Run16 BUG-088: on narrow screens the table scrolls sideways — a
            right-edge fade + explicit hint make the hidden columns
            discoverable instead of silently clipping them. */}
        <div className="admin-ops-table-wrap relative">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden"
            aria-hidden="true"
          />
          <Table className="admin-ops-table admin-ops-audit-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs && data.logs.length > 0 ? (
                data.logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="admin-ops-clickable-row cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedLog(log);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`View details for audit entry ${log.id}`}
                    data-testid={`row-audit-log-${log.id}`}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                       <span>TX#{log.id}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="admin-ops-audit-detail-button ml-1 h-8 w-8"
                        aria-label={`View details for audit entry ${log.id}`}
                        data-testid={`button-audit-detail-${log.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedLog(log);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {actorLabel(log)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="truncate" title={log.action.replace(/_/g, " ")}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                       {targetLabel(log)}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={ACTION_STATUS[log.action] ?? "recorded"} className="text-xs">
                        {(ACTION_STATUS[log.action] ?? "recorded").replace(/_/g, " ")}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                       {formatRelativeDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit log entries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-2 sm:hidden">
          Swipe the table sideways to see all columns.
        </p>
        </>
        )}

        {/* Run17 BUG-010: range readout + Previous/Next through the full log. */}
        {showTools && data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-sm text-muted-foreground" data-testid="text-audit-range">
              {offset + 1}–{Math.min(offset + (data.logs?.length || 0), data.total)} of{" "}
              {data.total.toLocaleString()} entries
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={offset === 0 || isFetching}
                onClick={() => setOffset(Math.max(0, offset - parseInt(appliedLimit, 10)))}
                data-testid="button-audit-prev"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={offset + parseInt(appliedLimit, 10) >= data.total || isFetching}
                onClick={() => setOffset(offset + parseInt(appliedLimit, 10))}
                data-testid="button-audit-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Run16 BUG-083: full-entry detail view — complete changes payload
            and notes, no truncation. */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit entry #{selectedLog?.id}</DialogTitle>
              <DialogDescription>
                {selectedLog && (
                  <>
                    {selectedLog.action.replace(/_/g, ' ')} ·{" "}
                    {selectedLog.originalResourceId || selectedLog.resourceId
                      ? `Resource #${selectedLog.originalResourceId || selectedLog.resourceId}`
                      : "system"}{" "}
                    · {formatDate(selectedLog.createdAt)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Performed by: </span>
                  {actorLabel(selectedLog)}
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Notes</div>
                  <p className="whitespace-pre-wrap break-words" data-testid="text-audit-detail-notes">
                    {selectedLog.notes || "—"}
                  </p>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Changes</div>
                  {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 ? (
                    <ScrollArea className="max-h-[300px] border rounded p-2">
                      <pre className="text-xs whitespace-pre-wrap break-all" data-testid="text-audit-detail-changes">
                        {JSON.stringify(selectedLog.changes, null, 2)}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <p>—</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TableShell>
    {showTools && <ContactSubmissions />}
    </div>
  );
}
