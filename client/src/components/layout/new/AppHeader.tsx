import { Link, useLocation } from "wouter";
import { Bookmark, Bell, Settings, User, LogOut, LogIn, Palette, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useGuestBookmarkIds } from "@/lib/guestBookmarks";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { useAuth } from "@/hooks/useAuth";
import type { AwesomeListNavNode } from "@/lib/static-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "@/styles/shell/header.css";

interface AppHeaderProps {
  onSearchOpen: () => void;
  user?: ReturnType<typeof useAuth>["user"];
  onLogout?: () => void;
  logoutError?: string | null;
  categories?: AwesomeListNavNode[];
}

// Same recursive sum as Home's navTotalCount; never fetch the full corpus.
function totalCount(node: AwesomeListNavNode): number {
  return node.resourceCount
    + (node.subcategories ?? []).reduce((n, child) => n + totalCount(child), 0)
    + (node.subSubcategories ?? []).reduce((n, child) => n + totalCount(child), 0);
}

function SearchIcon() {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="5" /><path d="M11 11 L14 14" />
  </svg>;
}

export default function AppHeader({ onSearchOpen, user, onLogout, logoutError, categories = [] }: AppHeaderProps) {
  const [location, navigate] = useLocation();
  const guestSavedCount = useGuestBookmarkIds().size;
  const { data: notificationState } = useQuery<{ unreadCount: number }>({
    queryKey: ["/api/notifications?limit=50"],
    enabled: Boolean(user),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadCount = notificationState?.unreadCount ?? 0;
  const count = categories
    .filter(c => !["Table of contents", "Contributing", "License", "External Links", "Anti-features"].includes(c.name) && !c.name.startsWith("List of"))
    .reduce((sum, node) => sum + totalCount(node), 0);
  const firstName = user?.name?.trim() ? user.name.trim().split(/\s+/)[0] : "Account";
  const role = user?.role === "admin" ? "Admin" : user ? "Member" : "Visitor";
  const signIn = () => {
    const here = window.location.pathname + window.location.search;
    const skipNext = here === "/" || here.startsWith("/sign-in") || here.startsWith("/sign-up");
    navigate(skipNext ? "/sign-in" : `/sign-in?redirect_url=${encodeURIComponent(here)}`);
  };
  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`nav-link${location === href || (href === "/categories" && location === "/") ? " active" : ""}`}
      aria-current={location === href || (href === "/categories" && location === "/") ? "page" : undefined}
    >
      {label}
    </Link>
  );

  return <>
    <header className="app-canonical-header">
      <span className="header-menu-control">
        <SidebarTrigger className="mobile-menu-btn" data-testid="mobile-drawer-trigger" aria-label="Toggle sidebar" />
        <svg className="header-menu-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4 H14 M2 8 H14 M2 12 H14" /></svg>
      </span>
      <Link href="/" className="header-brand" aria-label="Awesome Video — home" data-testid="header-brand">
        <span className="header-logo" aria-hidden="true" data-testid="brand-mark">av</span>
        <span className="header-wordmark hide-tablet">AWESOME.VIDEO</span>
      </Link>
      <div className="header-spacer" />
      {/* One responsive control preserves the existing search selector and focus
          restoration contract without a hidden duplicate winning querySelector. */}
      <button type="button" onClick={onSearchOpen} className="header-search-trigger" aria-label="Open search">
        <SearchIcon />
        <span className="header-search-label">Search <span>{categories.length ? count.toLocaleString() : "…"} resources…</span></span>
        <span className="header-kbd hide-mobile">⌘K</span>
      </button>
      <nav className="header-nav hide-tablet" aria-label="Primary">
        {navLink("/categories", "Browse")}
        {navLink("/submit", "Submit")}
        {navLink("/about", "About")}
        <a className="nav-link" href="/design-system" target="_blank" rel="noopener noreferrer">Docs ↗</a>
        {user?.role === "admin" && <Link href="/admin" className={`nav-link${location.startsWith("/admin") ? " active" : ""}`} aria-current={location.startsWith("/admin") ? "page" : undefined}>Admin<span className="header-live-dot" aria-hidden="true" /></Link>}
      </nav>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="user-pill" aria-label={`Account · ${role}`}>
            {user ? <Avatar className="header-avatar">
              <AvatarImage src={user.avatar} alt="" />
              <AvatarFallback>{firstName[0].toUpperCase()}</AvatarFallback>
            </Avatar> : <span className="header-avatar"><LogIn size={12} aria-hidden="true" /></span>}
            <span className="header-account-name hide-mobile">{user ? firstName : "Sign in"}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="header-account-menu w-56" align="end" sideOffset={8}>
          <DropdownMenuLabel className="font-normal">
            {user ? <div className="flex min-w-0 flex-col space-y-1">
              <p className="truncate text-sm font-medium">{user.name?.trim() ? user.name : user.email}</p>
              <p className="break-all text-xs text-muted-foreground">{user.email}</p>
            </div> : "Your account"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!user && <DropdownMenuItem onSelect={signIn} aria-label="Sign in"><LogIn className="mr-2 h-4 w-4" />Sign in</DropdownMenuItem>}
          {user && <>
            <DropdownMenuItem onSelect={() => navigate("/profile")}><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/bookmarks")}><Bookmark className="mr-2 h-4 w-4" />Bookmarks</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/notifications")} data-testid="button-notifications" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}>
              <Bell className="mr-2 h-4 w-4" />Notifications
              {unreadCount > 0 && <span className="ml-auto" data-testid="badge-notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate("/settings")}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
          </>}
          {!user && guestSavedCount > 0 && <DropdownMenuItem onSelect={() => navigate("/bookmarks")} data-testid="button-guest-saved" aria-label={`Saved resources, ${guestSavedCount} on this device`}>
            <Bookmark className="mr-2 h-4 w-4" />Saved resources <span className="ml-auto" data-testid="badge-guest-saved-count">{guestSavedCount > 99 ? "99+" : guestSavedCount}</span>
          </DropdownMenuItem>}
          <DropdownMenuItem onSelect={() => navigate("/settings/theme")} aria-label="Theme Settings" title="Theme settings"><Palette className="mr-2 h-4 w-4" />Theme Settings</DropdownMenuItem>
          {user?.role === "admin" && <DropdownMenuItem onSelect={() => navigate("/admin")}><Shield className="mr-2 h-4 w-4" />Admin</DropdownMenuItem>}
          {user && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={onLogout}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></>}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
    {logoutError && <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm font-medium text-destructive" role="alert" data-testid="banner-logout-error">Sign out failed. {logoutError}</div>}
  </>;
}