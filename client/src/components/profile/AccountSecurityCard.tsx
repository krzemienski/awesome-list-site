/**
 * Task #307 (Clerk migration): replaces the legacy ChangePasswordForm.
 * Passwords, connected sign-in methods, and active sessions are managed by
 * the auth provider's account portal, opened as a themed in-app modal.
 */
import { useEffect, type ReactNode } from "react";
import { requestClerk, useClerkBridge } from "@/lib/clerk-bridge";
import { useAuth } from "@/hooks/useAuth";
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

function SecurityCardShell({ description, children }: { description: string; children?: ReactNode }) {
  return (
    <Card data-testid="card-account-security">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          Password &amp; security
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children}
    </Card>
  );
}

function ClerkSecurityCard() {
  // Signed-in pages load Clerk anyway; request it here too so the portal
  // button is ready, and keep it disabled until clerk-js has loaded.
  const { loaded, clerk } = useClerkBridge();
  useEffect(() => {
    requestClerk();
  }, []);
  return (
    <SecurityCardShell description="Change your password, review devices where you're signed in, and manage connected sign-in methods in your secure account settings. App API keys are managed separately, below.">
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
    </SecurityCardShell>
  );
}

// The server reports how this session signed in. Only a Clerk session has an
// account portal; the owner password session gets an explanation instead.
export default function AccountSecurityCard() {
  const { user } = useAuth();
  switch (user?.authMethod) {
    case "clerk":
      return <ClerkSecurityCard />;
    case "owner_password":
      return (
        <SecurityCardShell description="You're signed in with the owner password, so there is no account password, device list or connected sign-in method to manage here. To end owner sessions everywhere, use Sign out all devices at the top of this page. App API keys are managed separately, below." />
      );
    default:
      return null;
  }
}
