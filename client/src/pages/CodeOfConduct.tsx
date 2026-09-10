import SEOHead from "@/components/layout/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { HeartHandshake } from "lucide-react";
import ParityPageHeader from "@/components/parity-settings/ParityPageHeader";

// Companion to Terms and Privacy — see Terms.tsx for the routing notes. This is
// a real static route (registered in App.tsx KNOWN_ROUTE_PATTERNS + <Route>,
// the server og-middleware staticRoutes, and the sitemap). The SEOHead title
// mirrors the server og-middleware title EXACTLY (two-pass SEO parity).
export default function CodeOfConduct() {
  return (
    <div className="parity-page parity-page--narrow space-y-6">
      <SEOHead
        title="Code of Conduct"
        titleTestId="heading-code-of-conduct"
        description="The standards of behavior we expect from everyone who participates in Awesome Video — a free, community-curated directory of video development resources."
      />
      <ParityPageHeader
        title="Code of Conduct"
        icon={<HeartHandshake className="h-5 w-5" />}
        meta="Last updated: July 16, 2026"
        backHref="/"
      />

      <Card className="parity-content-card">
        <CardContent className="pt-6 space-y-6 text-sm leading-relaxed text-[color:var(--text-2)]">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">1. Our pledge</h2>
            <p>
              Awesome Video is a community-curated directory built on the
              open-source awesome-video list. We are committed to keeping every
              interaction — resource submissions, suggested edits, and
              discussion — welcoming, respectful, and harassment-free for
              everyone, regardless of experience level, background, or identity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">2. Expected behavior</h2>
            <p>
              Be considerate and constructive. Assume good intent, give and
              accept feedback gracefully, credit the work of others, and keep
              submissions on-topic and genuinely useful to video developers.
              Respect the maintainers' review decisions and the open-source
              spirit of the project.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">3. Unacceptable behavior</h2>
            <p>
              Harassment, discriminatory or demeaning language, personal
              attacks, spam, and deliberately misleading or malicious
              submissions are not tolerated. Do not submit content you do not
              have the right to share, or content that is unlawful or unsafe.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">4. Reporting and enforcement</h2>
            <p>
              If you experience or witness a violation,{" "}
              <a
                href="https://github.com/krzemienski/awesome-video/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center min-h-[24px] align-middle underline underline-offset-4 hover:text-[color:var(--text)]"
                data-testid="link-code-of-conduct-report"
              >
                open an issue on the project's GitHub repository
              </a>
              . Issues are public, so do not include private or sensitive
              personal information. We may edit or remove submissions and
              suspend accounts that abuse the service, disrupt it, or breach
              this code.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">5. Scope</h2>
            <p>
              This code applies to every space the project maintains and to
              anyone taking part in it — browsing, submitting, or contributing
              to the upstream open-source list.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-[color:var(--text)]">6. Changes</h2>
            <p>
              We may update this code of conduct from time to time. Material
              changes will be reflected by the "Last updated" date above.
              Continuing to use the site after a change means you accept the
              updated code.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
