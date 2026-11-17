import { HandleSSOCallback, useSignUp } from "@clerk/react";
import { useLocation } from "wouter";
import { NEW_MEMBER_LANDING, navigateAfterAuth, withReturnPath } from "@/lib/auth-navigation";

/**
 * The OAuth provider's return page for the app-owned forms. Clerk finishes the
 * sign-in, or hands an unknown account to sign-up, from the client state the
 * redirect left behind.
 */
export default function SsoCallback() {
  const [, setLocation] = useLocation();
  const { signUp } = useSignUp();
  // A transfer that created the account leaves a complete sign-up behind; that
  // visitor lands where the prebuilt flow sends new members. A ?redirect_url=
  // still wins over the fallback.
  const fallback = () => (signUp.status === "complete" ? NEW_MEMBER_LANDING : "/");
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 px-4" data-testid="sso-callback">
      <p className="text-sm text-muted-foreground" role="status">
        Finishing sign-in…
      </p>
      <HandleSSOCallback
        navigateToApp={(args) => navigateAfterAuth(args, setLocation, fallback())}
        navigateToSignIn={() => setLocation(withReturnPath("/sign-in", "form=custom"))}
        navigateToSignUp={() => setLocation(withReturnPath("/sign-up/continue"))}
      />
    </div>
  );
}
