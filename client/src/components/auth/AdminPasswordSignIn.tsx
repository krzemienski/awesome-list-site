import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Owner password sign-in, shown on /sign-in?admin. Posts to
 * /api/auth/admin-login, which sets a signed HttpOnly cookie for the
 * built-in admin account when the password matches ADMIN_PASSWORD.
 * Not linked anywhere in the UI.
 */
export function AdminPasswordSignIn() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        // Full reload so every cached signed-out query is discarded.
        window.location.href = "/admin";
        return;
      }
      setError(
        response.status === 429
          ? "Too many attempts. Wait 15 minutes and try again."
          : "Incorrect password.",
      );
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 px-4"
      data-testid="form-admin-password"
    >
      <h1 className="display-h text-xl">Admin sign-in</h1>
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          data-testid="input-admin-password"
        />
      </div>
      {error && (
        <p className="text-sm font-medium text-[var(--accent)]" role="alert" data-testid="text-admin-password-error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting || password.length === 0} data-testid="button-admin-password-submit">
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
