import { Helmet } from "react-helmet";
import { AwesomeList } from "@/types/awesome-list";

interface SEOHeadProps {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  awesomeList?: AwesomeList;
  category?: string;
  resourceCount?: number;
  type?: "website" | "article";
}

const SITE_NAME = "Awesome Video";

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
  type = "website"
}: SEOHeadProps) {
  // Generate dynamic SEO data based on the awesome list
  const baseUrl = CANONICAL_BASE;
  // Canonical/og:url must be PATH-ONLY (drop ?query) so filtered views collapse
  // onto a single indexable URL, and must use the fixed apex base (never the
  // live window.location.origin) so a request served from a non-apex host does
  // not hydrate a host-specific canonical that contradicts the server.
  const currentUrl =
    url ||
    (typeof window !== 'undefined'
      ? `${CANONICAL_BASE}${window.location.pathname}`
      : CANONICAL_BASE);

  const siteTitle = awesomeList?.title || SITE_NAME;
  const siteDescription = awesomeList?.description || "A curated list of awesome resources";

  // Idempotent title builder — never produces a double-brand suffix when the
  // page already passes a title that includes the brand.
  const withBrand = (t: string) => (t.includes(SITE_NAME) ? t : `${t} — ${SITE_NAME}`);

  // Generate dynamic title based on page context
  const pageTitle = title
    ? withBrand(title)
    : category
    ? withBrand(`${category} Resources`)
    : SITE_NAME;

  // Generate dynamic description
  const pageDescription = description || (
    category 
      ? `Discover ${resourceCount || 'amazing'} ${category.toLowerCase()} resources in our curated ${siteTitle}. Find the best tools, libraries, and frameworks.`
      : awesomeList 
      ? `${siteDescription} Explore ${awesomeList.resources?.length || '2750+'} carefully curated resources across ${awesomeList.categories?.length || '80+'} categories.`
      : siteDescription
  );

  // Generate social sharing image
  const socialImage = image || `${baseUrl}/og-image.svg?title=${encodeURIComponent(pageTitle)}&category=${encodeURIComponent(category || '')}&resourceCount=${resourceCount || awesomeList?.resources?.length || ''}`;

  // Extract repository info for additional metadata
  const repoInfo = awesomeList?.repoUrl ? extractRepoInfo(awesomeList.repoUrl) : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={generateKeywords(awesomeList, category)} />
      <meta name="author" content={repoInfo ? `${repoInfo.owner} contributors` : `${SITE_NAME} contributors`} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={currentUrl} />
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

      {/* Favicon and Icons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="apple-touch-icon" href="/favicon.svg" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Structured Data (JSON-LD) is emitted SERVER-SIDE by og-middleware so a
          single route-appropriate schema is authoritative for crawlers. The
          client deliberately ships none to avoid duplicate/conflicting graphs. */}

      {/* Additional Meta for iMessage and Social Previews */}
      <meta property="al:web:url" content={currentUrl} />
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