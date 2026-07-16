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
import { useQuery } from "@tanstack/react-query";

interface AppHeaderProps {
  onSearchOpen: () => void;
  user?: any;
  onLogout?: () => void;
  categories?: any[];
}

// Resolve the true taxonomy parent chain for a category/subcategory/
// sub-subcategory slug so each breadcrumb links to its REAL parent
// (e.g. a subcategory's parent is its category, not a generic "/subcategory"
// route that does not exist). Returns null when the tree has not loaded or the
// slug is unknown, so the caller can fall back to the generic label chain.
function taxonomyCrumbs(
  kind: string,
  slug: string,
  categories: any[],
): { label: string; href: string }[] | null {
  if (!categories?.length) return null;
  for (const cat of categories) {
    if (kind === "category" && cat.slug === slug) {
      return [{ label: cat.name, href: `/category/${cat.slug}` }];
    }
    for (const sub of cat.subcategories || []) {
      if (kind === "subcategory" && sub.slug === slug) {
        return [
          { label: cat.name, href: `/category/${cat.slug}` },
          { label: sub.name, href: `/subcategory/${sub.slug}` },
        ];
      }
      for (const ss of sub.subSubcategories || []) {
        if (kind === "sub-subcategory" && ss.slug === slug) {
          return [
            { label: cat.name, href: `/category/${cat.slug}` },
            { label: sub.name, href: `/subcategory/${sub.slug}` },
            { label: ss.name, href: `/sub-subcategory/${ss.slug}` },
          ];
        }
      }
    }
  }
  return null;
}

function getBreadcrumbs(path: string, categories: any[] = []) {
  if (path === "/") return [{ label: "Home", href: "/" }];
  const segments = path.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
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
    login: "Sign in",
    settings: "Settings",
  };
  // Taxonomy routes get a real parent chain resolved from the tree.
  if (
    segments.length >= 2 &&
    ["category", "subcategory", "sub-subcategory"].includes(segments[0])
  ) {
    const resolved = taxonomyCrumbs(segments[0], segments[1], categories);
    if (resolved) return [...crumbs, ...resolved];
  }
  if (segments.length === 1) {
    crumbs.push({ label: routeLabels[segments[0]] || deslugify(segments[0]), href: path });
  } else if (segments.length >= 2) {
    if (segments[0] === "journey") {
      // BUG-029 (run13): the intermediate crumb must point at the real listing
      // page (/journeys), not the bare /journey redirect stub.
      crumbs.push({ label: "Learning Journeys", href: "/journeys" });
      crumbs.push({ label: deslugify(segments[1]), href: path });
    } else if (segments[0] === "resource") {
      // BUG-041 (run13): there is no /resource listing page — the old
      // intermediate "Resource" crumb was a dead link, so it's dropped.
      crumbs.push({ label: deslugify(segments[1]), href: path });
    } else {
      crumbs.push({ label: routeLabels[segments[0]] || deslugify(segments[0]), href: `/${segments[0]}` });
      crumbs.push({ label: deslugify(segments[1]), href: path });
    }
  }
  return crumbs;
}

export default function AppHeader({ onSearchOpen, user, onLogout, categories }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const crumbs = getBreadcrumbs(location, categories || []);

  // BUG-020 (run9): on /journey/:id the generic crumb chain ends in the raw
  // numeric id ("Home > Journey > 6"). Resolve the journey title from the
  // journeys list (tiny payload, shared cache with the Journeys page) and
  // swap it in once loaded. Query only runs on journey routes.
  const journeyMatch = location.match(/^\/journey\/(\d+)$/);
  const { data: journeyList } = useQuery<{ id: number; title: string }[]>({
    queryKey: ["/api/journeys"],
    enabled: !!journeyMatch,
    staleTime: 5 * 60 * 1000,
  });
  if (journeyMatch && Array.isArray(journeyList)) {
    const j = journeyList.find((x) => x.id === Number(journeyMatch[1]));
    if (j?.title) {
      const last = crumbs[crumbs.length - 1];
      if (last && last.href === location) last.label = j.title;
    }
  }

  // BUG-017 (run10): same treatment for /resource/:id — the generic crumb
  // chain ends in the raw numeric id ("Home > Resource > 2711"). Resolve the
  // resource title from the detail endpoint and swap it in once loaded.
  // Note: single-string key (default fetcher reads queryKey[0] only) — this is
  // a separate cache entry from ResourceDetail's ['/api/resources', id] key.
  const resourceMatch = location.match(/^\/resource\/(\d+)$/);
  const { data: crumbResource } = useQuery<{ id: number; title?: string }>({
    queryKey: [`/api/resources/${resourceMatch?.[1]}`],
    enabled: !!resourceMatch,
    staleTime: 5 * 60 * 1000,
  });
  if (resourceMatch && crumbResource?.title) {
    const last = crumbs[crumbs.length - 1];
    if (last && last.href === location) last.label = crumbResource.title;
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-[60px] items-center gap-2 md:gap-[18px] border-b border-border bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] backdrop-blur-[14px] px-3 sm:px-6">
      <SidebarTrigger
        className="-ml-1 shrink-0 min-h-[44px] min-w-[44px]"
        data-testid="mobile-drawer-trigger"
        aria-label="Toggle navigation menu"
      />
      <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 hidden sm:block" />

      {/* BUG-017 (run14): breadcrumb must stay on ONE line inside the fixed
          60px header — at 768px the wrapping chain clipped off-screen. The
          list is nowrap + overflow-hidden and every crumb truncates. */}
      <Breadcrumb className="hidden md:flex min-w-0 shrink overflow-hidden">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          {crumbs.flatMap((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            const nodes = [
              <BreadcrumbItem key={`${crumb.href}-item`} className="min-w-0">
                {isLast ? (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href} className="truncate">{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>,
            ];
            if (!isLast) {
              nodes.push(<BreadcrumbSeparator key={`${crumb.href}-sep`} />);
            }
            return nodes;
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-w-0 mx-1 sm:mx-2">
        <button
          onClick={onSearchOpen}
          className="w-full max-w-sm flex items-center min-h-[44px] sm:min-h-0 h-11 sm:h-9 rounded-lg border border-input bg-[var(--surface)] px-3 py-1 text-sm transition-colors duration-[var(--motion-fast)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation"
          aria-label="Open search"
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
          aria-label="Theme Settings"
        >
          <Palette className="h-4 w-4" />
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
          // BUG-025 (run9): "Sign in" everywhere — matches the /login page and
          // register flow instead of mixing "Login" and "Sign in".
          <Button variant="ghost" size="sm" onClick={() => {
            // BUG-023 (run13): carry the current page as a safe ?next= so
            // signing in returns the user here (login already validates it).
            const here = window.location.pathname + window.location.search;
            const skipNext = here === "/" || here.startsWith("/login") || here.startsWith("/register");
            setLocation(skipNext ? "/login" : `/login?next=${encodeURIComponent(here)}`);
          }} aria-label="Sign in" className="gap-1.5 h-9 px-2 sm:px-3 min-h-[44px] min-w-[44px]">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Button>
        )}
      </div>
    </header>
  );
}
