import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search, RefreshCw } from "lucide-react";

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

/* WP-6 a11y: per-color ink baked into each entry — white on -500 mid-tones was
   2.3–4.4:1; black ink passes AA (≥4.5:1) on all light/mid tones, white kept
   only on the dark reds. DS §7: accent-tone surfaces take black ink. */
const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-500 text-black",
  updated: "bg-blue-500 text-black",
  approved: "bg-emerald-500 text-black",
  rejected: "bg-red-500 text-black",
  deleted: "bg-red-700 text-white",
  synced: "bg-purple-500 text-black",
  ai_enriched: "bg-cyan-500 text-black",
  ai_enrichment_failed: "bg-orange-500 text-black",
  edit_suggested: "bg-yellow-500 text-black",
  edit_approved: "bg-emerald-600 text-black",
  edit_rejected: "bg-red-600 text-white",
  bulk_import: "bg-indigo-500 text-black",
  status_changed: "bg-amber-500 text-black",
};

const LIMIT_OPTIONS = ["25", "50", "100", "200"];

export default function AuditTab() {
  const [resourceIdFilter, setResourceIdFilter] = useState("");
  const [limit, setLimit] = useState("50");
  const [appliedFilter, setAppliedFilter] = useState<string>("");
  const [appliedLimit, setAppliedLimit] = useState("50");
  // Run16 BUG-083: clicking a row opens a detail view with the full payload.
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Run17 BUG-010: real pagination — the tab used to silently cap at the row
  // limit with no way to reach older entries.
  const [offset, setOffset] = useState(0);

  const { data, isLoading, refetch, isFetching } = useQuery<AuditLogsResponse>({
    queryKey: ['/api/admin/audit-logs', appliedFilter, appliedLimit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: appliedLimit, offset: String(offset) });
      if (appliedFilter) params.set('resourceId', appliedFilter);
      const response = await fetch(`/api/admin/audit-logs?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilter(resourceIdFilter);
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

  const summarizeChanges = (changes: Record<string, any> | null): string => {
    if (!changes) return "—";
    const keys = Object.keys(changes);
    if (keys.length === 0) return "—";
    if (keys.length <= 3) return keys.join(", ");
    return `${keys.slice(0, 3).join(", ")} +${keys.length - 3} more`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Audit Log
        </CardTitle>
        <CardDescription>
          View system activity and resource change history ({data?.total || 0} entries)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-2)]" />
            <Input
              placeholder="Filter by Resource ID..."
              value={resourceIdFilter}
              onChange={(e) => setResourceIdFilter(e.target.value)}
              className="pl-10"
              type="number"
            />
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
          <Button type="submit" variant="outline" size="icon" aria-label="Search">
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
        </form>

        {/* Run16 BUG-088: on narrow screens the table scrolls sideways — a
            right-edge fade + explicit hint make the hidden columns
            discoverable instead of silently clipping them. */}
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden"
            aria-hidden="true"
          />
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs && data.logs.length > 0 ? (
                data.logs.map((log) => (
                  <TableRow
                    key={log.id}
                    /* Run16 BUG-083: row click opens the full-entry detail view. */
                    className="cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                    data-testid={`row-audit-log-${log.id}`}
                  >
                    <TableCell className="text-xs text-muted-foreground">{log.id}</TableCell>
                    <TableCell>
                      <Badge className={`${ACTION_COLORS[log.action] || 'bg-gray-600 text-white'} text-xs`}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.originalResourceId || log.resourceId
                        ? `#${log.originalResourceId || log.resourceId}`
                        : "system"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {/* Run16 BUG-084: show the actor's email when known
                          instead of a truncated raw UUID. */}
                      {log.performedByEmail
                        ? log.performedByEmail
                        : log.performedBy
                          ? log.performedBy.slice(0, 12)
                          : "system"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {summarizeChanges(log.changes)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.notes || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No audit log entries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 sm:hidden">
          Swipe the table sideways to see all columns.
        </p>

        {/* Run17 BUG-010: range readout + Previous/Next through the full log. */}
        {data && data.total > 0 && (
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
                  {selectedLog.performedByEmail || selectedLog.performedBy || "system"}
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
      </CardContent>
    </Card>
  );
}
