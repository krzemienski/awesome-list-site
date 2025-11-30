import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Database,
  CheckCircle,
  Edit,
  Sparkles,
  Github,
  Users,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const [location] = useLocation();

  // Fetch admin stats for badge counts
  const { data: stats } = useQuery({
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
      if (!response.ok) throw new Error('Failed to fetch admin stats');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30s
    retry: 1,
  });

  const pendingCount = stats?.pendingResources || 0;
  const editCount = stats?.pendingEdits || 0;

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      label: 'All Resources',
      href: '/admin/resources',
      icon: Database,
    },
    {
      label: 'Pending Approvals',
      href: '/admin/pending',
      icon: CheckCircle,
      badge: pendingCount,
    },
    {
      label: 'Edit Suggestions',
      href: '/admin/edits',
      icon: Edit,
      badge: editCount,
    },
    {
      label: 'AI Enrichment',
      href: '/admin/enrichment',
      icon: Sparkles,
    },
    {
      label: 'GitHub Sync',
      href: '/admin/github',
      icon: Github,
    },
    {
      label: 'Users',
      href: '/admin/users',
      icon: Users,
    },
    {
      label: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
    {
      label: 'Audit Log',
      href: '/admin/audit',
      icon: FileText,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location === '/admin';
    }
    return location.startsWith(href);
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <h2 className="font-semibold text-lg">Admin Panel</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            'transition-all',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto p-2">
        <TooltipProvider delayDuration={300}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const hasBadge = item.badge && item.badge > 0;

              const navLink = (
                <a
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    active && 'bg-accent text-accent-foreground font-medium',
                    collapsed && 'justify-center'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {hasBadge && (
                        <Badge
                          variant="destructive"
                          className="ml-auto min-w-[20px] h-5 flex items-center justify-center"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                  {collapsed && hasBadge && (
                    <div className="absolute right-1 top-1 h-2 w-2 bg-destructive rounded-full" />
                  )}
                </a>
              );

              return (
                <li key={item.href} className="relative">
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {navLink}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {hasBadge && (
                          <Badge variant="destructive" className="ml-1">
                            {item.badge}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navLink
                  )}
                </li>
              );
            })}
          </ul>
        </TooltipProvider>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          <p>Admin Dashboard v2.0</p>
          <p className="mt-1">Awesome Video Resources</p>
        </div>
      )}
    </div>
  );
}
