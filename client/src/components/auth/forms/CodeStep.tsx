import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AuthField } from "./AuthField";

const RESEND_COOLDOWN_SECONDS = 30;

interface CodeStepProps {
  /** The address the code went to, shown in full. */
  email: string;
  busy: boolean;
  error: string | null;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onStartOver: () => void;
  submitLabel: string;
}

/** One six-digit code input; focus lands on it when the step appears. */
export function CodeStep({ email, busy, error, onSubmit, onResend, onStartOver, submitLabel }: CodeStepProps) {
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy && code.length > 0) onSubmit(code.trim());
  };

  const handleResend = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    onResend();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={busy} data-testid="form-auth-code">
      <AuthField
        ref={inputRef}
        label="Verification code"
        hint={`We sent a 6-digit code to ${email}.`}
        error={error}
        testId="input-auth-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        required
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <Button type="submit" disabled={busy} data-testid="button-auth-code-submit">
        {busy ? "Verifying…" : submitLabel}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="link"
          disabled={busy || cooldown > 0}
          onClick={handleResend}
          data-testid="button-auth-code-resend"
        >
          {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
        </Button>
        <Button type="button" variant="link" onClick={onStartOver} data-testid="button-auth-code-start-over">
          Use a different email
        </Button>
      </div>
    </form>
  );
}
