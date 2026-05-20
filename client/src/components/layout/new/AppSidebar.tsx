import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Home,
  Plus,
  BookOpen,
  Zap,
  Shield,
  ChevronRight,
  Folder,
  Palette,
  Search,
  X,
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
        ),
    )
    .map((cat) => {
      const filteredSubcategories = cat.subcategories
        ?.filter((sub) => getTotalResourceCount(sub) > 0)
        .map((sub) => ({
          ...sub,
          subSubcategories: sub.subSubcategories?.filter(
            (ss) => getTotalResourceCount(ss) > 0,
          ),
        }));
      return { ...cat, subcategories: filteredSubcategories };
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
          : undefined
      }
      title={label}
    >
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {typeof count === "number" && (
        <span
          className="font-mono shrink-0 tabular-nums"
          style={{ fontSize: 10, color: "var(--text-3)" }}
        >
          {formatCount(count)}
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
  const totalCount = getTotalResourceCount(cat);

  // approximate body height for max-height animation
  const expandedHeight = useMemo(() => {
    let h = 56; // "All in" row + padding
    subs.forEach((sub) => {
      h += 36;
      if ((sub.subSubcategories || []).length > 0 && openSubs.includes(subKey(sub.name))) {
        h += sub.subSubcategories!.length * 32 + 12;
      }
    });
    return h;
  }, [subs, openSubs]);

  const headerClick = () => {
    if (subs.length === 0) {
      navigate(catPath);
    } else {
      onToggle();
    }
  };

  return (
    <div className="accordion-item">
      <button
        type="button"
        onClick={headerClick}
        onDoubleClick={() => navigate(catPath)}
        className={cn("accordion-header", isActive && "active")}
        data-testid={`accordion-cat-${catSlug}`}
        data-state={isOpen ? "open" : "closed"}
        aria-expanded={subs.length > 0 ? isOpen : undefined}
        aria-controls={subs.length > 0 ? `accordion-body-${catSlug}` : undefined}
        title={cat.name}
      >
        <span className="flex items-center gap-[10px] min-w-0 flex-1">
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
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? "var(--text)" : "var(--text-2)",
            }}
          >
            {cat.name}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 10, color: "var(--text-3)" }}
          >
            {formatCount(totalCount)}
          </span>
          {subs.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Open ${cat.name}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(catPath);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(catPath);
                }
              }}
              data-testid={`open-cat-${catSlug}`}
              className="inline-flex items-center justify-center rounded-sm w-5 h-5 hover:bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)]"
              style={{ fontSize: 10 }}
              title={`Open ${cat.name} page`}
            >
              →
            </span>
          )}
          {subs.length > 0 && (
            <ChevronRight
              className="size-3 shrink-0"
              style={{
                transition: "transform 220ms cubic-bezier(0.2,0.65,0.3,1)",
                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                color: "var(--text-3)",
              }}
            />
          )}
        </span>
      </button>

      {subs.length > 0 && (
        <div
          id={`accordion-body-${catSlug}`}
          className="accordion-body"
          style={{ maxHeight: isOpen ? expandedHeight : 0 }}
        >
          <div className="accordion-body-inner">
            <SubItem
              label={`All in ${cat.name} →`}
              href={catPath}
              active={activePath === catPath}
              italic
              onClick={() => navigate(catPath)}
              testId={`sub-all-${catSlug}`}
            />
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
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openSubcategories, setOpenSubcategories] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const { setOpenMobile } = useSidebar();

  const filtered = useMemo(() => filterCategories(categories), [categories]);

  const visible = useMemo(() => {
    if (!filter.trim()) return filtered;
    const q = filter.trim().toLowerCase();
    return filtered.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.subcategories?.some((sub) => sub.name.toLowerCase().includes(q)),
    );
  }, [filtered, filter]);

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
  const expandedCount = openCategories.length;
  const allExpanded = expandedCount === totalCats && totalCats > 0;

  const toggleAll = () => {
    if (allExpanded) setOpenCategories([]);
    else setOpenCategories(filtered.map((c) => c.name));
  };

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
                  {resources.length.toLocaleString()} resources
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
            className="eyebrow"
            style={{
              fontSize: 9.5,
              letterSpacing: 1.8,
              color: "var(--text-3)",
              fontWeight: 700,
            }}
          >
            NAVIGATE
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
          className="px-3 pt-4 pb-2 flex items-center justify-between group-data-[collapsible=icon]:hidden"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div>
            <div
              className="eyebrow"
              style={{
                fontSize: 9.5,
                letterSpacing: 1.8,
                color: "var(--text-3)",
                fontWeight: 700,
              }}
            >
              BROWSE
            </div>
            <div
              className="mt-1"
              style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}
            >
              Categories{" "}
              <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
                · {totalCats}
              </span>
            </div>
          </div>
          {totalCats > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              data-testid="toggle-expand-all"
              className="font-mono hover:text-[var(--text)] text-[var(--text-3)] px-2 py-1 rounded hover:bg-[var(--surface)]"
              style={{ fontSize: 10, letterSpacing: 0.4 }}
              title={allExpanded ? "Collapse all" : "Expand all"}
            >
              {allExpanded ? "COLLAPSE" : "EXPAND"}
            </button>
          )}
        </div>

        {/* FILTER INPUT */}
        <div className="px-3 pb-2 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search
              className="size-3 absolute pointer-events-none"
              style={{
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-3)",
              }}
            />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter categories…"
              aria-label="Filter categories"
              data-testid="sidebar-filter"
              className="w-full"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "7px 28px 7px 28px",
                color: "var(--text)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                outline: "none",
              }}
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                aria-label="Clear filter"
                className="absolute"
                style={{
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-3)",
                }}
              >
                <X className="size-3" />
              </button>
            )}
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
            : visible.map((cat) => {
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
                    navigate={navigate}
                    matchQuery={filter}
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
          {!isLoading && visible.length === 0 && (
            <div
              className="px-4 py-6 text-center"
              style={{ color: "var(--text-3)", fontSize: 12 }}
            >
              No matching categories.
            </div>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter
        className="border-t p-0 group-data-[collapsible=icon]:hidden"
      >
        <div className="px-4 py-4">
          <div
            className="eyebrow mb-2"
            style={{
              fontSize: 9.5,
              letterSpacing: 1.8,
              color: "var(--text-3)",
              fontWeight: 700,
            }}
          >
            OPS
          </div>
          <div
            className="font-mono leading-relaxed"
            style={{ fontSize: 10.5, color: "var(--text-3)" }}
          >
            {resources.length.toLocaleString()} resources
            <br />
            {filtered.reduce(
              (n, c) => n + (c.subcategories?.length || 0),
              0,
            )}{" "}
            subcategories
            <br />
            {totalCats} top-level
            <br />
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                navigate("/about");
              }}
              data-testid="footer-about"
              className="inline-flex items-center gap-1 mt-2 no-underline"
              style={{ color: "var(--accent)" }}
            >
              <span
                className="size-1.5 rounded-full inline-block"
                style={{
                  background: "var(--accent)",
                  boxShadow: "0 0 6px var(--accent)",
                }}
              />
              about & status
            </a>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
