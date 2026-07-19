import { Helmet } from "react-helmet";
import { AwesomeList } from "@/types/awesome-list";
import {
  clampSeoTitle,
  clampSeoDescription,
  ogImagePath,
} from "@shared/seo-templates";

interface SEOHeadProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  awesomeList?: AwesomeList;
  category?: string;
  resourceCount?: number;
  type?: "website" | "article";
  /**
   * When true, emit a noindex/nofollow robots directive and omit the canonical
   * link so this state matches the server's soft-404 contract (og-middleware
   * marks missing resources noindex with no canonical). Used by error/not-found
   * branches so client hydration never re-asserts indexability on a dead URL.
   */
  noindex?: boolean;
}

const SITE_NAME = "Awesome Video";
const SITE_TAGLINE =
  "The curated index of 2,300+ video development resources — players, encoders, codecs, streaming, AI, tools, and community.";

// Canonical base must match the server SITE_URL (server/og-middleware.ts) so the
// client-hydrated canonical / og:url / og:image never drift to a non-apex host
// (e.g. the old staging subdomain, a www host, or a preview domain). Like the
// server, an env override (VITE_SITE_URL) wins; otherwise the official apex.
const CANONICAL_BASE = (import.meta.env.VITE_SITE_URL || "https://awesome.video").replace(/\/+$/, "");

export default function SEOHead({
  title,
  description,
  url,
  image,
  awesomeList,
  category,
  resourceCount,
  type = "website",
  noindex = false
}: SEOHeadProps) {
  // Generate dynamic SEO data based on the awesome list
  const baseUrl = CANONICAL_BASE;
  // Canonical/og:url must be PATH-ONLY (drop ?query) so filtered views collapse
  // onto a single indexable URL, and must use the fixed apex base (never the
  // live window.location.origin) so a request served from a non-apex host does
  // not hydrate a host-specific canonical that contradicts the server.
  // NOTE: window.location.pathname never includes the query string, so faceted
  // taxonomy pages (search/sort/tag params pushed via replaceState) always
  // canonicalize back to the clean base route — matching the server's behaviour.
  const currentUrl =
    url ||
    (typeof window !== 'undefined'
      ? `${CANONICAL_BASE}${window.location.pathname}`
      : CANONICAL_BASE);

  // siteTitle always resolves to the real brand ("Awesome Video") unless an
  // awesomeList override is explicitly passed — which no public page does.
  const siteTitle = awesomeList?.title || SITE_NAME;

  // Idempotent title builder — never produces a double-brand suffix when the
  // page already passes a title that includes the brand.
  const withBrand = (t: string) => (t.includes(SITE_NAME) ? t : `${t} — ${SITE_NAME}`);

  // Generate dynamic title based on page context. R4-025: clamped to the SERP
  // title budget through the SAME shared function the server's buildMetaTags
  // uses, so the crawl-pass and hydrated titles stay byte-identical.
  const pageTitle = clampSeoTitle(
    title
      ? withBrand(title)
      : category
      ? withBrand(`${category} Resources`)
      : SITE_NAME,
  );

  // Generate dynamic description — all public pages supply an explicit
  // description; these fallbacks only fire for transient loading states.
  // R4-026: clamped to the 160-char budget via the shared clamp (parity).
  const pageDescription = clampSeoDescription(description || (
    category
      ? `Discover ${resourceCount || 'curated'} ${category.toLowerCase()} resources on ${SITE_NAME}. Find the best tools, libraries, and frameworks for video development.`
      : awesomeList
      ? `${awesomeList.description || SITE_TAGLINE} Explore ${awesomeList.resources?.length || '2300+'} carefully curated resources across ${awesomeList.categories?.length || '80+'} categories.`
      : SITE_TAGLINE
  ));

  // Social sharing image — the SAME path-based PNG URL the server emits
  // (shared ogImagePath builder), so the two passes never advertise different
  // preview images. The endpoint resolves title/category server-side.
  const socialImage =
    image ||
    `${baseUrl}${ogImagePath(
      typeof window !== "undefined" ? window.location.pathname : "/",
    )}`;

  // Extract repository info for additional metadata
  const repoInfo = awesomeList?.repoUrl ? extractRepoInfo(awesomeList.repoUrl) : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={generateKeywords(awesomeList, category)} />
      <meta name="author" content={repoInfo ? `${repoInfo.owner} contributors` : `${SITE_NAME} contributors`} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"} />
      {!noindex && <link rel="canonical" href={currentUrl} />}

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      {!noindex && <meta property="og:url" content={currentUrl} />}
      <meta property="og:image" content={socialImage} />
      <meta property="og:image:alt" content={`${siteTitle} - ${pageDescription.substring(0, 100)}...`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={socialImage} />
      <meta name="twitter:image:alt" content={`${siteTitle} social preview`} />
      {repoInfo && (
        <meta name="twitter:creator" content={`@${repoInfo.owner}`} />
      )}

      {/* Additional SEO Meta Tags */}
      {/* MR-DS-04/05 — literal required (meta can't read CSS vars); matches DS --accent */}
      <meta name="theme-color" content="#ff3d52" />
      <meta name="msapplication-TileColor" content="#ff3d52" />
      <meta name="application-name" content={SITE_NAME} />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />

      {/* Favicon and Icons — apple-touch-icon must be raster PNG (R4-060):
          iOS ignores SVG touch icons and falls back to a page screenshot. */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Structured Data (JSON-LD) is emitted SERVER-SIDE by og-middleware so a
          single route-appropriate schema is authoritative for crawlers. The
          client deliberately ships none to avoid duplicate/conflicting graphs. */}

      {/* Additional Meta for iMessage and Social Previews */}
      {!noindex && <meta property="al:web:url" content={currentUrl} />}
      {repoInfo && (
        <>
          <meta property="article:author" content={repoInfo.owner} />
          <meta property="article:publisher" content={repoInfo.owner} />
        </>
      )}

      {/* Performance and Preconnect Hints */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="//github.com" />
      <link rel="dns-prefetch" href="//api.github.com" />
    </Helmet>
  );
}

function extractRepoInfo(url: string) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2]
    };
  }
  return null;
}

function generateKeywords(awesomeList?: AwesomeList, category?: string): string {
  const baseKeywords = [
    "awesome list",
    "curated resources",
    "developer tools",
    "open source",
    "programming resources"
  ];

  if (awesomeList?.title) {
    const title = awesomeList.title.toLowerCase();
    if (title.includes("go")) {
      baseKeywords.push("golang", "go programming", "go libraries", "go frameworks");
    }
  }

  if (category) {
    baseKeywords.push(category.toLowerCase(), `${category.toLowerCase()} tools`);
  }

  if (awesomeList?.categories) {
    // Add top categories as keywords
    baseKeywords.push(...awesomeList.categories.slice(0, 5).map(cat => cat.name.toLowerCase()));
  }

  return baseKeywords.join(", ");
}