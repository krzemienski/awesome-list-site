import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Plus,
  BookOpen,
  Zap,
  Shield,
  ChevronRight,
  Folder,
  Palette,
} from "lucide-react";
import { cn, slugify, getCategorySlug } from "@/lib/utils";
import { Category, Resource } from "@/types/awesome-list";
import { getCategoryIcon } from "@/config/navigation-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  categories: Category[];
  resources: Resource[];
  isLoading: boolean;
  user?: any;
}

/* -------- helpers -------- */

function getTotalResourceCount(item: any): number {
  let total = item.resources?.length || 0;
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

function filterCategories(categories: Category[]) {
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
        "sub-item touch-manipulation min-h-[36px] no-underline w-full",
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
      <span className="flex-1 min-w-0 truncate" title={label}>{label}</span>
      {typeof count === "number" && (
        <span
          className="font-mono shrink-0 tabular-nums"
          style={{ fontSize: 10, color: "var(--text-3)" }}
        >
          {formatCount(count)}
        </span>
      )}
      {count === 0 && (
        <span
          className="italic shrink-0"
          style={{ fontSize: 10, color: "var(--text-3)" }}
        >
          (empty)
        </span>
      )}
    </a>
  );
}

/* -------- top-level accordion category -------- */

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
  cat: Category;
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
  const directCount = cat.resources?.length || 0;
  const generalPath = `${catPath}?view=general`;
  const generalActive =
    activePath === catPath &&
    new URLSearchParams(activeSearch).get("view") === "general";

  // approximate body height for max-height animation
  const expandedHeight = useMemo(() => {
    let h = 8; // bottom padding only ("All in" row removed in P4)
    subs.forEach((sub) => {
      h += 36;
      if ((sub.subSubcategories || []).length > 0 && openSubs.includes(subKey(sub.name))) {
        h += sub.subSubcategories!.length * 32 + 12;
      }
    });
    if (directCount > 0) h += 36; // "General" row
    return h;
  }, [subs, openSubs, directCount]);

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
        <Link
          href={catPath}
          data-testid={`row-cat-${catSlug}`}
          aria-label={`Open ${cat.name} category page`}
          className="flex items-center gap-[10px] min-w-0 flex-1 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] rounded-sm"
        >
          <span
            className="flex items-center justify-center shrink-0"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: isActive
                ? "color-mix(in srgb, var(--accent) 22%, transparent)"
                : "rgba(255,255,255,0.04)",
              color: isActive ? "var(--accent)" : "var(--text-2)",
            }}
          >
            <CategoryIcon className="size-[13px]" />
          </span>
          <span
            className="truncate"
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
            style={{ fontSize: 10, color: "var(--text-3)" }}
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
              aria-controls={`accordion-body-${catSlug}`}
              data-testid={`toggle-cat-${catSlug}`}
              className="inline-flex items-center justify-center w-6 h-6 rounded-sm hover:bg-[var(--surface-2)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            >
              <ChevronRight
                className="size-3 shrink-0"
                style={{
                  transition: "transform 220ms cubic-bezier(0.2,0.65,0.3,1)",
                  transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                  color: "var(--text-3)",
                }}
              />
            </button>
          )}
        </span>
      </div>

      {(subs.length > 0 || directCount > 0) && (
        <div
          id={`accordion-body-${catSlug}`}
          className="accordion-body"
          style={{ maxHeight: isOpen ? expandedHeight : 0 }}
        >
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
                        data-state={subOpen ? "open" : "closed"}
                        data-testid={`expand-sub-${subSlug}`}
                        className="shrink-0 inline-flex items-center justify-center rounded-md hover:bg-[var(--surface)] text-[var(--text-3)] hover:text-[var(--text)]"
                        style={{ width: 22, minHeight: 36 }}
                      >
                        <ChevronRight
                          className="size-3"
                          style={{
                            transition:
                              "transform 200ms cubic-bezier(0.2,0.65,0.3,1)",
                            transform: subOpen
                              ? "rotate(90deg)"
                              : "rotate(0deg)",
                          }}
                        />
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
                    <div
                      className="accordion-body"
                      style={{
                        maxHeight: subOpen ? subSubs.length * 32 + 8 : 0,
                      }}
                    >
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
                    </div>
                  </div>
                );
              })}
            {directCount > 0 &&
              (!matchQuery ||
                cat.name.toLowerCase().includes(matchQuery.toLowerCase()) ||
                "general".includes(matchQuery.toLowerCase())) && (
                <SubItem
                  label="General"
                  count={directCount}
                  href={generalPath}
                  active={generalActive}
                  onClick={() => navigate(generalPath)}
                  testId={`sub-general-${catSlug}`}
                  italic
                />
              )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- main sidebar -------- */

export default function AppSidebar({
  categories,
  resources,
  isLoading,
  user,
}: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const activeSearch = useSearch();
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openSubcategories, setOpenSubcategories] = useState<string[]>([]);
  const { setOpenMobile } = useSidebar();

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

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("/")}
              className="cursor-pointer h-14 px-3"
              tooltip="Awesome Video"
            >
              <div
                className="flex aspect-square size-8 items-center justify-center rounded-md"
                style={{
                  background:
                    "color-mix(in srgb, var(--accent) 18%, transparent)",
                  color: "var(--accent)",
                  border:
                    "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
                }}
              >
                <Folder className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0">
                <span
                  className="font-sans text-sm font-semibold tracking-tight truncate"
                  style={{ color: "var(--text)" }}
                >
                  Awesome Video
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: 0.4,
                    color: "var(--text-3)",
                  }}
                >
                  {isLoading || resources.length === 0
                    ? "Loading…"
                    : `${resources.length.toLocaleString()} resources`}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* QUICK NAV */}
        <div className="px-3 pt-4 pb-2 group-data-[collapsible=icon]:hidden">
          <div
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontWeight: 500,
            }}
          >
            Navigation
          </div>
        </div>
        <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
          {navItems.map((item) => {
            const ActiveIcon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                }}
                data-testid={`nav-${slugify(item.label)}`}
                data-active={isActive(item.href) || undefined}
                className="sub-item touch-manipulation min-h-[36px] no-underline w-full"
                style={
                  isActive(item.href)
                    ? {
                        color: "var(--accent)",
                        background:
                          "color-mix(in srgb, var(--accent) 8%, transparent)",
                        borderColor:
                          "color-mix(in srgb, var(--accent) 25%, var(--border))",
                      }
                    : undefined
                }
              >
                <span className="flex items-center gap-[10px] min-w-0">
                  <ActiveIcon className="size-[14px] shrink-0" />
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
              className="sub-item touch-manipulation min-h-[36px] no-underline w-full"
              style={
                isActive("/admin")
                  ? {
                      color: "var(--accent)",
                      background:
                        "color-mix(in srgb, var(--accent) 8%, transparent)",
                      borderColor:
                        "color-mix(in srgb, var(--accent) 25%, var(--border))",
                    }
                  : undefined
              }
            >
              <span className="flex items-center gap-[10px] min-w-0">
                <Shield className="size-[14px] shrink-0" />
                <span className="truncate">Admin</span>
              </span>
            </a>
          )}
        </div>

        {/* CATEGORIES HEADER */}
        <div
          className="px-3 pt-4 pb-2 group-data-[collapsible=icon]:hidden"
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontWeight: 500,
            }}
          >
            Categories
          </div>
        </div>

        {/* ACCORDION CATEGORY LIST */}
        <div className="group-data-[collapsible=icon]:hidden">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="accordion-item"
                  style={{ padding: "13px 18px" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="size-5 rounded animate-pulse"
                      style={{ background: "var(--surface-2)" }}
                    />
                    <div
                      className="h-3 flex-1 rounded animate-pulse"
                      style={{ background: "var(--surface-2)" }}
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
          {!isLoading && filtered.length === 0 && (
            <div
              className="px-4 py-6 text-center"
              style={{ color: "var(--text-3)", fontSize: 12 }}
            >
              No categories.
            </div>
          )}
        </div>

      </SidebarContent>
      <SidebarFooter className="border-t p-2 group-data-[collapsible=icon]:hidden">
        <a
          href="/about"
          onClick={(e) => {
            e.preventDefault();
            navigate("/about");
          }}
          data-testid="footer-about"
          className="sub-item touch-manipulation min-h-[36px] no-underline w-full"
        >
          <span className="flex items-center gap-[10px] min-w-0">
            <BookOpen className="size-[14px] shrink-0" />
            <span className="truncate">About</span>
          </span>
        </a>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
