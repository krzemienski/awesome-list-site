import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  LEARNING_FORMAT_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  SKILL_LEVEL_VALUES,
  TIME_COMMITMENT_OPTIONS,
  type LearningPreferencesValues,
  type LearningSkillLevel,
  type LearningTimeCommitment,
} from "@shared/onboarding";

export const LEARNING_PREFERENCE_STEPS = [
  { number: 1, short: "Level", title: "Where are you starting?" },
  { number: 2, short: "Topics", title: "What do you want to explore?" },
  { number: 3, short: "Goals", title: "What would you like to achieve?" },
  { number: 4, short: "Formats", title: "How do you like to learn?" },
  { number: 5, short: "Time", title: "What fits your schedule?" },
] as const;

interface LearningPreferencesFormProps {
  values: LearningPreferencesValues;
  onChange: (values: LearningPreferencesValues) => void;
  categories: string[];
  step?: number;
  showAll?: boolean;
  disabled?: boolean;
  errors?: Partial<Record<keyof LearningPreferencesValues, string>>;
}

const SKILL_COPY: Record<
  LearningSkillLevel,
  { label: string; description: string }
> = {
  beginner: {
    label: "Beginner",
    description: "I’m building a foundation in video technology.",
  },
  intermediate: {
    label: "Intermediate",
    description: "I know the basics and want to go deeper.",
  },
  advanced: {
    label: "Advanced",
    description: "I work with video systems and want specialist material.",
  },
};

function toggleValue<T extends string>(items: T[], value: T): T[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

export default function LearningPreferencesForm({
  values,
  onChange,
  categories,
  step = 1,
  showAll = false,
  disabled = false,
  errors = {},
}: LearningPreferencesFormProps) {
  const visible = (section: number) => showAll || section === step;

  return (
    <div className={showAll ? "space-y-8" : ""}>
      {visible(1) ? (
        <fieldset
          className="space-y-4"
          data-testid="preferences-section-skill"
          disabled={disabled}
        >
          <legend className="font-sans text-lg font-semibold">
            {showAll ? "Skill level" : LEARNING_PREFERENCE_STEPS[0].title}
          </legend>
          <p className="text-sm text-[color:var(--text-2)]">
            Choose the closest match. You can change this at any time.
          </p>
          <RadioGroup
            value={values.skillLevel}
            onValueChange={(next) =>
              onChange({
                ...values,
                skillLevel: next as LearningSkillLevel,
              })
            }
            className="grid gap-3 sm:grid-cols-3"
          >
            {SKILL_LEVEL_VALUES.map((value) => {
              const copy = SKILL_COPY[value];
              const id = `preference-skill-${value}`;
              return (
                <Label
                  key={value}
                  htmlFor={id}
                  className="flex min-h-[92px] cursor-pointer items-start gap-3 border border-[var(--border)] bg-[var(--surface)] p-4 has-[[data-state=checked]]:border-[var(--accent)] has-[[data-state=checked]]:bg-[var(--surface-2)]"
                >
                  <RadioGroupItem id={id} value={value} className="mt-0.5" />
                  <span>
                    <span className="block font-medium">{copy.label}</span>
                    <span className="mt-1 block text-sm font-normal text-[color:var(--text-2)]">
                      {copy.description}
                    </span>
                  </span>
                </Label>
              );
            })}
          </RadioGroup>
          <FieldError message={errors.skillLevel} />
        </fieldset>
      ) : null}

      {visible(2) ? (
        <fieldset
          className="space-y-4"
          data-testid="preferences-section-topics"
          disabled={disabled}
        >
          <legend className="font-sans text-lg font-semibold">
            {showAll ? "Topics" : LEARNING_PREFERENCE_STEPS[1].title}
          </legend>
          <p className="text-sm text-[color:var(--text-2)]">
            These choices come directly from the current Awesome Video
            taxonomy. Choose one or more.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((category, index) => {
              const id = `preference-category-${index}`;
              return (
                <Label
                  key={category}
                  htmlFor={id}
                  className="flex min-h-[48px] cursor-pointer items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-3 py-2 has-[[data-state=checked]]:border-[var(--accent)] has-[[data-state=checked]]:bg-[var(--surface-2)]"
                >
                  <Checkbox
                    id={id}
                    checked={values.preferredCategories.includes(category)}
                    onCheckedChange={() =>
                      onChange({
                        ...values,
                        preferredCategories: toggleValue(
                          values.preferredCategories,
                          category,
                        ),
                      })
                    }
                  />
                  <span className="text-sm font-normal">{category}</span>
                </Label>
              );
            })}
          </div>
          <FieldError message={errors.preferredCategories} />
        </fieldset>
      ) : null}

      {visible(3) ? (
        <fieldset
          className="space-y-4"
          data-testid="preferences-section-goals"
          disabled={disabled}
        >
          <legend className="font-sans text-lg font-semibold">
            {showAll ? "Learning goals" : LEARNING_PREFERENCE_STEPS[2].title}
          </legend>
          <p className="text-sm text-[color:var(--text-2)]">
            Pick every goal that matters right now.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEARNING_GOAL_OPTIONS.map((option) => {
              const id = `preference-goal-${option.value}`;
              return (
                <Label
                  key={option.value}
                  htmlFor={id}
                  className="flex min-h-[48px] cursor-pointer items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-3 py-2 has-[[data-state=checked]]:border-[var(--accent)] has-[[data-state=checked]]:bg-[var(--surface-2)]"
                >
                  <Checkbox
                    id={id}
                    checked={values.learningGoals.includes(option.value)}
                    onCheckedChange={() =>
                      onChange({
                        ...values,
                        learningGoals: toggleValue(
                          values.learningGoals,
                          option.value,
                        ),
                      })
                    }
                  />
                  <span className="text-sm font-normal">{option.label}</span>
                </Label>
              );
            })}
          </div>
          <FieldError message={errors.learningGoals} />
        </fieldset>
      ) : null}

      {visible(4) ? (
        <fieldset
          className="space-y-4"
          data-testid="preferences-section-formats"
          disabled={disabled}
        >
          <legend className="font-sans text-lg font-semibold">
            {showAll ? "Preferred formats" : LEARNING_PREFERENCE_STEPS[3].title}
          </legend>
          <p className="text-sm text-[color:var(--text-2)]">
            Choose at least one format. These map to the catalog’s curated
            resource formats.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LEARNING_FORMAT_OPTIONS.map((option) => {
              const id = `preference-format-${option.value}`;
              return (
                <Label
                  key={option.value}
                  htmlFor={id}
                  className="flex min-h-[48px] cursor-pointer items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-3 py-2 has-[[data-state=checked]]:border-[var(--accent)] has-[[data-state=checked]]:bg-[var(--surface-2)]"
                >
                  <Checkbox
                    id={id}
                    checked={values.preferredResourceTypes.includes(
                      option.value,
                    )}
                    onCheckedChange={() =>
                      onChange({
                        ...values,
                        preferredResourceTypes: toggleValue(
                          values.preferredResourceTypes,
                          option.value,
                        ),
                      })
                    }
                  />
                  <span className="text-sm font-normal">{option.label}</span>
                </Label>
              );
            })}
          </div>
          <FieldError message={errors.preferredResourceTypes} />
        </fieldset>
      ) : null}

      {visible(5) ? (
        <fieldset
          className="space-y-4"
          data-testid="preferences-section-time"
          disabled={disabled}
        >
          <legend className="font-sans text-lg font-semibold">
            {showAll ? "Available time" : LEARNING_PREFERENCE_STEPS[4].title}
          </legend>
          <p className="text-sm text-[color:var(--text-2)]">
            This helps us favor resources that fit your learning rhythm.
          </p>
          <RadioGroup
            value={values.timeCommitment}
            onValueChange={(next) =>
              onChange({
                ...values,
                timeCommitment: next as LearningTimeCommitment,
              })
            }
            className="grid gap-2"
          >
            {TIME_COMMITMENT_OPTIONS.map((option) => {
              const id = `preference-time-${option.value}`;
              return (
                <Label
                  key={option.value}
                  htmlFor={id}
                  className="flex min-h-[48px] cursor-pointer items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-3 py-2 has-[[data-state=checked]]:border-[var(--accent)] has-[[data-state=checked]]:bg-[var(--surface-2)]"
                >
                  <RadioGroupItem id={id} value={option.value} />
                  <span className="text-sm font-normal">{option.label}</span>
                </Label>
              );
            })}
          </RadioGroup>
          <FieldError message={errors.timeCommitment} />

          <div className="border-l-2 border-[var(--accent)] bg-[var(--surface-2)] p-4 text-sm">
            <h3 className="font-semibold">What changes after you save</h3>
            <p className="mt-1 text-[color:var(--text-2)]">
              Your choices shape surfaces explicitly labeled personalized,
              including Personalized Recommendations. They do not change public
              catalog or search results, and preference values are not sent to
              analytics.
            </p>
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}