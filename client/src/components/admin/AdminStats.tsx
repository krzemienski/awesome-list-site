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
      <Card className="border-primary/20 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Total Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary font-mono">
            {isLoading ? "..." : stats?.users || 0}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Total Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary font-mono">
            {isLoading ? "..." : stats?.resources || 0}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Learning Journeys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary font-mono">
            {isLoading ? "..." : stats?.journeys || 0}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary font-mono">
            {isLoading ? "..." : stats?.pendingApprovals || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
