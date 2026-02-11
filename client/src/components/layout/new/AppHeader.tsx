import { Fragment } from "react";
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
    login: "Login",
    settings: "Settings",
  };
  if (segments.length === 1) {
    crumbs.push({ label: routeLabels[segments[0]] || deslugify(segments[0]), href: path });
  } else if (segments.length >= 2) {
    crumbs.push({ label: routeLabels[segments[0]] || deslugify(segments[0]), href: `/${segments[0]}` });
    crumbs.push({ label: deslugify(segments[1]), href: path });
  }
  return crumbs;
}

export default function AppHeader({ onSearchOpen, user, onLogout }: AppHeaderProps) {
  const { activeTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const crumbs = getBreadcrumbs(location);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 hidden sm:block" />

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                {i < crumbs.length - 1 ? (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-w-0 mx-1 sm:mx-2">
        <button
          onClick={onSearchOpen}
          className="w-full max-w-sm flex items-center h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent"
        >
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground truncate hidden sm:inline">Search resources...</span>
          <span className="text-muted-foreground truncate sm:hidden">Search...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:flex">
            /
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          onClick={() => setLocation("/settings/theme")}
          title="Theme Settings"
        >
          <Palette className="h-4 w-4" />
          <span
            className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-background"
            style={{ backgroundColor: activeTheme.preview.accent }}
          />
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name ? user.name[0].toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile"><User className="mr-2 h-4 w-4" /> Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bookmarks"><Bookmark className="mr-2 h-4 w-4" /> Bookmarks</Link>
              </DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin"><Shield className="mr-2 h-4 w-4" /> Admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/api/login")} className="gap-1.5 h-9 px-2 sm:px-3">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Login</span>
          </Button>
        )}
      </div>
    </header>
  );
}
