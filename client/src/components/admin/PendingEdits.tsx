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
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Eye, ExternalLink, AlertTriangle, Sparkles } from "lucide-react";
import type { Resource, ResourceEdit } from "@shared/schema";

interface ResourceEditWithResource extends ResourceEdit {
  resource: Resource;
}

export default function PendingEdits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedEdit, setSelectedEdit] = useState<ResourceEditWithResource | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editToApprove, setEditToApprove] = useState<ResourceEditWithResource | null>(null);
  const [editToReject, setEditToReject] = useState<ResourceEditWithResource | null>(null);

  const { data: edits = [], isLoading } = useQuery<ResourceEditWithResource[]>({
    queryKey: ['/api/admin/resource-edits'],
    queryFn: () => apiRequest('/api/admin/resource-edits'),
    refetchInterval: 10000,
    retry: 1,
  });

  const approveMutation = useMutation({
    mutationFn: async (editId: string) => {
      return await apiRequest(`/api/admin/resource-edits/${editId}/approve`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      toast({
        title: "Edit Approved",
        description: "The changes have been applied to the resource.",
      });
      setApproveDialogOpen(false);
      setEditToApprove(null);
    },
    onError: (error: any) => {
      const isConflict = error.message?.includes('Conflict');
      toast({
        title: isConflict ? "Merge Conflict" : "Approval Failed",
        description: error.message || "Failed to approve edit. Please try again.",
        variant: "destructive"
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ editId, reason }: { editId: string; reason: string }) => {
      return await apiRequest(`/api/admin/resource-edits/${editId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Edit Rejected",
        description: "The edit suggestion has been rejected.",
      });
      setRejectDialogOpen(false);
      setEditToReject(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject edit. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleViewDetails = (edit: ResourceEditWithResource) => {
    setSelectedEdit(edit);
    setViewDetailsOpen(true);
  };

  const handleApproveClick = (edit: ResourceEditWithResource) => {
    setEditToApprove(edit);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (edit: ResourceEditWithResource) => {
    setEditToReject(edit);
    setRejectDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    if (editToApprove) {
      approveMutation.mutate(editToApprove.id);
    }
  };

  const handleRejectConfirm = () => {
    if (editToReject && rejectionReason.trim().length >= 10) {
      rejectMutation.mutate({
        editId: editToReject.id,
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

  const hasConflict = (edit: ResourceEditWithResource) => {
    if (!edit.resource || !edit.originalResourceUpdatedAt) return false;
    const originalTime = new Date(edit.originalResourceUpdatedAt).getTime();
    const currentTime = edit.resource.updatedAt ? new Date(edit.resource.updatedAt).getTime() : Date.now();
    return currentTime > originalTime;
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderDiff = (changes: Record<string, { old: any; new: any }>) => {
    return Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) => (
      <div key={field} className="border-l-4 border-yellow-500 pl-3 py-2 mb-2">
        <p className="text-sm font-semibold capitalize">{field}</p>
        <div className="mt-1 space-y-1">
          <p className="text-sm text-red-600 dark:text-red-400">
            <span className="font-mono">- </span>
            {oldValue || '(empty)'}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            <span className="font-mono">+ </span>
            {newValue || '(empty)'}
          </p>
        </div>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Edits</CardTitle>
          <CardDescription>Edit suggestions awaiting review</CardDescription>
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

  if (edits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Pending Edits
          </CardTitle>
          <CardDescription>Edit suggestions awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              There are no pending edits to review at this time.
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
                Pending Edits
                <Badge variant="destructive" className="ml-2">
                  {edits.length}
                </Badge>
              </CardTitle>
              <CardDescription>Edit suggestions awaiting review</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>AI Analysis</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {edits.map((edit) => (
                  <TableRow key={edit.id} data-testid={`row-pending-edit-${edit.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {hasConflict(edit) && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <div>
                          <p>{edit.resource?.title || 'Unknown Resource'}</p>
                          {edit.resource?.url && (
                            <a
                              href={edit.resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                              data-testid={`link-edit-resource-${edit.id}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Resource
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {Object.keys(edit.proposedChanges as any).length} field(s)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {edit.claudeMetadata ? (
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <span className="text-xs">
                            {Math.round(((edit.claudeMetadata as any)?.confidence || 0) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No AI</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(edit.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(edit)}
                          data-testid={`button-view-edit-${edit.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApproveClick(edit)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-edit-${edit.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRejectClick(edit)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-edit-${edit.id}`}
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
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Suggestion Details</DialogTitle>
            <DialogDescription>
              Review the proposed changes before approving or rejecting
            </DialogDescription>
          </DialogHeader>
          {selectedEdit && (
            <div className="space-y-4">
              {hasConflict(selectedEdit) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                        Conflict Detected
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                        The resource has been modified since this edit was suggested. 
                        Review changes carefully before approving.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Resource Information</h3>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-sm"><strong>Title:</strong> {selectedEdit.resource?.title}</p>
                  <p className="text-sm"><strong>URL:</strong> <a href={selectedEdit.resource?.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{selectedEdit.resource?.url}</a></p>
                  <p className="text-sm"><strong>Category:</strong> {selectedEdit.resource?.category}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Proposed Changes</h3>
                <div className="bg-muted/50 rounded-lg p-3">
                  {renderDiff(selectedEdit.proposedChanges as any)}
                </div>
              </div>

              {selectedEdit.claudeMetadata && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    AI Analysis
                  </h3>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence</span>
                      <Badge variant="secondary">
                        {Math.round(((selectedEdit.claudeMetadata as any)?.confidence || 0) * 100)}%
                      </Badge>
                    </div>
                    {(selectedEdit.claudeMetadata as any)?.keyTopics && (
                      <div>
                        <span className="text-sm font-medium">Key Topics</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {((selectedEdit.claudeMetadata as any).keyTopics as string[]).map((topic: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Metadata</h3>
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p><strong>Submitted:</strong> {formatDate(selectedEdit.createdAt)}</p>
                  <p><strong>Status:</strong> <Badge>{selectedEdit.status}</Badge></p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Edit Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              {editToApprove && hasConflict(editToApprove) ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-yellow-600 dark:text-yellow-500">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <span>
                      Warning: The resource has been modified since this edit was created.
                      Approving will overwrite current changes.
                    </span>
                  </div>
                  <p className="text-foreground">
                    This will merge the suggested changes into the resource "{editToApprove?.resource?.title}".
                  </p>
                </div>
              ) : (
                `This will merge the suggested changes into the resource "${editToApprove?.resource?.title}". This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-approve-edit"
            >
              Approve & Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Edit Suggestion</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this edit suggestion (minimum 10 characters)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this edit is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                data-testid="input-rejection-reason"
              />
              <p className="text-sm text-muted-foreground">
                {rejectionReason.length} / 10 characters minimum
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectionReason.trim().length < 10 || rejectMutation.isPending}
              data-testid="button-confirm-reject-edit"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
