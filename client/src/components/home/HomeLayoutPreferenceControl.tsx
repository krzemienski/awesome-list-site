import type { HTMLAttributes } from "react";
import type { HomeLayout } from "@shared/onboarding-values";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useHomeLayout } from "./use-home-layout";

export interface HomeLayoutPreferenceControlProps extends HTMLAttributes<HTMLFieldSetElement> {
  disabled?: boolean;
}

const OPTIONS: readonly {
  value: HomeLayout;
  label: string;
  description: string;
}[] = [
  {
    value: "index",
    label: "Index",
    description: "The full catalog, organized for browsing.",
  },
  {
    value: "curated",
    label: "Curated",
    description: "A focused home feed with recent and featured picks.",
  },
];

function HomeLayoutPreferenceControl({
  disabled = false,
  className,
  ...props
}: HomeLayoutPreferenceControlProps) {
  const { layout, isLoading, setLayout, isSaving, isError, error } = useHomeLayout();
  const isDisabled = disabled || isLoading || isSaving;

  return (
    <fieldset
      {...props}
      className={className}
      disabled={isDisabled}
      data-testid="home-layout-preference-control"
    >
      <legend className="text-sm font-semibold">Home layout</legend>
      <p className="mt-1 text-sm text-[color:var(--text-2)]">
        Choose how the home page opens for you.
      </p>
      <RadioGroup
        aria-label="Home layout"
        value={layout}
        onValueChange={(value) => {
          const next = OPTIONS.find((option) => option.value === value)?.value;
          if (next) setLayout(next);
        }}
        className="mt-3 gap-2 sm:grid-cols-2"
        data-testid="home-layout-options"
      >
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            htmlFor={`home-layout-${option.value}`}
            className="flex min-h-16 cursor-pointer items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 transition-colors hover:border-[var(--accent)] has-[:checked]:border-[var(--accent)]"
          >
            <RadioGroupItem
              id={`home-layout-${option.value}`}
              value={option.value}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-xs text-[color:var(--text-2)]">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>
      {isLoading ? (
        <p className="mt-3 text-xs text-[color:var(--text-2)]" role="status">
          Loading your home layout…
        </p>
      ) : isSaving ? (
        <p className="mt-3 text-xs text-[color:var(--text-2)]" role="status">
          Saving your home layout…
        </p>
      ) : isError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error instanceof Error
            ? error.message
            : "We couldn’t save your home layout. Please try again."}
        </p>
      ) : null}
    </fieldset>
  );
}

export default HomeLayoutPreferenceControl;
