import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { SiReplit } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import SEOHead from "@/components/layout/SEOHead";
import { trackLogin } from "@/lib/analytics";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginUser {
  email: string;
  role?: string;
}

interface LoginResponse {
  user: LoginUser;
}

export default function Login() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Surface OIDC callback failures (server redirects here with ?error=oauth).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") {
      toast({
        title: "Social sign-in failed",
        description:
          "We couldn't complete the sign-in. If you originally created your account with email and password, sign in with those below.",
        variant: "destructive",
      });
      // Strip the param so a refresh doesn't re-fire the toast.
      window.history.replaceState(null, "", "/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    // BUG-042 (run10): validate on blur so an empty/invalid field shows its
    // error as soon as the user leaves it, not only on submit.
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/local/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = (await response.json()) as LoginResponse;

        // GA4 conversion: successful local sign-in.
        trackLogin('password');

        // Set the query data BEFORE showing toast or navigating
        // This ensures the AdminGuard sees the authenticated user immediately
        queryClient.setQueryData(['/api/auth/user'], {
          user: result.user,
          isAuthenticated: true
        });
        
        // Also invalidate any stale queries to force components to re-check
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        // Re-set the data after invalidation to ensure it's current
        queryClient.setQueryData(['/api/auth/user'], {
          user: result.user,
          isAuthenticated: true
        });
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${result.user.email}!`,
        });

        // BUG-027 (run10): honor a safe ?next= return path so flows like
        // /submit → login → back work. Same-origin only: must start with "/"
        // followed by neither "/" nor "\" (browsers normalize "\" to "/", so
        // "/\evil.com" would otherwise become a protocol-relative redirect).
        // Falls back to the role-based default. window.location ensures a
        // fresh load so the session cookie is sent.
        const nextParam = new URLSearchParams(window.location.search).get("next");
        const safeNext =
          nextParam && /^\/(?![/\\])/.test(nextParam) ? nextParam : null;
        window.location.href =
          safeNext ?? (result.user?.role === "admin" ? "/admin" : "/");
      } else {
        const error = (await response
          .json()
          .catch(() => ({ message: "Invalid email or password" }))) as {
          message?: string;
          retryAfter?: number;
        };
        // BUG-v3-M19 (run12): the lockout response (423) carries retryAfter
        // seconds — surface a concrete recovery duration instead of the
        // generic "try again later".
        if (response.status === 423) {
          const secs =
            typeof error.retryAfter === "number" && error.retryAfter > 0
              ? error.retryAfter
              : null;
          const wait =
            secs === null
              ? "a few minutes"
              : secs >= 90
                ? `about ${Math.ceil(secs / 60)} minutes`
                : `${secs} seconds`;
          toast({
            title: "Too many failed attempts",
            description: `Sign-in is temporarily locked. Try again in ${wait}.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message ?? "Invalid email or password",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] p-4">
      <SEOHead
        title="Sign In"
        description="Sign in to Awesome Video to save bookmarks, submit resources, and personalize your learning journey."
        noindex
      />
      <h1 className="sr-only">Sign in to Awesome Video</h1>
      <Card className="w-full max-w-md" data-testid="login-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-2">
            <LogIn className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <CardTitle className="font-sans font-bold text-2xl text-center tracking-tight">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            {/* R4-M10: generic copy — login serves all users, not just admins. */}
            Sign in to your Awesome Video account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
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
                        />
                      </div>
                    </FormControl>
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
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          className="pl-10 pr-12"
                          data-testid="input-password"
                          disabled={isLoading}
                        />
                        {/* BUG-026 (run9): show/hide password toggle */}
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end -mt-1">
                <Link
                  href="/forgot-password"
                  className="text-xs text-[color:var(--text-2)] hover:text-[color:var(--accent)] hover:underline"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign in"}
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
              data-testid="button-replit-login"
            >
              <SiReplit className="mr-2 h-4 w-4" />
              Continue with Replit
            </Button>
            <p className="text-center text-xs text-[color:var(--text-3)]">
              Sign in with Google, GitHub, Apple, or X via Replit
            </p>
          </div>

          <p className="text-center text-sm text-[color:var(--text-2)]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[color:var(--accent)] hover:underline" data-testid="link-register">
              Create account
            </Link>
          </p>

          {/* BUG-045 (run10): explicit no-account escape hatch — browsing
              never requires sign-in, so say so and link back out. */}
          <p className="text-center text-sm text-[color:var(--text-2)]">
            <Link href="/" className="text-[color:var(--accent)] hover:underline" data-testid="link-browse-guest">
              Continue browsing without an account
            </Link>
          </p>

          {/* Admin-account hint is a local-development convenience only.
              Gated on import.meta.env.DEV so it never renders in production builds. */}
          {import.meta.env.DEV && (
            <div className="space-y-2 pt-2 text-xs text-[color:var(--text-2)]">
              <p className="text-xs text-[color:var(--text-2)]">
                Local admin account:
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <code className="font-mono text-[color:var(--accent)]">admin@example.com</code>
                <span aria-hidden="true" className="text-[color:var(--text-3)]">/</span>
                <span>the <code className="font-mono text-[color:var(--accent)]">ADMIN_PASSWORD</code> secret</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
