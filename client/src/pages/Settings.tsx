import { Link } from "wouter";
import { ArrowLeft, Palette, User, ShieldCheck, Bookmark, Sparkles, ChevronRight, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/layout/SEOHead";
import { useAuth } from "@/hooks/useAuth";

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
    anonSafe: true,
  },
  {
    href: "/profile",
    icon: User,
    title: "Account",
    description: "View your profile, submissions, favorites, and progress.",
    testid: "link-settings-account",
  },
  {
    // NB-027 (run23): deep-link straight to the Security tab — Profile honors
    // ?tab= on first render (Run17 BUG-055), so this lands on password change
    // instead of the default Overview tab.
    href: "/profile?tab=security",
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
  // R5-044: the hub stays public (the theme picker is deliberately anonymous —
  // Run19 BUG-022), but Account/Security/Bookmarks/Recommendations all bounce
  // anonymous visitors to /login. Show anon users only the anon-safe subset
  // plus an explicit sign-in prompt instead of four dead-end cards.
  const { isAuthenticated, isLoading } = useAuth();
  const links = SETTINGS_LINKS.filter(
    (l) => isAuthenticated || isLoading || (l as any).anonSafe,
  );
  const showSignInPrompt = !isLoading && !isAuthenticated;
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
        <h1 className="display-h text-2xl">Settings</h1>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] mt-2">
          Manage your preferences and account. Pick a section below.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map(({ href, icon: Icon, title, description, testid }) => (
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

      {showSignInPrompt && (
        <Card className="p-5" data-testid="card-settings-signin">
          <div className="flex items-start gap-3">
            <LogIn className="h-5 w-5 text-[var(--accent)] mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="font-sans font-semibold text-base">Sign in for more</h2>
              <p className="text-sm text-[color:var(--text-2)] mt-1 mb-3">
                Account, security, bookmarks, and personalized recommendations
                are available once you sign in.
              </p>
              <Button asChild size="sm" data-testid="button-settings-signin">
                <Link href="/login?next=%2Fsettings">Sign in</Link>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
