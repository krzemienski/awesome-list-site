import { useState, useEffect } from 'react';
import { Bell, Menu, X, LayoutDashboard, FileText, Users, GitBranch, Database, CheckSquare, FileEdit, Sparkles, Download, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Resources", href: "/admin/resources", icon: FileText },
  { label: "Approvals", href: "/admin/approvals", icon: CheckSquare },
  { label: "Edits", href: "/admin/edits", icon: FileEdit },
  { label: "Enrichment", href: "/admin/enrichment", icon: Sparkles },
  { label: "GitHub Sync", href: "/admin/github", icon: GitBranch },
  { label: "Export", href: "/admin/export", icon: Download },
  { label: "Database", href: "/admin/database", icon: Database },
  { label: "Validation", href: "/admin/validation", icon: Activity },
  { label: "Users", href: "/admin/users", icon: Users },
];

function AdminNavigation({ collapsed }: { collapsed: boolean }) {
  const [location] = useLocation();

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (location === '/admin' && item.href === '/admin');

        return (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-pink-500/20 text-pink-500'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto rounded-full bg-pink-500 px-2 py-0.5 text-xs text-white">
                  {item.badge}
                </span>
              )}
            </a>
          </Link>
        );
      })}
    </>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return 'A';
    const email = user.email;
    const name = user.user_metadata?.full_name || email;
    const parts = name.split(/[\s@]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-r bg-card transition-all duration-300 ease-in-out',
          'fixed md:relative z-40 h-screen',
          isMobile
            ? mobileMenuOpen
              ? 'w-64 left-0'
              : '-left-64'
            : sidebarCollapsed
            ? 'w-16'
            : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="border-b px-6 py-4 flex items-center justify-between">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-bold">Admin Panel</h2>
            )}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ml-auto"
              >
                {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </Button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <AdminNavigation collapsed={sidebarCollapsed} />
            </div>
          </nav>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b bg-card px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          {/* Mobile menu button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            {/* Search - Hidden on small mobile */}
            <Input
              placeholder="Search..."
              className="w-32 md:w-64 hidden sm:block"
            />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={user?.user_metadata?.avatar_url}
                      alt={user?.user_metadata?.full_name || user?.email || 'Admin'}
                    />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.user_metadata?.full_name || 'Admin User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Admin Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
