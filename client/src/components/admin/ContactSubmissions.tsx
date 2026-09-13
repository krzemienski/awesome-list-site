import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/queryClient";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { AdminOpsTable as Table, TableShell } from "@/components/admin/AdminOpsPrimitives";
import "@/styles/pages/admin-ops-users-audit.css";

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

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ContactSubmissionsResponse>({
    queryKey: ["/api/admin/contact-submissions", PAGE_SIZE, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      const response = await fetch(`/api/admin/contact-submissions?${params}`, {
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
    // A missing inbox route is an honest unavailable state, not a transient
    // request failure worth retrying three times.
    retry: (_failureCount, queryError) => errorStatus(queryError) !== 404,
  });

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
        description={`Private inbox · ${total} ${total === 1 ? "message" : "messages"}`}
        className="admin-ops-contact-shell"
      >
        {isError ? (
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
            <div
              className="admin-ops-status-panel"
              role="alert"
              data-testid="alert-contact-submissions-error"
            >
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
              <p className="font-medium mb-1">Couldn&apos;t load contact submissions</p>
              <p className="text-sm text-muted-foreground mb-4">
                The server returned an error while fetching the private inbox. Try again.
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
          )
        ) : (
          <>
            <div className="admin-ops-table-wrap relative">
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden"
                aria-hidden="true"
              />
              <Table className="admin-ops-table admin-ops-contact-table">
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
            <p className="admin-ops-scroll-hint text-xs text-muted-foreground mt-2 sm:hidden">
              Swipe the table sideways to see all columns.
            </p>
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
          if (!open) setSelectedSubmission(null);
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
                  <p data-testid="text-contact-detail-name">{selectedSubmission.name || "—"}</p>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Reply-to</div>
                  <p
                    title={maskEmail(selectedSubmission.replyTo)}
                    data-testid="text-contact-detail-email"
                  >
                    {maskEmail(selectedSubmission.replyTo)}
                  </p>
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