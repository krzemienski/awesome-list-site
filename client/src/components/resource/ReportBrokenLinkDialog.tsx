import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Resource } from "@shared/schema";

interface ReportBrokenLinkDialogProps {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportBrokenLinkDialog({
  resource,
  open,
  onOpenChange
}: ReportBrokenLinkDialogProps) {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const reportMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/resources/${resource.id}/report-broken`, {
        method: "POST",
        credentials: 'include'
      });
    },
    onSuccess: () => {
      setIsSuccess(true);

      // Invalidate resource queries to refresh link health data
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resource.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });

      toast({
        title: "Report submitted",
        description: "Thank you for reporting this broken link. Our team will review it shortly.",
        duration: 4000
      });

      // Auto-close dialog after showing success state
      setTimeout(() => {
        setIsSuccess(false);
        onOpenChange(false);
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      });

      console.error("Report broken link error:", error);
    }
  });

  const handleSubmit = () => {
    reportMutation.mutate();
  };

  const handleCancel = () => {
    if (!reportMutation.isPending) {
      setIsSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Report Submitted
              </DialogTitle>
              <DialogDescription>
                Thank you for helping keep our resources up to date!
              </DialogDescription>
            </DialogHeader>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Report Broken Link
              </DialogTitle>
              <DialogDescription>
                Are you sure this link is broken or not working correctly?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="text-sm font-medium">{resource.title}</div>
                <div className="text-xs text-muted-foreground break-all">
                  {resource.url}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Your report will be reviewed by our team. If the link is confirmed to be broken,
                we'll update or remove this resource.
              </p>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={reportMutation.isPending}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={reportMutation.isPending}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0"
              >
                {reportMutation.isPending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Broken Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
