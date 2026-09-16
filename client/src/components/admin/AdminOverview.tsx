import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { EnrichmentJob, LinkHealthJob } from "@shared/schema";
import StatStatusChip from "@/components/admin/canonical/StatusChip";
import TableShell from "@/components/admin/canonical/TableShell";
import { formatRelativeAgo } from "@/lib/utils";
import "@/styles/pages/admin-overview.css";

interface OverviewStats {
  users?: number;
  resources?: number;
  journeys?: number;
  pendingApprovals?: number;
  pendingEdits?: number;
  totalPublic?: number;
  totalPending?: number;
  totalRejected?: number;
}

interface AdminOverviewProps {
  stats?: OverviewStats;
}

interface AuditEntry {
  id: number;
  resourceId: number | null;
  originalResourceId: number | null;
  action: string;
  performedBy: string | null;
  performedByEmail: string | null;
  notes: string | null;
  changes?: Record<string, unknown> | null;
  createdAt: string | null;
}

/**
 * Same target identity the audit tab renders: the recorded title when the log
 * carries one, otherwise the resource number, otherwise "System".
 */
const auditTarget = (entry: AuditEntry): string => {
  const changes = entry.changes ?? null;
  const nested = changes?.resource;
  const title = (nested && typeof nested === "object" && typeof (nested as { title?: unknown }).title === "string"
    ? (nested as { title: string }).title
    : typeof changes?.title === "string"
      ? changes.title
      : "").trim();
  if (title) return title;
  const id = entry.originalResourceId ?? entry.resourceId;
  return id ? `#${id}` : entry.notes ?? "System";
};

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
}

interface OperationsHealth {
  status?: "ready" | "degraded";
  readiness?: {
    lastProbe?: {
      ready?: boolean;
      durationMs?: number;
      checkedAt?: string;
      reason?: string;
    } | null;
  };
}

interface GithubQueueItem {
  id: number;
  status: string;
  createdAt: string;
  processedAt?: string | null;
  errorMessage?: string | null;
}

interface GithubQueueResponse {
  total: number;
  items: GithubQueueItem[];
}

interface GithubHistoryItem {
  id: number;
  status?: string;
  createdAt: string | null;
  commitMessage?: string | null;
}

interface LinkHistoryResponse {
  success: boolean;
  jobs: LinkHealthJob[];
}

interface EnrichmentResponse {
  success: boolean;
  jobs: EnrichmentJob[];
}

interface CategorySummary {
  id?: number;
  name: string;
  slug?: string;
  icon?: string | null;
  resourceCount?: number;
}

type HealthState = "ok" | "warn" | "bad" | "unknown";

/**
 * The frozen admin uses one glyph per top-level category. The public
 * categories endpoint intentionally returns taxonomy and approved counts, not
 * presentation metadata, so keep this small canonical mapping at the panel
 * boundary rather than changing the shared/API category contract.
 */
const CATEGORY_ICONS: Record<string, string> = {
  "community-events": "◈",
  "encoding-codecs": "◇",
  "general-tools": "◆",
  "infrastructure-delivery": "▣",
  "intro-learning": "▤",
  "media-tools": "▥",
  "players-clients": "▶",
  "protocols-transport": "⟁",
  "standards-industry": "◉",
};

const categoryIcon = (category: CategorySummary) =>
  category.icon ?? (category.slug ? CATEGORY_ICONS[category.slug] : undefined) ?? "◆";

interface HealthRow {
  label: string;
  detail: string;
  state: HealthState;
}

const title = (value: string) =>
  value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const auditActor = (entry: AuditEntry) => {
  const actor = entry.performedByEmail ?? entry.performedBy ?? "system";
  if (!actor.includes("@")) return actor;
  const [local, domain] = actor.split("@");
  return `${local.slice(0, 1)}•••@${domain}`;
};

const dateValue = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

/** One relative-age vocabulary across the admin surface (Database, Enrichment, Overview). */
const relativeAge = (value: string | null | undefined) => formatRelativeAgo(value);

const dateLabel = relativeAge;

const latestByDate = <T extends { createdAt?: string | null }>(items: T[]) =>
  [...items].sort(
    (left, right) =>
      (dateValue(right.createdAt)?.getTime() ?? 0) -
      (dateValue(left.createdAt)?.getTime() ?? 0),
  )[0];

function operationHealthRow(
  query: UseQueryResult<OperationsHealth>,
): HealthRow {
  if (query.isPending) {
    return { label: "Database", detail: "checking…", state: "unknown" };
  }
  if (query.isError || !query.data) {
    return { label: "Database", detail: "unavailable", state: "bad" };
  }
  const probe = query.data.readiness?.lastProbe;
  const ready = query.data.status === "ready" && probe?.ready !== false;
  return {
    label: "Database",
    detail: ready
      ? `ready${probe?.durationMs === undefined ? "" : ` · ${probe.durationMs}ms`}`
      : `degraded${probe?.reason ? ` · ${probe.reason}` : ""}`,
    state: ready ? "ok" : "bad",
  };
}

function renderHealthRows(
  operations: UseQueryResult<OperationsHealth>,
  githubQueue: UseQueryResult<GithubQueueResponse>,
  githubHistory: UseQueryResult<GithubHistoryItem[]>,
  linkStatus: UseQueryResult<{ success: boolean; job: LinkHealthJob | null }>,
  linkHistory: UseQueryResult<LinkHistoryResponse>,
  ai: UseQueryResult<{ status?: string }>,
  enrichment: UseQueryResult<EnrichmentResponse>,
): HealthRow[] {
  const database = operationHealthRow(operations);
  const activeGithub = githubQueue.data?.items
    .filter((item) => item.status === "pending" || item.status === "processing")
    .sort(
      (left, right) =>
        (dateValue(right.createdAt)?.getTime() ?? 0) -
        (dateValue(left.createdAt)?.getTime() ?? 0),
    )[0];
  const latestGithub = latestByDate(githubHistory.data ?? []);

  let github: HealthRow;
  if (githubQueue.isPending || githubHistory.isPending) {
    github = { label: "GitHub sync", detail: "checking…", state: "unknown" };
  } else if (githubQueue.isError || githubHistory.isError) {
    github = { label: "GitHub sync", detail: "unavailable", state: "bad" };
  } else if (activeGithub) {
    github = {
      label: "GitHub sync",
      detail: `${title(activeGithub.status)} · ${relativeAge(activeGithub.createdAt)}`,
      state: "warn",
    };
  } else if (latestGithub?.status === "failed") {
    github = {
      label: "GitHub sync",
      detail: `failed · ${relativeAge(latestGithub.createdAt)}`,
      state: "bad",
    };
  } else if (latestGithub) {
    github = {
      label: "GitHub sync",
      detail: `${title(latestGithub.status ?? "completed")} · ${relativeAge(latestGithub.createdAt)}`,
      state: "ok",
    };
  } else {
    github = { label: "GitHub sync", detail: "no runs", state: "unknown" };
  }

  const completedLinks = (linkHistory.data?.jobs ?? [])
    .filter((job) => job.status === "completed")
    .sort(
      (left, right) =>
        (dateValue(right.completedAt ?? right.createdAt)?.getTime() ?? 0) -
        (dateValue(left.completedAt ?? left.createdAt)?.getTime() ?? 0),
    );
  const lastCompletedLink = completedLinks[0];
  const currentLink = linkStatus.data?.job;
  let link: HealthRow;
  if (linkStatus.isPending || linkHistory.isPending) {
    link = { label: "Link checker", detail: "checking…", state: "unknown" };
  } else if (linkStatus.isError || linkHistory.isError || linkStatus.data?.success === false) {
    link = { label: "Link checker", detail: "unavailable", state: "bad" };
  } else if (currentLink?.status === "pending" || currentLink?.status === "processing") {
    link = {
      label: "Link checker",
      detail: `${title(currentLink.status)} · ${relativeAge(currentLink.createdAt)}`,
      state: "warn",
    };
  } else if (currentLink?.status === "failed" || currentLink?.status === "cancelled") {
    link = {
      label: "Link checker",
      detail: `${title(currentLink.status)} · ${relativeAge(currentLink.createdAt)}`,
      state: "bad",
    };
  } else if (lastCompletedLink) {
    const broken = lastCompletedLink.brokenLinks;
    link = {
      label: "Link checker",
      detail: `last ${relativeAge(lastCompletedLink.completedAt ?? lastCompletedLink.createdAt)}${broken ? ` · ${broken} broken` : ""}`,
      state: broken ? "warn" : "ok",
    };
  } else {
    link = { label: "Link checker", detail: "no completed runs", state: "unknown" };
  }

  let aiRow: HealthRow;
  if (ai.isPending) {
    aiRow = { label: "Researcher API", detail: "checking…", state: "unknown" };
  } else if (ai.isError || ai.data?.status !== "healthy") {
    aiRow = {
      label: "Researcher API",
      detail: ai.data?.status ? title(ai.data.status) : "unavailable",
      state: "bad",
    };
  } else {
    aiRow = { label: "Researcher API", detail: "healthy", state: "ok" };
  }

  let enrichmentRow: HealthRow;
  const jobs = enrichment.data?.jobs ?? [];
  const activeJobs = jobs.filter((job) => job.status === "pending" || job.status === "processing").length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  if (enrichment.isPending) {
    enrichmentRow = { label: "Enrichment queue", detail: "checking…", state: "unknown" };
  } else if (enrichment.isError || enrichment.data?.success === false) {
    enrichmentRow = { label: "Enrichment queue", detail: "unavailable", state: "bad" };
  } else if (failedJobs) {
    enrichmentRow = {
      label: "Enrichment queue",
      detail: `${failedJobs} failed`,
      state: "bad",
    };
  } else if (activeJobs) {
    enrichmentRow = {
      label: "Enrichment queue",
      detail: `${activeJobs} active`,
      state: "warn",
    };
  } else {
    enrichmentRow = { label: "Enrichment queue", detail: "idle", state: "ok" };
  }

  return [database, github, link, enrichmentRow, aiRow];
}

/**
 * The canonical overview deliberately contains only the four metric cards
 * (rendered by AdminStats) and these three source-backed panels: last-six
 * activity, operational health, and top-five category counts.
 */
export default function AdminOverview({ stats }: AdminOverviewProps) {
  const audit = useQuery<AuditResponse>({
    queryKey: ["/api/admin/audit-logs", "overview-last-six"],
    queryFn: () => apiRequest("/api/admin/audit-logs?limit=6&offset=0"),
    staleTime: 30_000,
  });
  const operations = useQuery<OperationsHealth>({
    queryKey: ["/api/admin/operations/health"],
    queryFn: () => apiRequest("/api/admin/operations/health"),
    staleTime: 30_000,
  });
  const ai = useQuery<{ status?: string }>({
    queryKey: ["/api/health/ai"],
    queryFn: () => apiRequest("/api/health/ai"),
    staleTime: 30_000,
  });
  const githubQueue = useQuery<GithubQueueResponse>({
    queryKey: ["/api/github/sync-status"],
    queryFn: () => apiRequest("/api/github/sync-status"),
    staleTime: 30_000,
  });
  const githubHistory = useQuery<GithubHistoryItem[]>({
    queryKey: ["/api/github/sync-history"],
    queryFn: () => apiRequest("/api/github/sync-history"),
    staleTime: 30_000,
  });
  const linkStatus = useQuery<{ success: boolean; job: LinkHealthJob | null }>({
    queryKey: ["/api/admin/link-health/status"],
    queryFn: () => apiRequest("/api/admin/link-health/status"),
    staleTime: 30_000,
  });
  const linkHistory = useQuery<LinkHistoryResponse>({
    queryKey: ["/api/admin/link-health/history"],
    queryFn: () => apiRequest("/api/admin/link-health/history"),
    staleTime: 30_000,
  });
  const enrichment = useQuery<EnrichmentResponse>({
    queryKey: ["/api/enrichment/jobs"],
    queryFn: () => apiRequest("/api/enrichment/jobs?limit=100"),
    staleTime: 30_000,
  });
  const categories = useQuery<CategorySummary[]>({
    queryKey: ["/api/categories", "overview-top-five"],
    queryFn: () => apiRequest("/api/categories"),
    staleTime: 60_000,
  });

  const healthRows = renderHealthRows(
    operations,
    githubQueue,
    githubHistory,
    linkStatus,
    linkHistory,
    ai,
    enrichment,
  );
  const healthSubtitle = healthRows.some((row) => row.state === "bad")
    ? "One or more systems need attention"
    : healthRows.some((row) => row.state === "unknown")
      ? "Checking current readiness"
      : healthRows.some((row) => row.state === "warn")
        ? "Some systems are still working"
        : "All systems nominal";
  const topCategories = [...(categories.data ?? [])]
    .sort((left, right) => (
      (right.resourceCount ?? 0) - (left.resourceCount ?? 0)
      || left.name.localeCompare(right.name)
    ))
    .slice(0, 5);
  const categoryMax = Math.max(1, ...topCategories.map((category) => category.resourceCount ?? 0));

  return (
    <div className="admin-overview admin-overview-canonical" data-testid="admin-overview">
      <div className="admin-canonical-overview-grid">
        <TableShell
          title="Recent activity"
          subtitle="Last 24 hours"
          className="admin-panel admin-activity"
          testId="admin-overview-activity"
        >
          {audit.isPending ? (
            <p className="admin-canonical-empty">Loading activity…</p>
          ) : audit.isError ? (
            <p className="admin-canonical-empty" role="alert">
              Activity is unavailable. Open Audit to retry.
            </p>
          ) : audit.data?.logs.length ? (
            <div className="admin-canonical-activity-list admin-table-wrap">
              {audit.data.logs.slice(0, 6).map((entry) => (
                <div key={entry.id} className="admin-canonical-activity-row">
                  <span className="admin-canonical-activity-id">
                    TX#{entry.id}
                  </span>
                  <span className="admin-canonical-activity-actor">
                    {auditActor(entry)}
                  </span>
                  <span className="admin-canonical-activity-action">
                    {entry.action.replace(/[_-]/g, " ")}
                  </span>
                  <span className="admin-canonical-activity-target">
                    {auditTarget(entry)}
                  </span>
                  <span className="admin-canonical-activity-time">
                    {dateLabel(entry.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-canonical-empty">No audit activity recorded.</p>
          )}
        </TableShell>

        <TableShell
          title="System health"
          subtitle={healthSubtitle}
          className="admin-panel"
          testId="admin-overview-health"
        >
          <div className="admin-canonical-health-list admin-health-grid">
            {healthRows.map(({ label, detail, state }) => (
              <div
                key={label}
                className="admin-canonical-health-row admin-health-card"
                data-testid={`health-${label === "Link checker"
                  ? "linkhealth"
                  : label === "Researcher API"
                    ? "researcher"
                    : label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <StatStatusChip
                  status={state}
                  dot
                  label={`${label}: ${state}`}
                />
                <span>{label}</span>
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </TableShell>

        <TableShell
          title="Top categories"
          subtitle="By resource count"
          className="admin-panel"
          testId="admin-overview-categories"
        >
          {categories.isPending ? (
            <p className="admin-canonical-empty">Loading categories…</p>
          ) : categories.isError ? (
            <p className="admin-canonical-empty" role="alert">Category data is unavailable.</p>
          ) : topCategories.length ? (
            <div className="admin-canonical-category-list">
              {topCategories.map((category, index) => {
                const count = category.resourceCount ?? 0;
                return (
                  <div
                    key={category.id ?? category.slug ?? category.name}
                    className="admin-canonical-category-row"
                    data-testid={`top-category-${index + 1}`}
                  >
                    <div className="admin-canonical-category-label">
                      <span>
                        <span aria-hidden="true">{categoryIcon(category)} </span>
                        {category.name}
                      </span>
                      <strong>{count.toLocaleString()}</strong>
                    </div>
                    <div className="admin-canonical-category-track" aria-hidden="true">
                      <span
                        className="admin-canonical-category-bar"
                        style={{ width: `${Math.max(2, (count / categoryMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="admin-canonical-empty">No categories have approved resources.</p>
          )}
        </TableShell>
      </div>
    </div>
  );
}