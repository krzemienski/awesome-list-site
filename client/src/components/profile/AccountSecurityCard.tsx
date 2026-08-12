/**
 * Task #307 (Clerk migration): replaces the legacy ChangePasswordForm.
 * Passwords, connected sign-in methods, and active sessions are managed by
 * the auth provider's account portal, opened as a themed in-app modal.
 */
import { useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function AccountSecurityCard() {
  const { openUserProfile } = useClerk();
  return (
    <Card data-testid="card-account-security">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          Password &amp; security
        </CardTitle>
        <CardDescription>
          Change your password, review devices where you're signed in, and
          manage connected sign-in methods in your secure account settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={() => openUserProfile()}
          data-testid="button-open-account-security"
        >
          Manage account security
        </Button>
      </CardContent>
    </Card>
  );
}
