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
import { deslugify } from "@/lib/utils";

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

const ADMIN_LABELS: Record<string, string> = {
  overview: "Overview",
  approvals: "Approvals",
  edits: "Edits",
  enrichment: "Enrichment",
  researcher: "Researcher",
  export: "Export",
  database: "Database",
  resources: "Resources",
  categories: "Categories",
  subcategories: "Subcategories",
  subsubcategories: "Sub-Subcategories",
  "sub-subcategories": "Sub-Subcategories",
  "sub-subcats": "Sub-Subcategories",
  journeys: "Journeys",
  users: "Users",
  github: "GitHub",
  "github-sync": "GitHub",
  linkhealth: "Link Health",
  "link-health": "Link Health",
  digests: "Digests",
  audit: "Audit",
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

function resolveCrumbs(categories: AwesomeListNavNode[], pathname: string, title: string): Crumb[] {
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
    return [{ href: "/categories", label: "Browse" }, { label: `Tag: ${decodedSlug(value)}` }];
  }
  if (root === "collection" && value) return [{ label: "Shared collection" }];
  if (root === "sign-in") return [{ label: "Sign in" }];
  if (root === "sign-up") return [{ label: "Sign up" }];
  if (root === "admin") {
    if (!value) return [{ label: "Admin" }];
    const label = ADMIN_LABELS[value.toLowerCase()];
    return label
      ? [{ href: "/admin", label: "Admin" }, { label }]
      : [{ label: "Page Not Found" }];
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
  const [pageTitle, setPageTitle] = useState(() => document.title);
  const [pageHeading, setPageHeading] = useState<string>();

  useEffect(() => {
    const title = document.querySelector("title");
    const main = document.querySelector("main");
    setPageHeading(undefined);
    const update = () => {
      setPageTitle(document.title);
      const heading = main?.querySelector("h1")?.textContent?.trim();
      if (heading) setPageHeading(heading);
    };
    update();
    const observer = new MutationObserver(update);
    if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });
    if (main) observer.observe(main, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [location]);

  const crumbs = useMemo(
    () => resolveCrumbs(categories, location, pageHeading ?? pageTitle),
    [categories, location, pageHeading, pageTitle],
  );
  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="mb-5 min-w-0" data-testid="page-breadcrumb">
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
        <BreadcrumbItem>
          <BreadcrumbLink href="/" title="Home" data-testid="link-breadcrumb-home">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          const href = crumb.href;
          return [
            <BreadcrumbItem className={current ? "min-w-0" : undefined} key={`${crumb.href ?? "current"}-${crumb.label}`}>
              {current
                ? <BreadcrumbPage className="block truncate" title={crumb.label} data-testid="breadcrumb-mobile-current">{crumb.label}</BreadcrumbPage>
                : <BreadcrumbLink href={href ?? "/"} title={crumb.label} data-testid={`link-breadcrumb-hidden-${href?.split("/").pop() ?? "home"}`}>{crumb.label}</BreadcrumbLink>}
            </BreadcrumbItem>,
            !current && <BreadcrumbSeparator key={`${crumb.label}-separator`} />,
          ];
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}