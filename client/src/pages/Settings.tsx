import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Palette, User, ShieldCheck, Bookmark, Sparkles, ChevronRight, LogIn, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  DEFAULT_LEARNING_PREFERENCES,
  type LearningPreferencesValues,
} from "@shared/onboarding-values";
import { completedLearningPreferencesSchema } from "@shared/onboarding";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/layout/SEOHead";
import { useAuth } from "@/hooks/useAuth";
import LearningPreferencesForm from "@/components/onboarding/learning-preferences-form";
import { useLearningPreferences } from "@/hooks/use-learning-preferences";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import NotificationPreferencesCard from "@/components/notifications/NotificationPreferencesCard";

interface CategoryOption {
  name: string;
  resourceCount: number;
}

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
  const { toast } = useToast();
  const {
    preferences,
    isLoading: preferencesLoading,
    isError: preferencesError,
    refetch: refetchPreferences,
    savePreferencesAsync,
    isSaving,
    resetPreferencesAsync,
    isResetting,
  } = useLearningPreferences();
  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery<CategoryOption[]>({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const [values, setValues] = useState<LearningPreferencesValues>(
    DEFAULT_LEARNING_PREFERENCES,
  );
  const [preferenceErrors, setPreferenceErrors] = useState<
    Partial<Record<keyof LearningPreferencesValues, string>>
  >({});
  const [preferenceRequestError, setPreferenceRequestError] = useState<
    string | null
  >(null);
  const [showEmptyPreferencesEditor, setShowEmptyPreferencesEditor] =
    useState(false);

  useEffect(() => {
    setValues(
      preferences
        ? {
            preferredCategories: preferences.preferredCategories,
            skillLevel: preferences.skillLevel,
            learningGoals: preferences.learningGoals,
            preferredResourceTypes: preferences.preferredResourceTypes,
            timeCommitment: preferences.timeCommitment,
          }
        : DEFAULT_LEARNING_PREFERENCES,
    );
    setShowEmptyPreferencesEditor(Boolean(preferences));
  }, [preferences]);

  const links = SETTINGS_LINKS.filter(
    (l) => isAuthenticated || isLoading || (l as any).anonSafe,
  );
  const showSignInPrompt = !isLoading && !isAuthenticated;
  const categoryNames = (categories ?? [])
    .filter((category) => category.resourceCount > 0)
    .map((category) => category.name);

  const handleSavePreferences = async () => {
    setPreferenceRequestError(null);
    const parsed = completedLearningPreferencesSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Partial<
        Record<keyof LearningPreferencesValues, string>
      > = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof LearningPreferencesValues;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setPreferenceErrors(nextErrors);
      return;
    }
    setPreferenceErrors({});
    try {
      await savePreferencesAsync({
        ...parsed.data,
        onboardingStatus: "completed",
        onboardingStep: 5,
      });
      toast({
        title: "Learning preferences saved",
        description:
          "Clearly labeled personalized recommendations will use your updated choices.",
      });
    } catch (error) {
      setPreferenceRequestError(
        error instanceof Error
          ? error.message
          : "We couldn’t save your learning preferences.",
      );
    }
  };

  const handleResetPreferences = async () => {
    setPreferenceRequestError(null);
    try {
      await resetPreferencesAsync();
      setValues(DEFAULT_LEARNING_PREFERENCES);
      setShowEmptyPreferencesEditor(false);
      setPreferenceErrors({});
      toast({
        title: "Learning preferences reset",
        description:
          "Personalized surfaces will use general picks until you choose new preferences.",
      });
    } catch (error) {
      setPreferenceRequestError(
        error instanceof Error
          ? error.message
          : "We couldn’t reset your learning preferences.",
      );
    }
  };
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
          // BUG-042 (audit2): the bare text link measured 55×20px — below the
          // 24px WCAG 2.5.8 floor; give it a 44px-tall hit area.
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-2)] hover:text-[var(--text)] mb-4 min-h-[44px]"
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

      {isAuthenticated ? (
        <section id="learning-preferences" aria-labelledby="learning-preferences-title">
          <Card data-testid="card-learning-preferences">
            <CardHeader>
              <CardTitle
                id="learning-preferences-title"
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="h-5 w-5 text-[var(--accent)]" />
                Learning preferences
              </CardTitle>
              <CardDescription>
                Review the same profile used by optional onboarding. These
                values shape only surfaces explicitly labeled personalized and
                are not sent to analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preferencesLoading || categoriesLoading ? (
                <div className="space-y-3" aria-busy="true">
                  <div className="h-5 w-40 animate-pulse bg-muted" />
                  <div className="h-28 animate-pulse bg-muted" />
                </div>
              ) : preferencesError || categoriesError ? (
                <div className="py-6 text-center" role="alert">
                  <p className="text-sm text-[color:var(--text-2)]">
                    We couldn’t load your learning preferences.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      void refetchPreferences();
                      void refetchCategories();
                    }}
                  >
                    Try again
                  </Button>
                </div>
              ) : !preferences && !showEmptyPreferencesEditor ? (
                <div
                  className="border border-[var(--border)] bg-[var(--surface-2)] p-5"
                  data-testid="learning-preferences-empty"
                >
                  <h3 className="font-sans font-semibold">
                    No learning preferences saved
                  </h3>
                  <p className="mt-1 text-sm text-[color:var(--text-2)]">
                    General recommendations stay available. Choose preferences
                    here whenever you want clearly labeled personalized picks.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setShowEmptyPreferencesEditor(true)}
                    data-testid="button-start-learning-preferences"
                  >
                    Choose preferences
                  </Button>
                </div>
              ) : (
                <>
                  <LearningPreferencesForm
                    values={values}
                    onChange={(next) => {
                      setValues(next);
                      setPreferenceErrors({});
                    }}
                    categories={categoryNames}
                    showAll
                    disabled={isSaving || isResetting}
                    errors={preferenceErrors}
                  />

                  {preferenceRequestError ? (
                    <p
                      className="mt-5 border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                      role="alert"
                    >
                      {preferenceRequestError}
                    </p>
                  ) : null}

                  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          disabled={isSaving || isResetting || !preferences}
                          data-testid="button-reset-learning-preferences"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset preferences
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Reset learning preferences?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This clears your skill level, topics, goals, formats,
                            and schedule. It does not delete your account,
                            bookmarks, or learning progress.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleResetPreferences()}
                            data-testid="button-confirm-reset-learning-preferences"
                          >
                            Reset preferences
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      onClick={() => void handleSavePreferences()}
                      disabled={isSaving || isResetting}
                      data-testid="button-save-learning-preferences"
                    >
                      {isSaving ? "Saving…" : "Save learning preferences"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {isAuthenticated ? (
        <section aria-labelledby="notification-settings-title">
          <NotificationPreferencesCard />
        </section>
      ) : null}

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
                <Link href="/sign-in?redirect_url=%2Fsettings">Sign in</Link>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
