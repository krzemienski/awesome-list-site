import { useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import type { AwesomeListNav, AwesomeListNavNode } from "@/lib/static-data";
import {
  normalizeTagFilter,
  TAG_LANDING_MIN_RESOURCES,
  tagLandingPath,
} from "@shared/tagNormalize";

interface TagsResponse {
  tags: { tag: string; count: number }[];
}

function taxonomyPath(nav: AwesomeListNav, slug: string): string | null {
  const at = (nodes: AwesomeListNavNode[] | undefined) =>
    (nodes ?? []).find((node) => node.slug === slug);
  if (at(nav.categories)) return `/category/${slug}`;
  for (const category of nav.categories) {
    if (at(category.subcategories)) return `/subcategory/${slug}`;
  }
  for (const category of nav.categories) {
    for (const subcategory of category.subcategories ?? []) {
      if (at(subcategory.subSubcategories)) return `/sub-subcategory/${slug}`;
    }
  }
  return null;
}

/**
 * Links copied from the original awesome-list README point at its heading
 * anchors (/#hevc, /#encoding--codecs). Those headings are now taxonomy or tag
 * pages, so a home visit carrying one of them goes to that page. Anchors that
 * name an element on the page, or match nothing, are left alone.
 */
export function useLegacyReadmeAnchor(nav: AwesomeListNav | undefined): void {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!nav || window.location.pathname !== "/") return;
    let anchor: string;
    try {
      anchor = decodeURIComponent(window.location.hash.slice(1)).toLowerCase();
    } catch {
      return;
    }
    if (!/^[a-z0-9-]+$/.test(anchor) || document.getElementById(anchor)) return;
    const tidied = anchor.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
    if (!tidied) return;

    const go = (path: string) => {
      if (window.location.pathname === "/" && window.location.hash) {
        navigate(path, { replace: true });
      }
    };
    const taxonomy = taxonomyPath(nav, anchor) ?? taxonomyPath(nav, tidied);
    if (taxonomy) {
      go(taxonomy);
      return;
    }

    let cancelled = false;
    void queryClient
      .fetchQuery<TagsResponse>({ queryKey: ["/api/tags"], staleTime: 60_000 })
      .then(({ tags }) => {
        const wanted = normalizeTagFilter(tidied);
        const tag = tags.find(
          (entry) => entry.tag === wanted && entry.count >= TAG_LANDING_MIN_RESOURCES,
        );
        if (tag && !cancelled) go(tagLandingPath(tag.tag));
      })
      // An unreachable tag list leaves the visitor on the home page, which is
      // where an unmatched anchor lands anyway.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [nav, navigate]);
}
