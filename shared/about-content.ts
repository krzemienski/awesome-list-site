// Maintainer / author E-E-A-T content. Shared verbatim between the client About
// page (client/src/pages/About.tsx) and the server-rendered crawler body
// (server/og-middleware.ts → renderStaticPageContent), so the visible page, the
// pre-JavaScript crawler view, and the site's Organization.founder schema all
// describe the same real person — a genuine E-E-A-T signal, not cloaking.
//
// Facts are kept truthful and evergreen: no fabricated tenure or inflated star
// counts. The "1,800+ stars" figure is a safe floor (the awesome-video repo is
// well above it and growing); the only external link is the verifiable GitHub
// profile.

export interface Maintainer {
  name: string;
  role: string;
  profileUrl: string;
  bio: string[];
}

export const MAINTAINER: Maintainer = {
  name: "Nick Krzemienski",
  role: "Creator & maintainer of awesome-video",
  profileUrl: "https://github.com/krzemienski",
  bio: [
    "awesome.video is curated and maintained by Nick Krzemienski, a video engineer and long-time contributor to the streaming media community and the creator of the open-source awesome-video list. He started the list to share the encoders, players, codecs, specifications, and learning resources he relies on with the wider video development community.",
    "The awesome-video list has become one of the most referenced open-source collections in the space, with more than 1,800 stars on GitHub. Every resource on this site is drawn from and kept in sync with that repository, so the directory reflects tools that working video engineers actually use.",
  ],
};

/** Public project copy consumed by both the React page and crawler body. */
export const ABOUT_PROJECT = {
  introLead: "awesome.video is the web home of",
  sourceName: "awesome-video",
  introDescription:
    "— a community-curated list of the best streaming and video-development tools, frameworks, libraries, and learning resources, maintained by Nick Krzemienski on GitHub.",
  facts: [
    { title: "The source list", description: "Resources on this site are drawn from the open-source awesome-video repository." },
    { title: "Open source", description: "The curated list and the platform that renders it are open source on GitHub." },
    { title: "Human reviewed", description: "New submissions are reviewed by maintainers before they are published." },
    { title: "For video builders", description: "Browse practical tools, frameworks, libraries, and learning resources for the video pipeline." },
  ],
  sourcesHeading: "Open source at its core",
  sourcesDescription: "The curated list that feeds this site, and the platform that renders it",
  sources: [
    {
      name: "awesome-video",
      url: "https://github.com/krzemienski/awesome-video",
      description: "A curated list of awesome streaming video tools, frameworks, libraries, and learning resources. Every resource on this site is sourced from and kept in sync with this repository.",
      label: "The source list",
      license: "CC0-1.0",
    },
    {
      name: "awesome-list-site",
      url: "https://github.com/krzemienski/awesome-list-site",
      description: "The open-source platform that powers this site — it transforms any GitHub awesome list into a sophisticated, interactive web dashboard with AI-powered enhancements, advanced search, and modern UI components.",
      label: "The engine",
      license: "MIT",
    },
  ],
  featuresHeading: "Features",
  featuresDescription: "Built for speed, accessibility, and user experience",
  features: [
    { label: "Responsive Design", desc: "Mobile-first" },
    { label: "Fast Performance", desc: "Optimized SPA" },
    { label: "Fuzzy Search", desc: "Find anything" },
    { label: "Multiple Themes", desc: "Customizable" },
    { label: "Accessible", desc: "WCAG compliant" },
    { label: "SEO Optimized", desc: "Discoverable" },
    { label: "Keyboard Shortcuts", desc: "⌘K or / to search" },
    { label: "Component Library", desc: "shadcn/ui" },
  ],
  technologyHeading: "Technology Stack",
  technologyDescription: "Modern web technologies for optimal performance",
  technologies: [
    { name: "React", description: "UI component framework" },
    { name: "Tailwind CSS", description: "Utility-first styling" },
    { name: "shadcn/ui", description: "Component primitives" },
    { name: "Fuse.js", description: "Fuzzy search engine" },
    { name: "Framer Motion", description: "Smooth animations" },
    { name: "TypeScript", description: "Type safety" },
  ],
  accessibilityHeading: "Accessibility First",
  accessibilityDescription: "Following WCAG 2.1 AA guidelines for inclusive design",
  accessibility: [
    "Proper heading structure",
    "Keyboard navigation",
    "Sufficient color contrast",
    "Appropriate ARIA attributes",
    "Respect for user motion preferences",
    "Screen reader optimized",
  ],
  creditsHeading: "Credits",
  creditsDescription: "Built with open source technologies",
  creditsIntro: "This project was built with dedication using open source technologies. Special thanks to:",
  credits: [
    { name: MAINTAINER.name, url: MAINTAINER.profileUrl, description: "Maintainer" },
    { name: "shadcn/ui", url: "https://ui.shadcn.com/", description: "Components" },
    { name: "Tailwind CSS", url: "https://tailwindcss.com/", description: "Styling" },
  ],
};

export function getAboutCatalogSummary(
  siteName: string,
  resourceCount?: number,
  categoryCount?: number,
): string {
  return resourceCount && categoryCount
    ? `${siteName} is a hand-curated index of ${resourceCount.toLocaleString("en-US")} resources across ${categoryCount} domains — encoding, transport, players, infrastructure, standards. Maintained as the canonical reference for people who actually ship video in production. `
    : "";
}
