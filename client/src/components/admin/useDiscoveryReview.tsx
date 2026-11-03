import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OK_SOLID_BUTTON } from "./researchDisplay";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { describeWriteError } from "@/lib/apiError";
import { sanitizeDisplay } from "@/lib/sanitize-display";

export interface ApproveTarget { id: number; title: string; url: string }

/**
 * Approve / reject one research discovery through the existing review
 * endpoints, plus the approve-confirmation and reject-reason dialogs. Shared by the run view (review in
 * place at the end of a run) and the pending-review table.
 */
export function useDiscoveryReview(onReviewed?: (discoveryId: number) => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [approveTarget, setApproveTarget] = useState<ApproveTarget | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  // The row's buttons unmount once it is reviewed; the dialog must not try to
  // return focus to them.
  const reviewedRef = useRef<number | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["/api/researcher/discoveries"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/researcher/jobs"] });
  };

  const approve = useMutation({
    mutationFn: async (discoveryId: number) => {
      await apiRequest(`/api/researcher/discoveries/${discoveryId}/approve`, { method: "POST" });
    },
    onSuccess: (_data, discoveryId) => {
      invalidate();
      reviewedRef.current = discoveryId;
      setApproveTarget(null);
      onReviewed?.(discoveryId);
      toast({ title: "Resource approved", description: "Discovery added to the database." });
    },
    onError: (error) => {
      setApproveTarget(null);
      toast({ title: "Failed to approve", description: describeWriteError(error), variant: "destructive" });
    },
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason: why }: { id: number; reason?: string }) => {
      await apiRequest(`/api/researcher/discoveries/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: why }) });
    },
    onSuccess: (_data, { id }) => {
      invalidate();
      reviewedRef.current = id;
      setRejectId(null);
      setReason("");
      toast({ title: "Discovery rejected" });
    },
    // The dialog stays mounted on failure so its inline error remains visible
    // and the operator can retry without a toast remount.
  });

  const restoreFocus = (event: Event) => {
    const id = reviewedRef.current;
    reviewedRef.current = null;
    if (id !== null && onReviewed) {
      event.preventDefault();
      onReviewed(id);
    }
  };

  const approveDialog = (
    <AlertDialog open={approveTarget !== null} onOpenChange={(open) => { if (!open && !approve.isPending) setApproveTarget(null); }}>
      <AlertDialogContent className="queues-agent__dialog" onCloseAutoFocus={restoreFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve and publish this discovery?</AlertDialogTitle>
          <AlertDialogDescription>
            This publishes the discovery as a live public resource. Removing it afterwards means deleting the resource.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {approveTarget && (
          <div className="min-w-0 rounded border p-2 text-sm" data-testid="text-approve-discovery-target">
            <p className="break-words font-medium">{sanitizeDisplay(approveTarget.title)}</p>
            <p className="break-all text-xs text-muted-foreground">{sanitizeDisplay(approveTarget.url)}</p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11" data-testid="button-cancel-approve-discovery" disabled={approve.isPending}>Cancel</AlertDialogCancel>
          <Button
            className={`min-h-11 ${OK_SOLID_BUTTON}`}
            data-testid="button-confirm-approve-discovery"
            disabled={approve.isPending}
            onClick={() => { if (approveTarget) approve.mutate(approveTarget.id); }}
          >
            {approve.isPending ? "Approving…" : "Approve and publish"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const close = () => {
    if (reject.isPending) return;
    setRejectId(null);
    setReason("");
    reject.reset();
  };

  const rejectDialog = (
    <Dialog open={rejectId !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent
        className="queues-agent__dialog"
        onCloseAutoFocus={restoreFocus}
      >
        <DialogHeader>
          <DialogTitle>Reject Discovery</DialogTitle>
          <DialogDescription>
            Mark this discovered resource as rejected. Optionally include a reason for the audit trail.
          </DialogDescription>
        </DialogHeader>
        {reject.isError && (
          <Alert variant="destructive" className="queues-agent__inline-error">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{describeWriteError(reject.error)}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          <div>
            <Label htmlFor="research-reject-reason">Reason (optional)</Label>
            <Textarea
              id="research-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this resource being rejected?"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={reject.isPending}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { if (rejectId !== null) reject.mutate({ id: rejectId, reason: reason || undefined }); }}
              disabled={reject.isPending}
              data-testid="button-confirm-reject-discovery"
            >
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { approve, requestApprove: setApproveTarget, approveDialog, requestReject: setRejectId, rejectDialog };
}
