import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import type { AwesomeListNavNode } from "@/lib/static-data";
import { Button } from "@/components/ui/button";
import {
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResourceTaxonomy {
  category?: string | null;
  subcategory?: string | null;
  subSubcategory?: string | null;
}

interface Ancestor {
  href: string;
  label: string;
}

interface ResourceBreadcrumbAncestorDisclosureProps {
  resourceId: string;
  categories: AwesomeListNavNode[];
}

/**
 * Route-only, lazy breadcrumb recovery for resource details.
 *
 * This intentionally uses ResourceDetail's exact React Query key. The two
 * observers therefore share the global cache and deduplicate an in-flight
 * detail request; Infinity prevents this late-loaded observer from refetching
 * an already resolved detail merely to populate a breadcrumb menu.
 */
export default function ResourceBreadcrumbAncestorDisclosure({
  resourceId,
  categories,
}: ResourceBreadcrumbAncestorDisclosureProps) {
  const { data: resource } = useQuery<ResourceTaxonomy>({
    queryKey: ["/api/resources", resourceId],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${resourceId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Resource breadcrumb unavailable");
      return response.json();
    },
    staleTime: Infinity,
  });

  const ancestors = useMemo<Ancestor[]>(() => {
    if (!resource?.category) return [];
    const category = categories.find((item) => item.name === resource.category);
    if (!category?.slug) return [];

    const resolved: Ancestor[] = [{
      href: `/category/${category.slug}`,
      label: category.name,
    }];
    if (!resource.subcategory) return resolved;

    const subcategory = (category.subcategories ?? []).find(
      (item) => item.name === resource.subcategory,
    );
    if (!subcategory?.slug) return resolved;
    resolved.push({
      href: `/subcategory/${subcategory.slug}`,
      label: subcategory.name,
    });
    if (!resource.subSubcategory) return resolved;

    const subSubcategory = (subcategory.subSubcategories ?? []).find(
      (item) => item.name === resource.subSubcategory,
    );
    if (subSubcategory?.slug) {
      resolved.push({
        href: `/sub-subcategory/${subSubcategory.slug}`,
        label: subSubcategory.name,
      });
    }
    return resolved;
  }, [categories, resource]);

  // There is no genuine disclosure without a resolved, navigable ancestor.
  // This protects against a stale/deleted taxonomy record and never creates a
  // decorative legacy test id.
  if (ancestors.length === 0) return null;

  const countLabel = `${ancestors.length} hidden breadcrumb level${ancestors.length === 1 ? "" : "s"}`;

  return (
    <>
      <BreadcrumbItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              // Breadcrumb text is 20px tall. Keep this inline visual control
              // within that established row. Its pseudo-element is intended
              // to provide a 24px pointer target without adding layout
              // height; focused geometry verification measures the result.
              className="relative !size-5 !min-h-5 !min-w-5 !p-0 before:absolute before:-inset-0.5 before:content-['']"
              data-testid="button-breadcrumb-ellipsis"
              aria-label={`Show ${countLabel}`}
              title={`Show ${countLabel}`}
            >
              <MoreHorizontal aria-hidden="true" />
              <span className="sr-only">Show {countLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="w-64">
            <DropdownMenuLabel>Hidden breadcrumb levels</DropdownMenuLabel>
            {ancestors.map((ancestor) => (
              <DropdownMenuItem key={ancestor.href} asChild>
                <a href={ancestor.href}>{ancestor.label}</a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
    </>
  );
}