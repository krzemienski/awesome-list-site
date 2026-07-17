import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { SiReplit } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import SEOHead from "@/components/layout/SEOHead";
import { useAuth } from "@/hooks/useAuth";
import { trackSignUp } from "@/lib/analytics";

const registerSchema = z.object({
  // BUG-037 (run18): an empty email must read "Email is required", not
  // "Please enter a valid email address" — min(1) fires before email().
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  // NB-001 (run18): reject whitespace-only passwords — a string of spaces
  // used to satisfy min(8). Server enforces the same message.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((v) => v.trim().length >= 8, "Password can't be spaces only"),
  // Run15 BUG-043: confirm-password field to catch typos before submit.
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// Run15 BUG-031: dictionary penalty — common passwords score "Very weak"
// regardless of length/class variety. Checked against the lowercased input
// with trailing digits/symbols stripped ("Password123!" → "password").
const COMMON_PASSWORDS = new Set([
  "password", "passwort", "passw0rd", "password1", "qwerty", "qwertyuiop",
  "letmein", "welcome", "monkey", "dragon", "iloveyou", "sunshine",
  "princess", "football", "baseball", "superman", "trustno1", "abc123",
  "abcd1234", "12345678", "123456789", "1234567890", "admin123",
  "changeme", "internet", "whatever", "computer", "michael", "jessica",
  "starwars", "shadow", "master", "freedom", "batman", "secret",
]);

function isDictionaryPassword(pw: string): boolean {
  const lower = pw.toLowerCase();
  const stripped = lower.replace(/[\d!@#$%^&*()_+\-=.,;:'"?]+$/, "");
  return COMMON_PASSWORDS.has(lower) || COMMON_PASSWORDS.has(stripped);
}

// R2-M27: lightweight password strength scoring — no external dependency.
// Score 0-4 from length + character-class variety.
function scorePassword(pw: string): number {
  if (!pw) return 0;
  if (isDictionaryPassword(pw)) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  const classes =
    Number(/[a-z]/.test(pw)) +
    Number(/[A-Z]/.test(pw)) +
    Number(/[0-9]/.test(pw)) +
    Number(/[^a-zA-Z0-9]/.test(pw));
  if (classes >= 2) score++;
  if (classes >= 3 && pw.length >= 10) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = [
  "bg-[var(--border)]",
  "bg-[#ff5c7a]",
  "bg-[#ffb84d]",
  "bg-[#5eddf2]",
  "bg-[#34d08c]",
];

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);
  return (
    <div className="space-y-1 pt-1" data-testid="password-strength">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={`h-1 flex-1 rounded-full transition-colors ${
              score >= seg ? STRENGTH_COLORS[score] : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>
      <p
        className="text-xs text-[color:var(--text-2)]"
        aria-live="polite"
        data-testid="password-strength-label"
      >
        Password strength: {STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

export default function Register() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // Distinguishes "arrived already signed in" from "signed up via this form" —
  // the form's own success path handles its redirect, so the effect below
  // must not race it.
  const submitStartedRef = useRef(false);

  // BUG-021 (run13): visiting /register while already signed in silently
  // showed the form again. Redirect home instead.
  useEffect(() => {
    if (authLoading || !isAuthenticated || submitStartedRef.current) return;
    setLocation("/", { replace: true });
  }, [authLoading, isAuthenticated, setLocation]);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    submitStartedRef.current = true;
    setIsLoading(true);
    // confirmPassword is a client-only field — never send it to the API.
    const credentials = { email: data.email, password: data.password };
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Registration failed" }));
        toast({
          title: "Registration failed",
          description: error.message || "Could not create your account.",
          variant: "destructive",
        });
        return;
      }

      // GA4 conversion: account successfully created.
      trackSignUp('password');

      // Account created — sign in immediately through the existing local-login flow so the
      // session payload is produced by the canonical handler (no hand-rolled session shape).
      const loginResponse = await fetch("/api/auth/local/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (loginResponse.ok) {
        const result = await loginResponse.json();
        queryClient.setQueryData(["/api/auth/user"], {
          user: result.user,
          isAuthenticated: true,
        });
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.setQueryData(["/api/auth/user"], {
          user: result.user,
          isAuthenticated: true,
        });
        toast({
          title: "Account created",
          description: `Welcome, ${result.user.email}!`,
        });
        // BUG-047 (run13): land on home with ?welcome=1 so the destination
        // page greets the new account (the full-page nav drops this toast).
        window.location.href = "/?welcome=1";
      } else {
        // Account exists but auto-login failed — send them to the login page.
        toast({
          title: "Account created",
          description: "Please sign in with your new credentials.",
        });
        window.location.href = "/login";
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] p-4">
      <SEOHead
        title="Create an Account"
        description="Create a free Awesome Video account to save bookmarks, submit resources, and track your learning journeys."
        noindex
      />
      <h1 className="sr-only">Create an Awesome Video account</h1>
      <Card className="w-full max-w-md" data-testid="register-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-2">
            <UserPlus className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <CardTitle className="font-sans font-bold text-2xl text-center tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription className="text-center">
            Join the community to submit and save resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            {/* Run15 BUG-047 (parity with /login): explicit method="post" so a
                no-JS submit can never put credentials in the URL.
                Run17 BUG-039: noValidate — zod owns validation so the email
                field shows the styled inline message, not a native bubble. */}
            <form method="post" noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        {/* BUG-049 (run18): native required/type=email aid AT,
                            autofill and mobile keyboards; the form's noValidate
                            keeps zod's styled inline messages authoritative. */}
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
                    {/* Run17 BUG-040: the display name is derived from the email
                        prefix — say so instead of doing it silently. */}
                    <p className="text-xs text-[color:var(--text-3)]" data-testid="text-display-name-hint">
                      Your display name starts as the part before the @ — change it anytime in Profile.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Password"
                          className="pl-10 pr-12"
                          data-testid="input-password"
                          disabled={isLoading}
                          required
                          minLength={8}
                        />
                        {/* BUG-026 (run9): show/hide password toggle (parity with /login) */}
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-[color:var(--text)] transition-colors"
                          data-testid="button-toggle-password"
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <PasswordStrengthMeter password={field.value} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Run15 BUG-043: confirm-password field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="confirmPassword">Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Confirm password"
                          className="pl-10 pr-12"
                          data-testid="input-confirm-password"
                          disabled={isLoading}
                          required
                          minLength={8}
                        />
                        {/* Run17 BUG-042: confirm field gets its own show/hide
                            toggle (parity with the password field above). */}
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                          aria-pressed={showConfirmPassword}
                          className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-[color:var(--text)] transition-colors"
                          data-testid="button-toggle-confirm-password"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
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
                data-testid="button-register"
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--bg-2)] px-2 text-[color:var(--text-2)] font-mono tracking-[0.18em]">
                Or continue with
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = "/api/login";
              }}
              data-testid="button-replit-register"
            >
              <SiReplit className="mr-2 h-4 w-4" />
              Continue with Replit
            </Button>
            <p className="text-center text-xs text-[color:var(--text-3)]">
              Uses Replit&apos;s secure sign-in
            </p>
          </div>

          <p className="text-center text-sm text-[color:var(--text-2)]">
            Already have an account?{" "}
            {/* BUG-028 (run14): >=24px target height for the inline link. */}
            <Link href="/login" className="inline-flex items-center min-h-[24px] align-middle text-[color:var(--accent)] hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
