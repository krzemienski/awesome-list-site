import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { whenClerkLoaded } from "@/lib/clerk-bridge";

function clerkErrorMessage(error: unknown): string {
  const first = (error as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0];
  if (first?.longMessage || first?.message) return first.longMessage ?? first.message ?? "";
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

/** Verifies the member's email in place: Clerk emails a code, the member types it here. */
export default function EmailVerifyPanel({ onVerified }: { onVerified: () => void }) {
  const [step, setStep] = useState<"start" | "code">("start");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    action()
      .catch((failure: unknown) => setError(clerkErrorMessage(failure)))
      .finally(() => setBusy(false));
  };
  const sendCode = () => run(async () => {
    await (await whenClerkLoaded()).sendEmailCode();
    setStep("code");
  });
  const confirmCode = () => { if (code.trim().length >= 6) run(async () => {
    await (await whenClerkLoaded()).confirmEmailCode(code.trim());
    onVerified();
  }); };

  return (
    <div className="space-y-3 border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,transparent)] p-4 text-sm" data-testid="digest-verify-email">
      <p className="flex items-start gap-2" role="alert">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-ink)]" />
        Email digests need a verified email address. {step === "start" ? "We’ll email you a 6-digit code." : "We emailed you a 6-digit code."}
      </p>
      {step === "code" ? (
        <div>
          <Label htmlFor="digest-verify-code">Verification code</Label>
          <input
            id="digest-verify-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="mt-2 min-h-[44px] w-full max-w-[12rem] rounded-md border border-input bg-[var(--surface)] px-3 font-mono text-sm tracking-widest"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {step === "start" ? (
          <Button className="min-h-[44px]" onClick={sendCode} aria-disabled={busy} aria-busy={busy}>{busy ? "Sending…" : "Verify email"}</Button>
        ) : (
          <>
            <Button className="min-h-[44px]" onClick={confirmCode} aria-disabled={busy || code.trim().length < 6} aria-busy={busy}>{busy ? "Checking…" : "Confirm code"}</Button>
            <Button variant="ghost" className="min-h-[44px]" onClick={sendCode} aria-disabled={busy}>Send a new code</Button>
          </>
        )}
      </div>
      {error ? <p className="text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}
