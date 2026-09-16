import { useQuery } from "@tanstack/react-query";
import type { ResearchJob } from "@shared/schema";
import { ApiError } from "@/lib/queryClient";
import { formatRelativeAgo } from "@/lib/utils";

export const RESEARCH_WORKSPACE_LIMIT = 4;

/** Mirror of the frozen note card: title, candidate count, freshness. */
export function toResearchNote(job: ResearchJob, now = Date.now()) {
  const active = job.status === "pending" || job.status === "processing";
  return {
    id: job.id,
    title: job.prompt,
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
          <p role="status" className="admin-research-notes__status" data-testid="research-notes-error">
            Research notes are unavailable right now.
          </p>
        ) : null}
        <div className="admin-research-notes" aria-busy={isLoading || undefined} data-testid="research-notes">
          {notes.map((note, index) => (
            <article className="card hoverable admin-research-note" key={note.id} data-testid={`research-note-${note.id}`}>
              <div className="admin-research-note__eyebrow">NOTE · {String(index + 1).padStart(2, "0")}</div>
              <h3>{note.title}</h3>
              <div className="admin-research-note__meta">
                <span>{note.candidates} candidates</span>
                <span>{note.freshness}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
