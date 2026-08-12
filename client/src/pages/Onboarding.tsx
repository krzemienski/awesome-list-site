import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import {
  DEFAULT_LEARNING_PREFERENCES,
  ONBOARDING_STEP_COUNT,
  type LearningPreferencesValues,
} from "@shared/onboarding";
import LearningPreferencesForm, {
  LEARNING_PREFERENCE_STEPS,
} from "@/components/onboarding/learning-preferences-form";
import SEOHead from "@/components/layout/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useLearningPreferences } from "@/hooks/use-learning-preferences";
import { safeGetItem, safeRemoveItem, safeSetItem } from "@/lib/safeStorage";

interface CategoryOption {
  name: string;
  resourceCount: number;
}

type PreferenceErrors = Partial<
  Record<keyof LearningPreferencesValues, string>
>;

const DRAFT_STORAGE_KEY = "awesome-video-onboarding-draft-v1";

function stepFromUrl(): number | null {
  const raw = Number(new URLSearchParams(window.location.search).get("step"));
  return Number.isInteger(raw) && raw >= 1 && raw <= ONBOARDING_STEP_COUNT
    ? raw
    : null;
}

function valuesFromPreferences(
  preferences: ReturnType<typeof useLearningPreferences>["preferences"],
): LearningPreferencesValues {
  if (!preferences) return DEFAULT_LEARNING_PREFERENCES;
  return {
    preferredCategories: preferences.preferredCategories,
    skillLevel: preferences.skillLevel,
    learningGoals: preferences.learningGoals,
    preferredResourceTypes: preferences.preferredResourceTypes,
    timeCommitment: preferences.timeCommitment,
  };
}

export default function Onboarding() {
  const { user } = useAuth();
  const {
    preferences,
    isLoading: preferencesLoading,
    isError: preferencesError,
    refetch: refetchPreferences,
    savePreferencesAsync,
    isSaving,
  } = useLearningPreferences();
  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery<CategoryOption[]>({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
  });
  const [values, setValues] = useState<LearningPreferencesValues>(
    DEFAULT_LEARNING_PREFERENCES,
  );
  const [step, setStep] = useState(stepFromUrl() ?? 1);
  const [errors, setErrors] = useState<PreferenceErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const hydratedRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const historyDepthRef = useRef(0);

  useEffect(() => {
    if (preferencesLoading || hydratedRef.current || !user?.id) return;

    let initialValues = valuesFromPreferences(preferences);
    let initialStep =
      stepFromUrl() ?? preferences?.onboardingStep ?? 1;
    const stored = safeGetItem(DRAFT_STORAGE_KEY);
    if (stored && preferences?.onboardingStatus !== "completed") {
      try {
        const draft = JSON.parse(stored) as {
          userId?: string;
          values?: LearningPreferencesValues;
          step?: number;
        };
        if (
          draft.userId === user.id &&
          draft.values &&
          Number.isInteger(draft.step) &&
          Number(draft.step) >= 1 &&
          Number(draft.step) <= ONBOARDING_STEP_COUNT
        ) {
          initialValues = draft.values;
          initialStep = stepFromUrl() ?? Number(draft.step);
        }
      } catch {
        safeRemoveItem(DRAFT_STORAGE_KEY);
      }
    }

    hydratedRef.current = true;
    setValues(initialValues);
    setStep(initialStep);
    const params = new URLSearchParams(window.location.search);
    if (!params.has("step")) {
      params.set("step", String(initialStep));
      window.history.replaceState(
        { onboardingFlow: true, onboardingDepth: 0 },
        "",
        `${window.location.pathname}?${params.toString()}`,
      );
    } else {
      const existingDepth =
        typeof window.history.state?.onboardingDepth === "number"
          ? window.history.state.onboardingDepth
          : 0;
      historyDepthRef.current = existingDepth;
      window.history.replaceState(
        { ...window.history.state, onboardingFlow: true, onboardingDepth: existingDepth },
        "",
        window.location.href,
      );
    }
  }, [preferencesLoading, preferences, user?.id]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const next = stepFromUrl();
      if (next) {
        historyDepthRef.current =
          typeof event.state?.onboardingDepth === "number"
            ? event.state.onboardingDepth
            : 0;
        setStep(next);
        setErrors({});
        requestAnimationFrame(() => headingRef.current?.focus());
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const rememberDraft = (
    nextValues: LearningPreferencesValues,
    nextStep: number,
  ) => {
    if (!user?.id) return;
    safeSetItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ userId: user.id, values: nextValues, step: nextStep }),
    );
  };

  const handleChange = (next: LearningPreferencesValues) => {
    setValues(next);
    setErrors({});
    rememberDraft(next, step);
  };

  const validateStep = (currentStep: number): boolean => {
    const nextErrors: PreferenceErrors = {};
    if (currentStep === 2 && values.preferredCategories.length === 0) {
      nextErrors.preferredCategories = "Choose at least one topic";
    }
    if (currentStep === 3 && values.learningGoals.length === 0) {
      nextErrors.learningGoals = "Choose at least one goal";
    }
    if (currentStep === 4 && values.preferredResourceTypes.length === 0) {
      nextErrors.preferredResourceTypes = "Choose at least one format";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const navigateStep = (nextStep: number, replace = false) => {
    const params = new URLSearchParams(window.location.search);
    params.set("step", String(nextStep));
    const nextDepth = replace
      ? historyDepthRef.current
      : historyDepthRef.current + 1;
    window.history[replace ? "replaceState" : "pushState"](
      { onboardingFlow: true, onboardingDepth: nextDepth },
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
    historyDepthRef.current = nextDepth;
    setStep(nextStep);
    setErrors({});
    rememberDraft(values, nextStep);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;
    setRequestError(null);
    const nextStep = Math.min(step + 1, ONBOARDING_STEP_COUNT);
    try {
      await savePreferencesAsync({
        ...values,
        onboardingStatus:
          preferences?.onboardingStatus === "completed"
            ? "completed"
            : "in_progress",
        onboardingStep: nextStep,
      });
      navigateStep(nextStep);
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "We couldn’t save your progress. Please try again.",
      );
    }
  };

  const handleBack = () => {
    if (step <= 1) return;
    // Traverse the entry created by Continue so the browser's Forward action
    // can restore the later step. A direct deep link has no onboarding history,
    // so it falls back to replacing that entry with the prior step.
    if (historyDepthRef.current > 0) {
      window.history.back();
    } else {
      navigateStep(step - 1, true);
    }
  };

  const handleSkip = async () => {
    setRequestError(null);
    try {
      await savePreferencesAsync({
        ...values,
        onboardingStatus: "dismissed",
        onboardingStep: step,
      });
      safeRemoveItem(DRAFT_STORAGE_KEY);
      window.location.href = "/";
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "We couldn’t save that choice. Please try again.",
      );
    }
  };

  const handleComplete = async () => {
    if (!validateStep(step)) return;
    setRequestError(null);
    try {
      await savePreferencesAsync({
        ...values,
        onboardingStatus: "completed",
        onboardingStep: ONBOARDING_STEP_COUNT,
      });
      safeRemoveItem(DRAFT_STORAGE_KEY);
      setCompleted(true);
      requestAnimationFrame(() => headingRef.current?.focus());
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "We couldn’t save your preferences. Please try again.",
      );
    }
  };

  const loading = preferencesLoading || categoriesLoading;
  const loadError = preferencesError || categoriesError;
  const categoryNames = (categories ?? [])
    .filter((category) => category.resourceCount > 0)
    .map((category) => category.name);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8" aria-busy="true">
        <SEOHead title="Learning Preferences" noindex />
        <div className="h-7 w-52 animate-pulse bg-muted" />
        <div className="h-48 animate-pulse bg-muted" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center" role="alert">
        <SEOHead title="Learning Preferences" noindex />
        <h1 className="font-sans text-xl font-semibold">
          We couldn’t load your preferences
        </h1>
        <p className="mt-2 text-sm text-[color:var(--text-2)]">
          Your account and the rest of the catalog are still available.
        </p>
        <Button
          className="mt-4"
          onClick={() => {
            void refetchPreferences();
            void refetchCategories();
          }}
        >
          Try again
        </Button>
      </Card>
    );
  }

  if (completed) {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden">
        <SEOHead title="Learning Preferences Saved" noindex />
        <CardContent className="p-6 sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white">
            <Check className="h-6 w-6" />
          </div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-6 font-sans text-3xl font-bold outline-none"
          >
            Your learning profile is ready
          </h1>
          <p className="mt-3 text-[color:var(--text-2)]">
            Personalized Recommendations can now use these choices. Public
            browsing and search stay the same for everyone.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/recommendations">
                <Sparkles className="mr-2 h-4 w-4" />
                See personalized recommendations
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Browse the catalog</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeStep = LEARNING_PREFERENCE_STEPS[step - 1];

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10 pt-3 sm:pt-6">
      <SEOHead
        title="Personalize Your Learning"
        description="Choose optional learning preferences for personalized Awesome Video recommendations."
        noindex
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
            Optional setup
          </p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 font-sans text-2xl font-bold outline-none sm:text-3xl"
          >
            {activeStep.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void handleSkip()}
          disabled={isSaving}
          className="min-h-[44px] px-2 text-sm text-[color:var(--text-2)] underline underline-offset-4 hover:text-[var(--text)]"
          data-testid="button-skip-onboarding"
        >
          Save and browse later
        </button>
      </div>

      <div aria-label={`Step ${step} of ${ONBOARDING_STEP_COUNT}`}>
        <div className="mb-2 flex justify-between text-xs text-[color:var(--text-2)]">
          <span>
            Step {step} of {ONBOARDING_STEP_COUNT}
          </span>
          <span>{activeStep.short}</span>
        </div>
        <Progress
          value={(step / ONBOARDING_STEP_COUNT) * 100}
          className="h-2"
        />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <LearningPreferencesForm
            values={values}
            onChange={handleChange}
            categories={categoryNames}
            step={step}
            disabled={isSaving}
            errors={errors}
          />
        </CardContent>
      </Card>

      {requestError ? (
        <p
          className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {requestError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={step === 1 || isSaving}
          className="sm:min-w-28"
          data-testid="button-onboarding-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {step < ONBOARDING_STEP_COUNT ? (
          <Button
            type="button"
            onClick={() => void handleNext()}
            disabled={isSaving}
            className="sm:min-w-32"
            data-testid="button-onboarding-next"
          >
            {isSaving ? "Saving…" : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void handleComplete()}
            disabled={isSaving}
            className="sm:min-w-40"
            data-testid="button-onboarding-save"
          >
            {isSaving ? "Saving…" : "Save preferences"}
            <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}