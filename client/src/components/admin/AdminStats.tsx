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
  };
  isLoading: boolean;
}

/**
 * @description Displays admin dashboard statistics in a responsive grid of cards.
 * Shows metrics for users, resources, learning journeys, and pending approvals.
 * Extracted from the main Admin Dashboard component for better code organization.
 */
export default function AdminStats({ stats, isLoading }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { icon: Users, label: "Total Users", value: stats?.users },
        { icon: FileText, label: "Total Resources", value: stats?.resources },
        { icon: Activity, label: "Learning Journeys", value: stats?.journeys },
        { icon: GitBranch, label: "Pending Approvals", value: stats?.pendingApprovals },
      ].map(({ icon: Icon, label, value }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="eyebrow flex items-center gap-2 normal-case">
              <Icon className="h-4 w-4 text-[var(--accent)]" />
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display font-medium text-3xl tracking-tight tabular-nums text-[var(--text)]">
              {isLoading ? "—" : value || 0}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
