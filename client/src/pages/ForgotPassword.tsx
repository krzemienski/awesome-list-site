import { useState } from "react";
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
  email: z.string().email("Please enter a valid email address"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Server always returns a generic success (no account enumeration).
        setSubmitted(true);
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
              <Button asChild variant="outline" className="w-full" data-testid="link-back-to-login">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
