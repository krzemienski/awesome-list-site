import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ToastActionElement } from "@/components/ui/toast";

const NOTE_MAX = 500;

interface LinkReport {
  status: "open" | "resolved" | "dismissed";
  note: string | null;
  createdAt: string;
  handledAt: string | null;
}

interface ReportLinkActionProps {
  resourceId: number;
  resourceTitle: string;
  isAuthenticated: boolean;
  /** Toast action that sends a guest to sign-in and back to this page. */
  signInAction: ToastActionElement;
}

export default function ReportLinkAction({
  resourceId,
  resourceTitle,
  isAuthenticated,
  signInAction,
}: ReportLinkActionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const queryKey = [`/api/resources/${resourceId}/link-report`];

  const { data } = useQuery<{ report: LinkReport | null }>({
    queryKey,
    enabled: isAuthenticated,
  });
  const reported = data?.report?.status === "open";

  const submit = useMutation({
    mutationFn: () =>
      apiRequest(`/api/resources/${resourceId}/link-report`, {
        method: "POST",
        body: JSON.stringify(note.trim() ? { note: note.trim() } : {}),
      }) as Promise<{ alreadyReported: boolean; report: LinkReport }>,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, { report: result.report });
      setOpen(false);
      setNote("");
      toast({
        title: result.alreadyReported ? "Already reported" : "Thanks — link reported",
        description: "A maintainer will check the link and fix or remove the resource.",
      });
    },
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in to report a broken link",
        description: "Create an account or sign in so maintainers can follow up on your report.",
        action: signInAction,
      });
      return;
    }
    if (reported) {
      toast({
        title: "You already reported this link",
        description: "A maintainer will check it. You can report it again after they've handled it.",
      });
      return;
    }
    submit.reset();
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        data-testid="button-report-link"
        className="min-h-[44px] px-4"
        aria-pressed={reported || undefined}
      >
        <Flag className={`h-4 w-4 mr-2 ${reported ? "fill-current" : ""}`} aria-hidden="true" />
        <span>{reported ? "Link reported" : "Report broken link"}</span>
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!submit.isPending) setOpen(next); }}>
        <DialogContent className="sm:max-w-[425px]" data-testid="dialog-report-link">
          <DialogHeader>
            <DialogTitle>Report a broken link</DialogTitle>
            <DialogDescription>
              Tell the maintainers that the link for “{resourceTitle}” no longer works.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!submit.isPending && note.length <= NOTE_MAX) submit.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="report-link-note">What happened? (optional)</Label>
              <Textarea
                id="report-link-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={NOTE_MAX}
                rows={3}
                placeholder="e.g. 404 page, domain expired, video removed"
                data-testid="input-report-link-note"
              />
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {note.length}/{NOTE_MAX}
              </p>
            </div>
            {submit.isError && (
              <p role="alert" className="text-sm text-destructive" data-testid="report-link-error">
                {submit.error instanceof Error ? submit.error.message : "The report could not be sent."}{" "}
                Please try again.
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submit.isPending}>
                Cancel
              </Button>
              <Button
                type="submit"
                aria-disabled={submit.isPending}
                aria-busy={submit.isPending}
                data-testid="button-submit-report-link"
              >
                {submit.isPending ? "Sending…" : "Send report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
