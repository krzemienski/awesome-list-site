import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ResearchJob } from "@shared/schema";
import { ApiError } from "@/lib/queryClient";
import { formatRelativeAgo } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RESEARCH_WORKSPACE_LIMIT = 4;

/** Mirror of the frozen note card: title, candidate count, freshness. */
function toResearchNote(job: ResearchJob, now = Date.now()) {
  const active = job.status === "pending" || job.status === "processing";
  const brief = job.prompt?.trim() || `Research job #${job.id}`;
  const firstLine = brief.split(/\r?\n/).find((line) => line.trim())?.trim() || brief;
  const title = firstLine.length > 76 ? `${firstLine.slice(0, 73).trimEnd()}…` : firstLine;
  const excerptText = brief.replace(/\s+/g, " ").trim();
  const excerpt = excerptText.length > 156 ? `${excerptText.slice(0, 153).trimEnd()}…` : excerptText;
  return {
    id: job.id,
    title,
    excerpt,
    brief,
    candidates: job.totalDiscoveries ?? 0,
    freshness: active ? "Active" : formatRelativeAgo(job.completedAt ?? job.startedAt ?? job.createdAt, now),
  };
}

/**
 * The Research workspace binds the frozen design's note cards to the latest
 * researcher jobs: one note per job, its discovery count as "candidates", and
 * "Active" while the agent is still running. An empty job list renders an
 * empty grid rather than invented notes.
 */
export function ResearchWorkspace() {
  const [selectedJob, setSelectedJob] = useState<ResearchJob | null>(null);
  const noteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const { data, isError, isLoading } = useQuery<{ jobs: ResearchJob[]; total: number }>({
    queryKey: ["/api/researcher/jobs", { limit: RESEARCH_WORKSPACE_LIMIT }],
    queryFn: async () => {
      const res = await fetch(`/api/researcher/jobs?limit=${RESEARCH_WORKSPACE_LIMIT}`, { credentials: "include" });
      if (!res.ok) throw new ApiError(res.status, `${res.status}: ${await res.text()}`);
      return res.json();
    },
    staleTime: 30_000,
  });
  const notes = (data?.jobs ?? []).map((job) => toResearchNote(job));

  return (
    <section className="admin-research-panel" aria-labelledby="admin-research-heading" data-testid="research-review-panel">
      <div className="card admin-research-workspace">
        <h2 id="admin-research-heading">Research workspace</h2>
        <p>Drafts, notes, and research-in-progress. Promote to &quot;Approvals&quot; once ready.</p>
        {isError ? (
          <p role="alert" className="admin-research-notes__status" data-testid="research-notes-error">
            Research notes are unavailable right now.
          </p>
        ) : null}
        <div className="admin-research-notes" aria-busy={isLoading || undefined} data-testid="research-notes">
          {isLoading ? (
            <p role="status" className="admin-research-notes__status" data-testid="research-notes-loading">
              Loading research notes…
            </p>
          ) : notes.length === 0 && !isError ? (
            <p role="status" className="admin-research-notes__status" data-testid="research-notes-empty">
              No research notes yet.
            </p>
          ) : notes.map((note, index) => {
            const job = data?.jobs.find((candidate) => candidate.id === note.id);
            return (
            <article className="card hoverable admin-research-note" key={note.id} data-testid={`research-note-${note.id}`}>
              <div className="admin-research-note__eyebrow">NOTE · {String(index + 1).padStart(2, "0")}</div>
              <button
                type="button"
                className="admin-research-note__open w-full text-left"
                onClick={(event) => {
                  noteTriggerRef.current = event.currentTarget;
                  if (job) setSelectedJob(job);
                }}
                aria-haspopup="dialog"
                aria-label={`Open research note: ${note.title}. ${note.excerpt}`}
                data-testid={`button-research-note-${note.id}`}
              >
                <h3>{note.title}</h3>
                <p className="admin-research-note__excerpt">{note.excerpt}</p>
                  <div className="admin-research-note__meta">
                    <span>{note.candidates} candidates</span>
                    <span>{note.freshness}</span>
                  </div>
              </button>
            </article>
            );
          })}
        </div>
      </div>
      <Dialog
        open={selectedJob !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      >
        <DialogContent
          className="max-h-[80vh] max-w-2xl overflow-y-auto"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            noteTriggerRef.current?.focus();
          }}
          data-testid="dialog-research-note"
        >
          <DialogHeader className="pr-10">
            <DialogTitle>
              {selectedJob ? toResearchNote(selectedJob).title : "Research note details"}
            </DialogTitle>
            <DialogDescription>
              {selectedJob
                ? `Research job #${selectedJob.id} · ${selectedJob.status} · ${selectedJob.totalDiscoveries ?? 0} candidates`
                : "Read-only research note details"}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Full research brief</h3>
                <div
                  className="whitespace-pre-wrap break-words rounded border p-3 text-sm leading-6"
                  data-testid="research-note-full-brief"
                >
                  {selectedJob.prompt}
                </div>
              </div>
              {selectedJob.categoryFocus && (
                <p className="text-sm text-muted-foreground">
                  Category focus: <span className="text-foreground">{selectedJob.categoryFocus}</span>
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
