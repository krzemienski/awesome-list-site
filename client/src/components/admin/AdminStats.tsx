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
}

/**
 * @description Displays admin dashboard statistics in a responsive grid of cards.
 * Shows metrics for users, resources, learning journeys, and pending approvals.
 * The resources card shows the LIVE (approved/public) count so it matches the
 * public catalog exactly (run3 audit R3-01); pending/rejected are a sublabel.
 */
export default function AdminStats({ stats, isLoading }: AdminStatsProps) {
  const publicCount = stats?.totalPublic ?? stats?.resources;
  const pendingCount = stats?.totalPending ?? 0;
  const rejectedCount = stats?.totalDeleted ?? 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { icon: Users, label: "Total Users", value: stats?.users },
        {
          icon: FileText,
          label: "Live Resources",
          value: publicCount,
          sublabel:
            pendingCount || rejectedCount
              ? /* R2-M22: only mention non-zero buckets (no "+0 pending"). */
                [
                  pendingCount ? `+${pendingCount} pending` : null,
                  rejectedCount ? `${rejectedCount} rejected` : null,
                ].filter(Boolean).join(" · ")
              : undefined,
          testId: "stat-live-resources",
        },
        { icon: Activity, label: "Learning Journeys", value: stats?.journeys },
        { icon: GitBranch, label: "Pending Approvals", value: stats?.pendingApprovals },
      ].map(({ icon: Icon, label, value, sublabel, testId }: any) => (
        <Card key={label}>
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
      ))}
    </div>
  );
}
