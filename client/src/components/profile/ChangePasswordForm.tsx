import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { visibleLength } from "@shared/validation";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    // R4-014 (run21): require 8 VISIBLE characters — zero-width chars and
    // whitespace don't count (mirrors the shared server rule).
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .refine((v) => visibleLength(v) >= 8, "Password must contain at least 8 visible characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  // Run15 BUG-029: block no-op rotation client-side too (server also 400s) —
  // "changing" to the same password would still invalidate other sessions.
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ChangePasswordData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Password changed",
          // NB-040 (run18): describe the real effect (you stay signed in here,
          // other devices are signed out) without implying a session-list/revoke
          // feature that this page doesn't offer.
          description: "Your password was updated. You'll stay signed in on this device.",
        });
        form.reset();
      } else {
        const error = await response.json().catch(() => ({ message: "Could not change password" }));
        toast({
          title: "Change failed",
          description: error.message || "Could not change your password.",
          variant: "destructive",
        });
      }
    } catch (error) {
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
    <Card data-testid="change-password-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-4 w-4 text-[var(--accent)]" />
          Change Password
        </CardTitle>
        <CardDescription>
          {/* NB-040 (run18): matches the real effect and the UI on this page —
              this is the only account-security control here; there is no separate
              session list to view or revoke. */}
          Change your account password. For your security, you'll stay signed in on
          this device and be signed out on your other devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="currentPassword">Current password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      data-testid="input-current-password"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="newPassword">New password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      data-testid="input-new-password"
                      disabled={isLoading}
                    />
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
                  <FormLabel htmlFor="confirmPassword">Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      data-testid="input-confirm-password"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} data-testid="button-change-password">
              {isLoading ? "Changing..." : "Change password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
