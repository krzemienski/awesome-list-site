import SEOHead from "@/components/layout/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import ParityPageHeader from "@/components/parity-settings/ParityPageHeader";

// BUG-019 (run13): the footer promised legal pages that didn't exist. Terms
// and Privacy are real routes now (also registered in App.tsx
// KNOWN_ROUTE_PATTERNS, the server og-middleware, and the sitemap).
export default function Terms() {
  return (
    <div className="parity-page parity-page--narrow space-y-6">
      <SEOHead
        title="Terms of Use"
        titleTestId="heading-terms"
        description="The terms that govern your use of Awesome Video — a free, community-curated directory of video development resources."
      />
      <ParityPageHeader
        title="Terms of Use"
        icon={<FileText className="h-5 w-5" />}
        meta="Last updated: September 1, 2026"
        backHref="/"
      />

      <Card className="parity-content-card">
        <CardContent className="pt-6 space-y-6 text-sm leading-relaxed text-[color:var(--text-2)]">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">1. What this site is</h2>
            <p>
              Awesome Video is a free, community-curated directory of video
              development resources built on the open-source awesome-video
              list. Browsing is open to everyone; creating an account adds
              bookmarks, favorites, learning-journey progress, and resource
              submissions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">2. Your account</h2>
            <p>
              You are responsible for the activity on your account and for
              keeping your credentials secure. You may sign in with a
              third-party identity provider or an email and password. We may
              suspend accounts that abuse the service, attempt to disrupt it,
              or submit spam.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">3. Submitted content</h2>
            <p>
              When you submit a resource or suggest an edit, you grant us a
              non-exclusive right to display, moderate, edit, and redistribute
              that submission as part of the directory, including in the
              upstream open-source list. Submissions are reviewed before they
              appear publicly. Do not submit content you do not have the right
              to share, or content that is unlawful, misleading, or malicious.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">4. Third-party links</h2>
            <p>
              The directory consists mostly of links to external sites we do
              not control. We make no guarantees about their availability,
              accuracy, or safety, and linking does not imply endorsement.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">5. No warranty</h2>
            <p>
              The service is provided "as is" without warranties of any kind.
              To the maximum extent permitted by law, we are not liable for any
              damages arising from your use of the site or the resources it
              links to.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">6. Changes</h2>
            <p>
              We may update these terms from time to time. Material changes
              will be reflected by the "Last updated" date above. Continuing to
              use the site after a change means you accept the updated terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">7. Governing law</h2>
            <p>
              These terms are governed by the laws of New York, United States,
              without regard to its conflict-of-laws principles.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">8. Contact</h2>
            <p>
              For legal, abuse, or terms questions,{" "}
              <a
                href="https://github.com/krzemienski/awesome-video/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center min-h-[24px] align-middle underline underline-offset-4 hover:text-[color:var(--text)]"
                data-testid="link-terms-contact"
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
