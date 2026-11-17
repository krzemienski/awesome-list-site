import { HandleSSOCallback } from "@clerk/react";
import { useLocation } from "wouter";
import { navigateAfterAuth } from "@/lib/auth-navigation";

/**
 * The OAuth provider's return page for the app-owned forms. Clerk finishes the
 * sign-in, or hands an unknown account to sign-up, from the client state the
 * redirect left behind.
 */
export default function SsoCallback() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 px-4" data-testid="sso-callback">
      <p className="text-sm text-muted-foreground" role="status">
        Finishing sign-in…
      </p>
      <HandleSSOCallback
        navigateToApp={(args) => navigateAfterAuth(args, setLocation)}
        navigateToSignIn={() => setLocation("/sign-in?form=custom")}
        navigateToSignUp={() => setLocation("/sign-up/continue")}
      />
    </div>
  );
}
