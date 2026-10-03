import { lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { hasAnalyticsVendors, openCookieSettings } from "@/components/ui/consent-banner";
import { visibleNavCategories, type AwesomeListNav } from "@/lib/static-data";
import { getCategoryGlyph } from "./category-glyphs";
import "@/styles/shell/footer.css";

const ContactFooter =
  import.meta.env.VITE_CONTACT_VARIANT === "a" ||
  import.meta.env.VITE_CONTACT_VARIANT === "b" ||
  import.meta.env.VITE_CONTACT_VARIANT === "c"
    ? lazy(() => import("@/components/contact/contact-footer").then((module) => ({ default: module.ContactFooter })))
    : null;

/** The deployment's display identity is the lowercase domain, as in the
 * reference PageFooter; another configured list keeps its own title. */
function footerDisplayName(siteName: string): string {
  return /^awesome\s+video(?:\s+dashboard)?$/i.test(siteName.trim())
    ? "awesome.video"
    : siteName.trim();
}

/** Reference EXPLORE rows use a category's short name ("Community", "Media"). */
function shortCategoryName(name: string): string {
  return name.split(/\s+&\s+|\s+/)[0] || name;
}

function GitHubMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Reference PageFooter (sidebar-variants.jsx): identity, index stats, explore
 * and source columns over a mono meta strip. Layout supplies its
 * already-loaded lightweight tree; the footer never fetches the corpus. */
export default function AppFooter({ nav, site }: {
  nav?: AwesomeListNav;
  site: { name: string; tagline: string; repoUrl: string; repoBranch: string; issuesUrl?: string };
}) {
  const [location] = useLocation();
  if (location.startsWith("/admin")) return null;

  const repo = site.repoUrl.replace(/\/$/, "");
  const repoLabel = repo.replace(/^https?:\/\/(www\.)?github\.com\//, "");
  const branch = encodeURIComponent(site.repoBranch);
  const displayName = footerDisplayName(site.name);
  // C9-V1-01: count and link only the categories the rest of the site shows.
  const categories = visibleNavCategories(nav?.categories);
  const subcategoryCount = categories.reduce((total, category) => total + (category.subcategories?.length ?? 0), 0);

  return (
    <footer className="app-footer" data-testid="site-footer">
      <div className="app-footer-grid">
        <div className="app-footer-identity">
          <p className="eyebrow app-footer-eyebrow">── INDEX</p>
          <Link href="/" className="display-h app-footer-name" data-testid="footer-home" aria-label={`${displayName} home`}>
            {displayName}
          </Link>
          {site.tagline && <p className="app-footer-tagline">{site.tagline}</p>}
          <div className="shimmer-line app-footer-shimmer" aria-hidden="true" />
        </div>

        <div>
          <h2 className="app-footer-heading">INDEXED</h2>
          {nav && <>
            <p className="display-h app-footer-total">{nav.totalResources.toLocaleString()}</p>
            <p className="app-footer-stats">
              {categories.length} categories<br />
              {subcategoryCount} subcategories<br />
              <span className="app-footer-live"><span className="live-dot" aria-hidden="true" /> live</span>
            </p>
          </>}
        </div>

        <nav aria-label="Explore categories">
          <h2 className="app-footer-heading">EXPLORE</h2>
          <div className="app-footer-explore">
            {categories.map((category) => category.slug ? (
              <Link key={category.slug} href={`/category/${encodeURIComponent(category.slug)}`} aria-label={category.name}>
                <span className="app-footer-glyph" aria-hidden="true">{getCategoryGlyph(category.name)}</span>
                <span aria-hidden="true">{shortCategoryName(category.name)}</span>
              </Link>
            ) : null)}
          </div>
        </nav>

        <div>
          <h2 className="app-footer-heading">SOURCE</h2>
          <a className="app-footer-repo" href={repo} target="_blank" rel="noopener noreferrer" data-testid="footer-github">
            <GitHubMark />
            <span>{repoLabel.split("/").map((part, i) => i === 0 ? part : <span key={i}>/<wbr />{part}</span>)}</span>
            <span className="app-footer-repo-arrow" aria-hidden="true">↗</span>
          </a>
          <p className="app-footer-note">
            Open-source.{" "}
            <a href={`${repo}/blob/${branch}/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">PRs welcome</a>.<br />
            Indexed automatically from <span className="app-footer-mono">README.md</span>.
          </p>
          {ContactFooter ? (
            <div className="app-footer-contact"><Suspense fallback={null}><ContactFooter /></Suspense></div>
          ) : null}
        </div>
      </div>

      <div className="app-footer-meta">
        <span data-testid="footer-copyright">© {new Date().getFullYear()} {displayName} · content CC0, code MIT</span>
        <nav className="app-footer-meta-links" aria-label="Site policies">
          <Link href="/about" data-testid="footer-about">About</Link>
          <Link href="/terms" data-testid="footer-terms">Terms</Link>
          <Link href="/privacy" data-testid="footer-privacy">Privacy</Link>
          <Link href="/code-of-conduct" data-testid="footer-code-of-conduct" aria-label="Code of Conduct">Conduct</Link>
          {hasAnalyticsVendors && (
            <button type="button" onClick={openCookieSettings} data-testid="footer-cookie-settings" className="btn ghost footer-cookie-settings">Cookie settings</button>
          )}
          <a href={site.issuesUrl || `${repo}/issues`} target="_blank" rel="noopener noreferrer">Issues ↗</a>
          <a href="/sitemap.xml">Sitemap</a>
        </nav>
        <span>built with the awesome-list framework</span>
      </div>
    </footer>
  );
}
