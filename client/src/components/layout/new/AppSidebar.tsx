import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo, useRef, useId, type ReactNode } from "react";
import { useLocation, useSearch, Link } from "wouter";
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
  MoreHorizontal,
  PanelLeft,
} from "lucide-react";
import { cn, slugify, getCategorySlug } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
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
import { useHomeBoot } from "@/lib/home-boot";

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
  siteName?: string;
  /** Source links follow the public site configuration, not a shell constant. */
  repoUrl?: string;
  repoBranch?: string;
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

function categoryStorageKey(cat: NavCategory): string {
  return cat.slug || getCategorySlug(cat.name);
}

/*
 * The V2 navigation uses category glyphs as taxonomy markers. These are
 * decorative because each category link already has an explicit accessible
 * name, so keeping them local avoids changing the shared icon map used by
 * other product surfaces.
 */
const CATEGORY_GLYPHS: Record<string, string> = {
  "Community & Events": "◈",
  "Encoding & Codecs": "◇",
  "General Tools": "◆",
  "Infrastructure & Delivery": "▣",
  "Intro & Learning": "▤",
  "Media Tools": "▥",
  "Players & Clients": "▶",
  "Protocols & Transport": "⟁",
  "Standards & Industry": "◉",
};

function getCategoryGlyph(categoryName: string): string {
  return CATEGORY_GLYPHS[categoryName] ?? "◈";
}

/*
 * The reference AVSidebarV2 keeps disclosure state in localStorage so a user
 * can move between taxonomy routes without losing their place in the tree.
 * Keep the storage adapter deliberately defensive: this component also renders
 * during SSR and older builds stored an object keyed by category id/name.
 */
const OPEN_CATEGORIES_STORAGE_KEY = "av-sb-cats";
const OPEN_SUBCATEGORIES_STORAGE_KEY = "av-sb-subs";

function readOpenKeys(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || "null");
    if (Array.isArray(stored)) {
      return stored.filter((value): value is string => typeof value === "string");
    }
    if (stored && typeof stored === "object") {
      return Object.entries(stored)
        .filter(([, value]) => value === true)
        .map(([name]) => name);
    }
  } catch {
    // A malformed or unavailable preference must not prevent navigation.
  }
  return [];
}

function writeOpenKeys(key: string, values: string[]) {
  try {
    const state = values.reduce<Record<string, boolean>>((result, value) => {
      result[value] = true;
      return result;
    }, {});
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage is optional (private mode and strict browser policies).
  }
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
      aria-current={active ? "page" : undefined}
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
}: { id: string; open: boolean; children: () => ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  // Keep the control's target in the DOM while closed, but delay the expensive
  // taxonomy subtree (and its ResizeObserver) until a user opens it once.
  // `open` makes an active route mount immediately; `hasBeenOpened` keeps the
  // body mounted for the same subsequent close/reopen animation and focus
  // behavior as before.
  const [hasBeenOpened, setHasBeenOpened] = useState(open);
  const shouldMountContent = open || hasBeenOpened;

  useEffect(() => {
    if (open) setHasBeenOpened(true);
  }, [open]);

  useEffect(() => {
    if (!shouldMountContent) return;
    const content = contentRef.current;
    if (!content) return;
    const measure = () => setHeight(content.scrollHeight);
    measure();
    // Watch the unclipped content: wrapped labels, fonts, responsive widths
    // and nested accordion animations can all change its actual height.
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [shouldMountContent]);

  return (
    <div id={id} className="accordion-body"
      style={{ maxHeight: open ? height : 0 }}
      {...(!open ? ({ inert: "" } as any) : {})}>
      {shouldMountContent ? (
        <div ref={contentRef} className="flow-root">{children()}</div>
      ) : null}
    </div>
  );
}

function CategoryAccordion({
  cat,
  isOpen,
  onToggle,
  isActive,
  activePath,
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
  navigate: (path: string) => void;
  matchQuery: string;
  openSubs: string[];
  toggleSub: (key: string) => void;
}) {
  const catSlug = cat.slug || getCategorySlug(cat.name);
  const subKey = (subName: string, subSlug?: string) =>
    `${catSlug}::${subSlug || slugify(subName)}`;
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
  const hasGrandchildren = subs.some(
    (sub) => (sub.subSubcategories?.length ?? 0) > 0,
  );

  return (
    <div className="accordion-item">
      <button
        type="button"
        className={cn("accordion-header", isActive && "active")}
        data-testid={`accordion-cat-${catSlug}`}
        data-state={isOpen ? "open" : "closed"}
        title={cat.name}
        onClick={subs.length > 0 ? onToggle : () => navigate(catPath)}
        aria-label={
          subs.length > 0
            ? `${isOpen ? "Collapse" : "Expand"} ${cat.name}`
            : `Open ${cat.name} category page`
        }
        aria-expanded={subs.length > 0 ? isOpen : undefined}
        aria-controls={subs.length > 0 ? bodyId : undefined}
      >
        <span
          className="av-sidebar-category-label"
          data-testid={`row-cat-${catSlug}`}
        >
          <span
            className="av-sidebar-category-glyph flex items-center justify-center shrink-0"
            style={{
              // DS-OK: frozen awesome-list-site-ds/layout.jsx Sidebar and
              // MobileDrawer category glyphs use 22px, 5px radius, 12px ink,
              // and this inactive rgba(255,255,255,0.04) fill exactly.
              width: 24,
              height: 24,
              borderRadius: "var(--radius-sm)",
              background: isActive
                ? "color-mix(in srgb, var(--accent) 25%, transparent)"
                : "var(--surface)",
              color: isActive ? "var(--accent)" : "var(--text-2)",
            }}
            aria-hidden="true"
          >
            {getCategoryGlyph(cat.name)}
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
        </span>
        <span className="av-sidebar-category-meta">
          {hasGrandchildren && (
            <span
              className="av-sidebar-l3-indicator"
              title="Contains nested subcategories"
              aria-hidden="true"
            >
              L3
            </span>
          )}
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
          {subs.length > 0 && (
            <span data-testid={`toggle-cat-${catSlug}`}>
              <ChevronRight className={cn("size-[10px] shrink-0 chevron-rotate", isOpen && "rotate-90")} />
            </span>
          )}
        </span>
      </button>

      {subs.length > 0 && (
        <MeasuredAccordionBody id={bodyId} open={isOpen}>
          {() => (
            <div className="accordion-body-inner">
              <a
                href={catPath}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(catPath);
                }}
                className="sub-item av-sidebar-all-category no-underline"
                aria-current={activePath === catPath ? "page" : undefined}
              >
                <span>All in {cat.name} →</span>
              </a>
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
                const subCount = getTotalResourceCount(sub);
                const subSubs = sub.subSubcategories || [];
                const subActive =
                  activePath === subPath ||
                  subSubs.some(
                    (ss) =>
                      activePath ===
                      `/sub-subcategory/${ss.slug || slugify(ss.name)}`,
                  );
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
                  <div key={sub.name} className="av-sidebar-l2-group">
                    <div className={cn("av-sidebar-l2-row", subActive && "active")}>
                      <a
                        href={subPath}
                        onClick={(event) => {
                          event.preventDefault();
                          navigate(subPath);
                        }}
                        data-testid={`sub-${subSlug}`}
                        aria-current={subActive ? "page" : undefined}
                        data-active={subActive || undefined}
                        title={sub.name}
                        className="av-sidebar-l2-link no-underline"
                      >
                        <span>{sub.name}</span>
                        <span
                          className="font-mono tabular-nums"
                          title={`${formatCount(subCount)} ${subCount === 1 ? "resource" : "resources"}`}
                          aria-label={`${formatCount(subCount)} ${subCount === 1 ? "resource" : "resources"}`}
                        >
                          {formatCount(subCount)}
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleSub(subKey(sub.name))}
                        aria-label={`${subOpen ? "Collapse" : "Expand"} ${subSubs.length} nested groups in ${sub.name}`}
                        aria-expanded={subOpen}
                        aria-controls={`${bodyId}-sub-${subSlug}`}
                        data-state={subOpen ? "open" : "closed"}
                        data-testid={`expand-sub-${subSlug}`}
                        className="icon-btn av-sidebar-l2-toggle"
                      >
                        <span className="av-sidebar-nested-count" aria-hidden="true">+{subSubs.length}</span>
                        <ChevronRight className={cn("size-[9px] chevron-rotate", subOpen && "rotate-90")} />
                      </button>
                    </div>
                    <MeasuredAccordionBody id={`${bodyId}-sub-${subSlug}`} open={subOpen}>
                      {() => (
                        <div className="av-sidebar-l3-tree">
                          <a
                            href={subPath}
                            onClick={(event) => {
                              event.preventDefault();
                              navigate(subPath);
                            }}
                            className="av-sidebar-l3-all no-underline"
                          >
                            <span aria-hidden="true">•</span>
                            <span>All in {sub.name}</span>
                          </a>
                          {subSubs.map((ss, index) => {
                            const ssSlug = ss.slug || slugify(ss.name);
                            const ssPath = `/sub-subcategory/${ssSlug}`;
                            return (
                              <a
                                key={ss.name}
                                href={ssPath}
                                onClick={(event) => {
                                  event.preventDefault();
                                  navigate(ssPath);
                                }}
                                data-testid={`subsub-${ssSlug}`}
                                data-active={activePath === ssPath || undefined}
                                aria-current={activePath === ssPath ? "page" : undefined}
                                className="av-sidebar-l3-row no-underline"
                              >
                                <span aria-hidden="true">{index === subSubs.length - 1 ? "└" : "├"}</span>
                                <span title={ss.name}>{ss.name}</span>
                                <span className="font-mono tabular-nums">{formatCount(getTotalResourceCount(ss))}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </MeasuredAccordionBody>
                  </div>
                );
              })}
            </div>
          )}
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
  siteName,
  repoUrl,
  repoBranch = "main",
  navError,
  onRetryNav,
  user,
}: AppSidebarProps) {
  const homeBoot = useHomeBoot();
  const isInitialHomeHydration = homeBoot?.isAnonymous === true;
  const [location, setLocation] = useLocation();
  const activeSearch = useSearch();
  const [openCategories, setOpenCategories] = useState<string[]>(() =>
    isInitialHomeHydration ? [] : readOpenKeys(OPEN_CATEGORIES_STORAGE_KEY),
  );
  const [openSubcategories, setOpenSubcategories] = useState<string[]>(() =>
    isInitialHomeHydration ? [] : readOpenKeys(OPEN_SUBCATEGORIES_STORAGE_KEY),
  );
  const [openKeysReady, setOpenKeysReady] = useState(!isInitialHomeHydration);
  const {
    setOpenMobile,
    isMobile,
    isDrawer,
    isPhone,
    openMobile,
    open,
    setOpen,
  } = useSidebar();
  // `open` is the SidebarProvider's persisted desktop preference. Tablet and
  // phone layouts retain the canonical expanded/drawer behavior, so only a
  // desktop user choice exposes the compact rail.
  const isRailCompact = !isDrawer && !open;

  const filtered = useMemo(() => filterCategories(categories), [categories]);

  useEffect(() => {
    if (!homeBoot || openKeysReady) return;
    setOpenCategories(readOpenKeys(OPEN_CATEGORIES_STORAGE_KEY));
    setOpenSubcategories(readOpenKeys(OPEN_SUBCATEGORIES_STORAGE_KEY));
    setOpenKeysReady(true);
  }, [homeBoot, openKeysReady]);

  useEffect(() => {
    if (!openKeysReady) return;
    writeOpenKeys(OPEN_CATEGORIES_STORAGE_KEY, openCategories);
  }, [openCategories, openKeysReady]);

  useEffect(() => {
    if (!openKeysReady) return;
    writeOpenKeys(OPEN_SUBCATEGORIES_STORAGE_KEY, openSubcategories);
  }, [openSubcategories, openKeysReady]);

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
          (cat.slug || getCategorySlug(cat.name)) === slug ||
          cat.subcategories?.some((sub) => (sub.slug || slugify(sub.name)) === slug) ||
          cat.subcategories?.some((sub) =>
            sub.subSubcategories?.some((ss) => (ss.slug || slugify(ss.name)) === slug),
          ),
      );
      if (matchCat) {
        const matchCatKey = categoryStorageKey(matchCat);
        setOpenCategories((prev) =>
          prev.includes(matchCatKey) || prev.includes(matchCat.name)
            ? prev
            : [...prev, matchCatKey],
        );
        const matchSub =
          parts[1] === "subcategory"
            ? matchCat.subcategories?.find(
                (sub) => (sub.slug || slugify(sub.name)) === slug,
              )
            : parts[1] === "sub-subcategory"
              ? matchCat.subcategories?.find((sub) =>
                  sub.subSubcategories?.some(
                    (ss) => (ss.slug || slugify(ss.name)) === slug,
                  ),
                )
              : undefined;
        if (matchSub && (matchSub.subSubcategories?.length ?? 0) > 0) {
          const key = `${matchCat.slug || getCategorySlug(matchCat.name)}::${matchSub.slug || slugify(matchSub.name)}`;
          setOpenSubcategories((prev) =>
            prev.includes(key) ? prev : [...prev, key],
          );
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
  const accountDashboardItem = {
    label: "Home dashboard",
    icon: Home,
    href: "/?context=account",
    testId: "nav-home-dashboard",
  };

  const totalCats = filtered.length;
  const brandName = siteName?.trim() || "Awesome Video";
  const brandWordmark = /^awesome\s+video(?:\s+dashboard)?$/i.test(brandName)
    ? "AWESOME.VIDEO"
    : brandName.toUpperCase();

  const brandHeader = (
    <SidebarHeader className="av-sidebar-drawer-header border-b p-0">
      <Link
        href="/"
        onClick={() => setOpenMobile(false)}
        aria-label={`${brandName} home`}
        className="flex min-h-7 items-center gap-[10px] px-0 py-0 no-underline"
      >
        <BrandMark className="size-7 shrink-0" />
        <span className="av-sidebar-drawer-wordmark">
          {brandWordmark}
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
    <div className="av-sidebar-category-list av-sidebar-tree-scroll">
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
            const catKey = categoryStorageKey(cat);
            const isOpen =
              openCategories.includes(catKey) || openCategories.includes(cat.name);
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
                    prev.includes(catKey) || prev.includes(cat.name)
                      ? prev.filter((c) => c !== catKey && c !== cat.name)
                      : [...prev, catKey],
                  )
                }
                isActive={catActive}
                activePath={activePath}
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
              className="btn-link font-medium min-h-[44px] md:min-h-[36px]"
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
  const drawerMoreItems = [...navItems.slice(2), accountDashboardItem];
  const desktopMoreItems = [
    ...navItems.slice(1).map((item) => ({
      ...item,
      testId: `nav-${slugify(item.label)}`,
    })),
    accountDashboardItem,
    ...(user?.role === "admin"
      ? [{ label: "Admin", icon: Shield, href: "/admin", testId: "nav-admin" }]
      : []),
    { label: "About", icon: Info, href: "/about", testId: "footer-about" },
  ];

  const resourceStatus = (
    <>
      {navError && totalResources === 0
        ? "Catalog unavailable"
        : isLoading || totalResources === 0
          ? "Loading resources"
          : `${totalResources.toLocaleString()} indexed`}
    </>
  );

  const renderMoreNavigation = (
    items: Array<{
      label: string;
      icon: typeof Home;
      href: string;
      testId?: string;
    }>,
    className = "",
    compact = false,
    showNavigationModeToggle = false,
  ) => (
    <details className={`av-sidebar-more-navigation ${className}`}>
      <summary
        className="flex min-h-[44px] cursor-pointer items-center px-3 text-xs font-medium text-[var(--text-2)]"
        aria-label={compact ? "More navigation" : undefined}
        title={compact ? "More navigation" : undefined}
      >
        {compact ? (
          <MoreHorizontal aria-hidden="true" className="size-4" />
        ) : (
          "More navigation"
        )}
      </summary>
      <SidebarMenu className="px-2 pb-2">
        {showNavigationModeToggle && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="min-h-[44px]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                data-testid="sidebar-compact-navigation"
                aria-label="Compact navigation"
                title="Compact navigation"
                className="sub-item touch-manipulation min-h-[44px] no-underline w-full"
              >
                <span className="flex min-w-0 items-center gap-[10px]">
                  <PanelLeft aria-hidden="true" className="size-[14px] shrink-0" />
                  <span className="break-words">Compact navigation</span>
                </span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
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
              aria-current={isActive(item.href) ? "page" : undefined}
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

  const homeNavigation = (
    <div className="av-sidebar-home-navigation">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          navigate("/");
        }}
        data-testid="nav-home"
        data-active={isActive("/") || undefined}
        aria-current={isActive("/") ? "page" : undefined}
        className="sub-item touch-manipulation min-h-[44px] no-underline w-full"
      >
        <span className="flex min-w-0 items-center gap-[10px]">
          <Home className="size-[14px] shrink-0" />
          <span className="break-words">Home</span>
        </span>
      </a>
    </div>
  );

  const categoriesHeading = (
    <div className="av-sidebar-categories-heading">
      <div
        className="font-mono uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: 1.8,
          fontWeight: 700,
          color: "var(--text-3)",
        }}
      >
        CATEGORIES{" "}
        {isLoading ? (
          <Skeleton className="inline-block h-3 w-4 rounded align-middle" />
        ) : (
          `· ${totalCats}`
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        data-testid="sidebar-compact-navigation"
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
        className="icon-btn av-sidebar-collapse-toggle"
      >
        <ChevronRight aria-hidden="true" className="size-[10px]" />
      </button>
    </div>
  );

  /*
   * The V2 reference ends the sidebar with a compact, pinned identity row.
   * Product routes remain available in the same keyboard-operable disclosure
   * rather than being removed to make room for that footer.
   */
  const compactFooter = (
    items: Array<{
      label: string;
      icon: typeof Home;
      href: string;
      testId?: string;
    }>,
    className: string,
    includeDocs = false,
    exposeResourceTestId = false,
    showNavigationModeToggle = false,
  ) => (
    <SidebarFooter className={`av-sidebar-compact-footer ${className}`}>
      <div className="av-sidebar-compact-footer-status">
        <span className="live-dot" aria-hidden="true" />
        <span
          className="av-sidebar-compact-footer-copy"
          {...(exposeResourceTestId
            ? { "data-testid": "sidebar-resource-count" }
            : {})}
        >
          {resourceStatus} · live
        </span>
        <div className="av-sidebar-compact-footer-links">
          {includeDocs && repoUrl && (
            <a
              href={`${repoUrl.replace(/\/$/, "")}/tree/${encodeURIComponent(repoBranch)}/docs`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs ↗
            </a>
          )}
          <a
            {...(repoUrl ? { href: repoUrl } : {})}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={repoUrl ? `Source: ${repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "")}` : "Source repository unavailable"}
            title={repoUrl ? `Source: ${repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "")}` : "Source repository unavailable"}
            aria-disabled={!repoUrl || undefined}
            tabIndex={repoUrl ? undefined : -1}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
        {renderMoreNavigation(
          items,
          "av-sidebar-footer-more",
          true,
          showNavigationModeToggle,
        )}
      </div>
    </SidebarFooter>
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
              aria-current={isActive(item.href) ? "page" : undefined}
              className="sub-item touch-manipulation min-h-[44px] no-underline w-full"
            >
              <span className="flex items-center gap-[10px] min-w-0">
                <DrawerIcon className="size-[14px] shrink-0" />
                <span className="break-words">{item.label}</span>
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
            aria-current={isActive("/admin") ? "page" : undefined}
            className="sub-item touch-manipulation min-h-[44px] no-underline w-full"
          >
            <span className="flex items-center gap-[10px] min-w-0">
              <Shield className="size-[14px] shrink-0" />
              <span className="break-words">Admin</span>
            </span>
          </a>
        )}
      </nav>
      <div className="av-sidebar-drawer-categories-label">
        <div className="font-mono">CATEGORIES</div>
      </div>
      {categoryList}
      {compactFooter(drawerMoreItems, "av-sidebar-drawer-footer", true)}
    </>
  );

  return (
    <Sidebar
      collapsible="none"
      variant="sidebar"
      drawerContent={drawerContent}
      className={cn(isRailCompact && "av-sidebar-rail-compact")}
    >
      {/* DS shell parity — on desktop/tablet the brand lives in the full-width
          header, NEVER in the sidebar/rail (reference layout.jsx). The brand
          block is rendered in the <=1024 Radix drawer only, which mirrors the
          reference .mobile-drawer (logo + wordmark + close at top). The
          static tablet copy is hidden by sidebar.css. */}
      {(isMobile || isDrawer) && brandHeader}

      <SidebarContent className="gap-0">
        {isRailCompact && (
          <div
            className="av-sidebar-icon-rail flex flex-col items-center gap-1.5 py-3"
            aria-hidden={false}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="icon-btn rail-icon-btn rail-expand-navigation touch-manipulation"
              data-testid="sidebar-expanded-navigation"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <ChevronRight aria-hidden="true" className="size-[11px]" />
            </button>
            <a
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigate("/");
              }}
              title="Home"
              aria-label="Home"
              data-testid="rail-home"
              data-active={isActive("/") || undefined}
              className="icon-btn rail-icon-btn no-underline touch-manipulation"
            >
              <Home aria-hidden="true" className="size-[15px]" />
            </a>
            <div className="av-sidebar-rail-divider" aria-hidden="true" />
            {filtered.map((cat) => {
              const catSlug = cat.slug || getCategorySlug(cat.name);
              const href = `/category/${catSlug}`;
              const catActive =
                isActive(href) ||
                cat.subcategories?.some((sub) =>
                  isActive(`/subcategory/${sub.slug || slugify(sub.name)}`) ||
                  sub.subSubcategories?.some((ss) =>
                    isActive(`/sub-subcategory/${ss.slug || slugify(ss.name)}`),
                  ),
                );
              return (
                <a
                  key={catSlug}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(href);
                  }}
                  title={`${cat.name} · ${formatCount(getTotalResourceCount(cat))}`}
                  aria-label={cat.name}
                  data-testid={`rail-${catSlug}`}
                  data-active={catActive || undefined}
                  className={cn(
                    "icon-btn rail-icon-btn no-underline touch-manipulation",
                    catActive && "active",
                  )}
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {getCategoryGlyph(cat.name)}
                  </span>
                </a>
              );
            })}
            <a
              {...(repoUrl ? { href: repoUrl } : {})}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn rail-icon-btn av-sidebar-rail-repo no-underline"
              aria-label={repoUrl ? `Source: ${repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "")}` : "Source repository unavailable"}
              title={repoUrl ? `Source: ${repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "")}` : "Source repository unavailable"}
              aria-disabled={!repoUrl || undefined}
              tabIndex={repoUrl ? undefined : -1}
            >
              <span aria-hidden="true" className="font-mono text-sm">↗</span>
            </a>
          </div>
        )}

        {/* V2 canonical order: Home, Categories, independently scrolling tree,
            then the compact pinned footer. No OPS/Browse interstitials. */}
        <div className="av-sidebar-expanded-navigation">
          <div>
            {homeNavigation}
            {categoriesHeading}
          </div>
          {categoryList}
          {compactFooter(desktopMoreItems, "", false, true)}
        </div>

      </SidebarContent>
    </Sidebar>
  );
}
