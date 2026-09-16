import { useState } from "react";
import { Link } from "wouter";
import SEOHead from "@/components/layout/SEOHead";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Accessibility,
  BookOpen,
  Code2,
  Component,
  ExternalLink,
  Github,
  Globe,
  Heart,
  HelpCircle,
  Keyboard,
  Palette,
  Rocket,
  Search,
  Users,
  Wind,
  Zap,
  ChevronDown,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAboutFaqs } from "@shared/faq";
import { MAINTAINER } from "@shared/about-content";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import "@/styles/pages/about.css";

interface AboutCatalogData {
  resources?: unknown[];
  categories?: unknown[];
}

export default function About() {
  // Run22 BUG-018: FAQ resource-count claim rendered from the live catalog
  // (same shared cache key as App/Home — no extra network round-trip).
  const { data: treeData } = useQuery<AboutCatalogData>({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  const aboutFaqs = getAboutFaqs(treeData?.resources?.length);
  const catalogSummary =
    treeData?.resources?.length && treeData?.categories?.length
      ? `Awesome.video is a hand-curated index of ${treeData.resources.length.toLocaleString()} resources across ${treeData.categories.length} domains — encoding, transport, players, infrastructure, standards. Maintained as the canonical reference for people who actually ship video in production. `
      : "";
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(() => new Set());

  const toggleFaq = (faqIndex: number) => {
    setOpenFaqs((current) => {
      const next = new Set(current);
      if (next.has(faqIndex)) {
        next.delete(faqIndex);
      } else {
        next.add(faqIndex);
      }
      return next;
    });
  };

  return (
    <div className="about-page">
      {/* R5-005 (run24): use the shared SEOHead (canonical + robots + full
          OG/Twitter set) — the bare Helmet block here declared only
          title+description, so the single-head-set reconciliation stripped
          the SSR-injected canonical/robots/og/twitter tags from the rendered
          DOM on /about. */}
      <SEOHead
        title="About — Awesome Video"
        description="Learn about Awesome Video — the web home of the awesome-video curated list by Nick Krzemienski — and awesome-list-site, the open-source platform that powers it."
      />

      {/* Canonical AboutPage opening: a narrow editorial column, eyebrow,
          display heading, divider, lead card, and callout grid. The copy in
          these surfaces stays grounded in the site's existing shared content. */}
      <header className="about-hero">
        <div className="about-eyebrow">
          <BookOpen className="about-eyebrow-icon" aria-hidden="true" />
          ABOUT THIS PROJECT
        </div>
        <h1 className="display-h about-title">
          A field journal for{" "}
          <span className="serif-italic about-title-accent">video engineers</span>
        </h1>
        <div className="shimmer-line about-shimmer-line" aria-hidden="true" />

        <Card className="about-card about-lead-card">
          <CardContent className="about-lead-content">
            <p className="about-lead-copy">
              <span>{catalogSummary}</span>
              awesome.video is the web home of{" "}
              <span className="about-strong">awesome-video</span> — a
              community-curated list of the best streaming and video-development
              tools, frameworks, libraries, and learning resources, maintained by
              Nick Krzemienski on GitHub.
            </p>
          </CardContent>
        </Card>

        <div className="about-callout-grid" aria-label="About this project">
          <div className="about-card about-callout-card">
            <div className="about-callout-index mono">01</div>
            <div className="about-callout-title">The source list</div>
            <div className="about-callout-copy">
              Resources on this site are drawn from the open-source awesome-video
              repository.
            </div>
          </div>
          <div className="about-card about-callout-card">
            <div className="about-callout-index mono">02</div>
            <div className="about-callout-title">Open source</div>
            <div className="about-callout-copy">
              The curated list and the platform that renders it are open source
              on GitHub.
            </div>
          </div>
          <div className="about-card about-callout-card">
            <div className="about-callout-index mono">03</div>
            <div className="about-callout-title">Human reviewed</div>
            <div className="about-callout-copy">
              New submissions are reviewed by maintainers before they are
              published.
            </div>
          </div>
          <div className="about-card about-callout-card">
            <div className="about-callout-index mono">04</div>
            <div className="about-callout-title">For video builders</div>
            <div className="about-callout-copy">
              Browse practical tools, frameworks, libraries, and learning
              resources for the video pipeline.
            </div>
          </div>
        </div>
      </header>

      {/* The sections below are retained product content. They are intentionally
          kept after the canonical opening rather than replaced by claims from
          the reference design that are not established by this application. */}
      <div className="about-retained-content">
        {/* Author / E-E-A-T bio — text shared verbatim with the server SSR body
            (shared/about-content.ts) and the site's Organization.founder schema. */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Users className="about-section-icon about-icon-accent" aria-hidden="true" />
              About the maintainer
            </h2>
            <CardDescription>{MAINTAINER.role}</CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-copy-stack">
              {MAINTAINER.bio.map((paragraph) => (
                <p key={paragraph.slice(0, 32)} className="about-body-copy">
                  {paragraph}
                </p>
              ))}
              <a
                href={MAINTAINER.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="about-inline-link"
              >
                <Github className="about-inline-icon" aria-hidden="true" />
                {MAINTAINER.name} on GitHub
                <ExternalLink className="about-external-icon" aria-hidden="true" />
              </a>
              {/* Run22 BUG-020: account/data-deletion requests now go through
                  the private, authenticated channel (Profile → Security) — the
                  public issue tracker is only for questions and corrections. */}
              <p className="about-body-copy">
                Need your account or personal data deleted? Sign in and use{" "}
                <Link
                  href="/profile?tab=security"
                  className="about-inline-link about-inline-link-text"
                  data-testid="link-about-deletion"
                >
                  Profile → Security → Delete account &amp; data
                </Link>{" "}
                — it&apos;s private and authenticated, so you never have to post
                personal details publicly.
              </p>
              <p className="about-body-copy">
                Questions or corrections? The best way to reach us is to{" "}
                <a
                  href="https://github.com/krzemienski/awesome-video/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-inline-link about-inline-link-text"
                  data-testid="link-about-github-issues"
                >
                  open an issue on GitHub
                  <ExternalLink className="about-external-icon" aria-hidden="true" />
                </a>
                .
              </p>
              <p className="about-body-copy">
                Review the{" "}
                <Link
                  href="/terms"
                  className="about-inline-link about-inline-link-text"
                >
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="about-inline-link about-inline-link-text"
                >
                  Privacy Policy
                </Link>{" "}
                for the site&apos;s legal and data practices.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* The source list & the platform */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Github className="about-section-icon about-icon-accent" aria-hidden="true" />
              Open source at its core
            </h2>
            <CardDescription>
              The curated list that feeds this site, and the platform that renders it
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-source-grid">
              <a
                href="https://github.com/krzemienski/awesome-video"
                target="_blank"
                rel="noopener noreferrer"
                className="about-source-link about-card"
              >
                <div className="about-source-heading">
                  <div className="about-source-name">
                    <Github className="about-source-icon" aria-hidden="true" />
                    <span>awesome-video</span>
                  </div>
                  <ExternalLink className="about-source-external" aria-hidden="true" />
                </div>
                <p className="about-source-copy">
                  A curated list of awesome streaming video tools, frameworks,
                  libraries, and learning resources. Every resource on this site
                  is sourced from and kept in sync with this repository.
                </p>
                <div className="about-chip-row">
                  <span className="about-chip">The source list</span>
                  <span className="about-chip">CC0-1.0</span>
                </div>
              </a>
              <a
                href="https://github.com/krzemienski/awesome-list-site"
                target="_blank"
                rel="noopener noreferrer"
                className="about-source-link about-card"
              >
                <div className="about-source-heading">
                  <div className="about-source-name">
                    <Rocket className="about-source-icon" aria-hidden="true" />
                    <span>awesome-list-site</span>
                  </div>
                  <ExternalLink className="about-source-external" aria-hidden="true" />
                </div>
                <p className="about-source-copy">
                  The open-source platform that powers this site — it transforms
                  any GitHub awesome list into a sophisticated, interactive web
                  dashboard with AI-powered enhancements, advanced search, and
                  modern UI components.
                </p>
                <div className="about-chip-row">
                  <span className="about-chip">The engine</span>
                  <span className="about-chip">MIT</span>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Zap className="about-section-icon" aria-hidden="true" />
              Features
            </h2>
            <CardDescription>
              Built for speed, accessibility, and user experience
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-feature-grid">
              {[
                { icon: Wind, label: "Responsive Design", desc: "Mobile-first" },
                { icon: Rocket, label: "Fast Performance", desc: "Optimized SPA" },
                { icon: Search, label: "Fuzzy Search", desc: "Find anything" },
                { icon: Palette, label: "Multiple Themes", desc: "Customizable" },
                { icon: Accessibility, label: "Accessible", desc: "WCAG compliant" },
                { icon: Globe, label: "SEO Optimized", desc: "Discoverable" },
                { icon: Keyboard, label: "Keyboard Shortcuts", desc: "⌘K or / to search" },
                { icon: Component, label: "Component Library", desc: "shadcn/ui" },
              ].map((feature, idx) => (
                <div key={feature.label} className="about-feature-card about-card">
                  <feature.icon
                    className={`about-feature-icon ${idx < 4 ? "about-icon-accent" : ""}`}
                    aria-hidden="true"
                  />
                  <div className="about-feature-label">{feature.label}</div>
                  <div className="about-feature-description">{feature.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Code2 className="about-section-icon" aria-hidden="true" />
              Technology Stack
            </h2>
            <CardDescription>
              Modern web technologies for optimal performance
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-tech-grid">
              <div className="about-tech-column">
                <div className="about-tech-item">
                  <div className="about-tech-dot about-tech-dot-filled" aria-hidden="true" />
                  <div>
                    <div className="about-tech-name">React</div>
                    <div className="about-tech-description">UI component framework</div>
                  </div>
                </div>
                <div className="about-tech-item">
                  <div className="about-tech-dot about-tech-dot-filled" aria-hidden="true" />
                  <div>
                    <div className="about-tech-name">Tailwind CSS</div>
                    <div className="about-tech-description">Utility-first styling</div>
                  </div>
                </div>
                <div className="about-tech-item">
                  <div className="about-tech-dot" aria-hidden="true" />
                  <div>
                    <div className="about-tech-name">shadcn/ui</div>
                    <div className="about-tech-description">Component primitives</div>
                  </div>
                </div>
              </div>
              <div className="about-tech-column">
                <div className="about-tech-item">
                  <div className="about-tech-dot about-tech-dot-filled" aria-hidden="true" />
                  <div>
                    <div className="about-tech-name">Fuse.js</div>
                    <div className="about-tech-description">Fuzzy search engine</div>
                  </div>
                </div>
                <div className="about-tech-item">
                  <div className="about-tech-dot about-tech-dot-filled" aria-hidden="true" />
                  <div>
                    <div className="about-tech-name">Framer Motion</div>
                    <div className="about-tech-description">Smooth animations</div>
                  </div>
                </div>
                <div className="about-tech-item">
                  <div className="about-tech-dot" aria-hidden="true" />
                  <div>
                    <div className="about-tech-name">TypeScript</div>
                    <div className="about-tech-description">Type safety</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Accessibility className="about-section-icon" aria-hidden="true" />
              Accessibility First
            </h2>
            <CardDescription>
              Following WCAG 2.1 AA guidelines for inclusive design
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-accessibility-grid">
              {[
                "Proper heading structure",
                "Keyboard navigation",
                "Sufficient color contrast",
                "Appropriate ARIA attributes",
                "Respect for user motion preferences",
                "Screen reader optimized",
              ].map((item) => (
                <div key={item} className="about-accessibility-item">
                  <div className="about-accessibility-dot" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Credits */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Heart className="about-section-icon" aria-hidden="true" />
              Credits
            </h2>
            <CardDescription>
              Built with open source technologies
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-copy-stack">
              <p className="about-body-copy">
                This project was built with dedication using open source technologies.
                Special thanks to:
              </p>
              <div className="about-credits-grid">
                <a
                  href="https://github.com/krzemienski"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-credit-link about-card"
                >
                  <Users className="about-credit-icon about-icon-accent" aria-hidden="true" />
                  <div>
                    <div className="about-credit-name">Nick Krzemienski</div>
                    <div className="about-credit-description">Maintainer</div>
                  </div>
                </a>
                <a
                  href="https://ui.shadcn.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-credit-link about-card"
                >
                  <Component className="about-credit-icon about-icon-accent" aria-hidden="true" />
                  <div>
                    <div className="about-credit-name">shadcn/ui</div>
                    <div className="about-credit-description">Components</div>
                  </div>
                </a>
                <a
                  href="https://tailwindcss.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-credit-link about-card"
                >
                  <Wind className="about-credit-icon about-icon-accent" aria-hidden="true" />
                  <div>
                    <div className="about-credit-name">Tailwind CSS</div>
                    <div className="about-credit-description">Styling</div>
                  </div>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ — content shared verbatim with the server's FAQPage schema
            (shared/faq.ts). Buttons/panels provide an accessible accordion
            without forking the shared question or answer copy. */}
        <Card className="about-card about-faq-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <HelpCircle className="about-section-icon about-icon-accent" aria-hidden="true" />
              Frequently asked questions
            </h2>
            <CardDescription>
              Quick answers about the site, the list, and how to contribute
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content about-faq-content">
            <div className="about-faq-list">
              {aboutFaqs.map((faq, faqIndex) => {
                const isOpen = openFaqs.has(faqIndex);
                const buttonId = `about-faq-button-${faqIndex}`;
                const panelId = `about-faq-panel-${faqIndex}`;
                return (
                  <div key={faq.question} className="about-faq-item">
                    <button
                      type="button"
                      id={buttonId}
                      className="about-faq-trigger"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      data-testid={`button-about-faq-${faqIndex}`}
                      onClick={() => toggleFaq(faqIndex)}
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`about-faq-chevron ${isOpen ? "about-faq-chevron-open" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="about-faq-panel"
                      hidden={!isOpen}
                    >
                      <p className="about-body-copy">{faq.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}