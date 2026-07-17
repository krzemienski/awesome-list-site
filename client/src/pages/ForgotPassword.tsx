import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/layout/SEOHead";

const forgotSchema = z.object({
  // BUG-037 (run18): an empty email must read "Email is required", not
  // "Please enter a valid email address" — min(1) fires before email().
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // NB-056 (run18): remember the email we sent to and run a 60s resend cooldown
  // so the confirmation screen can offer a "Resend email" action that re-calls
  // the same request without re-typing the address.
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  // NB-056 (run18): tick the resend countdown down to zero, one second at a time.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendReset = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        // Server always returns a generic success (no account enumeration).
        setSubmittedEmail(email);
        setSubmitted(true);
        // NB-056 (run18): start the 60s resend cooldown on every successful send.
        setCooldown(60);
      } else if (response.status === 429) {
        toast({
          title: "Too many requests",
          description: "Please wait a little while before requesting another reset link.",
          variant: "destructive",
        });
      } else {
        const error = await response.json().catch(() => ({ message: "Something went wrong" }));
        toast({
          title: "Couldn't send reset link",
          description: error.message || "Please check the email address and try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (data: ForgotFormData) => {
    void sendReset(data.email);
  };

  // NB-056 (run18): re-send to the same email; ignored while cooling down.
  const handleResend = () => {
    if (cooldown > 0 || isLoading || !submittedEmail) return;
    void sendReset(submittedEmail);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] p-4">
      <SEOHead
        title="Reset Your Password"
        description="Request a password reset link for your Awesome Video account."
        noindex
      />
      <h1 className="sr-only">Reset your Awesome Video password</h1>
      <Card className="w-full max-w-md" data-testid="forgot-password-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-2">
            <KeyRound className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <CardTitle className="font-sans font-bold text-2xl text-center tracking-tight">
            Forgot your password?
          </CardTitle>
          <CardDescription className="text-center">
            {submitted
              ? "Check your inbox"
              : "Enter your email and we'll send you a link to reset it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--bg-2)] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
                <p className="text-sm text-[color:var(--text-2)]" data-testid="text-forgot-success">
                  If an account with that email exists, we've sent a password reset link. It expires in 1 hour.
                </p>
              </div>
              {/* NB-056 (run18): resend the reset email to the same address with
                  a visible 60s countdown; disabled + aria-disabled while cooling
                  down so people don't spam requests. */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={cooldown > 0 || isLoading}
                aria-disabled={cooldown > 0 || isLoading}
                data-testid="button-resend-email"
              >
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : isLoading
                    ? "Sending..."
                    : "Resend email"}
              </Button>
              <Button asChild variant="ghost" className="w-full" data-testid="link-back-to-login">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <Form {...form}>
                {/* BUG-049 (run18): noValidate so zod owns the styled inline
                    messages (parity with /login, /register) while the native
                    required/type=email below still aid AT + autofill. */}
                <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="email">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              id="email"
                              type="email"
                              autoComplete="email"
                              placeholder="you@example.com"
                              className="pl-10"
                              data-testid="input-email"
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-send-reset-link"
                  >
                    {isLoading ? "Sending..." : "Send reset link"}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-[color:var(--text-2)]">
                Remembered it?{" "}
                <Link href="/login" className="text-[color:var(--accent)] hover:underline" data-testid="link-login">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
