import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function deslugify(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function extractRepoInfoFromUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'github.com') {
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        return { owner: pathParts[0], repo: pathParts[1] };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function getAbsoluteUrl(baseUrl: string, relativeUrl: string): string {
  try {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    
    const url = new URL(baseUrl);
    
    // Handle root-relative URLs
    if (relativeUrl.startsWith('/')) {
      return `${url.protocol}//${url.host}${relativeUrl}`;
    }
    
    // Handle relative URLs within the same directory
    const basePath = url.pathname.split('/').slice(0, -1).join('/');
    return `${url.protocol}//${url.host}${basePath}/${relativeUrl}`;
  } catch (e) {
    return relativeUrl;
  }
}

export function countResourcesByCategory(
  resources: Array<{ category: string; subcategory?: string }>, 
  category: string, 
  subcategory?: string
): number {
  if (subcategory) {
    return resources.filter(r => r.category === category && r.subcategory === subcategory).length;
  }
  return resources.filter(r => r.category === category).length;
}

export function getCategorySlug(category: string): string {
  return slugify(category);
}

export function getSubcategorySlug(category: string, subcategory: string): string {
  return `${slugify(category)}-${slugify(subcategory)}`;
}
