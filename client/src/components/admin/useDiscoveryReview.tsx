import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { describeWriteError } from "@/lib/apiError";

/**
 * Approve / reject one research discovery through the existing review
 * endpoints, plus the reject-reason dialog. Shared by the run view (review in
 * place at the end of a run) and the pending-review table.
 */
export function useDiscoveryReview(onReviewed?: (discoveryId: number) => void) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      onReviewed?.(discoveryId);
      toast({ title: "Resource approved", description: "Discovery added to the database." });
    },
    onError: (error) => {
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
        onCloseAutoFocus={(event) => {
          const id = reviewedRef.current;
          reviewedRef.current = null;
          if (id !== null && onReviewed) {
            event.preventDefault();
            onReviewed(id);
          }
        }}
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

  return { approve, requestReject: setRejectId, rejectDialog };
}
