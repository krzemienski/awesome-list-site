import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Database, FileEdit, FlaskConical, GitBranch, Link2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/queryClient";
import { fetchAwesomeListNav, type AwesomeListNav } from "@/lib/static-data";
import type { EnrichmentJob, LinkHealthJob, ResearchJob, Resource, ResourceEdit } from "@shared/schema";

interface OverviewStats { users?: number; resources?: number; journeys?: number; pendingApprovals?: number; pendingEdits?: number; totalPublic?: number; totalPending?: number; totalRejected?: number }
interface AdminOverviewProps { stats?: OverviewStats; onNavigate: (tab: string) => void }
interface PendingResponse { resources: Resource[]; total: number }
interface EditWithResource extends ResourceEdit { resource: Resource }
interface AuditEntry { id: number; resourceId: number | null; originalResourceId: number | null; action: string; performedBy: string | null; performedByEmail: string | null; notes: string | null; createdAt: string | null }
interface AuditResponse { logs: AuditEntry[]; total: number }
interface LinkStatus { success: boolean; job: LinkHealthJob | null }
interface GithubQueue { total: number; items: Array<{ id: number; status: string; createdAt: string; errorMessage?: string }> }
interface EnrichmentResponse { success: boolean; jobs: EnrichmentJob[] }
interface ResearchResponse { jobs: ResearchJob[]; total: number }
interface DigestHealth { transport: { available: boolean; errorCode?: string }; queue: Record<string, Record<string, number>> }

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new ApiError(response.status, await response.text());
  return response.json();
}
const dateLabel = (value: string | null | undefined) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—";
const title = (value: string) => value.replace(/_/g, " ");
const queueTotal = (queue: Record<string, Record<string, number>>) => Object.values(queue).flatMap(Object.values).reduce((sum, count) => sum + count, 0);
const issueSummary = (failed: number, cancelled: number) => [failed ? failed + " failed" : "", cancelled ? cancelled + " cancelled" : ""].filter(Boolean).join(" · ");

export default function AdminOverview({ stats, onNavigate }: AdminOverviewProps) {
  const pending = useQuery<PendingResponse>({ queryKey: ["/api/admin/pending-resources"], staleTime: 30_000 });
  const edits = useQuery<EditWithResource[]>({ queryKey: ["/api/admin/resource-edits"], staleTime: 30_000 });
  const audit = useQuery<AuditResponse>({ queryKey: ["/api/admin/audit-logs", "overview"], queryFn: () => getJson("/api/admin/audit-logs?limit=8&offset=0"), staleTime: 30_000 });
  const nav = useQuery<AwesomeListNav>({ queryKey: ["awesome-list-nav"], queryFn: fetchAwesomeListNav, staleTime: 60_000 });
  const links = useQuery<LinkStatus>({ queryKey: ["/api/admin/link-health/status"], staleTime: 30_000 });
  const github = useQuery<GithubQueue>({ queryKey: ["/api/github/sync-status"], staleTime: 30_000 });
  const enrichment = useQuery<EnrichmentResponse>({ queryKey: ["/api/enrichment/jobs"], staleTime: 30_000 });
  const research = useQuery<ResearchResponse>({ queryKey: ["/api/researcher/jobs", { limit: 20 }], queryFn: () => getJson("/api/researcher/jobs?limit=20"), staleTime: 30_000 });
  const digest = useQuery<DigestHealth>({ queryKey: ["/api/admin/digests/health"], staleTime: 30_000 });
  const categories = [...(nav.data?.categories ?? [])].sort((a, b) => b.resourceCount - a.resourceCount).slice(0, 6);
  const categoryMax = Math.max(1, ...categories.map((category) => category.resourceCount));
  const publicResources = stats?.totalPublic ?? stats?.resources ?? null;
  const workflow = [
    { label: "Live", value: publicResources, tone: "ink-1" },
    { label: "Pending", value: stats?.totalPending ?? stats?.pendingApprovals ?? null, tone: "accent" },
    { label: "Rejected", value: stats?.totalRejected ?? null, tone: "ink-3" },
    { label: "Edit queue", value: stats?.pendingEdits ?? null, tone: "ink-2" },
  ];
  const workflowMax = Math.max(1, ...workflow.map((item) => item.value ?? 0));
  const githubActive = github.data?.items.filter((item) => item.status === "pending" || item.status === "processing").length ?? 0;
  const githubFailed = github.data?.items.filter((item) => item.status === "failed").length ?? 0;
  const enrichmentActive = enrichment.data?.jobs.filter((job) => job.status === "pending" || job.status === "processing").length ?? 0;
  const enrichmentFailed = enrichment.data?.jobs.filter((job) => job.status === "failed").length ?? 0;
  const enrichmentCancelled = enrichment.data?.jobs.filter((job) => job.status === "cancelled").length ?? 0;
  const researchActive = research.data?.jobs.filter((job) => job.status === "pending" || job.status === "processing").length ?? 0;
  const researchFailed = research.data?.jobs.filter((job) => job.status === "failed").length ?? 0;
  const researchCancelled = research.data?.jobs.filter((job) => job.status === "cancelled").length ?? 0;
  const digestQueued = digest.data ? queueTotal(digest.data.queue) : null;
  const anyHealthError = links.isError || github.isError || enrichment.isError || research.isError || digest.isError;
  const anyHealthPending = links.isPending || github.isPending || enrichment.isPending || research.isPending || digest.isPending;
  const health = [
    { label: "Database", value: stats ? "Stats loaded" : "Checking…", state: stats ? "ok" : "unknown", Icon: Database, tab: "database" },
    { label: "GitHub sync", value: github.isPending ? "Checking…" : github.isError ? "Unavailable" : githubFailed ? githubFailed + " failed" : githubActive ? githubActive + " active" : "Idle", state: github.isPending ? "unknown" : github.isError || githubFailed ? "bad" : githubActive ? "warn" : "ok", Icon: GitBranch, tab: "github" },
    { label: "Link checker", value: links.isPending ? "Checking…" : links.isError ? "Unavailable" : links.data?.success === false ? "Endpoint reported failure" : links.data?.job ? title(links.data.job.status) : "No runs", state: links.isPending ? "unknown" : links.isError || links.data?.success === false || links.data?.job?.status === "failed" || links.data?.job?.status === "cancelled" ? "bad" : links.data?.job?.status === "processing" || links.data?.job?.status === "pending" ? "warn" : "ok", Icon: Link2, tab: "linkhealth" },
    { label: "Enrichment", value: enrichment.isPending ? "Checking…" : enrichment.isError ? "Unavailable" : enrichment.data?.success === false ? "Endpoint reported failure" : enrichmentFailed || enrichmentCancelled ? issueSummary(enrichmentFailed, enrichmentCancelled) : enrichmentActive ? enrichmentActive + " active" : "Idle", state: enrichment.isPending ? "unknown" : enrichment.isError || enrichment.data?.success === false || enrichmentFailed || enrichmentCancelled ? "bad" : enrichmentActive ? "warn" : "ok", Icon: FlaskConical, tab: "enrichment" },
    { label: "Research", value: research.isPending ? "Checking…" : research.isError ? "Unavailable" : researchFailed || researchCancelled ? issueSummary(researchFailed, researchCancelled) : researchActive ? researchActive + " active" : "Idle", state: research.isPending ? "unknown" : research.isError || researchFailed || researchCancelled ? "bad" : researchActive ? "warn" : "ok", Icon: CircleDashed, tab: "researcher" },
    { label: "Digests", value: digest.isPending ? "Checking…" : digest.isError ? "Unavailable" : !digest.data?.transport.available ? digest.data?.transport.errorCode || "Transport unavailable" : digestQueued ? digestQueued + " queued" : "Available", state: digest.isPending ? "unknown" : digest.isError || digest.data?.transport.available === false ? "bad" : digestQueued ? "warn" : "ok", Icon: MailCheck, tab: "digests" },
  ];
  const discoveryReviewCount = research.data?.jobs.reduce((sum, job) => sum + Math.max(0, (job.totalDiscoveries ?? 0) - (job.approvedDiscoveries ?? 0) - (job.rejectedDiscoveries ?? 0)), 0);

  return <div className="admin-overview" data-testid="admin-overview">
    <section className="admin-overview__queue" aria-labelledby="submission-queue-heading">
      <div className="admin-section-heading"><div><p className="eyebrow">Live workflow</p><h2 id="submission-queue-heading">Submission queue</h2></div><Button variant="ghost" className="min-h-11" onClick={() => onNavigate("approvals")}>Review queue <ArrowRight className="h-4 w-4" /></Button></div>
      <div className="admin-queue-grid">
        <button type="button" onClick={() => onNavigate("approvals")} className="admin-queue-card focus-ring" data-testid="queue-pending-resources"><span>Resource submissions</span><strong>{pending.isPending ? "—" : pending.isError ? "Error" : pending.data.total.toLocaleString()}</strong><small>{pending.isPending ? "loading queue…" : pending.isError ? "queue unavailable" : "awaiting approval"}</small></button>
        <button type="button" onClick={() => onNavigate("edits")} className="admin-queue-card focus-ring" data-testid="queue-pending-edits"><span>Edit suggestions</span><strong>{edits.isPending ? "—" : edits.isError ? "Error" : edits.data.length.toLocaleString()}</strong><small>{edits.isPending ? "loading queue…" : edits.isError ? "queue unavailable" : "awaiting review"}</small></button>
        <button type="button" onClick={() => onNavigate("researcher")} className="admin-queue-card focus-ring"><span>Research discoveries</span><strong>{research.isPending ? "—" : research.isError ? "Error" : discoveryReviewCount?.toLocaleString()}</strong><small>{research.isPending ? "loading jobs…" : research.isError ? "jobs unavailable" : "recorded by recent jobs"}</small></button>
      </div>
    </section>
    <div className="admin-overview__charts">
      <section className="admin-panel" aria-labelledby="category-chart-heading"><div className="admin-panel__heading"><div><h2 id="category-chart-heading">Catalog by category</h2><p>Configured public taxonomy</p></div><span className="admin-chip">{nav.data?.categories.length ?? "—"} categories</span></div>{nav.isError ? <p className="admin-empty" role="alert">Category data is unavailable.</p> : <div className="admin-bar-chart">{categories.map((category, index) => <div className="admin-bar-row" key={category.slug ?? category.name}><div><span>{category.name}</span><strong>{category.resourceCount.toLocaleString()}</strong></div><div className="admin-bar-track"><span className={"admin-bar admin-bar--ink-" + ((index % 4) + 1)} style={{ width: Math.max(2, category.resourceCount / categoryMax * 100) + "%" }} /></div></div>)}</div>}</section>
      <section className="admin-panel" aria-labelledby="workflow-chart-heading"><div className="admin-panel__heading"><div><h2 id="workflow-chart-heading">Catalog workflow</h2><p>Current resource and edit states</p></div><span className="admin-chip admin-chip--accent">Live</span></div><div className="admin-bar-chart">{workflow.map((item) => <div className="admin-bar-row" key={item.label}><div><span>{item.label}</span><strong>{item.value == null ? "—" : item.value.toLocaleString()}</strong></div><div className="admin-bar-track"><span className={"admin-bar admin-bar--" + item.tone} style={{ width: item.value == null ? "0%" : Math.max(2, item.value / workflowMax * 100) + "%" }} /></div></div>)}</div></section>
    </div>
    <section className="admin-panel" aria-labelledby="health-heading"><div className="admin-panel__heading"><div><h2 id="health-heading">Queue and service health</h2><p>Read directly from existing operational endpoints</p></div>{anyHealthError ? <span className="admin-chip admin-chip--bad"><AlertTriangle className="h-3.5 w-3.5" />Partial</span> : anyHealthPending ? <span className="admin-chip"><CircleDashed className="h-3.5 w-3.5" />Checking</span> : <span className="admin-chip"><CheckCircle2 className="h-3.5 w-3.5" />Connected</span>}</div><div className="admin-health-grid">{health.map(({ label, value, state, Icon, tab }) => <button type="button" className="admin-health-card focus-ring" onClick={() => onNavigate(tab)} key={label}><Icon className="h-4 w-4" /><span><strong>{label}</strong><small>{value}</small></span><i className={"admin-health-dot admin-health-dot--" + state} aria-label={state} /></button>)}</div></section>
    <section className="admin-panel admin-activity" aria-labelledby="activity-heading"><div className="admin-panel__heading"><div><h2 id="activity-heading">Recent activity</h2><p>{audit.data ? audit.data.total.toLocaleString() + " audit records" : "Existing resource audit log"}</p></div><Button variant="ghost" className="min-h-11" onClick={() => onNavigate("audit")}>Full audit log <ArrowRight className="h-4 w-4" /></Button></div>{audit.isError ? <p className="admin-empty" role="alert">Activity is unavailable. Open Audit to retry.</p> : <div className="admin-table-wrap"><table><thead><tr><th>ID</th><th>Actor</th><th>Action</th><th>Target</th><th>When</th></tr></thead><tbody>{audit.data?.logs.map((entry) => <tr key={entry.id}><td>#{entry.id}</td><td>{entry.performedByEmail ?? entry.performedBy ?? "system"}</td><td><span className="admin-chip">{title(entry.action)}</span></td><td>{entry.originalResourceId ?? entry.resourceId ? "Resource #" + (entry.originalResourceId ?? entry.resourceId) : entry.notes || "System"}</td><td>{dateLabel(entry.createdAt)}</td></tr>)}</tbody></table></div>}</section>
    <section className="admin-panel admin-unsupported" aria-labelledby="content-workflow-heading" data-testid="unsupported-cms-record"><FileEdit className="h-5 w-5" /><div><h2 id="content-workflow-heading">Content workflow</h2><p><strong>Authored posts are unsupported:</strong> this application has no CMS or posts endpoint. Research jobs, discoveries, and edit suggestions are the available source-backed editorial workflows.</p></div><div><Button variant="outline" className="min-h-11" onClick={() => onNavigate("researcher")}>Research &amp; discovery</Button><Button variant="outline" className="min-h-11" onClick={() => onNavigate("edits")}>Edit queue</Button></div></section>
  </div>;
}