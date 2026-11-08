/**
 * Clerk-backed auth routes. Route-split (backlog X-03) so the Clerk SDK stays
 * out of the anonymous entry bundle; the Clerk widgets render through
 * <ClerkSlot>, i.e. inside the lazily mounted Clerk runtime.
 */
import { useEffect, useLayoutEffect, useState } from "react";
import { SignIn, SignUp } from "@clerk/react";
import { useLocation, useSearch } from "wouter";
import { foldInheritedHashIntoRedirect, sanitizeRedirectParam } from "@/lib/returnUrl";
import { ClerkSlot } from "@/lib/clerk-bridge";
import { clearSignedInClientState, signOutAndVerify } from "@/hooks/useAuth";
import { trackLoggedOut } from "@/lib/analytics";
import SEOHead from "@/components/layout/SEOHead";
import { signInSeoDescription, signUpSeoDescription } from "@shared/seo-templates";
import StaleSessionGate from "@/components/auth/StaleSessionGate";
import { ClerkUiFallback } from "@/components/auth/AuthUnavailable";
import { AdminPasswordSignIn } from "@/components/auth/AdminPasswordSignIn";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { humanizeApiError, OFFLINE_MESSAGE } from "@/lib/apiError";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// A new account lands where Home offers the optional onboarding invitation.
const NEW_MEMBER_LANDING = `${basePath}/?context=account&welcome=1`;

// Clerk's own requests bypass the app API layer, so offline they just hang.
function OfflineNotice() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <Alert live="polite" className="max-w-md" data-testid="auth-offline-notice">
      {OFFLINE_MESSAGE}
    </Alert>
  );
}

export function SignInPage() {
  // A server-guard 302 from /admin#users keeps "#users" on this URL but not in
  // redirect_url; fold it in before Clerk reads the parameter (idempotent).
  // Unsafe redirect_url values are dropped first so Clerk never sees them.
  // Both rewrite history, which wouter broadcasts to every location
  // subscriber, so they run in a layout effect (not during render) and the
  // sign-in form mounts only after they have, still before first paint.
  // The sanitizer runs again on every in-app navigation that changes this URL
  // (e.g. /sign-in → /sign-in?redirect_url=…), because the page stays mounted.
  const [location] = useLocation();
  const search = useSearch();
  const [urlReady, setUrlReady] = useState(false);
  useLayoutEffect(() => {
    sanitizeRedirectParam();
  }, [location, search]);
  useLayoutEffect(() => {
    foldInheritedHashIntoRedirect();
    setUrlReady(true);
  }, []);
  if (!urlReady) return null;
  // /sign-in?admin shows the owner password form instead of Clerk.
  const adminPasswordMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("admin");
  return (
    <div
      className="flex justify-center py-10"
      data-testid="page-sign-in"
    >
      {/* Title mirrors the og-middleware /sign-in template (two-pass parity). */}
      <SEOHead title="Sign In" description={signInSeoDescription} noindex />
      {adminPasswordMode ? (
        <AdminPasswordSignIn />
      ) : (
        // C5-V3-01: never a blank body while Clerk's UI can't load.
        <div className="flex w-full min-w-0 flex-col items-center gap-4">
          <OfflineNotice />
          <ClerkSlot fallback={<ClerkUiFallback flow="sign-in" />}>
            <StaleSessionGate>
              <SignIn
                routing="path"
                path={`${basePath}/sign-in`}
                signUpUrl={`${basePath}/sign-up`}
                signUpFallbackRedirectUrl={NEW_MEMBER_LANDING}
                fallback={<ClerkUiFallback flow="sign-in" />}
              />
            </StaleSessionGate>
          </ClerkSlot>
        </div>
      )}
    </div>
  );
}

export function SignUpPage() {
  // Same URL hygiene as SignInPage: drop unsafe redirect_url values before
  // Clerk reads them, and again whenever the URL changes in-app.
  const [location] = useLocation();
  const search = useSearch();
  const [urlReady, setUrlReady] = useState(false);
  useLayoutEffect(() => {
    sanitizeRedirectParam();
    setUrlReady(true);
  }, [location, search]);
  if (!urlReady) return null;
  return (
    <div
      // F009: the Clerk card's Continue button used to sit under the fixed
      // consent banner. The banner is now an in-flow row of the app shell
      // (index.css `#root`), so plain page padding is all this needs.
      className="flex justify-center py-10"
      data-testid="page-sign-up"
    >
      {/* Title mirrors the og-middleware /sign-up template (two-pass parity). */}
      <SEOHead title="Create an Account" description={signUpSeoDescription} noindex />
      <div className="flex w-full min-w-0 flex-col items-center gap-4">
        <OfflineNotice />
        <ClerkSlot fallback={<ClerkUiFallback flow="sign-up" />}>
          <StaleSessionGate>
            <SignUp
              routing="path"
              path={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
              fallbackRedirectUrl={NEW_MEMBER_LANDING}
              fallback={<ClerkUiFallback flow="sign-up" />}
            />
          </StaleSessionGate>
        </ClerkSlot>
      </div>
    </div>
  );
}

// SPA-side /logout. Both direct and client-side navigation render this route,
// which runs the same sign-out as the account menu (owner password cookie and
// Clerk) and confirms invalidation before redirecting.
export function Logout() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const doSignOut = async () => {
      try {
        await signOutAndVerify();
        // Before the identity reset, so the event stays on this account.
        trackLoggedOut("this_device");
        clearSignedInClientState();
        if (!cancelled) window.location.replace("/");
      } catch (reason) {
        if (!cancelled) {
          setError(
            humanizeApiError(reason, "Sign out failed."),
          );
        }
      }
    };
    void doSignOut();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    // min-h-full, not min-h-screen: this screen renders inside the app shell's
    // <main>, and a row that claims a viewport height of its own pushes the
    // shell's bottom bar row past the fold.
    <div className="min-h-full flex items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-destructive font-medium" role="alert">
              {error}. You are still signed in.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Signing out…</p>
          </>
        )}
      </div>
    </div>
  );
}
