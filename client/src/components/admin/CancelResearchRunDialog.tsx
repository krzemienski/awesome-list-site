import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { describeWriteError } from "@/lib/apiError";

interface CancelResearchRunDialogProps {
  /** The run to cancel; null keeps the dialog closed. */
  jobId: number | null;
  pending: boolean;
  error: unknown;
  onConfirm: (jobId: number) => void;
  onDismiss: () => void;
}

/**
 * Confirmation before cancelling a paid research run, like the enrichment
 * job cancel. It stays open while the cancel is in flight and on failure, so
 * the pending state and any error show where the admin made the choice.
 */
export function CancelResearchRunDialog({ jobId, pending, error, onConfirm, onDismiss }: CancelResearchRunDialogProps) {
  return (
    <AlertDialog open={jobId !== null} onOpenChange={(open) => { if (!open && !pending) onDismiss(); }}>
      <AlertDialogContent data-testid="dialog-cancel-research-run">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel research run #{jobId}?</AlertDialogTitle>
          <AlertDialogDescription>
            The run stops now. Discoveries it already saved stay in the review
            list, and the API cost spent so far is not refunded. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{describeWriteError(error, { outcome: "The run may still be going. Try cancelling again." })}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} data-testid="button-cancel-research-run-dismiss">Keep running</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              if (jobId !== null) onConfirm(jobId);
            }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-cancel-research-run-confirm"
          >
            {pending ? "Cancelling…" : "Cancel run"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
