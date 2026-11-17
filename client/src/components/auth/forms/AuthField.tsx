import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface AuthFieldProps extends Omit<ComponentProps<typeof Input>, "id" | "aria-describedby" | "aria-invalid"> {
  label: string;
  /** Static help text, always visible and always part of the field's description. */
  hint?: string;
  /** The current error for this field; sets aria-invalid and joins the description. */
  error?: string | null;
  /** Extra control beside the input, such as the show/hide toggle. */
  adornment?: ReactNode;
  testId: string;
}

/**
 * The one place a sign-in field's accessibility wiring lives: a real label,
 * and a description built from the hint and the error. Neither is a live
 * region: focus moves to the invalid field, and the description is read then.
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, hint, error, adornment, testId, className, ...inputProps },
  ref,
) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-stretch gap-2">
        <Input
          {...inputProps}
          ref={ref}
          id={id}
          className={cn("auth-edge min-w-0 flex-1", className)}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          data-testid={testId}
        />
        {adornment}
      </div>
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-[var(--accent-ink)]" data-testid={`${testId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
});
