import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatAdminDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Eye, ExternalLink, Calendar, User, FolderTree, RefreshCw, AlertCircle } from "lucide-react";
import type { Resource } from "@shared/schema";
import "./queues-review.css";

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

interface BulkResourceResponse {
  message?: string;
  succeeded: number;
  failed: number;
}

interface BulkResourceOutcome {
  action: "approved" | "rejected";
  requested: number;
  succeeded: number;
  failed: number;
}

// Keep queue bulk requests within the shared API body-array ceiling.
const MAX_BULK_RESOURCE_IDS = 10_000;
const MIN_REJECTION_REASON_LENGTH = 10;

function StatusChip({ status }: { status: "pending" | "approved" | "rejected" }) {
  return (
    <Badge variant="chip" className={`admin-chip queue-review-status queue-review-status--${status}`}>
      {status}
    </Badge>
  );
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
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<number>>(new Set());
  const [bulkApproveIds, setBulkApproveIds] = useState<number[]>([]);
  const [bulkRejectIds, setBulkRejectIds] = useState<number[]>([]);
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState("");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [bulkApproveError, setBulkApproveError] = useState<string | null>(null);
  const [bulkRejectError, setBulkRejectError] = useState<string | null>(null);
  const [bulkOutcome, setBulkOutcome] = useState<BulkResourceOutcome | null>(null);
  // Run17 BUG-027: "Check again" busy/outcome state for the empty view.
  const [recheckState, setRecheckState] = useState<'idle' | 'checking' | 'checked'>('idle');

  // BUG-011 (run22): the swipe hint must appear whenever the table actually
  // overflows its scrollport (which is always the case at ≤768px, where the
  // 720px min-width table exceeds the content area) — the previous `sm:hidden`
  // class hid it between 640–768px even though the table still scrolled.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<PendingResourcesResponse>({
    queryKey: ['/api/admin/pending-resources'],
    refetchInterval: 10000
  });

  const pendingResourceData = data?.resources;
  const pendingResources = useMemo(
    () => pendingResourceData ?? [],
    [pendingResourceData],
  );
  const totalPending = data?.total ?? 0;
  const pendingResourceIds = useMemo(
    () => pendingResources.map((resource) => resource.id),
    [pendingResources],
  );
  const selectedPendingResourceIds = pendingResourceIds.filter((id) => selectedResourceIds.has(id));
  const allResourcesSelected = pendingResources.length > 0 && selectedPendingResourceIds.length === pendingResources.length;

  useEffect(() => {
    setSelectedResourceIds((previous) => {
      const next = new Set(previous);
      for (const id of previous) {
        if (!pendingResourceIds.includes(id)) next.delete(id);
      }
      return next.size === previous.size ? previous : next;
    });
  }, [pendingResourceIds]);

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
      setApproveDialogOpen(false);
      setResourceToApprove(null);
      setApproveError(null);
      toast({
        title: "Resource Approved",
        description: "The resource has been approved and added to the public catalog.",
      });
    },
    onError: (error: Error) => {
      setApproveError(error.message || "Failed to approve resource. Please try again.");
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
      setRejectDialogOpen(false);
      setResourceToReject(null);
      setRejectionReason("");
      setRejectError(null);
      toast({
        title: "Resource Rejected",
        description: "The resource has been rejected.",
      });
    },
    onError: (error: Error) => {
      setRejectError(error.message || "Failed to reject resource. Please try again.");
    }
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: number[]): Promise<BulkResourceResponse> => {
      if (ids.length > MAX_BULK_RESOURCE_IDS) {
        throw new Error(`Select no more than ${MAX_BULK_RESOURCE_IDS.toLocaleString()} resources at a time.`);
      }
      return await apiRequest('/api/admin/resources/bulk/approve', {
        method: 'POST',
        body: JSON.stringify({ ids })
      }) as BulkResourceResponse;
    },
    onSuccess: (response, ids) => {
      const outcome = {
        action: "approved" as const,
        requested: ids.length,
        succeeded: response.succeeded,
        failed: response.failed
      };
      setBulkOutcome(outcome);
      setSelectedResourceIds(new Set());
      setBulkApproveDialogOpen(false);
      setBulkApproveIds([]);
      setBulkApproveError(null);
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: response.failed > 0 ? "Bulk approval completed with failures" : "Resources Approved",
        description: `${response.succeeded} approved${response.failed > 0 ? `, ${response.failed} failed` : ""}.`,
        variant: response.failed > 0 ? "destructive" : undefined
      });
    },
    onError: (error: Error) => {
      setBulkApproveError(error.message || "Failed to approve selected resources. Please try again.");
    }
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: number[]; reason: string }): Promise<BulkResourceResponse> => {
      if (ids.length > MAX_BULK_RESOURCE_IDS) {
        throw new Error(`Select no more than ${MAX_BULK_RESOURCE_IDS.toLocaleString()} resources at a time.`);
      }
      if (reason.trim().length < MIN_REJECTION_REASON_LENGTH) {
        throw new Error(`Rejection reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters.`);
      }
      return await apiRequest('/api/admin/resources/bulk/reject', {
        method: 'POST',
        body: JSON.stringify({ ids, reason })
      }) as BulkResourceResponse;
    },
    onSuccess: (response, variables) => {
      const outcome = {
        action: "rejected" as const,
        requested: variables.ids.length,
        succeeded: response.succeeded,
        failed: response.failed
      };
      setBulkOutcome(outcome);
      setSelectedResourceIds(new Set());
      setBulkRejectDialogOpen(false);
      setBulkRejectIds([]);
      setBulkRejectionReason("");
      setBulkRejectError(null);
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-resources'] });
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: response.failed > 0 ? "Bulk rejection completed with failures" : "Resources Rejected",
        description: `${response.succeeded} rejected${response.failed > 0 ? `, ${response.failed} failed` : ""}.`,
        variant: response.failed > 0 ? "destructive" : undefined
      });
    },
    onError: (error: Error) => {
      setBulkRejectError(error.message || "Failed to reject selected resources. Please try again.");
    }
  });

  const handleViewDetails = (resource: Resource) => {
    setSelectedResource(resource);
    setViewDetailsOpen(true);
  };

  const handleApproveClick = (resource: Resource) => {
    setApproveError(null);
    setResourceToApprove(resource);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (resource: Resource) => {
    setRejectError(null);
    setResourceToReject(resource);
    setRejectDialogOpen(true);
  };

  const handleApproveConfirm = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (resourceToApprove) {
      approveMutation.mutate(resourceToApprove.id);
    }
  };

  const handleRejectConfirm = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (resourceToReject && rejectionReason.trim().length >= MIN_REJECTION_REASON_LENGTH) {
      rejectMutation.mutate({
        resourceId: resourceToReject.id,
        reason: rejectionReason.trim()
      });
    } else {
      setRejectError(`Rejection reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters.`);
    }
  };

  const toggleResourceSelection = (resourceId: number, checked: boolean) => {
    setSelectedResourceIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(resourceId);
      else next.delete(resourceId);
      return next;
    });
  };

  const toggleAllResources = (checked: boolean) => {
    setSelectedResourceIds(checked ? new Set(pendingResourceIds) : new Set());
  };

  const openBulkApproveDialog = () => {
    const ids = selectedPendingResourceIds.length > 0 ? selectedPendingResourceIds : pendingResourceIds;
    if (ids.length === 0) return;
    setBulkApproveError(
      ids.length > MAX_BULK_RESOURCE_IDS
        ? `Select no more than ${MAX_BULK_RESOURCE_IDS.toLocaleString()} resources at a time.`
        : null,
    );
    setBulkApproveIds(ids);
    setBulkApproveDialogOpen(true);
  };

  const openBulkRejectDialog = () => {
    if (selectedPendingResourceIds.length === 0) return;
    setBulkRejectError(
      selectedPendingResourceIds.length > MAX_BULK_RESOURCE_IDS
        ? `Select no more than ${MAX_BULK_RESOURCE_IDS.toLocaleString()} resources at a time.`
        : null,
    );
    setBulkRejectIds(selectedPendingResourceIds);
    setBulkRejectDialogOpen(true);
  };

  const handleBulkRejectConfirm = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (
      bulkRejectIds.length > 0 &&
      bulkRejectIds.length <= MAX_BULK_RESOURCE_IDS &&
      bulkRejectionReason.trim().length >= MIN_REJECTION_REASON_LENGTH
    ) {
      bulkRejectMutation.mutate({
        ids: bulkRejectIds,
        reason: bulkRejectionReason.trim()
      });
    } else {
      setBulkRejectError(
        bulkRejectIds.length > MAX_BULK_RESOURCE_IDS
          ? `Select no more than ${MAX_BULK_RESOURCE_IDS.toLocaleString()} resources at a time.`
          : `Rejection reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters.`,
      );
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

  if (isError) {
    return (
      <section className="admin-panel queue-review-shell" aria-label="Approvals">
        <div className="admin-panel__heading queue-review-shell-heading"><h2>Approvals</h2></div>
        <div className="queue-review-empty" role="alert" data-testid="pending-resources-load-error">
          <p>Unable to load pending resources. The queue may still contain items awaiting review.</p>
          <Button onClick={() => void refetch()} disabled={isFetching} data-testid="pending-resources-retry">
            {isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="admin-panel queue-review-shell" aria-labelledby="pending-resources-heading">
        <div className="admin-panel__heading queue-review-shell-heading">
          <div>
            <h2 id="pending-resources-heading">Pending Approvals</h2>
            <p>Resources awaiting admin review</p>
          </div>
        </div>
        <div className="queue-review-loading-table" aria-label="Loading pending approvals">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="queue-review-loading-row" key={i}>
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (totalPending === 0) {
    return (
      <section className="admin-panel queue-review-shell" aria-labelledby="pending-resources-heading">
        <div className="admin-panel__heading queue-review-shell-heading">
          <div>
            <h2 id="pending-resources-heading">Pending approvals</h2>
            <p>0 submissions awaiting review</p>
          </div>
          <div className="queue-review-actions">
            <button type="button" className="btn ghost" disabled>Bulk reject</button>
            <button type="button" className="btn primary" disabled>Approve all</button>
            <Button
              variant="ghost"
              size="sm"
              className="queue-review-extra-action"
              disabled={recheckState === 'checking'}
              onClick={() => {
                setRecheckState('checking');
                void queryClient
                  .invalidateQueries({ queryKey: ['/api/admin/pending-resources'] })
                  .then(() => setRecheckState('checked'), () => setRecheckState('checked'));
              }}
              data-testid="button-refresh-pending-resources"
            >
              <RefreshCw className={`h-3 w-3 mr-2 ${recheckState === 'checking' ? 'animate-spin' : ''}`} />
              {recheckState === 'checking' ? 'Checking…' : 'Check again'}
            </Button>
          </div>
        </div>
        {bulkOutcome && (
          <div className={`queue-review-result ${bulkOutcome.failed > 0 ? "queue-review-result--error" : ""}`} role={bulkOutcome.failed > 0 ? "alert" : "status"} data-testid="bulk-result-resources">
            <strong>{bulkOutcome.action === "approved" ? "Bulk approval" : "Bulk rejection"} complete.</strong>
            <span>{bulkOutcome.succeeded} succeeded · {bulkOutcome.failed} failed · {bulkOutcome.requested} requested</span>
          </div>
        )}
        <div className="admin-table-wrap">
          <table className="table">
            <thead><tr><th>Title</th><th>Category</th><th>Submitted by</th><th>When</th><th /></tr></thead>
          </table>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {recheckState === 'checked' ? 'Checked — still no pending resources.' : ''}
        </span>
      </section>
    );
  }

  return (
    <>
      <section className="admin-panel queue-review-shell" aria-labelledby="pending-resources-heading">
        <div className="admin-panel__heading queue-review-shell-heading">
          <div>
            <h2 id="pending-resources-heading" className="queue-review-title">
              Pending Approvals
              <Badge variant="accent" className="queue-review-count">{totalPending}</Badge>
            </h2>
            <p>{totalPending} submissions awaiting review</p>
          </div>
          <div className="queue-review-actions" role="toolbar" aria-label="Pending approval actions">
            <Button
              variant="destructive"
              size="sm"
              onClick={openBulkRejectDialog}
              disabled={selectedPendingResourceIds.length === 0 || bulkRejectMutation.isPending || bulkApproveMutation.isPending}
              data-testid="button-bulk-reject"
            >
              Bulk reject{selectedPendingResourceIds.length > 0 ? ` (${selectedPendingResourceIds.length})` : ""}
            </Button>
            <Button
              size="sm"
              className={"bg-[#34d08c] text-black hover:bg-[#34d08c]/90" /* DS-OK: status ok */}
              onClick={openBulkApproveDialog}
              disabled={pendingResources.length === 0 || bulkApproveMutation.isPending || bulkRejectMutation.isPending}
              data-testid="button-bulk-approve"
            >
              {selectedPendingResourceIds.length > 0 ? `Approve selected (${selectedPendingResourceIds.length})` : "Approve all"}
            </Button>
          </div>
        </div>
        {bulkOutcome && (
          <div className={`queue-review-result ${bulkOutcome.failed > 0 ? "queue-review-result--error" : ""}`} role={bulkOutcome.failed > 0 ? "alert" : "status"} data-testid="bulk-result-resources">
            <strong>{bulkOutcome.action === "approved" ? "Bulk approval" : "Bulk rejection"} complete.</strong>
            <span>{bulkOutcome.succeeded} succeeded · {bulkOutcome.failed} failed · {bulkOutcome.requested} requested</span>
          </div>
        )}
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
              className="admin-table-wrap queue-review-table-wrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
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
            <Table className="queue-review-table queue-review-table--resources min-w-[960px] table-fixed [&_td]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="queue-review-select-cell">
                    <Checkbox
                      checked={allResourcesSelected ? true : selectedPendingResourceIds.length > 0 ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleAllResources(checked === true)}
                      aria-label="Select all pending resources"
                      data-testid="checkbox-select-all-pending-resources"
                    />
                  </TableHead>
                  <TableHead className="w-[170px]">Title</TableHead>
                  <TableHead className="w-[115px]">Category</TableHead>
                  <TableHead className="w-[220px]">Description</TableHead>
                  <TableHead className="w-[150px]">Submitted</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[320px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingResources.map((resource) => (
                  <TableRow key={resource.id} data-testid={`row-pending-resource-${resource.id}`}>
                    <TableCell className="queue-review-select-cell">
                      <Checkbox
                        checked={selectedResourceIds.has(resource.id)}
                        onCheckedChange={(checked) => toggleResourceSelection(resource.id, checked === true)}
                        aria-label={`Select ${resource.title}`}
                        data-testid={`checkbox-pending-resource-${resource.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="line-clamp-1 break-words min-w-0" title={resource.title}>{resource.title}</span>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] shrink-0 text-muted-foreground hover:text-primary"
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
                    <TableCell>
                      <StatusChip status="pending" />
                    </TableCell>
                    <TableCell className="queue-review-action-cell text-right">
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
                          className={"bg-[#34d08c] text-black hover:bg-[#34d08c]/90" /* DS-OK: status ok */}
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
      </section>

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
      <AlertDialog open={approveDialogOpen} onOpenChange={(open) => {
        setApproveDialogOpen(open);
        if (!open) setApproveError(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this resource? It will be added to the public catalog.
              You can manually sync it to GitHub later using the GitHub Sync panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
           {approveError && (
             <Alert variant="destructive" data-testid="error-approve-dialog">
               <AlertCircle className="h-4 w-4" />
               <AlertDescription>{approveError}</AlertDescription>
             </Alert>
           )}
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
              className={"bg-[#34d08c] text-black hover:bg-[#34d08c]/90" /* DS-OK: status ok */}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
       <AlertDialog open={rejectDialogOpen} onOpenChange={(open) => {
         setRejectDialogOpen(open);
         if (!open) setRejectError(null);
       }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Resource?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this resource (minimum {MIN_REJECTION_REASON_LENGTH} characters).
              This message is shown to the contributor, so keep it factual and do not include internal notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
           {rejectError && (
             <Alert variant="destructive" data-testid="error-reject-dialog">
               <AlertCircle className="h-4 w-4" />
               <AlertDescription>{rejectError}</AlertDescription>
             </Alert>
           )}
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
                   {rejectionReason.trim().length}/{MIN_REJECTION_REASON_LENGTH} characters minimum · visible to the contributor
                </p>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setRejectionReason("");
                setRejectError(null);
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
               disabled={rejectMutation.isPending || rejectionReason.trim().length < MIN_REJECTION_REASON_LENGTH}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* Bulk Approve Confirmation Dialog */}
       <AlertDialog open={bulkApproveDialogOpen} onOpenChange={(open) => {
         setBulkApproveDialogOpen(open);
         if (!open) setBulkApproveError(null);
       }}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Approve pending resources?</AlertDialogTitle>
             <AlertDialogDescription>
               This will approve {bulkApproveIds.length} pending {bulkApproveIds.length === 1 ? "resource" : "resources"} and add them to the public catalog.
             </AlertDialogDescription>
           </AlertDialogHeader>
           {bulkApproveError && (
             <Alert variant="destructive" data-testid="error-bulk-approve-dialog">
               <AlertCircle className="h-4 w-4" />
               <AlertDescription>{bulkApproveError}</AlertDescription>
             </Alert>
           )}
           <AlertDialogFooter>
             <AlertDialogCancel data-testid="button-cancel-bulk-approve">Cancel</AlertDialogCancel>
             <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  bulkApproveMutation.mutate(bulkApproveIds);
                }}
                disabled={
                  bulkApproveMutation.isPending ||
                  bulkApproveIds.length === 0 ||
                  bulkApproveIds.length > MAX_BULK_RESOURCE_IDS
                }
               className={"bg-[#34d08c] text-black hover:bg-[#34d08c]/90" /* DS-OK: status ok */}
               data-testid="button-confirm-bulk-approve"
             >
               {bulkApproveMutation.isPending ? "Approving..." : `Approve ${bulkApproveIds.length}`}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

       {/* Bulk Reject Dialog */}
       <Dialog open={bulkRejectDialogOpen} onOpenChange={(open) => {
         setBulkRejectDialogOpen(open);
         if (!open) {
           setBulkRejectError(null);
           setBulkRejectionReason("");
         }
       }}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Reject pending resources?</DialogTitle>
             <DialogDescription>
               Provide a reason for rejecting {bulkRejectIds.length} pending {bulkRejectIds.length === 1 ? "resource" : "resources"}. This message is shown to contributors.
             </DialogDescription>
           </DialogHeader>
           {bulkRejectError && (
             <Alert variant="destructive" data-testid="error-bulk-reject-dialog">
               <AlertCircle className="h-4 w-4" />
               <AlertDescription>{bulkRejectError}</AlertDescription>
             </Alert>
           )}
           <div className="space-y-2">
             <Label htmlFor="bulk-rejection-reason">Rejection Reason *</Label>
             <Textarea
               id="bulk-rejection-reason"
               placeholder="Explain why these resources are being rejected..."
               value={bulkRejectionReason}
               onChange={(event) => setBulkRejectionReason(event.target.value)}
               className="min-h-[100px]"
               data-testid="textarea-bulk-rejection-reason"
             />
             <p className="text-xs text-muted-foreground">
                  {bulkRejectionReason.trim().length}/{MIN_REJECTION_REASON_LENGTH} characters minimum · visible to contributors
             </p>
           </div>
           <DialogFooter>
             <Button
               variant="outline"
               onClick={() => setBulkRejectDialogOpen(false)}
               data-testid="button-cancel-bulk-reject"
             >
               Cancel
             </Button>
             <Button
               variant="destructive"
               onClick={handleBulkRejectConfirm}
                disabled={
                  bulkRejectMutation.isPending ||
                  bulkRejectionReason.trim().length < MIN_REJECTION_REASON_LENGTH ||
                  bulkRejectIds.length === 0 ||
                  bulkRejectIds.length > MAX_BULK_RESOURCE_IDS
                }
               data-testid="button-confirm-bulk-reject"
             >
               {bulkRejectMutation.isPending ? "Rejecting..." : `Reject ${bulkRejectIds.length}`}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </>
  );
}
