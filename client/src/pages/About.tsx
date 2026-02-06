import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Github
} from "lucide-react";

export default function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>About - Awesome List Static Site</title>
        <meta
          name="description"
          content="Learn about the Awesome List Static Site project, its features, and how it works."
        />
      </Helmet>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">About</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          An SEO-friendly, mobile-first platform that transforms GitHub's curated "Awesome Lists"
          into beautiful, searchable websites.
        </p>
      </div>

      {/* What is this */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            What is this?
          </CardTitle>
          <CardDescription>
            Following the tradition of awesome repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground">
            Awesome List Static Site is an SEO-friendly, mobile-first website that transforms
            GitHub's curated "Awesome Lists" into beautiful, searchable websites.
          </p>
          <p className="text-muted-foreground">
            This project follows the tradition of the "awesome" repositories on GitHub,
            which are community-curated lists of resources on various technologies and topics.
          </p>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <Card className="mb-6 border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Features
          </CardTitle>
          <CardDescription>
            Built for speed, accessibility, and user experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wind, label: "Responsive Design", desc: "Mobile-first" },
              { icon: Rocket, label: "Fast Performance", desc: "Static generation" },
              { icon: Search, label: "Fuzzy Search", desc: "Find anything" },
              { icon: Palette, label: "Multiple Themes", desc: "Customizable" },
              { icon: Accessibility, label: "Accessible", desc: "WCAG compliant" },
              { icon: Globe, label: "SEO Optimized", desc: "Discoverable" },
              { icon: Keyboard, label: "Keyboard Shortcuts", desc: "Power user" },
              { icon: Component, label: "Component Library", desc: "shadcn/ui" }
            ].map((feature) => (
              <Card key={feature.label} className="border-border/50">
                <CardContent className="p-4">
                  <feature.icon className="h-6 w-6 text-primary mb-2" />
                  <div className="font-semibold text-sm mb-1">{feature.label}</div>
                  <div className="text-xs text-muted-foreground">{feature.desc}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Technology Stack
          </CardTitle>
          <CardDescription>
            Modern web technologies for optimal performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                <div>
                  <div className="font-semibold">React</div>
                  <div className="text-sm text-muted-foreground">UI component framework</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-accent rounded-full mt-2" />
                <div>
                  <div className="font-semibold">Tailwind CSS</div>
                  <div className="text-sm text-muted-foreground">Utility-first styling</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                <div>
                  <div className="font-semibold">shadcn/ui</div>
                  <div className="text-sm text-muted-foreground">Component primitives</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-accent rounded-full mt-2" />
                <div>
                  <div className="font-semibold">Fuse.js</div>
                  <div className="text-sm text-muted-foreground">Fuzzy search engine</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                <div>
                  <div className="font-semibold">Framer Motion</div>
                  <div className="text-sm text-muted-foreground">Smooth animations</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-accent rounded-full mt-2" />
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
      <Card className="mb-6 border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-accent" />
            Accessibility First
          </CardTitle>
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
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Credits
          </CardTitle>
          <CardDescription>
            Built with open source technologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              This project was built with dedication using open source technologies.
              Special thanks to:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://github.com/sindresorhus/awesome"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border border-border rounded hover:border-primary/50 transition-colors group"
              >
                <Users className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-sm">Awesome List</div>
                  <div className="text-xs text-muted-foreground">Community</div>
                </div>
              </a>
              <a
                href="https://ui.shadcn.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border border-border rounded hover:border-accent/50 transition-colors group"
              >
                <Component className="h-5 w-5 text-accent group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-sm">shadcn/ui</div>
                  <div className="text-xs text-muted-foreground">Components</div>
                </div>
              </a>
              <a
                href="https://tailwindcss.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border border-border rounded hover:border-primary/50 transition-colors group"
              >
                <Wind className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-sm">Tailwind CSS</div>
                  <div className="text-xs text-muted-foreground">Styling</div>
                </div>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
