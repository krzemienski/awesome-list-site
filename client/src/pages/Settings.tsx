import { Link } from "wouter";
import { ArrowLeft, Palette, User, ShieldCheck, Bookmark, Sparkles, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import SEOHead from "@/components/layout/SEOHead";

// Settings hub — a single landing page that links out to the real preference
// surfaces that already exist in the app. It deliberately does not duplicate
// their controls; it just routes to them.
const SETTINGS_LINKS = [
  {
    href: "/settings/theme",
    icon: Palette,
    title: "Appearance",
    description: "Switch design system, accent color, and font.",
    testid: "link-settings-theme",
  },
  {
    href: "/profile",
    icon: User,
    title: "Account",
    description: "View your profile, submissions, favorites, and progress.",
    testid: "link-settings-account",
  },
  {
    href: "/profile",
    icon: ShieldCheck,
    title: "Security",
    description: "Change your password from the Security tab on your profile.",
    testid: "link-settings-security",
  },
  {
    href: "/bookmarks",
    icon: Bookmark,
    title: "Bookmarks",
    description: "Review the resources you've saved for later.",
    testid: "link-settings-bookmarks",
  },
  {
    href: "/recommendations",
    icon: Sparkles,
    title: "Recommendations",
    description: "Personalized resource suggestions based on your interests.",
    testid: "link-settings-recommendations",
  },
] as const;

export default function Settings() {
  return (
    <div className="max-w-3xl space-y-8">
      <SEOHead
        title="Settings"
        description="Manage your Awesome Video preferences — appearance, account, security, and saved resources."
        noindex
      />

      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-2)] hover:text-[var(--text)] mb-4"
          data-testid="link-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="font-sans font-bold text-2xl tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] mt-2">
          Manage your preferences and account. Pick a section below.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SETTINGS_LINKS.map(({ href, icon: Icon, title, description, testid }) => (
          <Link key={testid} href={href} data-testid={testid}>
            <Card className="h-full p-4 flex items-start gap-3 hover:border-[var(--accent)] transition-colors cursor-pointer">
              <Icon className="h-5 w-5 text-[var(--accent)] mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-sans font-semibold text-base">{title}</h2>
                  <ChevronRight className="h-4 w-4 text-[color:var(--text-3)] shrink-0" />
                </div>
                <p className="text-sm text-[color:var(--text-2)] mt-1">{description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
