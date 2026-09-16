import { type MouseEvent, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatAdminDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Eye, ExternalLink, AlertTriangle, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import type { Resource, ResourceEdit } from "@shared/schema";
import "./queues-review.css";

interface ResourceEditWithResource extends ResourceEdit {
  resource: Resource;
}

const MIN_REJECTION_REASON_LENGTH = 10;

function StatusChip({ status }: { status: "pending" | "approved" | "rejected" }) {
  return (
    <Badge variant="chip" className={`admin-chip queue-review-status queue-review-status--${status}`}>
      {status}
    </Badge>
  );
}

// BUG-012 (run25): invisible characters must be VISIBLE in review. A
// zero-width-only value used to render as a blank "+ " line, so a reviewer
// could approve an edit that visibly changed nothing. Replace each invisible
// code point with its ‹U+XXXX› escape and flag values that contain them.
// (Covers Cf/Cs zero-widths, bidi controls, BOM, blank-rendering glyphs.)
const INVISIBLE_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2800\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g;

function revealInvisible(value: string): { text: string; count: number } {
  let count = 0;
  const text = value.replace(INVISIBLE_CHAR_RE, (ch) => {
    count++;
    return `‹U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}›`;
  });
  return { text, count };
}

function DiffValue({ value }: { value: string | number | null }) {
  if (value === null || value === undefined || String(value) === "") {
    return <>(empty)</>;
  }
  if (typeof value !== "string") return <>{String(value)}</>;
  const { text, count } = revealInvisible(value);
  const visibleRest = text.replace(/‹U\+[0-9A-F]{4,6}›/g, "").trim();
  return (
    <>
      <span className="break-all">{text}</span>
      {count > 0 && (
        <span className={"ml-1 inline-block align-middle rounded bg-[#ffb84d]/15 px-1 text-[10px] font-medium uppercase tracking-wide text-[#ffb84d]" /* DS-OK: status warn */}>
          {visibleRest === "" ? "invisible characters only" : `${count} invisible char${count === 1 ? "" : "s"}`}
        </span>
      )}
    </>
  );
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
  const [approveError, setApproveError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const { data: edits = [], isLoading, isError, refetch, isFetching } = useQuery<ResourceEditWithResource[]>({
    queryKey: ['/api/admin/resource-edits'],
    refetchInterval: 10000
  });

  // R5-013 (run24): same keyboard-operable scroller + right-edge gradient cue
  // as PendingResources (R5-058) — the edits table clipped its Actions column
  // at narrow widths with no affordance that more columns existed.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  // R5-058 (run25): the shadcn <Table> renders its own inner `overflow-auto`
  // wrapper — THAT is the element that actually scrolls horizontally. Track
  // ITS scrollLeft so the gradient cue hides at max scroll and re-shows when
  // the user scrolls back.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scroller = (el.querySelector('table')?.parentElement ?? el) as HTMLElement;
    const check = () => {
      const hasOverflow = scroller.scrollWidth > scroller.clientWidth + 1;
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
      setShowSwipeHint(hasOverflow && !atEnd);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    ro.observe(scroller);
    scroller.addEventListener('scroll', check, { passive: true });
    return () => {
      ro.disconnect();
      scroller.removeEventListener('scroll', check);
    };
  }, [isLoading, edits.length]);

  const approveMutation = useMutation({
    mutationFn: async (editId: number) => {
      return await apiRequest(`/api/admin/resource-edits/${editId}/approve`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      setApproveDialogOpen(false);
      setEditToApprove(null);
      setApproveError(null);
      toast({
        title: "Edit Approved",
        description: "The changes have been applied to the resource.",
      });
    },
    onError: (error: Error) => {
      setApproveError(error.message || "Failed to approve edit. Please try again.");
      // The dialog remains open so the inline error can be read and retried.
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ editId, reason }: { editId: number; reason: string }) => {
      return await apiRequest(`/api/admin/resource-edits/${editId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setRejectDialogOpen(false);
      setEditToReject(null);
      setRejectionReason("");
      setRejectError(null);
      toast({
        title: "Edit Rejected",
        description: "The edit suggestion has been rejected.",
      });
    },
    onError: (error: Error) => {
      setRejectError(error.message || "Failed to reject edit. Please try again.");
    }
  });

  const handleViewDetails = (edit: ResourceEditWithResource) => {
    setSelectedEdit(edit);
    setViewDetailsOpen(true);
  };

  const handleApproveClick = (edit: ResourceEditWithResource) => {
    setApproveError(null);
    setEditToApprove(edit);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (edit: ResourceEditWithResource) => {
    setRejectError(null);
    setEditToReject(edit);
    setRejectDialogOpen(true);
  };

  const handleApproveConfirm = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (editToApprove) {
      approveMutation.mutate(editToApprove.id);
    }
  };

  const handleRejectConfirm = () => {
    if (editToReject && rejectionReason.trim().length >= MIN_REJECTION_REASON_LENGTH) {
      rejectMutation.mutate({
        editId: editToReject.id,
        reason: rejectionReason.trim()
      });
    } else {
      setRejectError(`Rejection reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters.`);
    }
  };

  const hasConflict = (edit: ResourceEditWithResource) => {
    if (!edit.resource || !edit.originalResourceUpdatedAt) return false;
    const originalTime = new Date(edit.originalResourceUpdatedAt).getTime();
    const currentTime = edit.resource.updatedAt ? new Date(edit.resource.updatedAt).getTime() : Date.now();
    return currentTime > originalTime;
  };

  // BUG-027 (run19): shared site-wide date+time style from lib/utils.
  const formatDate = (dateString: string | Date) => formatAdminDateTime(dateString);

  const renderDiff = (changes: Record<string, { old: string | number | null; new: string | number | null }>) => {
    return Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) => (
      <div key={field} className={"border-l-4 border-[#ffb84d] pl-3 py-2 mb-2" /* DS-OK: status warn */}>
        <p className="text-sm font-semibold capitalize">{field}</p>
        <div className="mt-1 space-y-1">
          <p className={"text-sm text-[#ff5c7a]" /* DS-OK: status bad */}>
            <span className="font-mono">- </span>
            <DiffValue value={oldValue} />
          </p>
          <p className={"text-sm text-[#34d08c]" /* DS-OK: status ok */}>
            <span className="font-mono">+ </span>
            <DiffValue value={newValue} />
          </p>
        </div>
      </div>
    ));
  };

  if (isError) {
    return (
      <section className="admin-panel queue-review-shell" aria-label="Pending edits">
        <div className="admin-panel__heading queue-review-shell-heading"><h2>Pending edits</h2></div>
        <div className="queue-review-empty" role="alert" data-testid="pending-edits-load-error">
          <p>Unable to load pending edits. The queue may still contain suggestions awaiting review.</p>
          <Button onClick={() => void refetch()} disabled={isFetching} data-testid="pending-edits-retry">
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="admin-panel queue-review-shell" aria-labelledby="pending-edits-heading">
        <div className="admin-panel__heading queue-review-shell-heading">
          <div>
            <h2 id="pending-edits-heading">Pending Edits</h2>
            <p>Edit suggestions awaiting review</p>
          </div>
        </div>
        <div className="queue-review-loading-table" aria-label="Loading pending edits">
          {[...Array(4)].map((_, i) => (
            <div className="queue-review-loading-row" key={i}>
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (edits.length === 0) {
    return (
      <section className="admin-panel queue-review-shell" aria-labelledby="pending-edits-heading">
        <div className="admin-panel__heading queue-review-shell-heading">
          <div>
            <h2 id="pending-edits-heading">Edit history</h2>
            <p>Pending and recent edits to resources</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['/api/admin/resource-edits'] });
            }}
            data-testid="button-refresh-pending-edits"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Check again
          </Button>
        </div>
        <div className="admin-table-wrap">
          <table className="table">
            <thead><tr><th>Resource</th><th>Field</th><th>Editor</th><th>When</th><th /></tr></thead>
          </table>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="admin-panel queue-review-shell" aria-labelledby="pending-edits-heading">
        <div className="admin-panel__heading queue-review-shell-heading">
          <div>
            <h2 id="pending-edits-heading" className="queue-review-title">
              Pending Edits
              <Badge variant="accent" className="queue-review-count">{edits.length}</Badge>
            </h2>
            <p>{edits.length} edit suggestions awaiting review</p>
          </div>
        </div>
        {/* R4-012 (run21): shared narrow-admin-table strategy — a native
            overflow-auto viewport (scrolls BOTH axes) around a min-w table.
            The prior Radix ScrollArea rendered its viewport at
            min-width:100%, so it never scrolled horizontally and clipped the
            Actions column ≤768px. max-h keeps short lists compact; the
            desktop layout (table already fits, no scroll) is unchanged. */}
        <div className="relative">
          {showSwipeHint && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10"
              data-testid="gradient-scroll-cue-edits"
            />
          )}
          <div
            ref={scrollRef}
            className="admin-table-wrap queue-review-table-wrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            tabIndex={0}
            role="region"
            aria-label="Pending edits table, scrollable"
            onKeyDown={(e) => {
              const el = scrollRef.current;
              if (!el) return;
              // R5-058: scroll the shadcn <Table>'s own inner overflow-auto
              // wrapper — the outer viewport only overflows vertically.
              const scroller = (el.querySelector('table')?.parentElement ?? el) as HTMLElement;
              if (e.key === 'ArrowRight') { scroller.scrollBy({ left: 80 }); e.preventDefault(); }
              else if (e.key === 'ArrowLeft') { scroller.scrollBy({ left: -80 }); e.preventDefault(); }
            }}
          >
            <Table className="queue-review-table queue-review-table--edits min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>AI Analysis</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {edits.map((edit) => (
                  <TableRow key={edit.id} data-testid={`row-pending-edit-${edit.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {hasConflict(edit) && (
                          <AlertTriangle className={"h-4 w-4 text-[#ffb84d]" /* DS-OK: status warn */} />
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
                        {Object.keys(edit.proposedChanges).length} field(s)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {edit.claudeMetadata ? (
                        <div className="flex items-center gap-1">
                          <Sparkles className={"h-4 w-4 text-[#9d4edd]" /* DS-OK: violet info (DS chart/info constant) */} />
                          <span className="text-xs">
                            {Math.round((edit.claudeMetadata.confidence || 0) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No AI</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(edit.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusChip status="pending" />
                    </TableCell>
                    <TableCell className="queue-review-action-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(edit)}
                          aria-label={`View edit details for ${edit.resource?.title || 'resource'}`}
                          data-testid={`button-view-edit-${edit.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Run19 BUG-014: affirmative green, matching the
                            Approvals tab — the theme's primary is red-toned,
                            so variant="default" read as destructive. */}
                        <Button
                          variant="default"
                          size="sm"
                          className={"bg-[#34d08c] hover:bg-[#34d08c]/90 text-black" /* DS-OK: status ok */}
                          onClick={() => handleApproveClick(edit)}
                          disabled={approveMutation.isPending}
                          aria-label={`Approve edit for ${edit.resource?.title || 'resource'}`}
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
                          aria-label={`Reject edit for ${edit.resource?.title || 'resource'}`}
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
          </div>
          {showSwipeHint && (
            <p className="mt-2 text-xs text-muted-foreground" data-testid="text-swipe-hint-edits">
              Swipe the table sideways to see all columns, including Approve/Reject.
            </p>
          )}
        </div>
      </section>

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
                <div className={"bg-[#ffb84d]/10 border border-[#ffb84d]/30 rounded-lg p-4" /* DS-OK: status warn */}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={"h-5 w-5 text-[#ffb84d] mt-0.5" /* DS-OK: status warn */} />
                    <div>
                      <h4 className={"font-semibold text-[#ffb84d]" /* DS-OK: status warn */}>
                        Conflict Detected
                      </h4>
                      <p className="text-sm text-foreground mt-1">
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
                  {renderDiff(selectedEdit.proposedChanges as Record<string, { old: string | number | null; new: string | number | null }>)}
                </div>
              </div>

              {selectedEdit.claudeMetadata && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className={"h-4 w-4 text-[#9d4edd]" /* DS-OK: violet info (DS chart/info constant) */} />
                    AI Analysis
                  </h3>
                  <div className={"bg-[#9d4edd]/10 rounded-lg p-3 space-y-2" /* DS-OK: violet info (DS chart/info constant) */}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence</span>
                      <Badge variant="secondary">
                        {Math.round((selectedEdit.claudeMetadata.confidence || 0) * 100)}%
                      </Badge>
                    </div>
                    {selectedEdit.claudeMetadata.keyTopics && (
                      <div>
                        <span className="text-sm font-medium">Key Topics</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedEdit.claudeMetadata.keyTopics.map((topic: string, i: number) => (
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
      <AlertDialog open={approveDialogOpen} onOpenChange={(open) => {
        setApproveDialogOpen(open);
        if (!open) setApproveError(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Edit Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              {editToApprove && hasConflict(editToApprove) ? (
                <div className="space-y-2">
                  <div className={"flex items-start gap-2 text-[#ffb84d]" /* DS-OK: status warn */}>
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
          {approveError && (
            <Alert variant="destructive" data-testid="error-approve-edit-dialog">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{approveError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setApproveError(null)}
              data-testid="button-cancel-approve-edit"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending}
              className={"bg-[#34d08c] text-black hover:bg-[#34d08c]/90" /* DS-OK: status ok */}
              data-testid="button-confirm-approve-edit"
            >
              {approveMutation.isPending ? "Approving..." : "Approve & Merge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
        setRejectDialogOpen(open);
        if (!open) setRejectError(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Edit Suggestion</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this edit suggestion (minimum {MIN_REJECTION_REASON_LENGTH} characters).
              This message is shown to the contributor, so keep internal moderation notes out of it.
            </DialogDescription>
          </DialogHeader>
          {rejectError && (
            <Alert variant="destructive" data-testid="error-reject-edit-dialog">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{rejectError}</AlertDescription>
            </Alert>
          )}
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
                {rejectionReason.trim().length} / {MIN_REJECTION_REASON_LENGTH} characters minimum · visible to the contributor
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setRejectError(null);
              }}
              data-testid="button-cancel-reject-edit"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectionReason.trim().length < MIN_REJECTION_REASON_LENGTH || rejectMutation.isPending}
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
