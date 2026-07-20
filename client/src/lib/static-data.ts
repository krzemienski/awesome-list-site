/**
 * Data fetching for awesome list
 * 
 * All data is now served from the PostgreSQL database via /api/awesome-list
 * Static JSON files have been deprecated in favor of database-driven content
 */

/**
 * Fetch the awesome-list payload with a per-attempt timeout and one retry.
 * Surfaces the real failure cause (timeout, HTTP status, parse error) so the
 * ErrorPage shows something more useful than Safari's opaque "Load failed".
 */
const AWESOME_LIST_TIMEOUT_MS = 45_000;
const AWESOME_LIST_MAX_ATTEMPTS = 2;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStaticAwesomeList(): Promise<any> {
  // Check if we already have data from SSR
  if (typeof window !== 'undefined') {
    if ((window as any).__INITIAL_DATA__) {
      const data = (window as any).__INITIAL_DATA__;
      (window as any).__INITIAL_DATA__ = undefined;
      return data;
    }

    // BUG-001 (run19): index.html starts this fetch before the bundle parses.
    // Consume it once; on any failure fall through to the normal retry path.
    const early: Promise<Response> | undefined = (window as any).__awesomeListEarlyFetch;
    if (early) {
      (window as any).__awesomeListEarlyFetch = undefined;
      try {
        const response = await early;
        if (response.ok) {
          return await response.json();
        }
      } catch {
        /* fall through to the standard fetch below */
      }
    }
  }

  const url = '/api/awesome-list';
  let lastError: unknown;

  for (let attempt = 1; attempt <= AWESOME_LIST_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(url, AWESOME_LIST_TIMEOUT_MS);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText || ''} from ${url}`.trim());
      }
      try {
        return await response.json();
      } catch (parseErr) {
        throw new Error(
          `Invalid JSON from ${url} (got ${response.headers.get('content-type') || 'unknown'} ` +
            `content-type). The dev preview may have returned an HTML auth page instead of the API.`
        );
      }
    } catch (err) {
      lastError = err;
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const isLast = attempt === AWESOME_LIST_MAX_ATTEMPTS;
      if (isLast) {
        const why = isAbort
          ? `request timed out after ${AWESOME_LIST_TIMEOUT_MS / 1000}s`
          : err instanceof Error
            ? err.message
            : String(err);
        throw new Error(`Could not load resources from ${url} — ${why} (attempt ${attempt}/${AWESOME_LIST_MAX_ATTEMPTS}).`);
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Run22 BUG-008 — lightweight taxonomy tree for chrome (sidebar/header) and
 * slug resolution. Pages that don't render resource listings use this ~few-KB
 * payload instead of the ~2.7MB corpus.
 */
export interface AwesomeListNavNode {
  name: string;
  slug?: string;
  resourceCount: number;
  subcategories?: AwesomeListNavNode[];
  subSubcategories?: AwesomeListNavNode[];
}

export interface AwesomeListNav {
  title?: string;
  totalResources: number;
  categories: AwesomeListNavNode[];
}

/**
 * Routes whose CONTENT needs the full corpus (resource listings / client-side
 * fuzzy browse). Everything else renders from the nav tree + page-scoped
 * APIs. Keep in sync with the inline early-fetch gate in client/index.html
 * and the overlay settle logic in client/src/main.tsx.
 */
export function needsCorpusRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/categories' ||
    pathname === '/advanced' ||
    pathname === '/recommendations' ||
    pathname.startsWith('/category/') ||
    pathname.startsWith('/subcategory/') ||
    pathname.startsWith('/sub-subcategory/')
  );
}

export async function fetchAwesomeListNav(): Promise<AwesomeListNav> {
  // Consume the index.html early fetch once (same pattern as the corpus).
  if (typeof window !== 'undefined') {
    const early: Promise<Response> | undefined = (window as any).__awesomeListNavEarlyFetch;
    if (early) {
      (window as any).__awesomeListNavEarlyFetch = undefined;
      try {
        const response = await early;
        if (response.ok) {
          return await response.json();
        }
      } catch {
        /* fall through to the standard fetch below */
      }
    }
  }
  const response = await fetchWithTimeout('/api/awesome-list/nav', AWESOME_LIST_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText || ''} from /api/awesome-list/nav`.trim());
  }
  return await response.json();
}

export async function fetchSitemapData(): Promise<any> {
  try {
    const response = await fetch('/data/sitemap.json');
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('Sitemap data not available:', error);
    return null;
  }
}