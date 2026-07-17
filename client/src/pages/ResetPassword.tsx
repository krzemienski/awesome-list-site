import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/layout/SEOHead";

const resetSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

// wouter's useLocation() is path-only, so read the token straight from the query.
function getTokenFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") || "";
}

export default function ResetPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [token] = useState(getTokenFromUrl);

  const form = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });

      if (response.ok) {
        setDone(true);
      } else {
        const error = await response.json().catch(() => ({ message: "Something went wrong" }));
        toast({
          title: "Couldn't reset password",
          description: error.message || "This reset link may be invalid or expired.",
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

  const missingToken = !token;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] p-4">
      <SEOHead
        title="Set a New Password"
        description="Choose a new password for your Awesome Video account."
        noindex
      />
      <h1 className="sr-only">Set a new password for your Awesome Video account</h1>
      <Card className="w-full max-w-md" data-testid="reset-password-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-2">
            {done ? (
              <CheckCircle2 className="h-6 w-6 text-[var(--accent)]" />
            ) : missingToken ? (
              <AlertTriangle className="h-6 w-6 text-[var(--accent)]" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-[var(--accent)]" />
            )}
          </div>
          <CardTitle className="font-sans font-bold text-2xl text-center tracking-tight">
            {done ? "Password updated" : missingToken ? "Invalid reset link" : "Set a new password"}
          </CardTitle>
          <CardDescription className="text-center">
            {done
              ? "You can now sign in with your new password."
              : missingToken
                ? "This link is missing its reset token."
                : "Choose a strong new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <Button asChild className="w-full" data-testid="link-go-to-login">
              <Link href="/login">Go to sign in</Link>
            </Button>
          ) : missingToken ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--bg-2)] p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
                <p className="text-sm text-[color:var(--text-2)]">
                  This password reset link is invalid or incomplete. Please request a new one.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full" data-testid="link-request-new">
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              {/* BUG-049 (run18): noValidate so zod owns the styled inline
                  messages (parity with /login, /register) while the native
                  required/minLength below still aid AT + autofill. */}
              <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="newPassword">New password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            id="newPassword"
                            type="password"
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                            className="pl-10"
                            data-testid="input-new-password"
                            disabled={isLoading}
                            required
                            minLength={8}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                            type="password"
                            autoComplete="new-password"
                            placeholder="Re-enter your new password"
                            className="pl-10"
                            data-testid="input-confirm-password"
                            disabled={isLoading}
                            required
                            minLength={8}
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
                  data-testid="button-reset-password"
                >
                  {isLoading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
