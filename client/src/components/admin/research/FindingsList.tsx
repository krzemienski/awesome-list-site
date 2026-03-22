import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Filter,
  Info,
  RefreshCw,
} from "lucide-react";
import FindingCard from "./FindingCard";
import { useResearchFindings, useBulkApplyFindings, useBulkDismissFindings } from "./hooks/useResearchJobs";
import type { FindingFilters, FindingType, FindingSeverity, FindingStatus } from "./types";

interface FindingsListProps {
  jobId: string;
}

export default function FindingsList({ jobId }: FindingsListProps) {
  const [filters, setFilters] = useState<FindingFilters>({});
  const [page, setPage] = useState(1);
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());

  const { data: findingsData, isLoading } = useResearchFindings(jobId, filters, page, 20);
  const bulkApplyMutation = useBulkApplyFindings();
  const bulkDismissMutation = useBulkDismissFindings();

  const findings = findingsData?.findings || [];
  const total = findingsData?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFindings(new Set(findings.filter(f => f.status === "pending").map(f => f.id)));
    } else {
      setSelectedFindings(new Set());
    }
  };

  const handleSelectFinding = (findingId: string, checked: boolean) => {
    const newSelected = new Set(selectedFindings);
    if (checked) {
      newSelected.add(findingId);
    } else {
      newSelected.delete(findingId);
    }
    setSelectedFindings(newSelected);
  };

  const handleBulkApply = () => {
    if (selectedFindings.size === 0) return;
    if (confirm(`Apply ${selectedFindings.size} findings? This will modify the data.`)) {
      bulkApplyMutation.mutate(Array.from(selectedFindings), {
        onSuccess: () => setSelectedFindings(new Set()),
      });
    }
  };

  const handleBulkDismiss = () => {
    if (selectedFindings.size === 0) return;
    if (confirm(`Dismiss ${selectedFindings.size} findings?`)) {
      bulkDismissMutation.mutate(Array.from(selectedFindings), {
        onSuccess: () => setSelectedFindings(new Set()),
      });
    }
  };

  const pendingFindings = findings.filter(f => f.status === "pending");
  const allPendingSelected = pendingFindings.length > 0 &&
    pendingFindings.every(f => selectedFindings.has(f.id));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value === "all" ? undefined : value as FindingType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dead_link">Dead Links</SelectItem>
                  <SelectItem value="enrichment">Enrichments</SelectItem>
                  <SelectItem value="new_resource">New Resources</SelectItem>
                  <SelectItem value="category_change">Category Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.severity || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, severity: value === "all" ? undefined : value as FindingSeverity })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === "all" ? undefined : value as FindingStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {total} total
              </Badge>
              {selectedFindings.size > 0 && (
                <Badge className="bg-pink-500">
                  {selectedFindings.size} selected
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedFindings.size > 0 && (
        <Card className="border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedFindings.size} finding{selectedFindings.size !== 1 ? "s" : ""} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleBulkApply}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600"
                  disabled={bulkApplyMutation.isPending}
                >
                  {bulkApplyMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Apply Selected
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleBulkDismiss}
                  size="sm"
                  variant="outline"
                  disabled={bulkDismissMutation.isPending}
                >
                  {bulkDismissMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Dismissing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Dismiss Selected
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Findings List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Findings</CardTitle>
              <CardDescription>
                Page {page} of {totalPages} ({total} total)
              </CardDescription>
            </div>
            {pendingFindings.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allPendingSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select all pending</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : findings.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No findings match the current filters.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {findings.map((finding) => (
                  <div key={finding.id} className="flex items-start gap-3">
                    {finding.status === "pending" && (
                      <div className="pt-4">
                        <Checkbox
                          checked={selectedFindings.has(finding.id)}
                          onCheckedChange={(checked) =>
                            handleSelectFinding(finding.id, checked as boolean)
                          }
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <FindingCard finding={finding} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
