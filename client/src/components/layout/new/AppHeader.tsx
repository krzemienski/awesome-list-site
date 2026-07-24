import { Link, useLocation } from "wouter";
import { Search, Palette, LogIn, LogOut, User, Bookmark, Shield, MoreHorizontal } from "lucide-react";
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
    // BUG-029 (run19): the tree is loaded and the slug is NOT in it — this is
    // a 404, so say "Not found" instead of title-casing the raw slug into a
    // fake page title. (While the tree is still loading we keep the generic
    // fallback below to avoid a "Not found" flash on valid pages.)
    if (categories?.length) {
      return [
        ...crumbs,
        { label: routeLabels[segments[0]], href: `/${segments[0]}` },
        { label: "Not found", href: path },
      ];
    }
  }
  // BUG-029 (run19): unknown first segments render the NotFound page, so the
  // crumb must say "Not found" — never title-case a bogus slug into a fake
  // page title ("/this-page-does-not-exist" ≠ "This Page Does Not Exist").
  const knownFirstSegments = new Set([
    ...Object.keys(routeLabels),
    "logout",
    "register",
    "forgot-password",
    "reset-password",
    "auth",
    "signup",
    "explore",
    "categories",
    "recommendations",
    "search",
    "subsubcategory",
    "terms",
    "privacy",
    "favorites",
    "account",
  ]);
  if (!knownFirstSegments.has(segments[0])) {
    return [...crumbs, { label: "Not found", href: path }];
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
  // Run16 BUG-058: the key now MATCHES ResourceDetail's ['/api/resources', id]
  // entry (with an equivalent queryFn) so header + page share ONE cache entry
  // and missing resources fire a single GET /api/resources/:id, not two.
  const resourceMatch = location.match(/^\/resource\/(\d+)$/);
  const resourceId = resourceMatch?.[1];
  const { data: crumbResource } = useQuery<{
    id: number;
    title?: string;
    category?: string;
    subcategory?: string;
    subSubcategory?: string;
  }>({
    queryKey: ['/api/resources', resourceId],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${resourceId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Resource not found');
      return response.json();
    },
    enabled: !!resourceMatch,
  });
  if (resourceMatch && crumbResource?.title) {
    const last = crumbs[crumbs.length - 1];
    if (last && last.href === location) {
      last.label = crumbResource.title;
      // Run16 BUG-059: insert the resource's taxonomy chain (category >
      // subcategory > sub-subcategory) so the crumb reflects its real location
      // instead of just "Home > <title>". Slugs come from the shared tree —
      // DB slugs are NOT always slugify(name) (de-duplicated "-sc<id>" suffixes).
      const chain: { label: string; href: string }[] = [];
      const cat = (categories || []).find((c: any) => c.name === crumbResource.category);
      if (cat?.slug) {
        chain.push({ label: cat.name, href: `/category/${cat.slug}` });
        const sub = (cat.subcategories || []).find(
          (s: any) => s.name === crumbResource.subcategory,
        );
        if (sub?.slug) {
          chain.push({ label: sub.name, href: `/subcategory/${sub.slug}` });
          if (crumbResource.subSubcategory) {
            const ss = (sub.subSubcategories || []).find(
              (x: any) => x.name === crumbResource.subSubcategory,
            );
            if (ss?.slug) {
              chain.push({ label: ss.name, href: `/sub-subcategory/${ss.slug}` });
            }
          }
        }
      }
      crumbs.splice(crumbs.length - 1, 0, ...chain);
    }
  }

  // BUG-002 (run22): at 768–917px the md floors (breadcrumb 160px + search
  // 200px + 18px gaps) summed past the 512–661px of header space left by the
  // pinned 256px sidebar, pushing Theme + Sign in off-screen with no drawer
  // fallback. The wide gaps and floors now only apply from lg up; md gets
  // compact gaps and smaller floors so the right-side action cluster
  // (shrink-0) always fits.
  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-[60px] items-center gap-2 lg:gap-[18px] border-b border-border bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] backdrop-blur-[14px] px-3 sm:px-6">
      <SidebarTrigger
        className="-ml-1 shrink-0 min-h-[44px] min-w-[44px]"
        data-testid="mobile-drawer-trigger"
        aria-label="Toggle navigation menu"
      />
      <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 hidden sm:block" />

      {/* BUG-017 (run14): breadcrumb must stay on ONE line inside the fixed
          60px header — at 768px the wrapping chain clipped off-screen. The
          list is nowrap + overflow-hidden and every crumb truncates. */}
      {/* BUG-004 (run19): the nav also needs its own floor — with the search
          trigger refusing to shrink below 200px, an unbounded-basis breadcrumb
          absorbed ALL the flex shrink and clipped to 0px at md, hiding even
          the "Home › …" collapse. 160px keeps Home › … › <truncated title>. */}
      {/* BUG-002 (run22): the 160px floor only from lg — at md it overflowed
          the header (see header comment); 80px still fits the collapsed
          "Home › … › current" trail without clipping to 0 (run19 BUG-004). */}
      <Breadcrumb className="hidden md:flex min-w-0 md:min-w-[80px] lg:min-w-[160px] shrink overflow-hidden">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          {crumbs.flatMap((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            // Run15 BUG-045: the root "Home" crumb is short and must stay a
            // usable link — never let flexbox squeeze it to zero width. Only
            // the deeper (long) crumbs participate in truncation.
            const isRoot = i === 0;
            // Run17 BUG-023: at md–lg widths (768–1023px) there isn't room
            // for the full trail — middle crumbs compressed to unreadable
            // 2–8px slivers. Collapse all middle crumbs into a single
            // ellipsis so only "Home › … › Current" renders, each part
            // readable and clickable.
            // BUG-004 (run19): the same sliver pathology reproduced at
            // exactly lg (1024px) once search kept its 200px floor — the
            // full trail only genuinely fits from xl (1280px) up, so the
            // ellipsis collapse now holds through lg.
            const isMiddle = !isRoot && !isLast;
            const middleVis = "hidden xl:flex min-w-0";
            const nodes = [
              <BreadcrumbItem
                key={`${crumb.href}-item`}
                className={
                  isRoot && !isLast
                    ? "shrink-0"
                    : isMiddle
                      ? middleVis
                      : "min-w-0"
                }
              >
                {/* R5-057 (run24): title attrs — truncated crumbs ("Clou…" vs
                    "Cloud…") were ambiguous with no way to read the full
                    label; the native tooltip disambiguates at every width. */}
                {isLast ? (
                  <BreadcrumbPage className="truncate" title={crumb.label}>
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={crumb.href}
                    className={isRoot ? "whitespace-nowrap" : "truncate"}
                    title={crumb.label}
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>,
            ];
            if (!isLast) {
              nodes.push(
                <BreadcrumbSeparator
                  key={`${crumb.href}-sep`}
                  className={isMiddle ? "hidden xl:flex" : undefined}
                />,
              );
            }
            if (isRoot && crumbs.length > 2) {
              // Run22 BUG-022: the collapsed ellipsis used to be a dead
              // aria-hidden span — the middle crumbs it stood for were
              // unreachable below xl. It is now a real keyboard-focusable
              // menu button listing every hidden crumb as a navigable link.
              const hiddenCrumbs = crumbs.slice(1, -1);
              nodes.push(
                <BreadcrumbItem
                  key="crumb-ellipsis"
                  className="xl:hidden shrink-0"
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Show ${hiddenCrumbs.length} hidden breadcrumb ${hiddenCrumbs.length === 1 ? "level" : "levels"}`}
                      data-testid="button-breadcrumb-ellipsis"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {hiddenCrumbs.map((mid) => (
                        <DropdownMenuItem key={mid.href} asChild>
                          <Link
                            href={mid.href}
                            data-testid={`link-breadcrumb-hidden-${mid.href.split("/").pop()}`}
                          >
                            {mid.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>,
                <BreadcrumbSeparator key="crumb-ellipsis-sep" className="xl:hidden" />,
              );
            }
            return nodes;
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* R5-057 (run24): below md the full trail used to be display:none —
          deep pages had NO location cue at 375/320 (findability gap). Show a
          compact current-page crumb on small screens; it truncates and yields
          space to the search/actions cluster. */}
      {crumbs.length > 1 && (
        <nav
          aria-label="Current page"
          className="flex md:hidden min-w-0 shrink items-center text-sm text-muted-foreground"
          data-testid="breadcrumb-mobile-current"
        >
          <span
            aria-current="page"
            className="truncate max-w-[38vw] text-foreground"
            title={crumbs[crumbs.length - 1].label}
          >
            {crumbs[crumbs.length - 1].label}
          </span>
        </nav>
      )}

      {/* BUG-004 (run19): deep-taxonomy breadcrumbs used to flex-squeeze the
          search trigger to a sliver. Reserve a usable floor for search at md+
          (where the breadcrumb renders) — the breadcrumb, which truncates
          gracefully, absorbs the shrink instead. */}
      {/* BUG-002 (run22): 200px search floor only from lg; at md 110px fits
          the short "Search..." label and returns the overflow budget to the
          right-side controls. */}
      <div className="flex-1 min-w-0 md:min-w-[110px] lg:min-w-[200px] mx-1 sm:mx-2">
        <button
          onClick={onSearchOpen}
          className="w-full max-w-sm flex items-center min-h-[44px] sm:min-h-0 h-11 sm:h-9 rounded-lg border border-input bg-[var(--surface)] px-3 py-1 text-sm transition-colors duration-[var(--motion-fast)] hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation"
          aria-label="Open search"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          {/* Run16 BUG-047: at 768px the trigger is squeezed to ~78px of
              label space, truncating "Search resources..." to "Search re…".
              Show the full label only from lg up; tablet + mobile get the
              short label that fits. */}
          {/* Run25 C-02: on narrow phones the mobile breadcrumb squeezes the
              pill until even "Search..." clips mid-glyph ("S.."). Below 520px
              the pill is icon-only (button keeps aria-label="Open search");
              the label margins moved off the icon so it centers cleanly. */}
          <span className="ml-2 text-muted-foreground truncate hidden lg:inline">Search resources...</span>
          <span className="ml-2 text-muted-foreground truncate hidden min-[520px]:inline lg:hidden">Search...</span>
          {/* BUG-002 (run22): "/" hint from lg (was md) — saves ~20px at
              768–1023px where header space is tightest. */}
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded-sm border border-border bg-[var(--surface-2)] px-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-2)] lg:flex">
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
              {/* Run16 BUG-079: icon-only avatar trigger needs an accessible name. */}
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
                aria-label="Open account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name ? user.name[0].toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                {/* BUG-012 (run24): long names/emails used to overflow the
                    fixed-width menu — truncate the name, wrap the email. */}
                <div className="flex min-w-0 flex-col space-y-1">
                  <p className="truncate text-sm font-medium">{user.name || user.email}</p>
                  <p className="break-all text-xs text-muted-foreground">{user.email}</p>
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
