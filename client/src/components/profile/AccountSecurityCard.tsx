/**
 * Task #307 (Clerk migration): replaces the legacy ChangePasswordForm.
 * Passwords, connected sign-in methods, and active sessions are managed by
 * the auth provider's account portal, opened as a themed in-app modal.
 */
import { useEffect } from "react";
import { requestClerk, useClerkBridge } from "@/lib/clerk-bridge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { trackAccountSecurityOpened } from "@/lib/analytics";

export default function AccountSecurityCard() {
  // Signed-in pages load Clerk anyway; request it here too so the portal
  // button is ready, and keep it disabled until clerk-js has loaded.
  const { loaded, clerk } = useClerkBridge();
  useEffect(() => {
    requestClerk();
  }, []);
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
          App API keys are managed separately, below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          disabled={!loaded || !clerk}
          onClick={() => {
            if (!clerk) return;
            trackAccountSecurityOpened("manage_button");
            clerk.openUserProfile();
          }}
          data-testid="button-open-account-security"
        >
          Manage account security
        </Button>
      </CardContent>
    </Card>
  );
}
