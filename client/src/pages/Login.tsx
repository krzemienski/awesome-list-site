import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, Mail, Lock, Chrome, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
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
        const result = await response.json();
        
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

        // Navigate to admin - use window.location to ensure fresh page load
        // This guarantees the session cookie is sent with subsequent requests
        window.location.href = "/admin";
      } else {
        const error = await response.json().catch(() => ({ message: "Invalid email or password" }));
        toast({
          title: "Login failed",
          description: error.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = "/api/login";
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] p-4">
      <Card className="w-full max-w-md" data-testid="login-card">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] p-3 ring-1 ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
              <LogIn className="h-6 w-6 text-[var(--accent)]" />
            </div>
          </div>
          <div className="eyebrow text-center">// Authentication</div>
          <CardTitle className="font-display font-medium text-3xl text-center tracking-tight">
            Welcome <em className="not-italic font-display italic text-[var(--accent)]">back</em>
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access the admin dashboard
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
                          placeholder="admin@example.com"
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
                          autoComplete="current-password"
                          placeholder="Enter your password"
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

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("google")}
              data-testid="button-oauth-google"
            >
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthLogin("github")}
              data-testid="button-oauth-github"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 text-center text-sm text-[color:var(--text-2)] space-y-1">
            <p className="eyebrow">// Default admin</p>
            <p className="font-mono text-xs">admin@example.com / admin123</p>
            <p className="text-xs text-[color:var(--warn,#ffb84d)]">
              Change password after first login
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
