import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import SEOHead from "@/components/layout/SEOHead";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
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

      // Account created — sign in immediately through the existing local-login flow so the
      // session payload is produced by the canonical handler (no hand-rolled session shape).
      const loginResponse = await fetch("/api/auth/local/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
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
        window.location.href = "/";
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
                          type="password"
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          className="pl-10"
                          data-testid="input-password"
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
                data-testid="button-register"
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-[color:var(--text-2)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[color:var(--accent)] hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
