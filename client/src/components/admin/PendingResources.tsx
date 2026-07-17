import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Eye, ExternalLink, Calendar, User, FolderTree, RefreshCw } from "lucide-react";
import type { Resource } from "@shared/schema";

type PendingResource = Resource & { submittedByEmail?: string | null };

interface PendingResourcesResponse {
  resources: PendingResource[];
  total: number;
}

export default function PendingResources() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedResource, setSelectedResource] = useState<PendingResource | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [resourceToApprove, setResourceToApprove] = useState<Resource | null>(null);
  const [resourceToReject, setResourceToReject] = useState<Resource | null>(null);
  // Run17 BUG-027: "Check again" busy/outcome state for the empty view.
  const [recheckState, setRecheckState] = useState<'idle' | 'checking' | 'checked'>('idle');

  const { data, isLoading } = useQuery<PendingResourcesResponse>({
    queryKey: ['/api/admin/pending-resources'],
    refetchInterval: 10000
  });

  const approveMutation = useMutation({
    mutationFn: async (resourceId: number): Promise<unknown> => {
      return await apiRequest(`/api/admin/resources/${resourceId}/approve`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Resource Approved",
        description: "The resource has been approved and added to the public catalog.",
      });
      setApproveDialogOpen(false);
      setResourceToApprove(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve resource. Please try again.",
        variant: "destructive"
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ resourceId, reason }: { resourceId: number; reason: string }): Promise<unknown> => {
      return await apiRequest(`/api/admin/resources/${resourceId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Resource Rejected",
        description: "The resource has been rejected.",
      });
      setRejectDialogOpen(false);
      setResourceToReject(null);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject resource. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleViewDetails = (resource: Resource) => {
    setSelectedResource(resource);
    setViewDetailsOpen(true);
  };

  const handleApproveClick = (resource: Resource) => {
    setResourceToApprove(resource);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (resource: Resource) => {
    setResourceToReject(resource);
    setRejectDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    if (resourceToApprove) {
      approveMutation.mutate(resourceToApprove.id);
    }
  };

  const handleRejectConfirm = () => {
    if (resourceToReject && rejectionReason.trim().length >= 10) {
      rejectMutation.mutate({
        resourceId: resourceToReject.id,
        reason: rejectionReason.trim()
      });
    } else {
      toast({
        title: "Invalid Reason",
        description: "Rejection reason must be at least 10 characters.",
        variant: "destructive"
      });
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // BUG-034 (run14): submissions carry tags in metadata.tags (the submit form
  // writes there); some rows also have a top-level tags column. Surface both.
  const getSubmissionTags = (resource: any): string[] => {
    const metaTags = resource?.metadata?.tags;
    const colTags = resource?.tags;
    const raw = Array.isArray(metaTags) && metaTags.length > 0 ? metaTags : colTags;
    if (!Array.isArray(raw)) return [];
    return raw.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Resources awaiting admin review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
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

  const pendingResources = data?.resources ?? [];
  const totalPending = data?.total ?? 0;

  if (totalPending === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Resources awaiting admin review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground mb-4">
              There are no pending resources to review at this time.
            </p>
            {/* Run16 BUG-078: empty state gets an explicit refresh control.
                Run17 BUG-027: it now shows a busy state while re-fetching and
                announces the outcome via role="status". */}
            <Button
              variant="outline"
              disabled={recheckState === 'checking'}
              onClick={async () => {
                setRecheckState('checking');
                await queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
                setRecheckState('checked');
              }}
              data-testid="button-refresh-pending-resources"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${recheckState === 'checking' ? 'animate-spin' : ''}`} />
              {recheckState === 'checking' ? 'Checking…' : 'Check again'}
            </Button>
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground mt-3">
              {recheckState === 'checked' ? 'Checked — still no pending resources.' : ''}
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
                Pending Approvals
                <Badge variant="destructive" className="ml-2">
                  {totalPending}
                </Badge>
              </CardTitle>
              <CardDescription>Resources awaiting admin review</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Run17 BUG-001: was a Radix ScrollArea (overflow-hidden viewport) —
              the ~2800px-wide table was CLIPPED with no horizontal scrollbar,
              hiding Description/Submitted/Actions. Plain overflow-auto restores
              both axes (mirrors the run16 BUG-011 admin-table pattern). */}
          <div className="h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingResources.map((resource) => (
                  <TableRow key={resource.id} data-testid={`row-pending-resource-${resource.id}`}>
                    <TableCell className="font-medium max-w-[320px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate" title={resource.title}>{resource.title}</span>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                          data-testid={`link-resource-url-${resource.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {resource.category}
                        </Badge>
                        {resource.subcategory && (
                          <span className="text-xs text-muted-foreground">
                            {resource.subcategory}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm text-muted-foreground">
                        {truncateText(resource.description, 80)}
                      </p>
                      {/* BUG-034 (run14): reviewers must see submitted tags —
                          approvals were previously blind to tag content. */}
                      {getSubmissionTags(resource).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1" data-testid={`tags-pending-${resource.id}`}>
                          {getSubmissionTags(resource).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(resource.createdAt)}
                        </span>
                        {(resource.submittedByEmail ?? resource.submittedBy) && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {resource.submittedByEmail ?? resource.submittedBy}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(resource)}
                          data-testid={`button-view-details-${resource.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveClick(resource)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${resource.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejectClick(resource)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${resource.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resource Details</DialogTitle>
            <DialogDescription>
              Review full resource information before approval
            </DialogDescription>
          </DialogHeader>
          {selectedResource && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Title</Label>
                <p className="text-sm mt-1">{selectedResource.title}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">URL</Label>
                <a
                  href={selectedResource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {selectedResource.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <Label className="text-sm font-semibold">Description</Label>
                <p className="text-sm mt-1">{selectedResource.description}</p>
              </div>
              {/* BUG-034 (run14): tags visible in the detail modal too. */}
              {getSubmissionTags(selectedResource).length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1" data-testid="tags-detail-modal">
                    {getSubmissionTags(selectedResource).map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <FolderTree className="h-3 w-3" />
                    Category
                  </Label>
                  <p className="text-sm mt-1">{selectedResource.category}</p>
                </div>
                {selectedResource.subcategory && (
                  <div>
                    <Label className="text-sm font-semibold">Subcategory</Label>
                    <p className="text-sm mt-1">{selectedResource.subcategory}</p>
                  </div>
                )}
              </div>
              {selectedResource.subSubcategory && (
                <div>
                  <Label className="text-sm font-semibold">Sub-subcategory</Label>
                  <p className="text-sm mt-1">{selectedResource.subSubcategory}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Submitted Date
                  </Label>
                  <p className="text-sm mt-1">{formatDate(selectedResource.createdAt)}</p>
                </div>
                {(selectedResource.submittedByEmail ?? selectedResource.submittedBy) && (
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Submitted By
                    </Label>
                    <p className="text-sm mt-1">{selectedResource.submittedByEmail ?? selectedResource.submittedBy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDetailsOpen(false)}
              data-testid="button-close-details"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this resource? It will be added to the public catalog.
              You can manually sync it to GitHub later using the GitHub Sync panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {resourceToApprove && (
            <div className="bg-muted p-4 rounded-md">
              <p className="font-semibold">{resourceToApprove.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{resourceToApprove.url}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-approve">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this resource (minimum 10 characters).
            </AlertDialogDescription>
          </AlertDialogHeader>
          {resourceToReject && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="font-semibold">{resourceToReject.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{resourceToReject.url}</p>
              </div>
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explain why this resource is being rejected (e.g., duplicate content, broken link, not relevant to category, quality concerns...)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-2 min-h-[100px]"
                  data-testid="textarea-rejection-reason"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {rejectionReason.length}/10 characters minimum
                </p>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setRejectionReason("")}
              data-testid="button-cancel-reject"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending || rejectionReason.trim().length < 10}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
