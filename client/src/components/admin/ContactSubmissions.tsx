import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/queryClient";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronLeft, ChevronRight, Eye, EyeOff, RefreshCw } from "lucide-react";
import { AdminOpsTable as Table, TableShell } from "@/components/admin/AdminOpsPrimitives";
import { AdminLoadError } from "@/components/admin/AdminLoadError";
import "@/styles/pages/admin-ops-users-audit.css";
import { apiFetch } from "@/lib/api-fetch";
import { queryUnavailableReason } from "@/lib/query-availability";

interface ContactSubmission {
  id: string;
  name: string;
  replyTo: string;
  subject: string;
  message: string;
  createdAt: string | Date;
}

interface ContactSubmissionsResponse {
  submissions: ContactSubmission[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 20;

function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "••••••";
  return `${email[0]}•••${email.slice(at)}`;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorStatus(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

export default function ContactSubmissions() {
  const [offset, setOffset] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  // Reply-to stays masked until an admin explicitly reveals it for the open submission.
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const submissionsQuery = useQuery<ContactSubmissionsResponse>({
    queryKey: ["/api/admin/contact-submissions", PAGE_SIZE, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      const response = await apiFetch(`/api/admin/contact-submissions?${params}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new ApiError(response.status, "Failed to fetch contact submissions");
      }
      return (await response.json()) as ContactSubmissionsResponse;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // No local retry override: the global policy retries only short 429s.
    // The old predicate (retry unless 404) returned true forever, so a 5xx
    // kept the skeleton on screen instead of ever reaching the error state.
  });
  const { data, isLoading, error, refetch, isFetching } = submissionsQuery;
  // A fetch started offline is paused, not failed (sweep NEW-002).
  const unavailable = queryUnavailableReason(submissionsQuery);

  const pageSize = data?.limit ?? PAGE_SIZE;
  const total = data?.total ?? 0;
  const currentOffset = data?.offset ?? offset;
  const hasPreviousPage = currentOffset > 0;
  const hasNextPage = currentOffset + pageSize < total;

  if (isLoading) {
    return (
      <div data-testid="contact-submissions-shell">
        <TableShell
          title={<Skeleton className="h-5 w-44" />}
          className="admin-ops-contact-shell"
        >
          <div className="admin-ops-loading space-y-4">
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
          </div>
        </TableShell>
      </div>
    );
  }

  return (
    <div data-testid="contact-submissions-shell">
      <TableShell
        title="Contact submissions"
        description={data ? `Private inbox · ${total} ${total === 1 ? "message" : "messages"}` : "Private inbox"}
        className="admin-ops-contact-shell"
      >
        {unavailable ? (
          errorStatus(error) === 404 ? (
            <div
              className="admin-ops-status-panel"
              role="status"
              data-testid="alert-contact-submissions-not-found"
            >
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-1">Contact inbox unavailable</p>
              <p className="text-sm text-muted-foreground mb-4">
                The contact submissions endpoint returned 404. No inbox data is available.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { void refetch(); }}
                disabled={isFetching}
                data-testid="button-contact-submissions-retry"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Try again
              </Button>
            </div>
          ) : (
            <AdminLoadError
              subject="contact submissions"
              error={error}
              note={unavailable === "offline" ? "You're offline; it will load when your connection returns." : undefined}
              onRetry={() => { void refetch(); }}
              retrying={isFetching}
              testId="alert-contact-submissions-error"
              retryTestId="button-contact-submissions-retry"
            />
          )
        ) : (
          <>
            <div className="admin-ops-table-wrap relative">
              <Table className="admin-ops-table admin-ops-contact-table" scrollLabel="Contact submissions table, scrollable">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Reply-to</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.submissions && data.submissions.length > 0 ? (
                    data.submissions.map((submission) => {
                      const maskedEmail = maskEmail(submission.replyTo);
                      return (
                        <TableRow
                          key={submission.id}
                          className="admin-ops-clickable-row cursor-pointer"
                          onClick={() => setSelectedSubmission(submission)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedSubmission(submission);
                            }
                          }}
                          tabIndex={0}
                          aria-label={`View contact submission from ${submission.name || maskedEmail}`}
                          data-testid={`row-contact-submission-${submission.id}`}
                        >
                          <TableCell className="admin-ops-cell-name max-w-[220px] truncate" title={submission.name}>
                            {submission.name || "—"}
                          </TableCell>
                          <TableCell className="admin-ops-cell-email">
                            <span
                              title={maskedEmail}
                              aria-label={`Reply-to email ${maskedEmail}`}
                              data-testid={`text-contact-email-${submission.id}`}
                            >
                              {maskedEmail}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate" title={submission.subject}>
                            {submission.subject || "—"}
                          </TableCell>
                          <TableCell className="admin-ops-cell-joined whitespace-nowrap">
                            {formatDate(submission.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground" data-testid="text-contact-submissions-empty">
                        No contact submissions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {total > 0 && (
              <div className="admin-ops-pagination flex flex-wrap items-center justify-between gap-3 pt-4">
                <p className="text-sm text-muted-foreground" data-testid="text-contact-submissions-range">
                  {currentOffset + 1}–{Math.min(currentOffset + (data?.submissions.length ?? 0), total)} of{" "}
                  {total.toLocaleString()} submissions
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasPreviousPage || isFetching}
                    onClick={() => setOffset(Math.max(0, currentOffset - pageSize))}
                    aria-label="Previous contact submissions page"
                    data-testid="button-contact-submissions-prev"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage || isFetching}
                    onClick={() => setOffset(currentOffset + pageSize)}
                    aria-label="Next contact submissions page"
                    data-testid="button-contact-submissions-next"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      <Dialog
        open={!!selectedSubmission}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSubmission(null);
            setRevealedId(null);
          }
        }}
      >
        <DialogContent className="admin-ops-contact-dialog max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact submission</DialogTitle>
            <DialogDescription>
              {selectedSubmission ? `Received ${formatDate(selectedSubmission.createdAt)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="admin-ops-contact-detail space-y-4 text-sm">
              <div className="admin-ops-contact-detail-grid">
                <div>
                  <div className="text-muted-foreground mb-1">Name</div>
                  <p className="[overflow-wrap:anywhere]" data-testid="text-contact-detail-name">{selectedSubmission.name || "—"}</p>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Reply-to</div>
                  <div className="flex min-w-0 items-center gap-1.5">
                    {revealedId === selectedSubmission.id ? (
                      <a
                        href={`mailto:${selectedSubmission.replyTo}?subject=${encodeURIComponent(`Re: ${selectedSubmission.subject}`)}`}
                        className="min-w-0 break-all underline underline-offset-4"
                        data-testid="text-contact-detail-email"
                      >
                        {selectedSubmission.replyTo}
                      </a>
                    ) : (
                      <p className="min-w-0 break-all" data-testid="text-contact-detail-email">
                        {maskEmail(selectedSubmission.replyTo)}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setRevealedId(revealedId === selectedSubmission.id ? null : selectedSubmission.id)}
                      aria-label={revealedId === selectedSubmission.id ? "Mask reply-to email" : "Reveal reply-to email"}
                      data-testid="button-contact-detail-reveal"
                    >
                      {revealedId === selectedSubmission.id ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Subject</div>
                <p className="break-words" data-testid="text-contact-detail-subject">
                  {selectedSubmission.subject || "—"}
                </p>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Message</div>
                <p className="whitespace-pre-wrap break-words" data-testid="text-contact-detail-message">
                  {selectedSubmission.message || "—"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </TableShell>
    </div>
  );
}