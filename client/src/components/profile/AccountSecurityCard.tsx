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
  const { loaded, clerk, isSignedIn } = useClerkBridge();
  useEffect(() => {
    requestClerk();
  }, []);
  // The owner password session is not a Clerk session: Clerk loads with no
  // user, so its account portal would open nothing.
  const ownerPasswordSession = loaded && isSignedIn === false;
  return (
    <Card data-testid="card-account-security">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          Password &amp; security
        </CardTitle>
        <CardDescription>
          {ownerPasswordSession
            ? "You're signed in with the owner password, so there is no account password, device list or connected sign-in method to manage here. To end owner sessions everywhere, use Sign out all devices at the top of this page. App API keys are managed separately, below."
            : "Change your password, review devices where you're signed in, and manage connected sign-in methods in your secure account settings. App API keys are managed separately, below."}
        </CardDescription>
      </CardHeader>
      {ownerPasswordSession ? null : (
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
      )}
    </Card>
  );
}
