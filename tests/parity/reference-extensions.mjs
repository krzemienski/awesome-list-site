import crypto from "node:crypto";
import fsSync from "node:fs";
import path from "node:path";
import { operationsStyle, projectOperations } from "./reference-admin-operations.mjs";
import { catalogStyle, projectCatalog } from "./reference-admin-catalog.mjs";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

/**
 * The frozen prototype predates the retained About sections and the current
 * operations queues.  This module is an expected-side projection for those
 * surfaces only.  It deliberately does not import application components or
 * styles: the browser projection uses the frozen design tokens and its own
 * semantic DOM.
 */

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const sourcePaths = Object.freeze({
  aboutPage: path.join(repoRoot, "client", "src", "pages", "About.tsx"),
  aboutContent: path.join(repoRoot, "shared", "about-content.ts"),
  faq: path.join(repoRoot, "shared", "faq.ts"),
  pageBreadcrumb: path.join(repoRoot, "client", "src", "components", "layout", "new", "PageBreadcrumb.tsx"),
  adminPage: path.join(repoRoot, "client", "src", "pages", "AdminDashboard.tsx"),
  approvals: path.join(repoRoot, "client", "src", "components", "admin", "PendingResources.tsx"),
  audit: path.join(repoRoot, "client", "src", "components", "admin", "AuditTab.tsx"),
  contact: path.join(repoRoot, "client", "src", "components", "admin", "ContactSubmissions.tsx"),
  canonical: path.join(repoRoot, "client", "src", "components", "admin", "canonical", "TableShell.tsx"),
});

const ABOUT_HEADINGS = Object.freeze([
  "About the maintainer",
  "Open source at its core",
  "Features",
  "Technology Stack",
  "Accessibility First",
  "Credits",
  "Frequently asked questions",
]);

const ABOUT_DESCRIPTIONS = Object.freeze([
  "Built for speed, accessibility, and user experience",
  "Modern web technologies for optimal performance",
  "Following WCAG 2.1 AA guidelines for inclusive design",
  "Built with open source technologies",
  "Quick answers about the site, the list, and how to contribute",
]);

const ABOUT_FEATURES = Object.freeze([
  ["Responsive Design", "Mobile-first"],
  ["Fast Performance", "Optimized SPA"],
  ["Fuzzy Search", "Find anything"],
  ["Multiple Themes", "Customizable"],
  ["Accessible", "WCAG compliant"],
  ["SEO Optimized", "Discoverable"],
  ["Keyboard Shortcuts", "⌘K or / to search"],
  ["Component Library", "shadcn/ui"],
]);

const ABOUT_TECHNOLOGY = Object.freeze([
  ["React", "UI component framework"],
  ["Tailwind CSS", "Utility-first styling"],
  ["shadcn/ui", "Component primitives"],
  ["Fuse.js", "Fuzzy search engine"],
  ["Framer Motion", "Smooth animations"],
  ["TypeScript", "Type safety"],
]);

const ABOUT_ACCESSIBILITY = Object.freeze([
  "Proper heading structure",
  "Keyboard navigation",
  "Sufficient color contrast",
  "Appropriate ARIA attributes",
  "Respect for user motion preferences",
  "Screen reader optimized",
]);

const ABOUT_CREDITS = Object.freeze([
  ["Nick Krzemienski", "Maintainer", "https://github.com/krzemienski"],
  ["shadcn/ui", "Components", "https://ui.shadcn.com/"],
  ["Tailwind CSS", "Styling", "https://tailwindcss.com/"],
]);

const referenceExtensionStyle = `
.parity-about-retained{display:grid;gap:14px;margin-top:14px}
.parity-about-card{overflow:hidden;padding:0}
.parity-about-card__header{padding:1.5rem 1.5rem 0}
.parity-about-card__body{padding:1rem 1.5rem 1.5rem}
.parity-about-title{display:flex;align-items:center;gap:.5rem;margin:0;color:var(--text);font-size:1.5rem;font-weight:600;letter-spacing:-.02em;line-height:1.15}
.parity-about-icon{display:inline-grid;place-items:center;width:1.25rem;height:1.25rem;color:var(--accent);font-family:var(--font-mono);font-size:.65rem;font-weight:700}
.parity-about-icon svg{width:100%;height:100%}
.parity-about-description{margin:.35rem 0 0;color:var(--text-2);font-size:.8125rem}
.parity-about-copy{display:grid;gap:1rem}
.parity-about-copy p{max-width:65ch;margin:0;color:var(--text-2);font-size:.875rem;line-height:1.65}
.parity-about-copy a,.parity-about-source a{color:var(--accent);text-decoration:none}
.parity-about-copy a svg{width:.875rem;height:.875rem;margin-left:.25rem;vertical-align:-.15rem}
.parity-about-copy a:hover,.parity-about-source a:hover{text-decoration:underline;text-underline-offset:3px}
.parity-about-source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
.parity-about-source{display:flex;flex-direction:column;gap:.75rem;padding:1.25rem;color:inherit;text-decoration:none}
.parity-about-source__heading{display:flex;justify-content:space-between;gap:.75rem;color:var(--text);font-weight:600}
.parity-about-source__heading svg{width:1rem;height:1rem;flex:0 0 auto;color:var(--text-2)}
.parity-about-source__name{display:flex;align-items:center;gap:.5rem;min-width:0}
.parity-about-source__copy{margin:0;color:var(--text-2);font-size:.875rem;line-height:1.65}
.parity-about-chip-row{display:flex;flex-wrap:wrap;gap:.5rem}
.parity-about-chip{padding:.125rem .5rem;border:var(--hairline-w) solid var(--border);border-radius:var(--radius-sm);color:var(--text-2);font-size:.6875rem;line-height:1.5}
.parity-about-feature-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}
.parity-about-feature{padding:1rem}
.parity-about-feature__mark{display:grid;place-items:center;width:1.5rem;height:1.5rem;margin-bottom:.5rem;border:var(--hairline-w) solid var(--accent);border-radius:var(--radius-sm);color:var(--accent);font-size:.625rem}
.parity-about-feature__label{margin-bottom:.25rem;color:var(--text);font-size:.875rem;font-weight:600;line-height:1.35}
.parity-about-feature__description,.parity-about-tech__description,.parity-about-credit__description{color:var(--text-2);font-size:.75rem;line-height:1.5}
.parity-about-tech-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.25rem}
.parity-about-tech-column{display:grid;gap:.75rem}
.parity-about-tech{display:flex;align-items:flex-start;gap:.75rem}
.parity-about-tech__dot{width:.5rem;height:.5rem;flex:0 0 auto;margin-top:.45rem;border:var(--border-w) solid var(--accent);border-radius:var(--radius-pill)}
.parity-about-tech:nth-child(odd) .parity-about-tech__dot{background:var(--accent)}
.parity-about-tech__name{color:var(--text);font-weight:600;line-height:1.4}
.parity-about-accessibility-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem}
.parity-about-accessibility{display:flex;align-items:center;gap:.5rem;color:var(--text);font-size:.875rem;line-height:1.45}
.parity-about-accessibility__dot{width:.375rem;height:.375rem;flex:0 0 auto;border-radius:var(--radius-pill);background:var(--accent)}
.parity-about-credits-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
.parity-about-credit{display:flex;align-items:center;gap:.75rem;padding:1rem;color:inherit;text-decoration:none}
.parity-about-credit__mark{display:inline-flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;flex:0 0 auto;color:var(--accent)}
.parity-about-credit__mark svg{width:100%;height:100%}
.parity-about-credit__name{color:var(--text);font-size:.875rem;font-weight:600;line-height:1.35}
.parity-about-faq{padding-top:.75rem}
.parity-about-faq-list{border-top:var(--hairline-w) solid var(--border)}
.parity-about-faq-item{border-bottom:var(--hairline-w) solid var(--border)}
.parity-about-faq-trigger{display:flex;align-items:center;justify-content:space-between;gap:1rem;width:100%;min-height:3.5rem;padding:.875rem 0;border:0;background:transparent;color:var(--text);font:inherit;font-size:.875rem;font-weight:600;text-align:left}
.parity-about-faq-trigger:hover{color:var(--accent)}
.parity-about-faq-chevron{display:inline-flex;color:var(--text-2)}
.parity-about-faq-chevron svg{width:1rem;height:1rem}
.parity-about-faq-panel{padding:0 2rem 1.125rem 0}
.parity-about-faq-panel[hidden]{display:none}
.parity-about-faq-panel p{margin:0;color:var(--text-2);font-size:.875rem;line-height:1.65}
.parity-page-breadcrumb{display:flex;align-items:center;height:2.5rem;margin:0;color:var(--text-2);font-size:.875rem;line-height:1.25}
.parity-page-breadcrumb__list{display:flex;align-items:center;gap:.625rem;min-width:0;margin:0;padding:0;list-style:none}
.parity-page-breadcrumb__item{display:inline-flex;align-items:center;gap:.625rem;min-width:0}
.parity-page-breadcrumb__link,.parity-page-breadcrumb__current{color:inherit;text-decoration:none;white-space:nowrap}
.parity-page-breadcrumb__current{color:var(--text)}
.parity-page-breadcrumb__separator{display:inline-flex;align-items:center;color:var(--text-2)}
.parity-page-breadcrumb__separator svg{width:.875rem;height:.875rem}
.parity-admin-stack{display:flex;flex-direction:column;gap:1rem}
.parity-admin-panel{overflow:hidden;padding:0}
.parity-admin-panel__header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem;padding:1.125rem 1.375rem;border-bottom:var(--hairline-w) solid var(--border)}
.parity-admin-panel__header h2{margin:0;color:var(--text);font-size:.875rem;font-weight:600}
.parity-admin-panel__header p{margin:.25rem 0 0;color:var(--text-2);font-size:.75rem}
.parity-admin-panel__actions{display:flex;flex-wrap:wrap;gap:.5rem}
.parity-admin-empty{display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:2.5rem 1.25rem;text-align:center}
.parity-admin-empty__mark{color:var(--accent);font-family:var(--font-mono);font-size:1.5rem}
.parity-admin-empty__mark svg{display:block;width:1.5rem;height:1.5rem}
.parity-admin-panel button svg{width:1rem;height:1rem;flex:0 0 auto}
.parity-admin-empty h3{margin:0;color:var(--text);font-size:1rem;font-weight:600}
.parity-admin-empty p{margin:0;color:var(--text-2);font-size:.8125rem}
.parity-admin-table-wrap{overflow-x:auto}
.parity-admin-table{width:100%;min-width:44rem;border-collapse:collapse}
.parity-admin-table th,.parity-admin-table td{border-bottom:var(--hairline-w) solid var(--border);padding:.75rem 1rem;text-align:left;font-size:.75rem;vertical-align:middle}
.parity-admin-table th{color:var(--text-2);font-family:var(--font-mono);font-size:.625rem;letter-spacing:.08em;text-transform:uppercase}
.parity-admin-table td{color:var(--text-2)}
.parity-admin-table td:first-child,.parity-admin-table td:last-child{font-family:var(--font-mono);font-size:.6875rem}
.parity-admin-table td strong{color:var(--text);font-weight:500}
.parity-admin-table td svg{width:1rem;height:1rem;vertical-align:-.2rem}
.parity-admin-table .parity-admin-muted{color:var(--text-2);font-family:var(--font-mono);font-size:.6875rem}
.parity-admin-table .parity-admin-actions{display:flex;justify-content:flex-end;gap:.375rem;white-space:nowrap}
.parity-admin-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:.75rem;padding:1rem 1.375rem}
.parity-admin-toolbar input,.parity-admin-toolbar select{box-sizing:border-box;min-height:2.5rem;border:var(--hairline-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2,var(--bg-2));color:var(--text);font:inherit;font-size:.8125rem;padding:0 .75rem}
.parity-admin-toolbar input{min-width:12rem;flex:1}
.parity-admin-toolbar select{min-width:7rem}
.parity-admin-range{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;padding:0 1.375rem 1rem;color:var(--text-2);font-size:.75rem}
.parity-admin-contact{margin-top:1rem}
.parity-admin-contact__empty{padding:2rem;text-align:center;color:var(--text-2);font-size:.8125rem}
.parity-admin-status{padding:2rem;text-align:center;color:var(--text-2);font-size:.8125rem}
.parity-admin-status strong{display:block;margin-bottom:.35rem;color:var(--text);font-weight:600}
@media(max-width:56rem){.parity-about-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.parity-about-accessibility-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:40rem){.parity-about-source-grid,.parity-about-tech-grid,.parity-about-credits-grid{grid-template-columns:1fr}.parity-about-feature-grid,.parity-about-accessibility-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.parity-about-card__header{padding-inline:1.25rem}.parity-about-card__body{padding-inline:1.25rem}}
@media(max-width:26rem){.parity-about-feature-grid,.parity-about-accessibility-grid{grid-template-columns:1fr}}
`;

const read = (file) => fsSync.readFileSync(file, "utf8");

const extractMaintainer = (source) => {
  const name = source.match(/name:\s*"([^"]+)"/)?.[1];
  const role = source.match(/role:\s*"([^"]+)"/)?.[1];
  const profileUrl = source.match(/profileUrl:\s*"([^"]+)"/)?.[1];
  const bioBlock = source.match(/bio:\s*\[([\s\S]*?)\n\s*\],/m)?.[1] || "";
  const bio = [...bioBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  if (!name || !role || !profileUrl || bio.length === 0) {
    throw new Error("About maintainer source contract could not be parsed; refusing an invented expected projection");
  }
  return { name, role, profileUrl, bio };
};

const extractFaqContent = (source) => {
  const questionMatches = [...source.matchAll(/question:\s*"([^"]+)"/g)];
  if (questionMatches.length === 0) throw new Error("FAQ source contract is empty; refusing an invented expected projection");
  return questionMatches.map((match, index) => {
    const end = questionMatches[index + 1]?.index ?? source.length;
    const segment = source.slice(match.index, end);
    const answerMatch = segment.match(/answer:\s*(?:"([\s\S]*?)"|`([\s\S]*?)`)/);
    if (!answerMatch) throw new Error(`FAQ answer source contract is missing for "${match[1]}"`);
    return {
      question: match[1],
      // The first answer is a source-owned template whose count is supplied by
      // the live catalog in buildReferenceReconciliation.
      answer: (answerMatch[1] ?? answerMatch[2]).replace("${countClaim}", "{{resourceCount}}"),
    };
  });
};

const normalizeJsxText = (fragment) => String(fragment)
  .replace(/\{\s*["'`]\s*["'`]\s*\}/g, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/\{[^}]*\}/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&apos;/g, "'")
  .replace(/\s+/g, " ")
  .trim();

const extractAboutHero = (source) => {
  const leadFragment = source.match(/className="about-lead-copy">([\s\S]*?)<\/p>/)?.[1];
  const calloutMatches = [...source.matchAll(
    /<div className="about-callout-title">([\s\S]*?)<\/div>\s*<div className="about-callout-copy">([\s\S]*?)<\/div>/g,
  )];
  const leadCopy = normalizeJsxText(leadFragment || "");
  const callouts = calloutMatches.map((match) => ({
    title: normalizeJsxText(match[1]),
    copy: normalizeJsxText(match[2]),
  }));
  if (!leadCopy || callouts.length !== 4 || callouts.some(({ title, copy }) => !title || !copy)) {
    throw new Error("About hero source contract could not be parsed; refusing an invented expected projection");
  }
  return { leadCopy, callouts };
};

export function buildExpectedReferenceExtensions() {
  const sources = Object.fromEntries(Object.entries(sourcePaths).map(([key, file]) => [key, read(file)]));
  const aboutHero = extractAboutHero(sources.aboutPage);
  const normalizedAboutSource = normalizeJsxText(sources.aboutPage);
  const required = [
    ["about retained wrapper", sources.aboutPage.includes('className="about-retained-content"')],
    ...ABOUT_HEADINGS.map((heading) => [`About heading "${heading}"`, sources.aboutPage.includes(heading)]),
    ...ABOUT_DESCRIPTIONS.map((description) => [`About description "${description}"`, sources.aboutPage.includes(description)]),
    ...ABOUT_FEATURES.flatMap(([label, description]) => [
      [`About feature "${label}"`, sources.aboutPage.includes(label)],
      [`About feature description "${description}"`, sources.aboutPage.includes(description)],
    ]),
    ...ABOUT_TECHNOLOGY.flatMap(([name, description]) => [
      [`About technology "${name}"`, sources.aboutPage.includes(name)],
      [`About technology description "${description}"`, sources.aboutPage.includes(description)],
    ]),
    ...ABOUT_ACCESSIBILITY.map((item) => [`About accessibility item "${item}"`, sources.aboutPage.includes(item)]),
    ...ABOUT_CREDITS.flatMap(([name, description]) => [
      [`About credit "${name}"`, sources.aboutPage.includes(name)],
      [`About credit description "${description}"`, sources.aboutPage.includes(description)],
    ]),
    ["About retained hero source contract", aboutHero.leadCopy.includes("awesome.video is the web home of") &&
      aboutHero.callouts.length === 4 &&
      aboutHero.callouts.every(({ title, copy }) => normalizedAboutSource.includes(title) && normalizedAboutSource.includes(copy))],
    ["About source project labels", [
      "awesome-video",
      "awesome-list-site",
      "The source list",
      "The engine",
      "CC0-1.0",
      "MIT",
      "A curated list of awesome streaming video tools, frameworks",
      "The open-source platform that powers this site",
    ].every((value) => sources.aboutPage.includes(value))],
    ["Page breadcrumb source contract", [
      'data-testid="page-breadcrumb"',
      'BreadcrumbLink href="/"',
      'BreadcrumbPage',
      'BreadcrumbSeparator',
    ].every((value) => sources.pageBreadcrumb.includes(value))],
    ["About canonical Card primitives", ["Card", "CardHeader", "CardContent"].every((name) => sources.aboutPage.includes(name))],
    ["Admin approvals endpoint", sources.approvals.includes("'/api/admin/pending-resources'")],
    ["Admin approvals empty state", sources.approvals.includes("All Caught Up!")],
    ["Admin audit endpoint", sources.audit.includes("/api/admin/audit-logs?")],
    ["Admin audit panel", sources.audit.includes('title="Audit Log"')],
    ["Admin contact panel", sources.audit.includes("ContactSubmissions")],
    ["Admin contact endpoint", sources.contact.includes("/api/admin/contact-submissions?")],
    ["Admin dashboard canonical tab", sources.adminPage.includes("CANONICAL_TABS")],
    ["Admin canonical TableShell", sources.canonical.includes('className={cn("card admin-canonical-table-shell"')],
  ];
  const missing = required.filter(([, present]) => !present).map(([label]) => label);
  if (missing.length) {
    throw new Error(`Retained reference source contract drifted; refusing expected extension (${missing.join(", ")})`);
  }

  const aboutContent = sources.aboutContent;
  const maintainer = extractMaintainer(aboutContent);
  const faqContent = extractFaqContent(sources.faq);
  const sourceProof = Object.fromEntries(Object.entries(sources).map(([key, source]) => [
    key,
    { file: path.relative(repoRoot, sourcePaths[key]).split(path.sep).join("/"), sha256: sha256(source) },
  ]));
  return {
    version: 2,
    style: referenceExtensionStyle + operationsStyle + catalogStyle,
    about: {
      headings: ABOUT_HEADINGS,
      descriptions: ABOUT_DESCRIPTIONS,
      maintainer,
      sourceProjects: [
        {
          name: "awesome-video",
          href: "https://github.com/krzemienski/awesome-video",
          copy: "A curated list of awesome streaming video tools, frameworks, libraries, and learning resources. Every resource on this site is sourced from and kept in sync with this repository.",
          chips: ["The source list", "CC0-1.0"],
          mark: "GH",
        },
        {
          name: "awesome-list-site",
          href: "https://github.com/krzemienski/awesome-list-site",
          copy: "The open-source platform that powers this site — it transforms any GitHub awesome list into a sophisticated, interactive web dashboard with AI-powered enhancements, advanced search, and modern UI components.",
          chips: ["The engine", "MIT"],
          mark: "↗",
        },
      ],
      features: ABOUT_FEATURES,
      technology: ABOUT_TECHNOLOGY,
      accessibility: ABOUT_ACCESSIBILITY,
      credits: ABOUT_CREDITS,
      faqQuestions: faqContent.map(({ question }) => question),
      faqAnswers: faqContent.map(({ answer }) => answer),
      resourceCount: null,
      hero: aboutHero,
      sourceProof: {
        aboutPage: sourceProof.aboutPage,
        aboutContent: sourceProof.aboutContent,
        faq: sourceProof.faq,
        pageBreadcrumb: sourceProof.pageBreadcrumb,
        hero: sourceProof.aboutPage,
      },
    },
    admin: {
      retainedTabs: ["approvals", "audit"],
      sourceProof: {
        adminPage: sourceProof.adminPage,
        approvals: sourceProof.approvals,
        audit: sourceProof.audit,
        contact: sourceProof.contact,
        canonical: sourceProof.canonical,
        pageBreadcrumb: sourceProof.pageBreadcrumb,
      },
    },
  };
}

const text = (document, value) => {
  const node = document.createTextNode(String(value ?? ""));
  return node;
};

const node = (document, tag, className, content = null) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== null) element.append(text(document, content));
  return element;
};

const link = (document, label, href, className = "") => {
  const anchor = node(document, "a", className, label);
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
};

const svgIcon = (document, name, className = "") => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (className) svg.setAttribute("class", className);
  const paths = {
    chevron: [["path", { d: "m9 18 6-6-6-6" }]],
    refresh: [
      ["path", { d: "M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" }],
      ["path", { d: "M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" }],
    ],
    search: [
      ["circle", { cx: "11", cy: "11", r: "7" }],
      ["path", { d: "m20 20-4-4" }],
    ],
    check: [
      ["circle", { cx: "12", cy: "12", r: "9" }],
      ["path", { d: "m8.5 12 2.25 2.25L15.5 9.5" }],
    ],
    external: [
      ["path", { d: "M14 3h7v7" }],
      ["path", { d: "m10 14 11-11" }],
      ["path", { d: "M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" }],
    ],
    users: [
      ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
      ["circle", { cx: "9", cy: "7", r: "4" }],
      ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" }],
    ],
    github: [
      ["path", { d: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.5 5.5 0 0 0 19.3 3.7 5.1 5.1 0 0 0 19.2 0S18 0 15 2.2a13.4 13.4 0 0 0-6 0C6 0 4.8 0 4.8 0a5.1 5.1 0 0 0-.1 3.7A5.5 5.5 0 0 0 3.2 7.5c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 9 18v4" }],
      ["path", { d: "M9 18c-4.5 2-5-2-7-2" }],
    ],
    zap: [["path", { d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z" }]],
    code: [
      ["path", { d: "m8 9-4 3 4 3" }],
      ["path", { d: "m16 9 4 3-4 3" }],
      ["path", { d: "m14 5-4 14" }],
    ],
    accessibility: [
      ["circle", { cx: "12", cy: "5", r: "2" }],
      ["path", { d: "M5 9h14M12 7v13M8 21l4-8 4 8" }],
    ],
    heart: [["path", { d: "M20.8 8.6c0 5.4-8.8 11-8.8 11s-8.8-5.6-8.8-11A4.6 4.6 0 0 1 12 5.4a4.6 4.6 0 0 1 8.8 3.2z" }]],
    help: [
      ["circle", { cx: "12", cy: "12", r: "9" }],
      ["path", { d: "M9.7 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.8-1.9 1.2-1.9 2.7" }],
      ["path", { d: "M12 17h.01" }],
    ],
    rocket: [
      ["path", { d: "M4.5 16.5c-1.5 1.3-2 3.5-2 3.5s2.2-.5 3.5-2l2-2-1.5-1.5-2 2z" }],
      ["path", { d: "M12 15 9 12c1-4.5 4.5-8.5 11-9 0 6.5-4.5 10-9 11z" }],
      ["path", { d: "M15 9h.01" }],
    ],
    component: [
      ["rect", { x: "3", y: "3", width: "7", height: "7", rx: "1" }],
      ["rect", { x: "14", y: "3", width: "7", height: "7", rx: "1" }],
      ["rect", { x: "14", y: "14", width: "7", height: "7", rx: "1" }],
      ["rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }],
    ],
    eye: [
      ["path", { d: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" }],
      ["circle", { cx: "12", cy: "12", r: "2.5" }],
    ],
    square: [["rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }]],
    wind: [
      ["path", { d: "M9.5 17H5a3 3 0 1 1 0-6h8.5a3 3 0 1 0 0-6H12" }],
      ["path", { d: "M5 21h10a3 3 0 1 0 0-6h-1" }],
    ],
  };
  (paths[name] || []).forEach(([tag, attributes]) => {
    const child = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) => child.setAttribute(key, value));
    svg.append(child);
  });
  return svg;
};

const appendReferenceBreadcrumb = (document, root, label) => {
  if (root.querySelector('[data-parity-reference-breadcrumb="true"]')) return;
  const nav = node(document, "nav", "parity-page-breadcrumb");
  nav.dataset.parityReferenceBreadcrumb = "true";
  nav.setAttribute("aria-label", "breadcrumb");
  const list = node(document, "ol", "parity-page-breadcrumb__list");
  const home = node(document, "li", "parity-page-breadcrumb__item");
  const homeLink = link(document, "Home", "/", "parity-page-breadcrumb__link");
  homeLink.target = "_self";
  homeLink.removeAttribute("rel");
  const separator = node(document, "span", "parity-page-breadcrumb__separator");
  separator.append(svgIcon(document, "chevron"));
  home.append(homeLink, separator);
  const current = node(document, "li", "parity-page-breadcrumb__item");
  current.append(node(document, "span", "parity-page-breadcrumb__current", label));
  list.append(home, current);
  nav.append(list);
  root.prepend(nav);
};

const compactText = (element) => element?.textContent?.replace(/\s+/g, " ").trim() || "";

const replaceDirectText = (element, value) => {
  const directText = [...element.childNodes].filter((child) => child.nodeType === 3);
  if (directText.length) {
    directText[0].nodeValue = value;
    directText.slice(1).forEach((child) => child.remove());
  } else {
    element.append(text(document, value));
  }
};

const appendAboutHeroProjection = (document, root, hero) => {
  /*
   * The frozen opening remains the expected-side renderer.  Only replace the
   * semantic copy that the retained About source owns; classes, wrappers,
   * styles, and card geometry stay frozen and independent of the app.
   */
  const candidates = [...root.querySelectorAll("p,div,span,h3,h4")];
  const lead = candidates
    .filter((element) => /hand-curated|1,816|across 9/i.test(compactText(element)))
    .sort((a, b) => compactText(a).length - compactText(b).length)[0];
  const legacyTitles = ["No link farms", "Open source", "Versioned", "Built for ops"];
  const targets = legacyTitles.map((legacyTitle) => {
    const title = candidates
      .filter((element) => compactText(element) === legacyTitle)
      .sort((a, b) => compactText(a).length - compactText(b).length)[0];
    const copy = title?.nextElementSibling || title?.parentElement?.querySelector("p");
    return { title, copy };
  });
  if (!lead || targets.some(({ title, copy }) => !(title instanceof HTMLElement) || !(copy instanceof HTMLElement))) {
    return [];
  }
  replaceDirectText(lead, hero.leadCopy);
  targets.forEach(({ title, copy }, index) => {
    replaceDirectText(title, hero.callouts[index].title);
    replaceDirectText(copy, hero.callouts[index].copy);
  });
  return ["retained About hero lead and callouts"];
};

const aboutHeader = (document, icon, title, description) => {
  const header = node(document, "header", "parity-about-card__header");
  const heading = node(document, "h2", "parity-about-title");
  const iconNames = { "◎": "users", GH: "github", "✦": "zap", "</>": "code", A11Y: "accessibility", "♥": "heart", "?": "help" };
  const iconSlot = node(document, "span", "parity-about-icon");
  iconSlot.append(svgIcon(document, iconNames[icon] || "help"));
  heading.append(iconSlot, text(document, title));
  header.append(heading, node(document, "p", "parity-about-description", description));
  return header;
};

const aboutCard = (document, icon, title, description) => {
  const card = node(document, "section", "card parity-about-card");
  card.append(aboutHeader(document, icon, title, description));
  const body = node(document, "div", "parity-about-card__body");
  card.append(body);
  return { card, body };
};

const appendAboutProjection = (document, root, about) => {
  const retained = node(document, "div", "parity-about-retained");
  retained.dataset.parityReferenceExtension = "about-retained";

  const maintainer = aboutCard(document, "◎", about.headings[0], about.maintainer.role);
  const maintainerCopy = node(document, "div", "parity-about-copy");
  about.maintainer.bio.forEach((paragraph) => maintainerCopy.append(node(document, "p", "", paragraph)));
  const maintainerLink = link(document, `${about.maintainer.name} on GitHub`, about.maintainer.profileUrl);
  maintainerLink.append(svgIcon(document, "external"));
  maintainerCopy.append(maintainerLink);
  const deletion = node(document, "p", "", "Need your account or personal data deleted? Sign in and use ");
  deletion.append(link(document, "Profile → Security → Delete account & data", "/profile?tab=security"), text(document, " — it’s private and authenticated, so you never have to post personal details publicly."));
  maintainerCopy.append(deletion);
  const contact = node(document, "p", "", "Questions or corrections? The best way to reach us is to ");
  const issueLink = link(document, "open an issue on GitHub", "https://github.com/krzemienski/awesome-video/issues");
  issueLink.append(svgIcon(document, "external"));
  contact.append(issueLink, text(document, "."));
  maintainerCopy.append(contact);
  const legal = node(document, "p", "", "Review the ");
  legal.append(link(document, "Terms of Use", "/terms"), text(document, " and "), link(document, "Privacy Policy", "/privacy"), text(document, " for the site’s legal and data practices."));
  maintainerCopy.append(legal);
  maintainer.body.append(maintainerCopy);
  retained.append(maintainer.card);

  const projects = aboutCard(document, "GH", about.headings[1], "The curated list that feeds this site, and the platform that renders it");
  const projectGrid = node(document, "div", "parity-about-source-grid");
  about.sourceProjects.forEach((project) => {
    const projectCard = link(document, "", project.href, "card parity-about-source");
    const projectHeading = node(document, "div", "parity-about-source__heading");
    const projectName = node(document, "div", "parity-about-source__name");
    projectName.append(svgIcon(document, project.name === "awesome-video" ? "github" : "rocket"), text(document, project.name));
    projectHeading.append(projectName, svgIcon(document, "external"));
    projectCard.append(projectHeading, node(document, "p", "parity-about-source__copy", project.copy));
    const chips = node(document, "div", "parity-about-chip-row");
    project.chips.forEach((chip) => chips.append(node(document, "span", "parity-about-chip", chip)));
    projectCard.append(chips);
    projectGrid.append(projectCard);
  });
  projects.body.append(projectGrid);
  retained.append(projects.card);

  const features = aboutCard(document, "✦", about.headings[2], about.descriptions[0]);
  const featureGrid = node(document, "div", "parity-about-feature-grid");
  about.features.forEach(([label, description], index) => {
    const feature = node(document, "div", "card parity-about-feature");
    feature.append(node(document, "div", "parity-about-feature__mark", String(index + 1).padStart(2, "0")));
    feature.append(node(document, "div", "parity-about-feature__label", label));
    feature.append(node(document, "div", "parity-about-feature__description", description));
    featureGrid.append(feature);
  });
  features.body.append(featureGrid);
  retained.append(features.card);

  const technology = aboutCard(document, "</>", about.headings[3], about.descriptions[1]);
  const technologyGrid = node(document, "div", "parity-about-tech-grid");
  const columns = [about.technology.slice(0, 3), about.technology.slice(3)];
  columns.forEach((items) => {
    const column = node(document, "div", "parity-about-tech-column");
    items.forEach(([name, description]) => {
      const item = node(document, "div", "parity-about-tech");
      item.append(node(document, "span", "parity-about-tech__dot"), node(document, "div", "", null));
      item.lastElementChild.append(node(document, "div", "parity-about-tech__name", name), node(document, "div", "parity-about-tech__description", description));
      column.append(item);
    });
    technologyGrid.append(column);
  });
  technology.body.append(technologyGrid);
  retained.append(technology.card);

  const accessibility = aboutCard(document, "A11Y", about.headings[4], about.descriptions[2]);
  const accessibilityGrid = node(document, "div", "parity-about-accessibility-grid");
  about.accessibility.forEach((item) => {
    const entry = node(document, "div", "parity-about-accessibility");
    entry.append(node(document, "span", "parity-about-accessibility__dot"), text(document, item));
    accessibilityGrid.append(entry);
  });
  accessibility.body.append(accessibilityGrid);
  retained.append(accessibility.card);

  const credits = aboutCard(document, "♥", about.headings[5], about.descriptions[3]);
  const creditCopy = node(document, "div", "parity-about-copy");
  creditCopy.append(node(document, "p", "", "This project was built with dedication using open source technologies. Special thanks to:"));
  const creditGrid = node(document, "div", "parity-about-credits-grid");
  about.credits.forEach(([name, description, href]) => {
    const credit = link(document, "", href, "card parity-about-credit");
    const creditMark = node(document, "span", "parity-about-credit__mark");
    creditMark.append(svgIcon(document, name === "Nick Krzemienski" ? "users" : name === "shadcn/ui" ? "component" : "wind"));
    credit.append(creditMark);
    const copy = node(document, "div", "");
    copy.append(node(document, "div", "parity-about-credit__name", name), node(document, "div", "parity-about-credit__description", description));
    credit.append(copy);
    creditGrid.append(credit);
  });
  creditCopy.append(creditGrid);
  credits.body.append(creditCopy);
  retained.append(credits.card);

  const faq = aboutCard(document, "?", about.headings[6], about.descriptions[4]);
  const faqList = node(document, "div", "parity-about-faq parity-about-faq-list");
  about.faqQuestions.forEach((question, index) => {
    const item = node(document, "div", "parity-about-faq-item");
    const trigger = node(document, "button", "parity-about-faq-trigger");
    trigger.type = "button";
    trigger.id = `parity-about-faq-button-${index}`;
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `parity-about-faq-panel-${index}`);
    const chevron = node(document, "span", "parity-about-faq-chevron");
    chevron.append(svgIcon(document, "chevron"));
    trigger.append(text(document, question), chevron);
    const panel = node(document, "div", "parity-about-faq-panel");
    panel.id = `parity-about-faq-panel-${index}`;
    panel.hidden = true;
    panel.setAttribute("role", "region");
    const answer = String(about.faqAnswers[index] || "").replace(
      "{{resourceCount}}",
      about.resourceCount || "thousands of reviewed resources",
    );
    panel.append(node(document, "p", "", answer));
    trigger.addEventListener("click", () => {
      const open = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
    item.append(trigger, panel);
    faqList.append(item);
  });
  faq.body.append(faqList);
  retained.append(faq.card);

  root.append(retained);
};

const appendButton = (document, label, variant = "ghost") => node(document, "button", `btn ${variant}`, label);

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const auditStatus = (action) => ({
  create: "completed",
  created: "completed",
  update: "completed",
  updated: "completed",
  approved: "approved",
  rejected: "rejected",
  deleted: "completed",
  synced: "completed",
  imported: "completed",
  exported: "completed",
  import: "completed",
  export: "completed",
  skip: "completed",
  ai_enriched: "completed",
  ai_enrichment_failed: "failed",
  edit_suggested: "pending",
  edit_approved: "approved",
  edit_rejected: "rejected",
  edit_superseded: "completed",
  edit_withdrawn: "completed",
  bulk_import: "completed",
  status_changed: "completed",
  withdrawn: "completed",
  category_created: "completed",
  category_updated: "completed",
  category_deleted: "completed",
  subcategory_created: "completed",
  subcategory_updated: "completed",
  subcategory_deleted: "completed",
  sub_subcategory_created: "completed",
  sub_subcategory_updated: "completed",
  sub_subcategory_deleted: "completed",
  "users.exported": "completed",
  "catalog.exported": "completed",
  "catalog.exported_github": "pending",
  "database.exported": "completed",
  maintenance_backfill_approved_at: "completed",
  maintenance_canonicalize_tags: "completed",
}[action] || "recorded");

const maskEmail = (value) => {
  const email = String(value || "");
  const at = email.indexOf("@");
  if (at <= 0) return email || "system";
  return `${email[0]}•••${email.slice(at)}`;
};

const actorLabel = (log) => log.performedByEmail
  ? maskEmail(log.performedByEmail)
  : log.performedBy
    ? String(log.performedBy).slice(0, 12)
    : "system";

const appendAdminHeader = (document, title, description, actions = []) => {
  const header = node(document, "header", "parity-admin-panel__header");
  const copy = node(document, "div", "");
  copy.append(node(document, "h2", "", title), node(document, "p", "", description));
  header.append(copy);
  if (actions.length) {
    const controls = node(document, "div", "parity-admin-panel__actions");
    actions.forEach((action) => controls.append(action));
    header.append(controls);
  }
  return header;
};

const appendAdminTable = (document, headers, rows) => {
  const wrap = node(document, "div", "parity-admin-table-wrap");
  const table = node(document, "table", "parity-admin-table");
  const head = node(document, "thead", "");
  const headRow = node(document, "tr", "");
  headers.forEach((header) => headRow.append(node(document, "th", "", header)));
  head.append(headRow);
  const body = node(document, "tbody", "");
  rows.forEach((cells) => {
    const row = node(document, "tr", "");
    cells.forEach((cell) => row.append(cell instanceof Node ? cell : node(document, "td", "", cell)));
    body.append(row);
  });
  table.append(head, body);
  wrap.append(table);
  return wrap;
};

const replaceAdminPanel = (document, root, panel) => {
  const tabs = root.querySelector(".tabs");
  if (!(tabs instanceof HTMLElement)) return false;
  let sibling = tabs.nextElementSibling;
  while (sibling) {
    const next = sibling.nextElementSibling;
    sibling.remove();
    sibling = next;
  }
  root.append(panel);
  return true;
};

const appendApprovalsProjection = (document, root) => {
  const resources = Array.isArray(window.AV_PENDING_RESOURCES)
    ? window.AV_PENDING_RESOURCES
    : Array.isArray(window.AV_PENDING_APPROVALS) ? window.AV_PENDING_APPROVALS : [];
  const panel = node(document, "section", "card parity-admin-panel");
  panel.dataset.parityReferenceExtension = "admin-approvals";
  const actions = resources.length
    ? [appendButton(document, "Bulk reject"), appendButton(document, "Approve all", "primary")]
    : [];
  panel.append(appendAdminHeader(document, "Pending Approvals", resources.length ? `${resources.length} submissions awaiting review` : "Resources awaiting admin review", actions));
  if (!resources.length) {
    const empty = node(document, "div", "parity-admin-empty");
    const check = node(document, "div", "parity-admin-empty__mark");
    check.append(svgIcon(document, "check"));
    const refresh = appendButton(document, "Check again");
    refresh.prepend(svgIcon(document, "refresh"));
    empty.append(check, node(document, "h3", "", "All Caught Up!"), node(document, "p", "", "There are no pending resources to review at this time."), refresh);
    panel.append(empty);
  } else {
    const rows = resources.map((resource) => {
      const titleCell = node(document, "td", "");
      titleCell.append(node(document, "strong", "", resource.title || ""));
      const actionsCell = node(document, "td", "parity-admin-actions");
      actionsCell.append(appendButton(document, "View"), appendButton(document, "Approve", "primary"), appendButton(document, "Reject", "ghost"));
      return [
        (() => {
          const selectCell = node(document, "td", "");
          selectCell.append(svgIcon(document, "square"));
          return selectCell;
        })(),
        titleCell,
        node(document, "td", "", resource.category || resource.cat || ""),
        node(document, "td", "", resource.description || ""),
        node(document, "td", "parity-admin-muted", formatDate(resource.createdAt)),
        node(document, "td", "", "pending"),
        actionsCell,
      ];
    });
    panel.append(appendAdminTable(document, ["", "Title", "Category", "Description", "Submitted", "Status", "Actions"], rows));
  }
  return replaceAdminPanel(document, root, panel);
};

const appendAuditProjection = (document, root) => {
  const logs = Array.isArray(window.AV_AUDIT_LOGS) ? window.AV_AUDIT_LOGS : [];
  const total = Number(window.AV_AUDIT_TOTAL ?? logs.length);
  const panelStack = node(document, "div", "parity-admin-stack");
  panelStack.dataset.parityReferenceExtension = "admin-audit";
  const panel = node(document, "section", "card parity-admin-panel");
  const input = node(document, "input", "");
  input.placeholder = "Filter by Resource ID...";
  input.type = "number";
  const select = node(document, "select", "");
  ["25", "50", "100", "200"].forEach((value) => {
    const option = node(document, "option", "", `${value} rows`);
    option.value = value;
    if (value === "50") option.selected = true;
    select.append(option);
  });
  const search = appendButton(document, "", "ghost");
  search.append(svgIcon(document, "search"));
  search.setAttribute("aria-label", "Search");
  const refresh = appendButton(document, "", "ghost");
  refresh.append(svgIcon(document, "refresh"));
  refresh.setAttribute("aria-label", "Refresh");
  const toolbar = node(document, "form", "parity-admin-toolbar");
  toolbar.append(input, select, search, refresh);
  const rowData = logs.map((log) => {
    const id = node(document, "td", "parity-admin-muted", log.id);
    id.append(text(document, "  "), svgIcon(document, "eye"));
    return [
      id,
      node(document, "td", "parity-admin-muted", actorLabel(log)),
      node(document, "td", "", String(log.action || "").replace(/_/g, " ")),
      node(document, "td", "", log.originalResourceId || log.resourceId ? `#${log.originalResourceId || log.resourceId}` : "System"),
      node(document, "td", "", auditStatus(log.action).replace(/_/g, " ")),
      node(document, "td", "parity-admin-muted", formatDate(log.createdAt)),
    ];
  });
  if (!rowData.length) {
    rowData.push([node(document, "td", "", "No audit log entries found")]);
    rowData[0][0].colSpan = 6;
  }
  panel.append(appendAdminHeader(document, "Audit Log", `Append-only · ${total} events`), toolbar, appendAdminTable(document, ["ID", "Actor", "Action", "Target", "Status", "When"], rowData));
  if (total > 0) {
    const range = node(document, "div", "parity-admin-range");
    range.append(node(document, "span", "", `1–${Math.min(logs.length, total)} of ${total.toLocaleString()} entries`));
    range.append(node(document, "span", "parity-admin-actions", null));
    range.lastElementChild.append(appendButton(document, "Previous"), appendButton(document, "Next"));
    panel.append(range);
  }
  panelStack.append(panel);

  const contacts = window.AV_CONTACT_SUBMISSIONS;
  const contactPanel = node(document, "section", "card parity-admin-panel parity-admin-contact");
  const contactTotal = Number(contacts?.total || 0);
  contactPanel.append(appendAdminHeader(document, "Contact submissions", `Private inbox · ${contactTotal} ${contactTotal === 1 ? "message" : "messages"}`));
  if (contacts?.available === false) {
    const status = node(document, "div", "parity-admin-status");
    const unavailable = Number(contacts?.status) === 404;
    status.append(
      node(document, "strong", "", unavailable ? "Contact inbox unavailable" : "Couldn't load contact submissions"),
      node(document, "span", "", unavailable
        ? "The contact submissions endpoint returned 404. No inbox data is available."
        : "The server returned an error while fetching the private inbox. Try again."),
      appendButton(document, "↻  Try again"),
    );
    contactPanel.append(status);
  } else if (!contactTotal) {
    contactPanel.append(node(document, "div", "parity-admin-contact__empty", "No contact submissions found"));
  } else {
    const submissions = Array.isArray(contacts?.submissions) ? contacts.submissions : [];
    const rows = submissions.map((submission) => [
      node(document, "td", "", submission.name || "—"),
      node(document, "td", "parity-admin-muted", maskEmail(submission.replyTo)),
      node(document, "td", "", submission.subject || "—"),
      node(document, "td", "parity-admin-muted", formatDate(submission.createdAt)),
    ]);
    contactPanel.append(appendAdminTable(document, ["Name", "Reply-to", "Subject", "Received"], rows));
  }
  panelStack.append(contactPanel);
  return replaceAdminPanel(document, root, panelStack);
};

/*
 * Playwright serializes the callback passed to evaluate rather than closing
 * over module functions.  Keep the browser projection source explicit and
 * self-contained so no application module can leak into the expected page.
 */
const browserProjection = (extension) => {
  const root = document.querySelector("main .page-content");
  if (!(root instanceof HTMLElement)) return { about: { status: "not-applicable" }, admin: { status: "not-applicable" } };
  const ensureStyle = () => {
    if (document.querySelector("style[data-parity-reference-extensions]")) return;
    const style = document.createElement("style");
    style.dataset.parityReferenceExtensions = "retained";
    style.textContent = extension.style;
    document.head.append(style);
  };
  const aboutHeading = root.querySelector("h1");
  const isAbout = aboutHeading?.textContent?.includes("field journal");
  const activeTab = root.querySelector(".tabs .tab.active")?.textContent?.trim();
  const aboutResult = { status: "not-applicable", modified: [], source: extension.about.sourceProof };
  const adminResult = { status: "not-applicable", modified: [], source: extension.admin.sourceProof };
  if (activeTab && aboutHeading?.textContent?.trim() === "Admin") {
    ensureStyle();
    appendReferenceBreadcrumb(document, root, "Admin");
  }
  for (const [project, bindings] of [
    [projectOperations, window.AV_RETAINED_OPERATIONS],
    [projectCatalog, window.AV_RETAINED_CATALOG],
  ]) {
    if (!bindings) continue;
    const result = project(document, root, bindings);
    if (result.status === "applied") {
      ensureStyle();
      appendReferenceBreadcrumb(document, root, "Admin");
      adminResult.status = "applied";
      adminResult.modified.push(...result.modified);
      adminResult.source = { ...adminResult.source, ...bindings.sourceProof };
    }
  }
  if (isAbout && !root.querySelector('[data-parity-reference-extension="about-retained"]')) {
    ensureStyle();
    appendReferenceBreadcrumb(document, root, "About");
    const heroModified = appendAboutHeroProjection(document, root, extension.about.hero);
    appendAboutProjection(document, root, extension.about);
    aboutResult.status = "applied";
    aboutResult.modified = [...heroModified, "retained About cards", "maintainer source content", "open-source projects", "features", "technology", "accessibility", "credits", "FAQ questions"];
  }
  if (activeTab === "Approvals" && !root.querySelector('[data-parity-reference-extension="admin-approvals"]')) {
    ensureStyle();
    appendReferenceBreadcrumb(document, root, "Admin");
    appendApprovalsProjection(document, root);
    adminResult.status = "applied";
    adminResult.modified = ["source-backed approvals queue", "canonical empty/action state"];
  }
  if (activeTab === "Audit" && !root.querySelector('[data-parity-reference-extension="admin-audit"]')) {
    ensureStyle();
    appendReferenceBreadcrumb(document, root, "Admin");
    appendAuditProjection(document, root);
    adminResult.status = "applied";
    adminResult.modified = ["source-backed audit table", "audit filters and pagination", "contact submissions panel"];
  }
  return { about: aboutResult, admin: adminResult };
};

const browserProjectionSource = [
  ["projectOperations", projectOperations],
  ["projectCatalog", projectCatalog],
  ["text", text],
  ["node", node],
  ["link", link],
  ["svgIcon", svgIcon],
  ["appendReferenceBreadcrumb", appendReferenceBreadcrumb],
  ["compactText", compactText],
  ["replaceDirectText", replaceDirectText],
  ["appendAboutHeroProjection", appendAboutHeroProjection],
  ["aboutHeader", aboutHeader],
  ["aboutCard", aboutCard],
  ["appendAboutProjection", appendAboutProjection],
  ["appendButton", appendButton],
  ["formatDate", formatDate],
  ["auditStatus", auditStatus],
  ["maskEmail", maskEmail],
  ["actorLabel", actorLabel],
  ["appendAdminHeader", appendAdminHeader],
  ["appendAdminTable", appendAdminTable],
  ["replaceAdminPanel", replaceAdminPanel],
  ["appendApprovalsProjection", appendApprovalsProjection],
  ["appendAuditProjection", appendAuditProjection],
  ["browserProjection", browserProjection],
].map(([name, functionSource]) => `const ${name} = ${functionSource.toString()};`).join("\n");

export async function applyExpectedRetainedReferenceExtensions(page, extension) {
  const result = await page.evaluate(({ extension, source }) => {
    // The function is generated from the audited expected-only projection
    // helpers above; it has no access to application modules or CSS.
    return new Function("extension", `${source}\nreturn browserProjection(extension);`)(extension);
  }, { extension, source: browserProjectionSource });
  return {
    status: result.about.status === "applied" || result.admin.status === "applied" ? "applied" : "not-applicable",
    about: result.about,
    admin: result.admin,
    version: extension.version,
  };
}

export { sourcePaths };