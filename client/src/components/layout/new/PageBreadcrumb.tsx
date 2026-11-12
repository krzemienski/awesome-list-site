import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import type { AwesomeListNavNode } from "@/lib/static-data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { lazyOptional } from "@/lib/lazy-optional";
import { deslugify } from "@/lib/utils";
import { tagDisplayNameBranded } from "@shared/seo-templates";
import { normalizeTagPathSegment } from "@shared/tagNormalize";
import { normalizeAdminTab, type AdminTabId } from "@shared/admin-tabs";

// The breadcrumb sits outside RouteErrorBoundary; a failed chunk drops the
// disclosure and leaves the plain trail.
const ResourceBreadcrumbAncestorDisclosure = lazyOptional(
  () => import("./ResourceBreadcrumbAncestorDisclosure"),
);

const PAGE_TRAIL_SELECTOR = 'nav[aria-label="Breadcrumb"]:not([data-testid="page-breadcrumb"])';

const RESOURCE_BREADCRUMB_DISCLOSURE_QUERY =
  "(min-width: 768px) and (max-width: 1279px)";

function ResourceBreadcrumbAncestorSlot({
  resourceId,
  categories,
}: {
  resourceId: string;
  categories: AwesomeListNavNode[];
}) {
  const [eligible, setEligible] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(RESOURCE_BREADCRUMB_DISCLOSURE_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(RESOURCE_BREADCRUMB_DISCLOSURE_QUERY);
    const update = () => setEligible(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Do not load the resource-only chunk or render a hidden legacy selector
  // outside the production tablet/tablet-desktop visibility interval.
  if (!eligible) return null;

  return (
    <ResourceBreadcrumbAncestorDisclosure
      resourceId={resourceId}
      categories={categories}
    />
  );
}

interface Crumb {
  href?: string;
  label: string;
}

const STATIC_PATH_LABELS: Record<string, string> = {
  "/explore": "Browse",
  "/resource": "Resource Not Found",
  "/tag": "Browse by Tag",
  "/categories": "Browse",
  "/category": "Browse",
  "/recommendations": "Recommendations",
  "/search": "Search",
  "/about": "About",
  "/terms": "Terms",
  "/privacy": "Privacy",
  "/code-of-conduct": "Code of Conduct",
  "/advanced": "Advanced Search",
  "/submit": "Submit",
  "/journeys": "Learning Journeys",
  "/journey": "Learning Journeys",
  "/continue-learning": "Continue Learning",
  "/profile": "Profile",
  "/contributions": "Your Contributions",
  "/bookmarks": "Bookmarks",
  "/notifications": "Notifications",
  "/favorites": "Bookmarks",
  "/account": "Profile",
  "/settings": "Settings",
  "/onboarding": "Learning Preferences",
  "/design-system": "Design System",
  "/sign-in": "Sign in",
  "/sign-up": "Sign up",
  "/login": "Sign in",
  "/register": "Sign up",
  "/forgot-password": "Sign in",
  "/reset-password": "Sign in",
  "/auth/login": "Sign in",
  "/auth/register": "Sign up",
  "/signup": "Sign up",
  "/logout": "Signing out",
};

// Keyed by canonical tab id; normalizeAdminTab maps the aliases.
const ADMIN_LABELS: Record<AdminTabId, string> = {
  overview: "Overview",
  approvals: "Approvals",
  edits: "Edits",
  enrichment: "Enrichment",
  researcher: "Researcher",
  research: "Research",
  export: "Export",
  database: "Database",
  resources: "Resources",
  categories: "Categories",
  subcategories: "Subcategories",
  subsubcategories: "Sub-Subcategories",
  journeys: "Journeys",
  users: "Users",
  github: "GitHub",
  linkhealth: "Link Health",
  digests: "Digests",
  audit: "Audit",
  contact: "Contact inbox",
};

function taxonomyCrumbs(categories: AwesomeListNavNode[], pathname: string): Crumb[] | undefined {
  const [, root, categorySlug, subcategorySlug] = pathname.split("/");
  for (const category of categories) {
    const categoryCrumb = { href: `/category/${category.slug}`, label: category.name };
    if (pathname === categoryCrumb.href) return [{ label: category.name }];
    for (const subcategory of category.subcategories ?? []) {
      const subcategoryCrumb = { href: `/subcategory/${subcategory.slug}`, label: subcategory.name };
      if (pathname === subcategoryCrumb.href) return [categoryCrumb, { label: subcategory.name }];
      if (root === "category" && category.slug === categorySlug && subcategory.slug === subcategorySlug) {
        return [categoryCrumb, { label: subcategory.name }];
      }
      for (const leaf of subcategory.subSubcategories ?? []) {
        if (pathname === `/sub-subcategory/${leaf.slug}` || pathname === `/subsubcategory/${leaf.slug}`) {
          return [categoryCrumb, subcategoryCrumb, { label: leaf.name }];
        }
      }
    }
  }
}

function titleLabel(title: string): string | undefined {
  const label = title.split(/\s+[|·–—-]\s+Awesome(?:\.Video| Video)?/i)[0]?.trim();
  return label && !/^Awesome(?:\.Video| Video)?$/i.test(label) ? label : undefined;
}

function decodedSlug(value: string): string {
  try {
    return deslugify(decodeURIComponent(value));
  } catch {
    return deslugify(value);
  }
}

function resolveCrumbs(categories: AwesomeListNavNode[], pathname: string, title: string, hash = ""): Crumb[] {
  const taxonomy = taxonomyCrumbs(categories, pathname);
  if (taxonomy) return taxonomy;
  const parts = pathname.split("/").filter(Boolean);
  const [root, value] = parts;
  if (!root) return [];
  if (root === "resource") {
    return [{ label: /^\d+$/.test(value ?? "") ? titleLabel(title) ?? "Resource" : "Not found" }];
  }
  if (root === "journey" && value) {
    return [{ href: "/journeys", label: "Learning Journeys" }, { label: titleLabel(title) ?? "Journey" }];
  }
  if (root === "tag" && value) {
    // Same name source as the TagLanding H1, so brand casing ("FFmpeg") matches.
    const tag = normalizeTagPathSegment(value);
    return [
      { href: "/categories", label: "Browse" },
      { label: `Tag: ${tag ? tagDisplayNameBranded(tag) : decodedSlug(value)}` },
    ];
  }
  if (root === "collection" && value) return [{ label: "Shared collection" }];
  if (root === "sign-in") return [{ label: "Sign in" }];
  if (root === "sign-up") return [{ label: "Sign up" }];
  if (root === "admin") {
    // Tabs open as /admin/<section> deep links or as /admin#<section> (the
    // dashboard's own tab clicks and Settings menu); both name the section.
    const section = value ?? hash;
    if (!section) return [{ label: "Admin" }];
    const tab = normalizeAdminTab(section);
    return tab
      ? [{ href: "/admin", label: "Admin" }, { label: ADMIN_LABELS[tab] }]
      : value ? [{ label: "Page Not Found" }] : [{ label: "Admin" }];
  }
  if (pathname === "/settings/theme") {
    return [{ href: "/settings", label: "Settings" }, { label: "Appearance" }];
  }
  const staticLabel = STATIC_PATH_LABELS[pathname];
  if (staticLabel) return [{ label: staticLabel }];
  return [{ label: "Page Not Found" }];
}

export default function PageBreadcrumb({ categories }: { categories: AwesomeListNavNode[] }) {
  const [location] = useLocation();
  // `document` is unavailable while the public Home tree renders on Node.
  // The effect below takes the authoritative title after hydration.
  const [pageTitle, setPageTitle] = useState(
    () => (typeof document === "undefined" ? "" : document.title),
  );
  const [pageHeading, setPageHeading] = useState<string>();
  const [pageOwnsTrail, setPageOwnsTrail] = useState(false);

  useEffect(() => {
    const title = document.querySelector("title");
    const main = document.querySelector("main");
    setPageHeading(undefined);
    const update = () => {
      setPageTitle(document.title);
      const heading = main?.querySelector("h1")?.textContent?.trim();
      if (heading) setPageHeading(heading);
      setPageOwnsTrail(Boolean(main?.querySelector(PAGE_TRAIL_SELECTOR)));
    };
    update();
    const observer = new MutationObserver(update);
    if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });
    if (main) observer.observe(main, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [location]);

  // wouter's location has no hash; the admin tabs live in it. The dashboard
  // switches tabs with history.pushState, which wouter's history patch
  // announces as a "pushState" event (wouter/src/use-browser-location.js).
  const [hash, setHash] = useState(() => (typeof window === "undefined" ? "" : window.location.hash.slice(1)));
  useEffect(() => {
    const sync = () => setHash(window.location.hash.slice(1));
    const events = ["hashchange", "popstate", "pushState", "replaceState"] as const;
    sync();
    for (const type of events) window.addEventListener(type, sync);
    return () => {
      for (const type of events) window.removeEventListener(type, sync);
    };
  }, []);

  const crumbs = useMemo(
    () => resolveCrumbs(categories, location, pageHeading ?? pageTitle, hash),
    [categories, location, pageHeading, pageTitle, hash],
  );
  // A page that paints its own trail (subcategory and sub-subcategory
  // listings) owns the one Breadcrumb landmark; a second, hidden copy made
  // screen readers list two.
  if (crumbs.length === 0 || pageOwnsTrail) return null;
  // The frozen design has no shell-level breadcrumb row: every page that
  // shows crumbs (pages.jsx SubcategoryPage) or a back link / eyebrow
  // (CategoryPage, ResourcePage, SubmitPage, AboutPage, admin) renders it
  // inside its own `.page-content`. On the other routes this shell breadcrumb
  // stays in the DOM for assistive technology and the selector contracts (same
  // testids, same links) but is visually hidden. Its links
  // stay in the accessibility tree but out of the Tab order, so keyboard
  // focus never lands on an invisible 1px target.
  // ResourceDetail uses this exact string id in its public-detail query key.
  // Restrict the lazy disclosure to routable public resource ids: it has no
  // role on generic /resource 404s or any other breadcrumb shape.
  const resourceId = /^\/resource\/(\d+)$/.exec(location)?.[1];

  return (
    <Breadcrumb className="sr-only" data-testid="page-breadcrumb">
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
        <BreadcrumbItem>
          <BreadcrumbLink href="/" title="Home" tabIndex={-1} data-testid="link-breadcrumb-home">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          const href = crumb.href;
          return [
            resourceId && current ? (
              <ResourceBreadcrumbAncestorSlot
                key={`resource-ancestor-disclosure-${resourceId}`}
                resourceId={resourceId}
                categories={categories}
              />
            ) : null,
            <BreadcrumbItem className={current ? "min-w-0" : undefined} key={`${crumb.href ?? "current"}-${crumb.label}`}>
              {current
                ? <BreadcrumbPage className="block truncate" title={crumb.label} data-testid="breadcrumb-mobile-current">{crumb.label}</BreadcrumbPage>
                : <BreadcrumbLink href={href ?? "/"} title={crumb.label} tabIndex={-1} data-testid={`link-breadcrumb-hidden-${href?.split("/").pop() ?? "home"}`}>{crumb.label}</BreadcrumbLink>}
            </BreadcrumbItem>,
            !current && <BreadcrumbSeparator key={`${crumb.label}-separator`} />,
          ];
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}