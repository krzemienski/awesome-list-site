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
              We use a session cookie to keep you signed in and local storage
              for preferences such as your theme and your analytics consent
              choice. Third-party sign-in providers may set their own cookies
              during authentication.
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
              Account data is kept while your account is active. You can
              request deletion of your account and personal data by contacting
              the maintainer via the{" "}
              {/* Run16 BUG-067: the copy referenced the About page without
                  linking it. */}
              <Link
                href="/about"
                className="underline underline-offset-4 hover:text-[color:var(--text)]"
                data-testid="link-privacy-about"
              >
                About page
              </Link>
              ; approved resources you submitted remain in the directory but
              are detached from your identity.
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
