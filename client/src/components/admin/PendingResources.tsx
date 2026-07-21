import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatAdminDate } from "@/lib/utils";
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

// BUG-040 (run19): the detail dialog renders whatever string is stored in
// resource.url — only make it clickable when it is a well-formed http(s)
// URL with no embedded whitespace.
function isSafeHttpUrl(raw: string | null | undefined): boolean {
  if (!raw || /\s/.test(raw)) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

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

  // BUG-011 (run22): the swipe hint must appear whenever the table actually
  // overflows its scrollport (which is always the case at ≤768px, where the
  // 720px min-width table exceeds the content area) — the previous `sm:hidden`
  // class hid it between 640–768px even though the table still scrolled.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const { data, isLoading } = useQuery<PendingResourcesResponse>({
    queryKey: ['/api/admin/pending-resources'],
    refetchInterval: 10000
  });

  // BUG-011 (run22): keep the hint in sync with real horizontal overflow.
  // Deps include the loading/count flags because the scroll container only
  // mounts once data has arrived (early returns above it).
  // R5-058 (run25): the shadcn <Table> renders its own inner `overflow-auto`
  // wrapper — THAT is the element that actually scrolls horizontally, not the
  // outer max-h viewport. Track ITS scrollLeft so the gradient cue hides once
  // the user reaches the rightmost columns (no more content off-screen), and
  // re-shows when they scroll back.
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
  }, [isLoading, data?.total]);

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

  // BUG-034 (run14): submissions carry tags in metadata.tags (the submit form
  // writes there); some rows also have a top-level tags column. Surface both.
  const getSubmissionTags = (resource: any): string[] => {
    const metaTags = resource?.metadata?.tags;
    const colTags = resource?.tags;
    const raw = Array.isArray(metaTags) && metaTags.length > 0 ? metaTags : colTags;
    if (!Array.isArray(raw)) return [];
    return raw.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  };

  // BUG-027 (run19): delegate to the shared site-wide formatter so resource
  // pages, admin tables, and journeys all render dates identically.
  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return formatAdminDate(date);
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
          {/* R4-011 (run21): shared narrow-admin-table strategy — a single
              contained overflow-auto viewport (scrolls BOTH axes) around a
              min-w table. The previous sticky-right Actions cell (338px) was
              WIDER than the ≤768px scrollport and clamped over the Title cell;
              dropping sticky + letting the whole row scroll together keeps rows
              readable and Approve/Reject reachable at 375/768 while leaving the
              desktop layout (table already fits, no scroll) unchanged. */}
          {/* R5-058: the scroller is keyboard-operable (tabbable region with
              arrow-key scrolling) and shows a right-edge gradient cue while
              more columns remain off-screen. */}
          <div className="relative">
            {showSwipeHint && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10"
                data-testid="gradient-scroll-cue"
              />
            )}
            <div
              ref={scrollRef}
              className="max-h-[600px] overflow-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              tabIndex={0}
              role="region"
              aria-label="Pending approvals table, scrollable"
              onKeyDown={(e) => {
                const el = scrollRef.current;
                if (!el) return;
                // R5-058: horizontal overflow lives on the shadcn <Table>'s own
                // inner overflow-auto wrapper — scroll THAT, not the outer
                // max-h viewport (which only ever overflows vertically).
                const scroller = (el.querySelector('table')?.parentElement ?? el) as HTMLElement;
                if (e.key === 'ArrowRight') { scroller.scrollBy({ left: 80 }); e.preventDefault(); }
                else if (e.key === 'ArrowLeft') { scroller.scrollBy({ left: -80 }); e.preventDefault(); }
              }}
            >
            {/* BUG-011 (run22): balanced columns via table-fixed — with auto
                layout, max-w on cells doesn't cap column width, so the table
                grew to ~1312px and pushed Approve/Reject off-screen even at
                1440. Fixed layout makes the table fit its container at desktop
                (no scroll) while min-w-[960px] keeps the ≤768px scroll+hint
                behavior (px column widths act as minimums in fixed layout).
                Tighter py-2 keeps tablet rows compact. */}
            <Table className="min-w-[960px] table-fixed [&_td]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">Title</TableHead>
                  <TableHead className="w-[115px]">Category</TableHead>
                  <TableHead className="w-[220px]">Description</TableHead>
                  <TableHead className="w-[150px]">Submitted</TableHead>
                  <TableHead className="w-[320px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingResources.map((resource) => (
                  <TableRow key={resource.id} data-testid={`row-pending-resource-${resource.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="line-clamp-1 break-words min-w-0" title={resource.title}>{resource.title}</span>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                          aria-label={`Open ${resource.title || resource.url} in a new tab`}
                          data-testid={`link-resource-url-${resource.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 min-w-0">
                        {/* BUG-011 (run22): badge/subcategory truncate on one
                            line (full value in tooltip) so the category cell
                            never drives row height past the tablet budget. */}
                        <Badge variant="outline" className="w-fit max-w-full" title={resource.category}>
                          <span className="truncate">{resource.category}</span>
                        </Badge>
                        {resource.subcategory && (
                          <span className="text-xs text-muted-foreground truncate" title={resource.subcategory}>
                            {resource.subcategory}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* BUG-011 (run22): clamp instead of hard-truncating at 80
                          chars — up to 3 full lines, full text on hover. */}
                      <p className="text-sm text-muted-foreground line-clamp-3" title={resource.description}>
                        {resource.description}
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
                          <span className="flex items-center gap-1 text-muted-foreground min-w-0">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate" title={resource.submittedByEmail ?? resource.submittedBy ?? undefined}>
                              {resource.submittedByEmail ?? resource.submittedBy}
                            </span>
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
                          aria-label={`View details for ${resource.title}`}
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
                          aria-label={`Approve ${resource.title}`}
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
                          aria-label={`Reject ${resource.title}`}
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
          </div>
          {/* R4-011 (run21) + BUG-011 (run22): discoverability hint for the
              contained horizontal scroll — shown whenever the table actually
              overflows (always at ≤768px), not just below the sm breakpoint. */}
          {showSwipeHint && (
            <p className="text-xs text-muted-foreground mt-2" data-testid="hint-swipe-pending-table">
              Swipe the table sideways to see all columns, including Approve/Reject.
            </p>
          )}
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
                {/* BUG-040 (run19): only render a live link when the stored
                    value is actually a well-formed http(s) URL — malformed
                    submissions render as plain text instead of a dead/unsafe
                    clickable anchor. */}
                {/* R4-017: the anchor is a flex container, so raw text becomes a
                    min-width:auto flex item that refuses to wrap — an unbroken
                    1,900-char URL blew the dialog out to ~15,000px. Wrap the URL
                    in a min-w-0 span with overflow-wrap:anywhere so it breaks. */}
                {isSafeHttpUrl(selectedResource.url) ? (
                  <a
                    href={selectedResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1 min-w-0"
                    data-testid="link-detail-url"
                  >
                    <span className="min-w-0 [overflow-wrap:anywhere]">{selectedResource.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p
                    className="text-sm mt-1 break-all text-muted-foreground"
                    data-testid="text-detail-url-invalid"
                  >
                    {selectedResource.url}
                    <span className="ml-2 text-xs">(not a valid URL)</span>
                  </p>
                )}
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
            <div className="bg-muted p-4 rounded-md min-w-0">
              <p className="font-semibold min-w-0 break-words [overflow-wrap:anywhere]">{resourceToApprove.title}</p>
              <p className="text-sm text-muted-foreground mt-1 min-w-0 break-all">{resourceToApprove.url}</p>
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
              <div className="bg-muted p-4 rounded-md min-w-0">
                <p className="font-semibold min-w-0 break-words [overflow-wrap:anywhere]">{resourceToReject.title}</p>
                <p className="text-sm text-muted-foreground mt-1 min-w-0 break-all">{resourceToReject.url}</p>
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
                  {rejectionReason.trim().length}/10 characters minimum
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
