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
import { ABOUT_PROJECT, getAboutCatalogSummary, MAINTAINER } from "@shared/about-content";
import { aboutTitle } from "@shared/page-headings";
import { resolveSiteIdentity, siteHost } from "@shared/site-identity";
import { fetchAwesomeListNav, fetchStaticAwesomeList, visibleNavCategories } from "@/lib/static-data";
import { preferredContactDestination, useContactConfig } from "@/lib/contact";
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
  // C8-V1-01: "domains" counts the categories the public site lists, not
  // empty admin-created ones (shared nav cache with App/Home).
  const { data: navData } = useQuery({
    queryKey: ["awesome-list-nav"],
    queryFn: fetchAwesomeListNav,
    staleTime: 1000 * 60 * 60,
  });
  const domainCount = navData ? visibleNavCategories(navData.categories).length : undefined;
  const { data: contactConfig } = useContactConfig(true);
  const contactDestination = preferredContactDestination(contactConfig);
  const siteIdentity = resolveSiteIdentity(
    contactConfig?.site
      ? {
          name: contactConfig.site.title,
          description: contactConfig.site.description,
          url: contactConfig.site.url,
          author: contactConfig.site.author,
          repoUrl: contactConfig.site.repoUrl,
          repoBranch: contactConfig.site.repoBranch,
        }
      : undefined,
  );
  const aboutFaqs = getAboutFaqs({
    resourceCount: treeData?.resources?.length,
    categoryCount: domainCount,
    site: siteIdentity,
  });
  const siteHostName = siteHost(siteIdentity.url);
  const catalogSummary = getAboutCatalogSummary(
    siteHostName || siteIdentity.name,
    treeData?.resources?.length,
    domainCount,
  );
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
        <div className="eyebrow about-eyebrow">
          <BookOpen className="about-eyebrow-icon" aria-hidden="true" />
          ABOUT THIS PROJECT
        </div>
        <h1 className="page-title about-title">
          {aboutTitle.lead}{" "}
          <span className="serif-italic about-title-accent">{aboutTitle.accent}</span>
        </h1>
        <div className="shimmer-line about-shimmer-line" aria-hidden="true" />

        <Card className="about-card about-lead-card">
          <CardContent className="about-lead-content">
            <p className="about-lead-copy">
              <span>{catalogSummary}</span>
              {ABOUT_PROJECT.introLead}{" "}
              <span className="about-strong">{ABOUT_PROJECT.sourceName}</span>{" "}
              {ABOUT_PROJECT.introDescription}
            </p>
          </CardContent>
        </Card>

        <div className="about-callout-grid" aria-label="About this project">
          {ABOUT_PROJECT.facts.map((fact, index) => (
            <div key={fact.title} className="about-card about-callout-card">
              <div className="about-callout-index mono">{String(index + 1).padStart(2, "0")}</div>
              <h2 className="about-callout-title">{fact.title}</h2>
              <div className="about-callout-copy">{fact.description}</div>
            </div>
          ))}
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
              <Users className="about-section-icon about-icon-ink" aria-hidden="true" />
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
                — it’s private and authenticated, so you never have to post
                personal details publicly.
              </p>
              <p className="about-body-copy">
                Questions or corrections?{" "}
                {contactDestination ? (
                  <>
                    The best way to reach us is to{" "}
                    <a
                      href={contactDestination.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="about-inline-link about-inline-link-text"
                      data-testid="link-about-github-issues"
                    >
                      {contactDestination.label}
                      <ExternalLink className="about-external-icon" aria-hidden="true" />
                    </a>
                    .
                  </>
                ) : (
                  <span data-testid="text-about-contact-unavailable">
                    No public contact destination is configured yet.
                  </span>
                )}
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
                for the site’s legal and data practices.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* The source list & the platform */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Github className="about-section-icon about-icon-ink" aria-hidden="true" />
              {ABOUT_PROJECT.sourcesHeading}
            </h2>
            <CardDescription>
              {ABOUT_PROJECT.sourcesDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-source-grid">
              <a
                href={ABOUT_PROJECT.sources[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="about-source-link about-card"
              >
                <div className="about-source-heading">
                  <div className="about-source-name">
                    <Github className="about-source-icon" aria-hidden="true" />
                    <span>{ABOUT_PROJECT.sources[0].name}</span>
                  </div>
                  <ExternalLink className="about-source-external" aria-hidden="true" />
                </div>
                <p className="about-source-copy">
                  {ABOUT_PROJECT.sources[0].description}
                </p>
                <div className="about-chip-row">
                  <span className="about-chip">{ABOUT_PROJECT.sources[0].label}</span>
                  <span className="about-chip">{ABOUT_PROJECT.sources[0].license}</span>
                </div>
              </a>
              <a
                href={ABOUT_PROJECT.sources[1].url}
                target="_blank"
                rel="noopener noreferrer"
                className="about-source-link about-card"
              >
                <div className="about-source-heading">
                  <div className="about-source-name">
                    <Rocket className="about-source-icon" aria-hidden="true" />
                    <span>{ABOUT_PROJECT.sources[1].name}</span>
                  </div>
                  <ExternalLink className="about-source-external" aria-hidden="true" />
                </div>
                <p className="about-source-copy">
                  {ABOUT_PROJECT.sources[1].description}
                </p>
                <div className="about-chip-row">
                  <span className="about-chip">{ABOUT_PROJECT.sources[1].label}</span>
                  <span className="about-chip">{ABOUT_PROJECT.sources[1].license}</span>
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
              {ABOUT_PROJECT.featuresHeading}
            </h2>
            <CardDescription>
              {ABOUT_PROJECT.featuresDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-feature-grid">
              {ABOUT_PROJECT.features.map((feature, idx) => {
                const Icon = [Wind, Rocket, Search, Palette, Accessibility, Globe, Keyboard, Component][idx];
                return (
                  <div key={feature.label} className="about-feature-card about-card">
                    <Icon
                      className={`about-feature-icon ${idx < 4 ? "about-icon-ink" : ""}`}
                      aria-hidden="true"
                    />
                    <div className="about-feature-label">{feature.label}</div>
                    <div className="about-feature-description">{feature.desc}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Technology Stack */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Code2 className="about-section-icon" aria-hidden="true" />
              {ABOUT_PROJECT.technologyHeading}
            </h2>
            <CardDescription>
              {ABOUT_PROJECT.technologyDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-tech-grid">
              {[0, 3].map((start) => (
                <div key={start} className="about-tech-column">
                  {ABOUT_PROJECT.technologies.slice(start, start + 3).map((technology, index) => (
                    <div key={technology.name} className="about-tech-item">
                      <div className={`about-tech-dot${index < 2 ? " about-tech-dot-filled" : ""}`} aria-hidden="true" />
                      <div>
                        <div className="about-tech-name">{technology.name}</div>
                        <div className="about-tech-description">{technology.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card className="about-card">
          <CardHeader className="about-card-header">
            <h2 className="about-section-title">
              <Accessibility className="about-section-icon" aria-hidden="true" />
              {ABOUT_PROJECT.accessibilityHeading}
            </h2>
            <CardDescription>
              {ABOUT_PROJECT.accessibilityDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-accessibility-grid">
              {ABOUT_PROJECT.accessibility.map((item) => (
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
              {ABOUT_PROJECT.creditsHeading}
            </h2>
            <CardDescription>
              {ABOUT_PROJECT.creditsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="about-card-content">
            <div className="about-copy-stack">
              <p className="about-body-copy">
                {ABOUT_PROJECT.creditsIntro}
              </p>
              <div className="about-credits-grid">
                <a
                  href={ABOUT_PROJECT.credits[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-credit-link about-card"
                >
                  <Users className="about-credit-icon about-icon-ink" aria-hidden="true" />
                  <div>
                    <div className="about-credit-name">{ABOUT_PROJECT.credits[0].name}</div>
                    <div className="about-credit-description">{ABOUT_PROJECT.credits[0].description}</div>
                  </div>
                </a>
                <a
                  href={ABOUT_PROJECT.credits[1].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-credit-link about-card"
                >
                  <Component className="about-credit-icon about-icon-ink" aria-hidden="true" />
                  <div>
                    <div className="about-credit-name">{ABOUT_PROJECT.credits[1].name}</div>
                    <div className="about-credit-description">{ABOUT_PROJECT.credits[1].description}</div>
                  </div>
                </a>
                <a
                  href={ABOUT_PROJECT.credits[2].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-credit-link about-card"
                >
                  <Wind className="about-credit-icon about-icon-ink" aria-hidden="true" />
                  <div>
                    <div className="about-credit-name">{ABOUT_PROJECT.credits[2].name}</div>
                    <div className="about-credit-description">{ABOUT_PROJECT.credits[2].description}</div>
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
              <HelpCircle className="about-section-icon about-icon-ink" aria-hidden="true" />
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
                      className="btn ghost about-faq-trigger"
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