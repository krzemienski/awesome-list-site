import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, RefreshCw } from "lucide-react";

interface AuditLogEntry {
  id: number;
  resourceId: number | null;
  originalResourceId: number | null;
  action: string;
  performedBy: string | null;
  changes: Record<string, any> | null;
  notes: string | null;
  createdAt: string | null;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
}

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-500",
  updated: "bg-blue-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  deleted: "bg-red-700",
  synced: "bg-purple-500",
  ai_enriched: "bg-cyan-500",
  ai_enrichment_failed: "bg-orange-500",
  edit_suggested: "bg-yellow-500",
  edit_approved: "bg-emerald-600",
  edit_rejected: "bg-red-600",
  bulk_import: "bg-indigo-500",
  status_changed: "bg-amber-500",
};

const LIMIT_OPTIONS = ["25", "50", "100", "200"];

export default function AuditTab() {
  const [resourceIdFilter, setResourceIdFilter] = useState("");
  const [limit, setLimit] = useState("50");
  const [appliedFilter, setAppliedFilter] = useState<string>("");
  const [appliedLimit, setAppliedLimit] = useState("50");

  const { data, isLoading, refetch, isFetching } = useQuery<AuditLogsResponse>({
    queryKey: ['/api/admin/audit-logs', appliedFilter, appliedLimit],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: appliedLimit });
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
  };

  const clearFilter = () => {
    setResourceIdFilter("");
    setAppliedFilter("");
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Filter by Resource ID..."
              value={resourceIdFilter}
              onChange={(e) => setResourceIdFilter(e.target.value)}
              className="pl-10"
              type="number"
            />
          </div>
          <Select value={limit} onValueChange={setLimit}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt}>{opt} rows</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" size="icon">
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
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </form>

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
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">{log.id}</TableCell>
                    <TableCell>
                      <Badge className={`${ACTION_COLORS[log.action] || 'bg-gray-500'} text-white text-xs`}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.originalResourceId || log.resourceId
                        ? `#${log.originalResourceId || log.resourceId}`
                        : "system"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {log.performedBy ? log.performedBy.slice(0, 12) : "system"}
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
      </CardContent>
    </Card>
  );
}
