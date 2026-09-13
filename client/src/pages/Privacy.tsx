import { Link } from "wouter";
import SEOHead from "@/components/layout/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { openCookieSettings } from "@/components/ui/consent-banner";
import "@/styles/pages/system-legal.css";

// BUG-019 (run13): companion to Terms — see that file for the routing notes.
export default function Privacy() {
  return (
    <div className="legal-page">
      <SEOHead
        title="Privacy Policy"
        description="How Awesome Video handles your data: what we collect, how it's used, and the analytics choices you control."
      />
      <div className="legal-header">
        <h1 className="display-h legal-title text-2xl sm:text-3xl flex items-center gap-2" data-testid="heading-privacy">
          <Shield className="h-6 w-6 text-[var(--accent)]" />
          Privacy Policy
        </h1>
        <p className="legal-updated text-sm text-[color:var(--text-3)]">Last updated: September 1, 2026</p>
        <div className="shimmer-line legal-rule" aria-hidden="true" />
      </div>

      <Card className="legal-card">
        <CardContent className="legal-prose pt-6 space-y-6 text-sm leading-relaxed text-[color:var(--text-2)]">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">1. What we collect</h2>
            <p>
              Browsing anonymously requires no personal data. If you create an
              account, Clerk provides the sign-in interface and manages your
              credentials, authentication sessions, and session tokens. Awesome
              Video does not receive or use your password for sign-in. Clerk
              sends us the identity details needed to connect your account,
              including your account identifier and, when available, your email
              address, name, and profile image. We store a local account record
              with those details, your role, and your activity on the site:
              bookmarks, favorites, learning-journey progress, preferences, and
              resource submissions. A nullable password field retained from the
              site's pre-Clerk authentication system may remain on legacy
              account records, but it is not used for authentication.
            </p>
            <p>
              Clerk acts as our authentication service provider and processes
              sign-in details, credentials, sessions, and tokens on our behalf.
              Clerk may also process information under its own privacy terms
              when you use its authentication services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">2. Analytics</h2>
            <p>
              We use Google Analytics 4, Mixpanel, PostHog, and Amplitude to
              understand how the site is used, including page visits, popular
              resources, interactions, performance, and errors. PostHog and
              Amplitude may also provide session-replay features; PostHog masks
              page text and all form inputs in those recordings. These services
              only load after you accept analytics in the consent banner, and
              you can decline without losing site functionality.
            </p>
            <p>
              Analytics data can include usage events, technical and device
              information, pseudonymous identifiers, and your account
              identifier when you are signed in. After consent, Mixpanel may
              also receive your name and email address as account profile
              properties. Mixpanel stores its browser identifier in local
              storage rather than a cookie.
            </p>
            {/* R5-025 (run24): in-product consent-reset control — re-opens the
                banner so a persisted Accept/Decline can be changed anytime. */}
            <p>
              Changed your mind?{" "}
              <button
                type="button"
                onClick={openCookieSettings}
                className="legal-inline-link inline-flex items-center min-h-[24px] underline underline-offset-4 hover:text-[color:var(--text)]"
                data-testid="button-privacy-cookie-settings"
              >
                Open cookie settings
              </button>{" "}
              to make or change your analytics choice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">3. Cookies</h2>
            <p>
              We keep cookies to a minimum. Preferences such as your theme and
              your analytics consent choice are stored in your browser's local
              storage (not cookies). The cookies you may see are:
            </p>
            <div className="legal-table-wrap overflow-x-auto">
              <table className="legal-table block w-full text-left text-xs sm:table sm:text-sm border-collapse" data-testid="table-cookies">
                <thead className="hidden sm:table-header-group">
                  <tr className="border-b border-[var(--border)] text-[color:var(--text)]">
                    <th className="py-2 pr-4 font-semibold align-top">Cookie</th>
                    <th className="py-2 pr-4 font-semibold align-top">Purpose</th>
                    <th className="py-2 font-semibold align-top">Lifetime</th>
                  </tr>
                </thead>
                <tbody className="block sm:table-row-group">
                  <tr className="block border-b border-[var(--border)] py-2 sm:table-row sm:py-0">
                    <td className="block py-1 align-top font-mono sm:table-cell sm:py-2 sm:pr-4">
                      <span className="mb-1 block font-sans font-semibold text-[color:var(--text)] sm:hidden">Cookie</span>
                      __session*
                    </td>
                    <td className="block py-1 align-top sm:table-cell sm:py-2 sm:pr-4">
                      <span className="mb-1 block font-semibold text-[color:var(--text)] sm:hidden">Purpose</span>
                      Clerk authentication cookie. Clerk uses it to maintain and
                      verify your signed-in session; the name may include an
                      instance suffix.
                    </td>
                    <td className="block py-1 align-top sm:table-cell sm:py-2">
                      <span className="mb-1 block font-semibold text-[color:var(--text)] sm:hidden">Lifetime</span>
                      Managed by Clerk according to the authentication session
                    </td>
                  </tr>
                  {/* Run22 BUG-051: full GAESA disclosure — retention and
                      user-control details match the live cookie attributes
                      (expires ~30 days, path=/, set on the first response
                      before any consent because it comes from the edge, not
                      our application). */}
                  <tr className="block border-b border-[var(--border)] py-2 sm:table-row sm:py-0">
                    <td className="block py-1 align-top font-mono sm:table-cell sm:py-2 sm:pr-4">
                      <span className="mb-1 block font-sans font-semibold text-[color:var(--text)] sm:hidden">Cookie</span>
                      GAESA
                    </td>
                    <td className="block py-1 align-top sm:table-cell sm:py-2 sm:pr-4">
                      <span className="mb-1 block font-semibold text-[color:var(--text)] sm:hidden">Purpose</span>
                      Infrastructure cookie set by our hosting edge (Google App
                      Engine), not by this application. It supports request
                      routing between the edge and our servers — we do not use
                      it to track you, it carries no analytics, and we never
                      read it. Because it comes from the hosting platform, it
                      appears on your first visit regardless of your analytics
                      consent choice. It applies site-wide (path "/"). You can
                      block or delete it in your browser settings at any time —
                      the site keeps working; the edge may simply set a fresh
                      one on a later visit.
                    </td>
                    <td className="block py-1 align-top sm:table-cell sm:py-2">
                      <span className="mb-1 block font-semibold text-[color:var(--text)] sm:hidden">Lifetime</span>
                      About 30 days from your last visit
                    </td>
                  </tr>
                  <tr className="block py-2 sm:table-row sm:py-0">
                    <td className="block py-1 align-top font-mono sm:table-cell sm:py-2 sm:pr-4">
                      <span className="mb-1 block font-sans font-semibold text-[color:var(--text)] sm:hidden">Cookie</span>
                      _ga*, ph_*, AMP_*, AMP_MKTG_*
                    </td>
                    <td className="block py-1 align-top sm:table-cell sm:py-2 sm:pr-4">
                      <span className="mb-1 block font-semibold text-[color:var(--text)] sm:hidden">Purpose</span>
                      Cookies used by Google Analytics, PostHog, and Amplitude
                      for analytics identifiers and session continuity. They
                      are only set after you accept analytics; declining keeps
                      these services from loading.
                    </td>
                    <td className="block py-1 align-top sm:table-cell sm:py-2">
                      <span className="mb-1 block font-semibold text-[color:var(--text)] sm:hidden">Lifetime</span>
                      Set and managed by the relevant analytics provider
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Clerk and any sign-in method you choose through Clerk may set
              additional cookies while you authenticate.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">4. Sharing</h2>
            <p>
              We do not sell your data. Accepted resource submissions become
              part of the public directory and may be attributed in the
              upstream open-source list; your email address is never published.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">5. Retention and deletion</h2>
            <p>
              Account data is kept while your account is active. To delete
              your account and personal data, sign in and use{" "}
              {/* Run22 BUG-020: private, authenticated deletion channel —
                  replaces the old public-GitHub-issue instruction, which
                  would have required exposing personal data publicly. */}
              <Link
                href="/profile?tab=security"
                className="legal-inline-link inline-flex items-center min-h-[24px] align-middle underline underline-offset-4 hover:text-[color:var(--text)]"
                data-testid="link-privacy-deletion"
              >
                Profile → Security → Delete account &amp; data
              </Link>
              . The request is tied to your authenticated session and handled
              privately by a maintainer — you never have to post your email or
              any personal data in a public issue. If you can no longer sign
              in, open a GitHub issue{" "}
              <a
                href="https://github.com/krzemienski/awesome-video/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="legal-inline-link inline-flex items-center min-h-[24px] align-middle underline underline-offset-4 hover:text-[color:var(--text)]"
                data-testid="link-privacy-github-issues"
              >
                on the repository
              </a>{" "}
              that mentions only your username — include no email or personal
              data; the maintainer will verify ownership privately. Approved
              resources you submitted remain in the directory but are detached
              from your identity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">6. Changes</h2>
            <p>
              We may update this policy from time to time. Material changes
              will be reflected by the "Last updated" date above.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">7. Contact</h2>
            <p>
              For privacy, legal, or abuse questions,{" "}
              <a
                href="https://github.com/krzemienski/awesome-video/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="legal-inline-link inline-flex items-center min-h-[24px] align-middle underline underline-offset-4 hover:text-[color:var(--text)]"
                data-testid="link-privacy-contact"
              >
                open an issue on the project's GitHub repository
              </a>
              . Issues are public, so do not include private or sensitive
              personal information.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
