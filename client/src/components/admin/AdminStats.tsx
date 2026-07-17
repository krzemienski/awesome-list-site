import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Activity, GitBranch } from "lucide-react";

/**
 * @description Props for the AdminStats component
 */
interface AdminStatsProps {
  stats?: {
    users?: number;
    resources?: number;
    journeys?: number;
    pendingApprovals?: number;
    totalPublic?: number;
    totalPending?: number;
    totalDeleted?: number;
  };
  isLoading: boolean;
  /** R4-L17: when provided, stat cards become clickable and jump to the matching admin tab. */
  onNavigate?: (tab: string) => void;
}

/**
 * @description Displays admin dashboard statistics in a responsive grid of cards.
 * Shows metrics for users, resources, learning journeys, and pending approvals.
 * The resources card shows the LIVE (approved/public) count so it matches the
 * public catalog exactly (run3 audit R3-01); pending/rejected are a sublabel.
 * R4-L17: each card deep-links to its admin tab when onNavigate is supplied.
 */
export default function AdminStats({ stats, isLoading, onNavigate }: AdminStatsProps) {
  const publicCount = stats?.totalPublic ?? stats?.resources;
  const pendingCount = stats?.totalPending ?? 0;
  const rejectedCount = stats?.totalDeleted ?? 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { icon: Users, label: "Total Users", value: stats?.users, tab: "users" },
        {
          icon: FileText,
          label: "Live Resources",
          value: publicCount,
          /* R2-M22: only mention non-zero buckets (no "+0 pending").
             Run16 BUG-029: pending/rejected are now deep-links — pending jumps
             to the approvals tab, rejected opens the resources tab pre-filtered
             to status=rejected (ResourceManager reads ?status= on mount). */
          sublabel:
            pendingCount || rejectedCount ? (
              <>
                {pendingCount ? (
                  <button
                    type="button"
                    className="underline decoration-dotted hover:text-[var(--accent)]"
                    data-testid="link-stat-pending"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.("approvals");
                    }}
                  >
                    +{pendingCount} pending
                  </button>
                ) : null}
                {pendingCount && rejectedCount ? " · " : null}
                {rejectedCount ? (
                  <button
                    type="button"
                    className="underline decoration-dotted hover:text-[var(--accent)]"
                    data-testid="link-stat-rejected"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = new URL(window.location.href);
                      url.searchParams.set("status", "rejected");
                      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
                      onNavigate?.("resources");
                    }}
                  >
                    {rejectedCount} rejected
                  </button>
                ) : null}
              </>
            ) : undefined,
          testId: "stat-live-resources",
          tab: "resources",
        },
        { icon: Activity, label: "Learning Journeys", value: stats?.journeys, tab: "journeys" },
        { icon: GitBranch, label: "Pending Approvals", value: stats?.pendingApprovals, tab: "approvals" },
      ].map(({ icon: Icon, label, value, sublabel, testId, tab }: any) => {
        const clickable = Boolean(onNavigate && tab);
        return (
          <Card
            key={label}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? `${label} — open the ${tab} tab` : undefined}
            title={clickable ? `Open the ${tab} tab` : undefined}
            onClick={clickable ? () => onNavigate!(tab) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNavigate!(tab);
                    }
                  }
                : undefined
            }
            className={
              clickable
                ? "cursor-pointer transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                : undefined
            }
            data-testid={clickable ? `stat-card-${tab}` : undefined}
          >
            <CardHeader className="pb-2">
              <CardTitle className="eyebrow flex items-center gap-2 normal-case">
                <Icon className="h-4 w-4 text-[var(--accent)]" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="font-display font-medium text-3xl tracking-tight tabular-nums text-[var(--text)]"
                data-testid={testId}
              >
                {isLoading ? "—" : value || 0}
              </div>
              {!isLoading && sublabel && (
                <div className="text-xs text-[var(--text-2)] mt-1">{sublabel}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
