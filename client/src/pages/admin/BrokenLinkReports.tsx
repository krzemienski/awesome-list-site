import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, ExternalLink, Calendar, User, AlertTriangle } from "lucide-react";
import type { Resource } from "@shared/schema";

interface BrokenLinkReport {
  id: number;
  resourceId: number;
  reportedBy: string;
  reportedAt: string;
  status: "pending" | "reviewed";
  reviewedBy?: string;
  reviewedAt?: string;
  resource: Resource;
}

interface BrokenLinkReportsResponse {
  reports: BrokenLinkReport[];
  total: number;
}

export default function BrokenLinkReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reportToReview, setReportToReview] = useState<BrokenLinkReport | null>(null);

  const { data, isLoading } = useQuery<BrokenLinkReportsResponse>({
    queryKey: ['/api/admin/broken-link-reports', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set('status', statusFilter);
      }
      const response = await fetch(`/api/admin/broken-link-reports?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch broken link reports');
      return response.json();
    },
    refetchInterval: 30000
  });

  const reviewMutation = useMutation({
    mutationFn: async (reportId: number) => {
      return await apiRequest(`/api/admin/broken-link-reports/${reportId}/review`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/broken-link-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Report Reviewed",
        description: "The broken link report has been marked as reviewed.",
      });
      setReviewDialogOpen(false);
      setReportToReview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "Failed to review report. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleReviewClick = (report: BrokenLinkReport) => {
    setReportToReview(report);
    setReviewDialogOpen(true);
  };

  const handleReviewConfirm = () => {
    if (reportToReview) {
      reviewMutation.mutate(reportToReview.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateUrl = (url: string, maxLength: number) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Broken Link Reports</CardTitle>
          <CardDescription>User-reported broken or invalid links</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const reports = data?.reports || [];
  const totalReports = data?.total || 0;
  const pendingCount = reports.filter(r => r.status === "pending").length;

  if (totalReports === 0 && statusFilter === "all") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Broken Link Reports
          </CardTitle>
          <CardDescription>User-reported broken or invalid links</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Reports Yet!</h3>
            <p className="text-muted-foreground">
              There are no broken link reports at this time. Users can report broken links from resource detail pages.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Broken Link Reports
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>User-reported broken or invalid links</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <XCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground">
                No {statusFilter === "pending" ? "pending" : statusFilter === "reviewed" ? "reviewed" : ""} broken link reports.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Reported At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold">{report.resource.title}</span>
                          <span className="text-xs text-muted-foreground">
                            ID: {report.resource.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={report.resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 max-w-[300px]"
                          title={report.resource.url}
                        >
                          <span className="truncate">{truncateUrl(report.resource.url, 40)}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{report.reportedBy}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(report.reportedAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.status === "pending" ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                            Pending
                          </Badge>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                              Reviewed
                            </Badge>
                            {report.reviewedBy && (
                              <span className="text-xs text-muted-foreground">
                                by {report.reviewedBy}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/resource/${report.resource.id}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Resource
                          </Button>
                          {report.status === "pending" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleReviewClick(report)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Mark Reviewed
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Review Confirmation Dialog */}
      <AlertDialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Report as Reviewed?</AlertDialogTitle>
            <AlertDialogDescription>
              {reportToReview && (
                <div className="space-y-2 mt-4">
                  <p>You are about to mark this broken link report as reviewed:</p>
                  <div className="bg-muted p-3 rounded-md space-y-1">
                    <p className="font-semibold">{reportToReview.resource.title}</p>
                    <p className="text-sm text-muted-foreground break-all">
                      {reportToReview.resource.url}
                    </p>
                    <p className="text-sm">
                      Reported by: <span className="font-medium">{reportToReview.reportedBy}</span>
                    </p>
                    <p className="text-sm">
                      Reported: {formatDate(reportToReview.reportedAt)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    This will mark the report as reviewed. Make sure you've verified or fixed the link before proceeding.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReviewConfirm}>
              Mark as Reviewed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
