import { useQuery } from '@tanstack/react-query';
import { Database, Clock, Users, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

interface AdminStats {
  totalResources: number;
  pendingResources: number;
  users: number;
  enrichedResources: number;
  categories: number;
  recentActivity: {
    weeklySubmissions: number;
    weeklyApprovals: number;
  };
}

interface StatWidgetProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}

function StatWidget({ title, value, icon, change, trend, colorClass }: StatWidgetProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`${colorClass || 'text-primary'}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {change !== undefined && (
          <div className="text-sm flex items-center gap-1 mt-2">
            {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
            <span className={
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' :
              'text-muted-foreground'
            }>
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-20 mb-2" />
        <Skeleton className="h-4 w-16" />
      </CardContent>
    </Card>
  );
}

export function DashboardWidgets() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      // Get Supabase session for JWT token
      const { data: { session } } = await supabase.auth.getSession();

      const headers: HeadersInit = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/stats', {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }

      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load dashboard statistics. Please refresh the page.
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <StatWidgetSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Calculate quality score (percentage of resources with descriptions)
  const qualityScore = stats.enrichedResources && stats.totalResources
    ? Math.round((stats.enrichedResources / stats.totalResources) * 100)
    : 0;

  // Calculate trends (comparing recent activity)
  const submissionTrend = stats.recentActivity?.weeklySubmissions || 0;
  const approvalTrend = stats.recentActivity?.weeklyApprovals || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Resources */}
      <StatWidget
        title="Total Resources"
        value={stats.totalResources}
        icon={<Database className="h-5 w-5" />}
        change={submissionTrend > 0 ? submissionTrend : undefined}
        trend={submissionTrend > 0 ? 'up' : 'neutral'}
      />

      {/* Pending Approvals */}
      <StatWidget
        title="Pending Approvals"
        value={stats.pendingResources}
        icon={<Clock className="h-5 w-5" />}
        colorClass={stats.pendingResources > 0 ? 'text-amber-500' : 'text-primary'}
        change={approvalTrend > 0 ? approvalTrend : undefined}
        trend={approvalTrend > 0 ? 'up' : 'neutral'}
      />

      {/* Active Users */}
      <StatWidget
        title="Active Users"
        value={stats.users}
        icon={<Users className="h-5 w-5" />}
      />

      {/* Quality Score */}
      <StatWidget
        title="Quality Score"
        value={`${qualityScore}%`}
        icon={<Star className="h-5 w-5" />}
        colorClass={
          qualityScore >= 80 ? 'text-green-500' :
          qualityScore >= 60 ? 'text-amber-500' :
          'text-red-500'
        }
      />
    </div>
  );
}
