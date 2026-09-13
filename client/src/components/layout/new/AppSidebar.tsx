import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo, useRef, useId, type ReactNode } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Plus,
  BookOpen,
  Zap,
  Shield,
  ChevronRight,
  Info,
  Palette,
  Search,
} from "lucide-react";
import { cn, slugify, getCategorySlug } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { getCategoryIcon } from "@/config/navigation-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import "@/styles/shell/sidebar.css";
import "@/styles/shell/drawer.css";

/**
 * Run22 BUG-008: the sidebar renders from the lightweight nav tree
 * (name/slug/resourceCount, no resource arrays) so cold loads of non-listing
 * pages never download the 2.7MB corpus. The corpus shape (resources arrays)
 * is still accepted for compatibility.
 */
interface NavCategory {
  name: string;
  slug?: string;
  resourceCount?: number;
  resources?: any[];
  subcategories?: NavCategory[];
  subSubcategories?: NavCategory[];
}

interface AppSidebarProps {
  categories: NavCategory[];
  totalResources: number;
  isLoading: boolean;
  // R5-024 (run24): true when the nav tree fetch failed — the header subtitle
  // resolves to a neutral label instead of showing "Loading…" forever.
  navError?: boolean;
  // R5-024 (run25): retry the nav fetch from the sidebar's error state, mirroring
  // the /categories card's Retry button — so a failed fetch never masquerades as
  // an empty "No categories." list.
  onRetryNav?: () => void;
  user?: any;
}

/* -------- helpers -------- */

function getTotalResourceCount(item: any): number {
  let total = item.resources ? item.resources.length : (item.resourceCount ?? 0);
  if (item.subcategories) {
    total += item.subcategories.reduce(
      (sum: number, sub: any) => sum + getTotalResourceCount(sub),
      0,
    );
  }
  if (item.subSubcategories) {
    total += item.subSubcategories.reduce(
      (sum: number, ss: any) => sum + getTotalResourceCount(ss),
      0,
    );
  }
  return total;
}

function filterCategories(categories: NavCategory[]) {
  return categories
    .filter(
      (cat) =>
        cat.name !== "Table of contents" &&
        !cat.name.startsWith("List of") &&
        !["Contributing", "License", "External Links", "Anti-features"].includes(
          cat.name,
        ) &&
        // Drop top-level categories that contain no resources at all (e.g. the
        // "Categories"/"Projects"/"Resources" meta-entries). Mirrors the
        // count>0 filter Home uses so the nav and landing page agree on which
        // categories are real. Empty SUBcategories are still kept (dimmed)
        // below — this only removes wholly empty top-level entries.
        getTotalResourceCount(cat) > 0,
    )
    .map((cat) => {
      // BUG-006: hide wholly empty subcategories / sub-subcategories from the
      // nav. (This reverses follow-up #51's "keep dimmed empties visible"
      // decision.) On the clean dev tree every node has resources so this is a
      // no-op; on prod it removes the empty rows the QA audit flagged. Counts
      // still reconcile because an empty node contributes 0 to the parent sum.
      const subcategories = (cat.subcategories ?? [])
        .map((sub) => ({
          ...sub,
          subSubcategories: (sub.subSubcategories ?? []).filter(
            (ss) => getTotalResourceCount(ss) > 0,
          ),
        }))
        .filter((sub) => getTotalResourceCount(sub) > 0);
      return { ...cat, subcategories };
    });
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/* -------- sub-rows -------- */

function SubItem({
  label,
  count,
  href,
  active,
  onClick,
  testId,
  italic = false,
  size = "sm",
}: {
  label: string;
  count?: number;
  href: string;
  active: boolean;
  onClick: () => void;
  testId?: string;
  italic?: boolean;
  size?: "sm" | "xs";
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      data-testid={testId}
      data-active={active || undefined}
      className={cn(
        "sub-item touch-manipulation min-h-[44px] no-underline w-full",
        size === "xs" && "text-[12px]",
        italic && "italic",
      )}
      style={
        active
          ? {
              color: "var(--accent)",
              background: "color-mix(in srgb, var(--accent) 8%, transparent)",
              borderColor:
                "color-mix(in srgb, var(--accent) 25%, var(--border))",
            }
          : count === 0
            ? { opacity: 0.45 }
            : undefined
      }
      title={count === 0 ? `${label} (no resources yet)` : label}
    >
      <span className="flex-1 min-w-0 break-words" title={label}>{label}</span>
      {typeof count === "number" && (
        <span
          className="font-mono shrink-0 tabular-nums"
          style={{ fontSize: 12, color: "var(--text-3)" }}
          // BUG-049 (run19): bare numbers were ambiguous next to the labeled
          // "N resources" header — give every count an explicit unit for
          // assistive tech and a hover title for sighted users.
          title={`${formatCount(count)} ${count === 1 ? "resource" : "resources"}`}
          aria-label={`${formatCount(count)} ${count === 1 ? "resource" : "resources"}`}
        >
          {formatCount(count)}
        </span>
      )}
      {count === 0 && (
        <span
          className="italic shrink-0"
          style={{ fontSize: 12, color: "var(--text-3)" }}
        >
          (empty)
        </span>
      )}
    </a>
  );
}

/* -------- top-level accordion category -------- */

function MeasuredAccordionBody({
  id, open, children,
}: { id: string; open: boolean; children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => setHeight(content.scrollHeight);
    measure();
    // Watch the unclipped content: wrapped labels, fonts, responsive widths
    // and nested accordion animations can all change its actual height.
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  return (
    <div id={id} className="accordion-body"
      style={{ maxHeight: open ? height : 0 }}
      {...(!open ? ({ inert: "" } as any) : {})}>
      <div ref={contentRef} className="flow-root">{children}</div>
    </div>
  );
}

function CategoryAccordion({
  cat,
  isOpen,
  onToggle,
  isActive,
  activePath,
  activeSearch,
  navigate,
  matchQuery,
  openSubs,
  toggleSub,
}: {
  cat: NavCategory;
  isOpen: boolean;
  onToggle: () => void;
  isActive: boolean;
  activePath: string;
  activeSearch: string;
  navigate: (path: string) => void;
  matchQuery: string;
  openSubs: string[];
  toggleSub: (key: string) => void;
}) {
  const subKey = (subName: string) => `${cat.name}::${subName}`;
  const CategoryIcon = getCategoryIcon(cat.name);
  const catSlug = cat.slug || getCategorySlug(cat.name);
  // Tablet can mount both the sidebar and drawer; disclosure IDs must belong
  // to the mounted instance, not just the shared category.
  const instanceId = useId();
  const bodyId = `accordion-body-${catSlug}-${instanceId}`;
  const catPath = `/category/${catSlug}`;
  const subs = cat.subcategories || [];
  // Single source of truth: the recursive tree-sum over the DB-derived
  // /api/awesome-list hierarchy. The backend folds orphaned resources into the
  // nearest valid node, so this always equals COUNT(*) WHERE category = X and
  // always equals (direct + sum of child badges) — no "mixed validators".
  const totalCount = getTotalResourceCount(cat);

  // Resources assigned to this category but to no subcategory. They are real
  // and reachable on the category page, but without a "General" line the child
  // badges never sum to the category badge. Surfacing them here makes the sidebar
  // math reconcile: sum(subcategory badges) + General badge === category badge.
  const directCount = cat.resources
    ? cat.resources.length
    : (cat.resourceCount ?? 0);
  // audit2 BUG-030: the canonical content-filter key is ?filter=general now
  // (?view= carries layout only); the legacy ?view=general alias still
  // counts as active so old links highlight correctly.
  const generalPath = `${catPath}?filter=general`;
  const generalActive =
    activePath === catPath &&
    (new URLSearchParams(activeSearch).get("filter") === "general" ||
      new URLSearchParams(activeSearch).get("view") === "general");

  // Semantic split (post-architect-review):
  //  - The row is a <Link> (real navigation semantics; right-click/cmd-click
  //    opens in new tab; assistive tech announces it as "link").
  //  - The chevron is a sibling <button> with aria-expanded/aria-controls
  //    pointing at the accordion body. It is the SOLE owner of disclosure
  //    semantics — `aria-expanded` is no longer on the row.
  //  - No nested interactive controls: Link and Button are siblings inside
  //    a non-interactive flex container that keeps the row visual.

  return (
    <div className="accordion-item">
      <div
        className={cn("accordion-header", isActive && "active", "flex items-center w-full")}
        data-testid={`accordion-cat-${catSlug}`}
        data-state={isOpen ? "open" : "closed"}
        title={cat.name}
      >
        {/* BUG-043 (audit2): the category label link measured 24px tall in the
            mobile drawer (the 44px expander alone carried the row height) —
            give the link itself a 44px floor in the drawer, 36px on md+. */}
        <Link
          href={catPath}
          data-testid={`row-cat-${catSlug}`}
          aria-label={`Open ${cat.name} category page`}
          className="flex items-center gap-[10px] min-w-0 flex-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-sm min-h-[44px] md:min-h-[36px]"
        >
          <span
            className="flex items-center justify-center shrink-0"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: isActive
                ? "color-mix(in srgb, var(--accent) 22%, transparent)"
                : "color-mix(in srgb, var(--text) 4%, transparent)",
              color: isActive ? "var(--accent)" : "var(--text-2)",
            }}
          >
            <CategoryIcon className="size-[13px]" />
          </span>
          <span
            className="min-w-0 break-words"
            title={cat.name}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? "var(--text)" : "var(--text-2)",
            }}
          >
            {cat.name}
          </span>
        </Link>
        <span className="flex items-center gap-2 shrink-0 pl-2">
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 12, color: "var(--text-3)" }}
            // BUG-049 (run19): unit-label the category badge like the header's
            // "N resources" so the bare number is unambiguous.
            title={`${formatCount(totalCount)} ${totalCount === 1 ? "resource" : "resources"}`}
            aria-label={`${formatCount(totalCount)} ${totalCount === 1 ? "resource" : "resources"}`}
          >
            {formatCount(totalCount)}
          </span>
          {/* P1 — removed redundant "→" page-link span; chevron is the single
              disclosure control per ref 01 sidebar. */}
          {(subs.length > 0 || directCount > 0) && (
            <button
              type="button"
              onClick={onToggle}
              title={isOpen ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
              aria-label={isOpen ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
              aria-expanded={isOpen}
              aria-controls={bodyId}
              data-testid={`toggle-cat-${catSlug}`}
              className="inline-flex items-center justify-center w-10 min-w-10 min-h-[44px] -mx-2 rounded-sm text-[var(--text-3)] hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <ChevronRight className={cn("size-3 shrink-0 chevron-rotate", isOpen && "rotate-90")} />
            </button>
          )}
        </span>
      </div>

      {(subs.length > 0 || directCount > 0) && (
        <MeasuredAccordionBody id={bodyId} open={isOpen}>
          <div className="accordion-body-inner">
            {/* P4 — removed "All in {cat.name} →" link; not present in ref 09/10.
                Users open the category page by clicking the category row itself. */}
            {subs
              .filter(
                (sub) =>
                  !matchQuery ||
                  sub.name.toLowerCase().includes(matchQuery.toLowerCase()) ||
                  cat.name.toLowerCase().includes(matchQuery.toLowerCase()),
              )
              .map((sub) => {
                const subSlug = sub.slug || slugify(sub.name);
                const subPath = `/subcategory/${subSlug}`;
                const subActive = activePath === subPath;
                const subCount = getTotalResourceCount(sub);
                const subSubs = sub.subSubcategories || [];
                const subOpen = openSubs.includes(subKey(sub.name));

                if (subSubs.length === 0) {
                  return (
                    <SubItem
                      key={sub.name}
                      label={sub.name}
                      count={subCount}
                      href={subPath}
                      active={subActive}
                      onClick={() => navigate(subPath)}
                      testId={`sub-${subSlug}`}
                    />
                  );
                }

                return (
                  <div key={sub.name}>
                    <div className="flex items-stretch gap-[2px]">
                      <button
                        type="button"
                        onClick={() => toggleSub(subKey(sub.name))}
                        aria-label={`Toggle ${sub.name}`}
                        aria-expanded={subOpen}
                        aria-controls={`${bodyId}-sub-${subSlug}`}
                        data-state={subOpen ? "open" : "closed"}
                        data-testid={`expand-sub-${subSlug}`}
                        className="shrink-0 inline-flex items-center justify-center w-10 min-w-10 min-h-[44px] -mx-2 rounded-md hover:bg-[var(--surface)] text-[var(--text-3)] hover:text-[var(--text)]"
                      >
                        <ChevronRight className={cn("size-3 chevron-rotate", subOpen && "rotate-90")} />
                      </button>
                      <SubItem
                        label={sub.name}
                        count={subCount}
                        href={subPath}
                        active={subActive}
                        onClick={() => navigate(subPath)}
                        testId={`sub-${subSlug}`}
                      />
                    </div>
                    <MeasuredAccordionBody id={`${bodyId}-sub-${subSlug}`} open={subOpen}>
                      <div
                        style={{
                          paddingLeft: 22,
                          marginTop: 2,
                          marginBottom: 4,
                          borderLeft: "1px solid var(--border)",
                          marginLeft: 10,
                        }}
                      >
                        {subSubs.map((ss) => {
                          const ssSlug = ss.slug || slugify(ss.name);
                          const ssPath = `/sub-subcategory/${ssSlug}`;
                          return (
                            <SubItem
                              key={ss.name}
                              label={ss.name}
                              count={getTotalResourceCount(ss)}
                              href={ssPath}
                              active={activePath === ssPath}
                              onClick={() => navigate(ssPath)}
                              testId={`subsub-${ssSlug}`}
                              size="xs"
                            />
                          );
                        })}
                      </div>
                    </MeasuredAccordionBody>
                  </div>
                );
              })}
            {directCount > 0 &&
              (!matchQuery ||
                cat.name.toLowerCase().includes(matchQuery.toLowerCase()) ||
                "uncategorized".includes(matchQuery.toLowerCase())) && (
                <SubItem
                  label="Uncategorized"
                  count={directCount}
                  href={generalPath}
                  active={generalActive}
                  onClick={() => navigate(generalPath)}
                  testId={`sub-uncategorized-${catSlug}`}
                  italic
                />
              )}

          </div>
        </MeasuredAccordionBody>
      )}
    </div>
  );
}

/* -------- main sidebar -------- */

export default function AppSidebar({
  categories,
  totalResources,
  isLoading,
  navError,
  onRetryNav,
  user,
}: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const activeSearch = useSearch();
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openSubcategories, setOpenSubcategories] = useState<string[]>([]);
  const { setOpenMobile, isMobile, isDrawer, isPhone, openMobile } = useSidebar();

  const filtered = useMemo(() => filterCategories(categories), [categories]);

  /* auto-expand active category and subcategory on route change */
  useEffect(() => {
    if (categories.length === 0) return;
    const parts = location.split("/");
    if (
      parts[1] === "category" ||
      parts[1] === "subcategory" ||
      parts[1] === "sub-subcategory"
    ) {
      const slug = parts[2];
      const matchCat = categories.find(
        (cat) =>
          getCategorySlug(cat.name) === slug ||
          cat.subcategories?.some((sub) => sub.slug === slug) ||
          cat.subcategories?.some((sub) =>
            sub.subSubcategories?.some((ss) => ss.slug === slug),
          ),
      );
      if (matchCat) {
        setOpenCategories((prev) =>
          prev.includes(matchCat.name) ? prev : [...prev, matchCat.name],
        );
        if (parts[1] === "sub-subcategory") {
          const matchSub = matchCat.subcategories?.find((sub) =>
            sub.subSubcategories?.some((ss) => ss.slug === slug),
          );
          if (matchSub) {
            const key = `${matchCat.name}::${matchSub.name}`;
            setOpenSubcategories((prev) =>
              prev.includes(key) ? prev : [...prev, key],
            );
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, location]);

  /* BUG-011 (run26): deep links must bring the active tree item into the
     sidebar scrollport — auto-expansion alone can leave it below the fold on
     long trees. Wait out the accordion max-height transition, then nudge the
     LAST [data-active] match (tree items render after the nav quick-links, and
     data-active is only present when active) into view; block:'nearest' is a
     no-op when it's already visible. Re-runs when the mobile drawer opens,
     since its content only becomes scrollable/visible at that point. */
  useEffect(() => {
    if (categories.length === 0) return;
    if (isPhone && !openMobile) return;
    const t = setTimeout(() => {
      const surface = openMobile ? ".av-sidebar-drawer" : ".av-sidebar-shell";
      const matches = document.querySelectorAll<HTMLElement>(
        `${surface} [data-active]`,
      );
      const el = matches[matches.length - 1];
      el?.scrollIntoView({ block: "nearest" });
    }, 350);
    return () => clearTimeout(t);
  }, [categories, location, isPhone, openMobile]);

  // A route can change from a breadcrumb, browser history, or another shell
  // surface rather than one of the drawer's own links. Keep the drawer closed
  // after every such navigation and let Radix restore focus to the trigger.
  useEffect(() => {
    setOpenMobile(false);
  }, [location, activeSearch, setOpenMobile]);

  const navigate = (path: string) => {
    setLocation(path);
    setOpenMobile(false);
  };

  const normalizePath = (p: string) => {
    try {
      const decoded = decodeURIComponent(p);
      return decoded.length > 1 && decoded.endsWith("/")
        ? decoded.slice(0, -1)
        : decoded;
    } catch {
      return p;
    }
  };
  const activePath = normalizePath(location);
  const isActive = (path: string) => activePath === normalizePath(path);

  const navItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Submit Resource", icon: Plus, href: "/submit" },
    { label: "Learning Journeys", icon: BookOpen, href: "/journeys" },
    { label: "Advanced", icon: Zap, href: "/advanced" },
    { label: "Theme", icon: Palette, href: "/settings/theme" },
  ];

  const totalCats = filtered.length;
  const totalSubcategories = filtered.reduce(
    (total, category) => total + (category.subcategories?.length ?? 0),
    0,
  );

  const brandHeader = (
    <SidebarHeader className="av-sidebar-drawer-header border-b p-0">
      <Link
        href="/"
        onClick={() => setOpenMobile(false)}
        aria-label="Awesome Video home"
        className="flex min-h-7 items-center gap-[10px] px-0 py-0 no-underline"
      >
        <BrandMark className="size-7 shrink-0" />
        <span className="av-sidebar-drawer-wordmark">
          AWESOME.VIDEO
          <span className="sr-only" data-testid="sidebar-resource-count">
            {navError && totalResources === 0
              ? "Catalog unavailable"
              : isLoading || totalResources === 0
                ? "Loading resources"
                : `${totalResources.toLocaleString()} resources`}
          </span>
        </span>
      </Link>
    </SidebarHeader>
  );

  const categoryList = (
    <div className="av-sidebar-category-list">
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="accordion-item"
              style={{ padding: "13px 18px" }}
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-5 rounded" />
                <Skeleton
                  className="h-3 rounded"
                  style={{ width: `${55 + ((i * 17) % 30)}%` }}
                />
              </div>
            </div>
          ))
        : filtered.map((cat) => {
            const isOpen = openCategories.includes(cat.name);
            const catSlug = cat.slug || getCategorySlug(cat.name);
            const catActive =
              activePath === `/category/${catSlug}` ||
              (cat.subcategories?.some(
                (s) =>
                  activePath === `/subcategory/${s.slug || slugify(s.name)}`,
              ) ??
                false) ||
              (cat.subcategories?.some((s) =>
                s.subSubcategories?.some(
                  (ss) =>
                    activePath ===
                    `/sub-subcategory/${ss.slug || slugify(ss.name)}`,
                ),
              ) ??
                false);

            return (
              <CategoryAccordion
                key={cat.name}
                cat={cat}
                isOpen={isOpen}
                onToggle={() =>
                  setOpenCategories((prev) =>
                    prev.includes(cat.name)
                      ? prev.filter((c) => c !== cat.name)
                      : [...prev, cat.name],
                  )
                }
                isActive={catActive}
                activePath={activePath}
                activeSearch={activeSearch}
                navigate={navigate}
                matchQuery=""
                openSubs={openSubcategories}
                toggleSub={(name) =>
                  setOpenSubcategories((prev) =>
                    prev.includes(name)
                      ? prev.filter((s) => s !== name)
                      : [...prev, name],
                  )
                }
              />
            );
          })}
      {/* R5-024: a failed nav fetch must NOT masquerade as an empty list.
          When the fetch errored and we have nothing cached to show, render
          the same error/retry affordance the /categories card uses. The
          genuine empty-state copy is reserved for a SUCCESSFUL empty
          response (navError false, not loading, zero categories). */}
      {navError && filtered.length === 0 ? (
        <div
          className="px-4 py-6 text-center flex flex-col items-center gap-2"
          role="alert"
          style={{ color: "var(--text-3)", fontSize: 12 }}
          data-testid="sidebar-nav-error"
        >
          <span>Couldn't load categories.</span>
          {onRetryNav && (
            <button
              type="button"
              onClick={() => onRetryNav()}
              className="underline underline-offset-2 font-medium min-h-[44px] md:min-h-[36px]"
              style={{ color: "var(--text-2)" }}
              data-testid="sidebar-nav-retry"
            >
              Retry
            </button>
          )}
        </div>
      ) : (
        !isLoading &&
        filtered.length === 0 && (
          <div
            className="px-4 py-6 text-center"
            style={{ color: "var(--text-3)", fontSize: 12 }}
            data-testid="sidebar-nav-empty"
          >
            No categories.
          </div>
        )
      )}
    </div>
  );

  const drawerNavItems = [
    { label: "Home", icon: Home, href: "/", testId: "nav-home" },
    {
      label: "Submit",
      icon: Plus,
      href: "/submit",
      testId: "nav-submit-resource",
    },
    {
      label: "About",
      icon: BookOpen,
      href: "/about",
      testId: "footer-about",
    },
  ];
  const drawerMoreItems = navItems.slice(2);
  const desktopMoreItems = [
    ...navItems.slice(1).map((item) => ({
      ...item,
      testId: `nav-${slugify(item.label)}`,
    })),
    ...(user?.role === "admin"
      ? [{ label: "Admin", icon: Shield, href: "/admin", testId: "nav-admin" }]
      : []),
    { label: "About", icon: Info, href: "/about", testId: "footer-about" },
  ];

  const renderMoreNavigation = (
    items: Array<{
      label: string;
      icon: typeof Home;
      href: string;
      testId?: string;
    }>,
    className = "",
  ) => (
    <details className={`av-sidebar-more-navigation ${className}`}>
      <summary className="flex min-h-[44px] cursor-pointer items-center px-3 text-xs font-medium text-[var(--text-2)]">
        More navigation
      </summary>
      <SidebarMenu className="px-2 pb-2">
        {items.map((item) => {
          const MoreIcon = item.icon;
          return (
            <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild className="min-h-[44px]" isActive={isActive(item.href)}>
            <a
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href);
              }}
              data-testid={item.testId ?? `nav-${slugify(item.label)}`}
              data-active={isActive(item.href) || undefined}
              className="sub-item touch-manipulation min-h-[44px] no-underline w-full"
            >
              <span className="flex min-w-0 items-center gap-[10px]">
                <MoreIcon className="size-[14px] shrink-0" />
                <span className="break-words">{item.label}</span>
              </span>
            </a>
            </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </details>
  );

  const drawerContent = (
    <>
      {brandHeader}
      <form
        className="av-sidebar-drawer-search"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const query = new FormData(form).get("q")?.toString() ?? "";
          navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <div className="av-sidebar-drawer-search-control">
          <Search aria-hidden="true" className="size-[14px] shrink-0" />
          <input
            type="search"
            className="search-input"
            name="q"
            placeholder="Search..."
            aria-label="Search navigation"
          />
        </div>
      </form>
      <nav className="av-sidebar-drawer-nav" aria-label="Primary">
        {drawerNavItems.map((item) => {
          const DrawerIcon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.href);
              }}
              data-testid={item.testId}
              data-active={isActive(item.href) || undefined}
              className="sub-item touch-manipulation min-h-[44px] no-underline w-full"
            >
              <span className="flex items-center gap-[10px] min-w-0">
                <DrawerIcon className="size-[14px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
            </a>
          );
        })}
        {user?.role === "admin" && (
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              navigate("/admin");
            }}
            data-testid="nav-admin"
            data-active={isActive("/admin") || undefined}
            className="sub-item touch-manipulation min-h-[44px] no-underline w-full"
          >
            <span className="flex items-center gap-[10px] min-w-0">
              <Shield className="size-[14px] shrink-0" />
              <span className="truncate">Admin</span>
            </span>
          </a>
        )}
      </nav>
      {/* The rail remains a hidden baseline compatibility surface only; route
          links themselves stay visible through More navigation below. */}
      <div className="av-sidebar-drawer-legacy-compat" aria-hidden="true">
        {[
          ...navItems,
          ...(user?.role === "admin"
            ? [{ label: "Admin", icon: Shield, href: "/admin" }]
            : []),
          { label: "About", icon: Info, href: "/about" },
        ].map((item) => (
          <a
            key={`rail-${item.href}`}
            href={item.href}
            data-testid={`rail-${slugify(item.label)}`}
          >
            {item.label}
          </a>
        ))}
      </div>
      <div className="av-sidebar-drawer-categories-label">
        <div className="font-mono">CATEGORIES</div>
      </div>
      {categoryList}
      {renderMoreNavigation(drawerMoreItems, "px-3 pt-2")}
      <SidebarFooter className="av-sidebar-drawer-footer">
        <span>{totalResources.toLocaleString()} indexed</span>
        <div>
          <a
            href="https://github.com/krzemienski/awesome-video/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs ↗
          </a>
          <a
            href="https://github.com/krzemienski/awesome-video"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </SidebarFooter>
    </>
  );

  return (
    <Sidebar
      collapsible="none"
      variant="sidebar"
      drawerContent={drawerContent}
    >
      {/* DS shell parity — on desktop/tablet the brand lives in the full-width
          header, NEVER in the sidebar/rail (reference layout.jsx). The brand
          block is rendered in the <=1024 Radix drawer only, which mirrors the
          reference .mobile-drawer (logo + wordmark + close at top). The
          static tablet copy is hidden by sidebar.css. */}
      {(isMobile || isDrawer) && brandHeader}

      <SidebarContent className="gap-0">
        {/* Legacy rail selectors remain in the tree for production baseline
            compatibility, but the canonical default shell deliberately does
            not expose a collapsed icon rail. sidebar.css keeps this hidden;
            a future explicit variant may opt in without changing row IDs. */}
        <div
          className="av-sidebar-icon-rail hidden group-data-[collapsible=icon]:flex flex-col items-center gap-1.5 py-3"
          aria-hidden="true"
        >
          {[
            ...navItems,
            ...(user?.role === "admin"
              ? [{ label: "Admin", icon: Shield, href: "/admin" }]
              : []),
            { label: "About", icon: Info, href: "/about" },
          ].map((item) => {
            const RailIcon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                }}
                title={item.label}
                aria-label={item.label}
                data-testid={`rail-${slugify(item.label)}`}
                data-active={isActive(item.href) || undefined}
                className={cn(
                  "rail-icon-btn no-underline touch-manipulation",
                  isActive(item.href) && "active",
                )}
              >
                <RailIcon className="size-4" />
              </a>
            );
          })}
        </div>

        {/* CANONICAL DESKTOP ORDER: BROWSE/Categories, Home, category tree,
            then OPS counts. Product routes live in accessible More navigation
            details below OPS rather than preceding the canonical tree. */}
        <div className="px-[18px] pt-[18px] pb-2 group-data-[collapsible=icon]:hidden">
          <div
            className="font-mono uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: 1.8,
              fontWeight: 700,
              color: "var(--text-3)",
            }}
          >
            Browse
          </div>
          <div
            style={{ marginTop: 6, fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}
          >
            Categories{" "}
            <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
              ·{" "}
              {isLoading ? (
                <Skeleton className="inline-block h-3 w-4 rounded align-middle" />
              ) : (
                totalCats
              )}
            </span>
          </div>
        </div>
        <div className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
            data-testid="nav-home"
            data-active={isActive("/") || undefined}
            className="sub-item touch-manipulation min-h-[44px] no-underline w-full"
          >
            <span className="flex min-w-0 items-center gap-[10px]">
              <Home className="size-[14px] shrink-0" />
              <span>Home</span>
            </span>
          </a>
        </div>

        {/* ACCORDION CATEGORY LIST */}
        {categoryList}

        <div className="px-[18px] py-[18px] group-data-[collapsible=icon]:hidden">
          <div
            className="font-mono uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: 1.8,
              fontWeight: 700,
              color: "var(--text-3)",
              marginBottom: 10,
            }}
          >
            OPS
          </div>
          <div
            className="font-mono"
            style={{
              fontSize: 11,
              lineHeight: 1.7,
              color: "var(--text-3)",
            }}
          >
            <div data-testid="sidebar-resource-count">
              {navError && totalResources === 0
                ? "Catalog unavailable"
                : isLoading || totalResources === 0
                  ? "Loading resources"
                  : `${totalResources.toLocaleString()} resources`}
            </div>
            <div>{totalSubcategories} subcategories</div>
            <div>{totalCats} top-level</div>
            <span
              className="mt-1.5 inline-flex items-center gap-1.5"
              style={{ color: "var(--accent)" }}
            >
              <span className="live-dot" aria-hidden="true" />
              indexed
            </span>
          </div>
        </div>
        {renderMoreNavigation(desktopMoreItems, "group-data-[collapsible=icon]:hidden")}

      </SidebarContent>
    </Sidebar>
  );
}
