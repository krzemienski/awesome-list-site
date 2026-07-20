import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Sparkles,
  Zap,
  Search,
  Palette,
  Accessibility,
  Globe,
  Keyboard,
  Code2,
  Wind,
  Component,
  Rocket,
  Heart,
  Users,
  Github,
  ExternalLink,
  HelpCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAboutFaqs } from "@shared/faq";
import { MAINTAINER } from "@shared/about-content";
import { fetchStaticAwesomeList } from "@/lib/static-data";

export default function About() {
  // Run22 BUG-018: FAQ resource-count claim rendered from the live catalog
  // (same shared cache key as App/Home — no extra network round-trip).
  const { data: treeData } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  const aboutFaqs = getAboutFaqs(treeData?.resources?.length);
  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>About — Awesome Video</title>
        <meta
          name="description"
          content="Learn about Awesome Video — the web home of the awesome-video curated list by Nick Krzemienski — and awesome-list-site, the open-source platform that powers it."
        />
      </Helmet>

      <div className="mb-10 space-y-3">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          <h1 className="font-sans font-bold text-3xl sm:text-4xl tracking-tight">
            About
          </h1>
        </div>
        <p className="text-base sm:text-lg text-[color:var(--text-2)] max-w-3xl leading-relaxed">
          awesome.video is the web home of{" "}
          <span className="font-semibold text-foreground">awesome-video</span> — a community-curated
          list of the best streaming and video-development tools, frameworks, libraries, and learning
          resources, maintained by Nick Krzemienski on GitHub.
        </p>
      </div>

      {/* Author / E-E-A-T bio — text shared verbatim with the server SSR body
          (shared/about-content.ts) and the site's Organization.founder schema. */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--accent)]" />
            About the maintainer
          </h2>
          <CardDescription>{MAINTAINER.role}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MAINTAINER.bio.map((paragraph) => (
              <p
                key={paragraph.slice(0, 32)}
                className="text-sm text-muted-foreground leading-relaxed max-w-prose"
              >
                {paragraph}
              </p>
            ))}
            <a
              href={MAINTAINER.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 min-h-[24px] text-sm font-medium text-[var(--accent)] hover:underline"
            >
              <Github className="h-4 w-4" />
              {MAINTAINER.name} on GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {/* Run22 BUG-020: account/data-deletion requests now go through
                the private, authenticated channel (Profile → Security) — the
                public issue tracker is only for questions and corrections. */}
            <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
              Need your account or personal data deleted? Sign in and use{" "}
              <Link
                href="/profile?tab=security"
                className="font-medium text-[var(--accent)] hover:underline"
                data-testid="link-about-deletion"
              >
                Profile → Security → Delete account &amp; data
              </Link>
              {" "}— it's private and authenticated, so you never have to post
              personal details publicly.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
              Questions or corrections? The best way to reach us is to{" "}
              <a
                href="https://github.com/krzemienski/awesome-video/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 min-h-[24px] align-middle font-medium text-[var(--accent)] hover:underline"
                data-testid="link-about-github-issues"
              >
                open an issue on GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      {/* The source list & the platform */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Github className="h-5 w-5 text-[var(--accent)]" />
            Open source at its core
          </h2>
          <CardDescription>
            The curated list that feeds this site, and the platform that renders it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://github.com/krzemienski/awesome-video"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3 p-5 border border-[var(--border)] bg-[var(--surface)] rounded-[var(--radius-sm)] hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">awesome-video</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
                A curated list of awesome streaming video tools, frameworks, libraries, and learning
                resources. Every resource on this site is sourced from and kept in sync with this
                repository.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 border border-[var(--border)] rounded-[var(--radius-sm)]">
                  The source list
                </span>
                <span className="px-2 py-0.5 border border-[var(--border)] rounded-[var(--radius-sm)]">
                  CC0-1.0
                </span>
              </div>
            </a>
            <a
              href="https://github.com/krzemienski/awesome-list-site"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-3 p-5 border border-[var(--border)] bg-[var(--surface)] rounded-[var(--radius-sm)] hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">awesome-list-site</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
                The open-source platform that powers this site — it transforms any GitHub awesome list
                into a sophisticated, interactive web dashboard with AI-powered enhancements, advanced
                search, and modern UI components.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 border border-[var(--border)] rounded-[var(--radius-sm)]">
                  The engine
                </span>
                <span className="px-2 py-0.5 border border-[var(--border)] rounded-[var(--radius-sm)]">
                  MIT
                </span>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-[color:var(--text-2)]" />
            Features
          </h2>
          <CardDescription>
            Built for speed, accessibility, and user experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wind, label: "Responsive Design", desc: "Mobile-first" },
              { icon: Rocket, label: "Fast Performance", desc: "Optimized SPA" },
              { icon: Search, label: "Fuzzy Search", desc: "Find anything" },
              { icon: Palette, label: "Multiple Themes", desc: "Customizable" },
              { icon: Accessibility, label: "Accessible", desc: "WCAG compliant" },
              { icon: Globe, label: "SEO Optimized", desc: "Discoverable" },
              { icon: Keyboard, label: "Keyboard Shortcuts", desc: "⌘K or / to search" },
              { icon: Component, label: "Component Library", desc: "shadcn/ui" }
            ].map((feature, idx) => (
              <Card key={feature.label}>
                <CardContent className="p-4">
                  <feature.icon
                    className={`h-6 w-6 mb-2 ${idx < 4 ? "text-[var(--accent)]" : "text-[color:var(--text-2)]"}`}
                  />
                  <div className="font-semibold text-sm mb-1">{feature.label}</div>
                  <div className="text-xs text-muted-foreground">{feature.desc}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Code2 className="h-5 w-5 text-[color:var(--text-2)]" />
            Technology Stack
          </h2>
          <CardDescription>
            Modern web technologies for optimal performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-[var(--accent)] rounded-full mt-2" />
                <div>
                  <div className="font-semibold">React</div>
                  <div className="text-sm text-muted-foreground">UI component framework</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full mt-2 border border-[var(--accent)] bg-transparent" />
                <div>
                  <div className="font-semibold">Tailwind CSS</div>
                  <div className="text-sm text-muted-foreground">Utility-first styling</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-[var(--accent)] rounded-full mt-2" />
                <div>
                  <div className="font-semibold">shadcn/ui</div>
                  <div className="text-sm text-muted-foreground">Component primitives</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full mt-2 border border-[var(--accent)] bg-transparent" />
                <div>
                  <div className="font-semibold">Fuse.js</div>
                  <div className="text-sm text-muted-foreground">Fuzzy search engine</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-[var(--accent)] rounded-full mt-2" />
                <div>
                  <div className="font-semibold">Framer Motion</div>
                  <div className="text-sm text-muted-foreground">Smooth animations</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full mt-2 border border-[var(--accent)] bg-transparent" />
                <div>
                  <div className="font-semibold">TypeScript</div>
                  <div className="text-sm text-muted-foreground">Type safety</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-[color:var(--text-2)]" />
            Accessibility First
          </h2>
          <CardDescription>
            Following WCAG 2.1 AA guidelines for inclusive design
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              "Proper heading structure",
              "Keyboard navigation",
              "Sufficient color contrast",
              "Appropriate ARIA attributes",
              "Respect for user motion preferences",
              "Screen reader optimized"
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-accent rounded-full" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Credits */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Heart className="h-5 w-5 text-[color:var(--text-2)]" />
            Credits
          </h2>
          <CardDescription>
            Built with open source technologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground max-w-prose">
              This project was built with dedication using open source technologies.
              Special thanks to:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://github.com/krzemienski"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border border-[var(--border)] bg-[var(--surface)] rounded-[var(--radius-sm)] hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] transition-colors group"
              >
                <Users className="h-5 w-5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-sm">Nick Krzemienski</div>
                  <div className="text-xs text-muted-foreground">Maintainer</div>
                </div>
              </a>
              <a
                href="https://ui.shadcn.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border border-[var(--border)] bg-[var(--surface)] rounded-[var(--radius-sm)] hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] transition-colors group"
              >
                <Component className="h-5 w-5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-sm">shadcn/ui</div>
                  <div className="text-xs text-muted-foreground">Components</div>
                </div>
              </a>
              <a
                href="https://tailwindcss.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border border-[var(--border)] bg-[var(--surface)] rounded-[var(--radius-sm)] hover:border-[color-mix(in_srgb,var(--accent)_60%,transparent)] transition-colors group"
              >
                <Wind className="h-5 w-5 text-[var(--accent)] group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-sm">Tailwind CSS</div>
                  <div className="text-xs text-muted-foreground">Styling</div>
                </div>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ — content shared verbatim with the server's FAQPage schema (shared/faq.ts) */}
      <Card className="mt-4">
        <CardHeader>
          <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[var(--accent)]" />
            Frequently asked questions
          </h2>
          <CardDescription>
            Quick answers about the site, the list, and how to contribute
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {aboutFaqs.map((faq) => (
              <div key={faq.question} className="space-y-1.5">
                {/* Run15 BUG-028: h2 keeps the heading outline sequential —
                    the page's only H1 is the hero; CardTitles are divs. */}
                <h2 className="font-semibold text-sm">{faq.question}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
