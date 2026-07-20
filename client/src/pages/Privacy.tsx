import { Link } from "wouter";
import SEOHead from "@/components/layout/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

// BUG-019 (run13): companion to Terms — see that file for the routing notes.
export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SEOHead
        title="Privacy Policy"
        description="How Awesome Video handles your data: what we collect, how it's used, and the analytics choices you control."
      />
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-privacy">
          <Shield className="h-6 w-6 text-[var(--accent)]" />
          Privacy Policy
        </h1>
        <p className="text-sm text-[color:var(--text-3)]">Last updated: July 16, 2026</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6 text-sm leading-relaxed text-[color:var(--text-2)]">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">1. What we collect</h2>
            <p>
              Browsing anonymously requires no personal data. If you create an
              account we store your email address, an optional display name,
              a securely hashed password (for email sign-ups), and your
              activity on the site: bookmarks, favorites, learning-journey
              progress, and resource submissions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">2. Analytics</h2>
            <p>
              We use Google Analytics to understand aggregate usage — which
              pages are visited and which resources are popular. Analytics
              only runs after you accept it in the consent banner, and you can
              decline without losing any functionality. We do not send
              personally identifying information to analytics.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">3. Cookies</h2>
            <p>
              We keep cookies to a minimum. Preferences such as your theme and
              your analytics consent choice are stored in your browser's local
              storage (not cookies). The cookies you may see are:
            </p>
            {/* NB-035 (run18): replaced the vague cookie paragraph with an
                accurate breakdown — connect.sid is our session auth cookie,
                GAESA is set by the Google App Engine hosting edge (not us, not
                for tracking), and the _ga* analytics cookies are only set after
                you consent. */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse" data-testid="table-cookies">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[color:var(--text)]">
                    <th className="py-2 pr-4 font-semibold align-top">Cookie</th>
                    <th className="py-2 pr-4 font-semibold align-top">Purpose</th>
                    <th className="py-2 font-semibold align-top">Lifetime</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-2 pr-4 align-top font-mono">connect.sid</td>
                    <td className="py-2 pr-4 align-top">
                      Session cookie that keeps you signed in after you log in.
                      Only set once you have an account and sign in.
                    </td>
                    <td className="py-2 align-top">Persists for 7 days</td>
                  </tr>
                  {/* Run22 BUG-051: full GAESA disclosure — retention and
                      user-control details match the live cookie attributes
                      (expires ~30 days, path=/, set on the first response
                      before any consent because it comes from the edge, not
                      our application). */}
                  <tr className="border-b border-[var(--border)]">
                    <td className="py-2 pr-4 align-top font-mono">GAESA</td>
                    <td className="py-2 pr-4 align-top">
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
                    <td className="py-2 align-top">About 30 days from your last visit</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top font-mono">_ga, _ga_*</td>
                    <td className="py-2 pr-4 align-top">
                      Google Analytics cookies that measure aggregate usage.
                      These are only set after you accept analytics in the
                      consent banner; decline and they are never created.
                    </td>
                    <td className="py-2 align-top">
                      _ga up to 2 years; _ga_* up to 2 years
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Third-party sign-in providers may also set their own cookies while
              you authenticate with them.
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
                className="underline underline-offset-4 hover:text-[color:var(--text)]"
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
                className="underline underline-offset-4 hover:text-[color:var(--text)]"
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
        </CardContent>
      </Card>
    </div>
  );
}
