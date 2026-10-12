import { Link } from "wouter";
import { FileText, Shield, HeartHandshake } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { hasAnalyticsVendors, openCookieSettings } from "@/components/ui/consent-banner";
import { preferredContactDestination, useContactConfig } from "@/lib/contact";
import { legalPolicies, LegalPolicyContent, type LegalPolicyPath } from "@shared/legal-policy-content";
import "@/styles/pages/system-legal.css";

const icons = { "/terms": FileText, "/privacy": Shield, "/code-of-conduct": HeartHandshake };
const testIds = { "/terms": "terms", "/privacy": "privacy", "/code-of-conduct": "code-of-conduct" };

export default function LegalPolicyPage({ path }: { path: LegalPolicyPath }) {
  const { data: contactConfig } = useContactConfig(true);
  const policy = legalPolicies[path];
  const Icon = icons[path];
  return (
    <div className="legal-page">
      <SEOHead title={policy.heading} description={policy.description} />
      <div className="legal-header">
        <h1 className="page-title legal-title text-2xl sm:text-3xl flex items-center gap-2" data-testid={`heading-${testIds[path]}`}>
          <Icon className="h-6 w-6 text-[var(--accent-ink)]" />
          {policy.heading}
        </h1>
        <p className="legal-updated text-sm text-[color:var(--text-3)]">Last updated: {policy.updated}</p>
        <div className="shimmer-line legal-rule" aria-hidden="true" />
      </div>
      <Card className="legal-card">
        <CardContent className="legal-prose pt-6 space-y-6 text-sm leading-relaxed text-[color:var(--text-2)]" data-seo-section="legal-policy">
          <LegalPolicyContent
            path={path}
            contactDestination={preferredContactDestination(contactConfig)}
            Link={Link}
            cookieSettings={hasAnalyticsVendors ? (
              <p data-seo-interactive>Changed your mind?{" "}
                <button type="button" onClick={openCookieSettings}
                  className="legal-inline-link inline-flex items-center min-h-[24px] underline underline-offset-4 hover:text-[color:var(--text)]"
                  data-testid="button-privacy-cookie-settings">
                  Open cookie settings
                </button>{" "}to make or change your analytics choice.
              </p>
            ) : null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
