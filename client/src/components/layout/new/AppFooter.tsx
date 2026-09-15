import { lazy, Suspense, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { openCookieSettings } from "@/components/ui/consent-banner";
import { contactVariant } from "@/lib/contact";
import type { AwesomeListNav } from "@/lib/static-data";
import "@/styles/shell/footer.css";

const ContactFooter =
  import.meta.env.VITE_CONTACT_VARIANT === "a" ||
  import.meta.env.VITE_CONTACT_VARIANT === "b" ||
  import.meta.env.VITE_CONTACT_VARIANT === "c"
    ? lazy(() => import("@/components/contact/contact-footer").then((module) => ({ default: module.ContactFooter })))
    : null;

function Column({ title, children }: { title: string; children: ReactNode }) {
  return <div className="footer-column"><h2>{title}</h2><div className="app-footer-links">{children}</div></div>;
}

function ExternalLink({ href, children, testId }: { href: string; children: ReactNode; testId?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId}>{children}</a>;
}

/** Layout supplies its already-loaded lightweight tree; the footer never fetches the corpus. */
export default function AppFooter({ nav, site }: {
  nav?: AwesomeListNav;
  site: { name: string; tagline: string; repoUrl: string; repoBranch: string };
}) {
  const [location] = useLocation();
  if (location.startsWith("/admin")) return null;

  const repo = site.repoUrl.replace(/\/$/, "");
  const branch = encodeURIComponent(site.repoBranch);
  const categories = nav?.categories ?? [];
  const subcategoryCount = categories.reduce((total, category) => total + (category.subcategories?.length ?? 0), 0);
  return (
    <footer className="site-footer app-footer" data-testid="site-footer">
      <div className="site-footer-inner">
        <nav className="footer-grid" aria-label="Footer">
          <div className="footer-brand">
            <Link href="/" className="footer-brand-link" data-testid="footer-home" aria-label={`${site.name} home`}>
              <BrandMark className="app-footer-mark" />
              <span className="footer-wordmark">{site.name.toUpperCase()}</span>
            </Link>
            <p className="footer-tagline">{site.tagline}</p>
            {nav && <div className="footer-stats">
              {nav.totalResources.toLocaleString()} resources · {categories.length} categories · {subcategoryCount} subcategories
              <span className="footer-live"><span className="live-dot" aria-hidden="true" />indexed live</span>
            </div>}
          </div>
          <Column title="BROWSE">
            {categories.slice(0, 6).map((category) => category.slug ? (
              <Link key={category.slug} href={`/category/${encodeURIComponent(category.slug)}`}>{category.name}</Link>
            ) : null)}
            <Link href="/categories" data-testid="footer-categories">All categories →</Link>
            <Link href="/journeys" data-testid="footer-journeys">Journeys</Link>
          </Column>
          <Column title="PROJECT">
            <Link href="/about" data-testid="footer-about">About</Link>
            <Link href="/submit" data-testid="footer-submit">Submit a resource</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/terms" data-testid="footer-terms">Terms</Link>
            <Link href="/privacy" data-testid="footer-privacy">Privacy</Link>
            <Link href="/code-of-conduct" data-testid="footer-code-of-conduct">Code of Conduct</Link>
            <button type="button" onClick={openCookieSettings} data-testid="footer-cookie-settings" className="footer-cookie-settings">Cookie settings</button>
          </Column>
          <Column title="SOURCE">
            <ExternalLink href={repo} testId="footer-github">{repo.replace(/^https?:\/\/(www\.)?github\.com\//, "")} ↗</ExternalLink>
            {contactVariant !== "a" && <ExternalLink href={`${repo}/issues`}>Report an issue ↗</ExternalLink>}
            <ExternalLink href={`${repo}/blob/${branch}/CONTRIBUTING.md`}>Contributing ↗</ExternalLink>
            <ExternalLink href="https://github.com/sindresorhus/awesome">awesome-list guidelines ↗</ExternalLink>
            <ExternalLink href={`${repo}/tree/${branch}/docs`}>Docs ↗</ExternalLink>
            <a href="/sitemap.xml">Sitemap</a>
            {ContactFooter ? (
              <div className="app-footer-contact"><Suspense fallback={null}><ContactFooter /></Suspense></div>
            ) : null}
          </Column>
        </nav>
        <div className="footer-bottom">
          <span data-testid="footer-copyright">© {new Date().getFullYear()} {site.name} · content CC0, code MIT</span>
          <span>Built with React &amp; shadcn/ui</span>
        </div>
      </div>
    </footer>
  );
}