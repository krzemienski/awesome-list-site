import { Link, useLocation } from "wouter";
import { Search, Palette, LogIn, LogOut, User, Bookmark, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { deslugify } from "@/lib/utils";

interface AppHeaderProps {
  onSearchOpen: () => void;
  user?: any;
  onLogout?: () => void;
}

function getBreadcrumbs(path: string) {
  if (path === "/") return [{ label: "Home", href: "/" }];
  const segments = path.split("/").filter(Boolean);
  const crumbs: { label: string; href: string | null }[] = [{ label: "Home", href: "/" }];
  // Base segments that have no standalone index route. Their breadcrumb crumb
  // is a label only — linking to /<segment> would land on the 404 page.
  const noIndexRoute = new Set([
    "category",
    "subcategory",
    "sub-subcategory",
    "resource",
    "journey",
    "settings",
  ]);
  const routeLabels: Record<string, string> = {
    category: "Category",
    subcategory: "Subcategory",
    "sub-subcategory": "Sub-subcategory",
    resource: "Resource",
    admin: "Admin",
    profile: "Profile",
    bookmarks: "Bookmarks",
    about: "About",
    advanced: "Advanced",
    submit: "Submit Resource",
    journeys: "Learning Journeys",
    journey: "Journey",
    login: "Login",
    settings: "Settings",
  };
  if (segments.length === 1) {
    const href = noIndexRoute.has(segments[0]) ? null : path;
    crumbs.push({ label: routeLabels[segments[0]] || deslugify(segments[0]), href });
  } else if (segments.length >= 2) {
    const parentHref = noIndexRoute.has(segments[0]) ? null : `/${segments[0]}`;
    crumbs.push({ label: routeLabels[segments[0]] || deslugify(segments[0]), href: parentHref });
    crumbs.push({ label: deslugify(segments[1]), href: path });
  }
  return crumbs;
}

export default function AppHeader({ onSearchOpen, user, onLogout }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const crumbs = getBreadcrumbs(location);

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-[60px] items-center gap-2 md:gap-[18px] border-b border-border bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] backdrop-blur-[14px] px-3 sm:px-6">
      <SidebarTrigger
        className="-ml-1 shrink-0 min-h-[44px] min-w-[44px]"
        data-testid="mobile-drawer-trigger"
        aria-label="Toggle navigation menu"
      />
      <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 hidden sm:block" />

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {crumbs.flatMap((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            const nodes = [
              <BreadcrumbItem key={`${crumb.href ?? crumb.label}-item`}>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>,
            ];
            if (!isLast) {
              nodes.push(<BreadcrumbSeparator key={`${crumb.href ?? crumb.label}-sep`} />);
            }
            return nodes;
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-w-0 mx-1 sm:mx-2">
        <button
          onClick={onSearchOpen}
          className="w-full max-w-sm flex items-center min-h-[44px] sm:min-h-0 h-11 sm:h-9 rounded-lg border border-input bg-[var(--surface)] px-3 py-1 text-sm transition-colors duration-[var(--motion-fast)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation"
        >
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground truncate hidden sm:inline">Search resources...</span>
          <span className="text-muted-foreground truncate sm:hidden">Search...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded-sm border border-border bg-[var(--surface-2)] px-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-2)] md:flex">
            /
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 min-h-[44px] min-w-[44px] relative touch-manipulation"
          onClick={() => setLocation("/settings/theme")}
          title="Theme Settings"
        >
          <Palette className="h-4 w-4" />
          <span
            className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-background"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </Button>

        {user ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name ? user.name[0].toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setLocation("/profile")} className="min-h-[44px]">
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/bookmarks")} className="min-h-[44px]">
                <Bookmark className="mr-2 h-4 w-4" /> Bookmarks
              </DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem onSelect={() => setLocation("/admin")} className="min-h-[44px]">
                  <Shield className="mr-2 h-4 w-4" /> Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onLogout} className="min-h-[44px]">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setLocation("/login")} className="gap-1.5 h-9 px-2 sm:px-3 min-h-[44px] min-w-[44px]">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Login</span>
          </Button>
        )}
      </div>
    </header>
  );
}
