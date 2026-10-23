import React, { type ElementType, type ReactNode } from "react";
import type { PreferredContactDestination } from "./contact-destination";

export const legalPolicies = {
  "/terms": {
    heading: "Terms of Use",
    updated: "September 1, 2026",
    description: "The terms that govern your use of Awesome Video — a free, community-curated directory of video development resources.",
  },
  "/privacy": {
    heading: "Privacy Policy",
    updated: "October 23, 2026",
    description: "How Awesome Video handles your data: what we collect, how it's used, and the analytics choices you control.",
  },
  "/code-of-conduct": {
    heading: "Code of Conduct",
    updated: "July 16, 2026",
    description: "The standards of behavior we expect from everyone who participates in Awesome Video — a free, community-curated directory of video development resources.",
  },
} as const;

export type LegalPolicyPath = keyof typeof legalPolicies;

const linkClass = "legal-inline-link inline-flex items-center min-h-[24px] align-middle underline underline-offset-4 hover:text-[color:var(--text)]";

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return <section className="space-y-2"><h2 className="text-base font-semibold text-[color:var(--text)]">{heading}</h2>{children}</section>;
}

function Contact({ destination, testId, unavailableId }: {
  destination: PreferredContactDestination | null;
  testId: string;
  unavailableId: string;
}) {
  return destination
    ? <a href={destination.href} target="_blank" rel="noopener noreferrer" className={linkClass} data-testid={testId}>{destination.label}</a>
    : <span data-testid={unavailableId}>no configured public contact destination is available</span>;
}

const privacyCookies = [
  [
    "__session*",
    "Clerk authentication cookie. Clerk uses it to maintain and verify your signed-in session; the name may include an instance suffix.",
    "Managed by Clerk according to the authentication session",
  ],
  [
    "GAESA",
    'Infrastructure cookie set by our hosting edge (Google App Engine), not by this application. It supports request routing between the edge and our servers — we do not use it to track you, it carries no analytics, and we never read it. Because it comes from the hosting platform, it appears on your first visit regardless of your analytics consent choice. It applies site-wide (path "/"). You can block or delete it in your browser settings at any time — the site keeps working; the edge may simply set a fresh one on a later visit.',
    "About 30 days from your last visit",
  ],
  [
    "_ga*, ph_*, AMP_*, AMP_MKTG_*",
    "Cookies used by Google Analytics, PostHog, and Amplitude for analytics identifiers and session continuity. They are only set after you accept analytics; declining keeps these services from loading.",
    "Set and managed by the relevant analytics provider",
  ],
];

/** No browser dependencies: both render paths use this exact policy copy. */
export function LegalPolicyContent({ path, contactDestination, cookieSettings, Link = "a" }: {
  path: LegalPolicyPath;
  contactDestination: PreferredContactDestination | null;
  cookieSettings?: ReactNode;
  Link?: ElementType;
}) {
  const contactWarning = contactDestination?.kind === "issues"
    ? "Issues are public, so do not include private or sensitive personal information."
    : "Please do not include private or sensitive personal information.";

  if (path === "/terms") return <>
    <Section heading="1. What this site is"><p>Awesome Video is a free, community-curated directory of video development resources built on the open-source awesome-video list. Browsing is open to everyone; creating an account adds bookmarks, favorites, learning-journey progress, and resource submissions.</p></Section>
    <Section heading="2. Your account"><p>You are responsible for the activity on your account and for keeping your credentials secure. You may sign in with a third-party identity provider or an email and password. We may suspend accounts that abuse the service, attempt to disrupt it, or submit spam.</p></Section>
    <Section heading="3. Submitted content"><p>When you submit a resource or suggest an edit, you grant us a non-exclusive right to display, moderate, edit, and redistribute that submission as part of the directory, including in the upstream open-source list. Submissions are reviewed before they appear publicly. Do not submit content you do not have the right to share, or content that is unlawful, misleading, or malicious.</p></Section>
    <Section heading="4. Third-party links"><p>The directory consists mostly of links to external sites we do not control. We make no guarantees about their availability, accuracy, or safety, and linking does not imply endorsement.</p></Section>
    <Section heading="5. No warranty"><p>The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for any damages arising from your use of the site or the resources it links to.</p></Section>
    <Section heading="6. Changes"><p>We may update these terms from time to time. Material changes will be reflected by the "Last updated" date above. Continuing to use the site after a change means you accept the updated terms.</p></Section>
    <Section heading="7. Governing law"><p>These terms are governed by the laws of New York, United States, without regard to its conflict-of-laws principles.</p></Section>
    <Section heading="8. Contact"><p>For legal, abuse, or terms questions, <Contact destination={contactDestination} testId="link-terms-contact" unavailableId="text-terms-contact-unavailable" />. {contactWarning}</p></Section>
  </>;

  if (path === "/code-of-conduct") return <>
    <Section heading="1. Our pledge"><p>Awesome Video is a community-curated directory built on the open-source awesome-video list. We are committed to keeping every interaction — resource submissions, suggested edits, and discussion — welcoming, respectful, and harassment-free for everyone, regardless of experience level, background, or identity.</p></Section>
    <Section heading="2. Expected behavior"><p>Be considerate and constructive. Assume good intent, give and accept feedback gracefully, credit the work of others, and keep submissions on-topic and genuinely useful to video developers. Respect the maintainers' review decisions and the open-source spirit of the project.</p></Section>
    <Section heading="3. Unacceptable behavior"><p>Harassment, discriminatory or demeaning language, personal attacks, spam, and deliberately misleading or malicious submissions are not tolerated. Do not submit content you do not have the right to share, or content that is unlawful or unsafe.</p></Section>
    <Section heading="4. Reporting and enforcement"><p>If you experience or witness a violation, <Contact destination={contactDestination} testId="link-code-of-conduct-report" unavailableId="text-code-of-conduct-contact-unavailable" />. {contactWarning} We may edit or remove submissions and suspend accounts that abuse the service, disrupt it, or breach this code.</p></Section>
    <Section heading="5. Scope"><p>This code applies to every space the project maintains and to anyone taking part in it — browsing, submitting, or contributing to the upstream open-source list.</p></Section>
    <Section heading="6. Changes"><p>We may update this code of conduct from time to time. Material changes will be reflected by the "Last updated" date above. Continuing to use the site after a change means you accept the updated code.</p></Section>
  </>;

  return <>
    <Section heading="1. What we collect">
      <p>Browsing anonymously requires no personal data. If you create an account, Clerk provides the sign-in interface and manages your credentials, authentication sessions, and session tokens. Awesome Video does not receive or use your password for sign-in. Clerk sends us the identity details needed to connect your account, including your account identifier and, when available, your email address, name, and profile image. We store a local account record with those details, your role, and your activity on the site: bookmarks, favorites, learning-journey progress, preferences, and resource submissions. A nullable password field retained from the site's pre-Clerk authentication system may remain on legacy account records, but it is not used for authentication.</p>
      <p>Clerk acts as our authentication service provider and processes sign-in details, credentials, sessions, and tokens on our behalf. Clerk may also process information under its own privacy terms when you use its authentication services.</p>
    </Section>
    <Section heading="2. Analytics">
      <p>We use Google Analytics 4, Mixpanel, PostHog, and Amplitude to understand how the site is used, including page visits, popular resources, interactions, performance, and errors. PostHog and Amplitude may also provide session-replay features; PostHog masks page text and all form inputs in those recordings. These services only load after you accept analytics in the consent banner, and you can decline without losing site functionality.</p>
      <p>Our hosting platform, Replit, also provides Replit Analytics, which counts page visits without cookies or cross-site identifiers. Unless you decline analytics in the consent banner, the site also sends Replit Analytics anonymous interaction and performance events — for example, which resource or related link was opened, page-load timings, whether a submission, sign-up or sign-in completed, the address of a page that was not found, and the kind of error the site hit. These events never include your name, email address, account identifier, or the text you type. Page-visit counts are recorded by the platform whether or not you decline.</p>
      <p>Analytics data can include usage events, technical and device information, pseudonymous identifiers, and your account identifier when you are signed in. After consent, Mixpanel may also receive your name and email address as account profile properties. Mixpanel stores its browser identifier in local storage rather than a cookie.</p>
      {cookieSettings}
    </Section>
    <Section heading="3. Cookies">
      <p>We keep cookies to a minimum. Preferences such as your theme and your analytics consent choice are stored in your browser's local storage (not cookies). The cookies you may see are:</p>
      <div className="legal-table-wrap overflow-x-auto">
        <table role="table" className="legal-table block w-full text-left text-xs sm:table sm:text-sm border-collapse" data-testid="table-cookies">
          {/* Preserve table semantics when the mobile layout uses display: block. */}
          <thead role="rowgroup" className="sr-only sm:not-sr-only sm:table-header-group"><tr role="row" className="border-b border-[var(--border)] text-[color:var(--text)]">
            {["Cookie", "Purpose", "Lifetime"].map((label, index) => <th key={label} role="columnheader" id={`cookie-header-${["name", "purpose", "lifetime"][index]}`} scope="col" className={index < 2 ? "py-2 pr-4 font-semibold align-top" : "py-2 font-semibold align-top"}>{label}</th>)}
          </tr></thead>
          <tbody role="rowgroup" className="block sm:table-row-group">
            {privacyCookies.map((row, rowIndex) => <tr key={row[0]} role="row" className={rowIndex < 2 ? "block border-b border-[var(--border)] py-2 sm:table-row sm:py-0" : "block py-2 sm:table-row sm:py-0"}>
              {row.map((text, index) => <td key={index} role="cell" headers={`cookie-header-${["name", "purpose", "lifetime"][index]}`} className={index === 0 ? "block py-1 align-top font-mono sm:table-cell sm:py-2 sm:pr-4" : index === 1 ? "block py-1 align-top sm:table-cell sm:py-2 sm:pr-4" : "block py-1 align-top sm:table-cell sm:py-2"}>
                <span aria-hidden="true" className={index === 0 ? "mb-1 block font-sans font-semibold text-[color:var(--text)] sm:hidden" : "mb-1 block font-semibold text-[color:var(--text)] sm:hidden"}>{["Cookie", "Purpose", "Lifetime"][index]}</span>{text}
              </td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
      <p>Clerk and any sign-in method you choose through Clerk may set additional cookies while you authenticate.</p>
    </Section>
    <Section heading="4. Sharing"><p>We do not sell your data. Accepted resource submissions become part of the public directory and may be attributed in the upstream open-source list; your email address is never published.</p></Section>
    <Section heading="5. Retention and deletion"><p>
      Account data is kept while your account is active. To delete your account and personal data, sign in and use <Link href="/profile?tab=security" className={linkClass} data-testid="link-privacy-deletion">Profile → Security → Delete account &amp; data</Link>. The request is tied to your authenticated session and handled privately by a maintainer — you never have to post your email or {contactDestination?.kind === "issues" ? "any personal data in a public issue." : "personal data publicly."} If you can no longer sign in, <Contact destination={contactDestination} testId="link-privacy-github-issues" unavailableId="text-privacy-contact-unavailable" />{contactDestination ? ` ${contactDestination.kind === "issues" ? "and mention only your username" : "and explain that you need account access"}` : ""}. {contactDestination?.kind === "issues" ? "Do not include your email or other personal data; the maintainer will verify ownership privately." : contactDestination ? "Do not include passwords, session details, or other sensitive information." : "Please do not post personal information while this deployment has no configured contact destination."} Approved resources you submitted remain in the directory but are detached from your identity.
    </p></Section>
    <Section heading="6. Changes"><p>We may update this policy from time to time. Material changes will be reflected by the "Last updated" date above.</p></Section>
    <Section heading="7. Contact"><p>For privacy, legal, or abuse questions, <Contact destination={contactDestination} testId="link-privacy-contact" unavailableId="text-privacy-contact-unavailable" />. {contactWarning}</p></Section>
  </>;
}
