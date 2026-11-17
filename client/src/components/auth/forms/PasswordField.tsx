import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthField, type AuthFieldProps } from "./AuthField";

interface PasswordFieldProps extends Omit<AuthFieldProps, "type" | "adornment" | "autoComplete"> {
  /** Required so no caller can ship a password field the browser cannot fill. */
  autoComplete: "current-password" | "new-password";
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { testId, ...fieldProps },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const toggleId = useId();
  return (
    <AuthField
      {...fieldProps}
      ref={ref}
      testId={testId}
      type={visible ? "text" : "password"}
      adornment={
        <Button
          id={toggleId}
          type="button"
          variant="outline"
          size="icon"
          className="auth-edge shrink-0"
          aria-pressed={visible}
          aria-label="Show password"
          onClick={() => setVisible((v) => !v)}
          data-testid={`${testId}-toggle`}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      }
    />
  );
});
