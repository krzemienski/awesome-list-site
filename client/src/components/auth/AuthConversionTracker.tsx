import { useEffect } from "react";
import { useClerk } from "@clerk/react";
import type { ClientResource } from "@clerk/react/types";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { trackLogin, trackSignUp } from "@/lib/analytics";

// Task #393: the GA4 `login` / `sign_up` conversion senders lost their call
// sites in the Clerk migration (task #307) — the app-owned auth forms that used
// to call them were replaced by Clerk's prebuilt <SignIn>/<SignUp>, which own
// the flow internals. This component is their real call site.
//
// Why a Clerk resource listener and not `useAuth().isAuthenticated`:
// "authenticated" is true on every page load with a live cookie, so firing on
// it would count one conversion per visit, per tab, forever. A conversion is
// the *completion of an auth attempt*, which is a transition, not a state.
//
// Clerk does not hand us that transition directly: by the time `session` is
// populated it has already cleared `client.signIn` / `client.signUp`, so the
// completed attempt and the session it created are never visible in the same
// update. What the listener does see is the sequence — an attempt goes past
// with a live `status`, and a session appears a few updates later. So the
// attempt is remembered as it passes and redeemed when the session shows up.
//
// That sequence is exactly what a session restore lacks: reloading a page,
// restoring a session and refreshing a token all publish a session with no
// attempt before it, so nothing fires. The session id we last reported is
// persisted as a second, idempotent guard — Clerk emits several updates per
// completion, invokes each new listener immediately with current state, and
// shares localStorage across tabs.
//
// No PII: only the verification STRATEGY is read. `signIn.identifier` and
// `signUp.emailAddress` hold the visitor's email and are never touched.

const REPORTED_SESSION_KEY = "av_auth_conversion_session";

type PendingAttempt = { kind: "sign-up" | "sign-in"; method?: string };

/**
 * Clerk verification strategy → GA4 `method`. OAuth strategies arrive as
 * `oauth_google` / `oauth_custom_acme`; report the provider alone so the GA4
 * dimension reads "google" next to "password".
 */
function methodFromStrategy(strategy: string | null | undefined): string | undefined {
  if (!strategy) return undefined;
  const oauth = /^oauth(?:_custom)?_(.+)$/.exec(strategy);
  return oauth ? oauth[1] : strategy;
}

/**
 * The strategy an in-flight attempt is using, if it has committed to one yet.
 * Attempts are observed mid-flight, so this is often still empty — it is a
 * fallback for `client.lastAuthenticationStrategy`, which Clerk sets once the
 * attempt succeeds.
 */
function attemptStrategy(client: ClientResource | null | undefined, kind: PendingAttempt["kind"]): string | undefined {
  if (kind === "sign-up") {
    const signUp = client?.signUp;
    return (
      methodFromStrategy(signUp?.verifications?.externalAccount?.strategy) ??
      methodFromStrategy(signUp?.verifications?.emailAddress?.strategy)
    );
  }
  return methodFromStrategy(client?.signIn?.firstFactorVerification?.strategy);
}

export default function AuthConversionTracker() {
  const { addListener } = useClerk();

  useEffect(() => {
    let pending: PendingAttempt | null = null;

    return addListener(({ client, session }: { client: ClientResource; session?: unknown }) => {
      // Clerk runs its listeners inline while it propagates auth state, so an
      // exception here would escape into the sign-in itself. Measurement must
      // never be able to break the flow it measures.
      try {
        // An attempt is in flight. Check sign-up first: an OAuth "sign in" with
        // no account is transferred into a sign-up, and that is a registration.
        const kind = client?.signUp?.status ? "sign-up" : client?.signIn?.status ? "sign-in" : null;
        if (kind) {
          // Keep the strategy once it appears — a later update in the same
          // attempt may no longer carry it.
          const method = attemptStrategy(client, kind) ?? (pending?.kind === kind ? pending.method : undefined);
          pending = { kind, method };
        }

        const sessionId = (session as { id?: string } | null | undefined)?.id;
        // No session yet, or a session with no attempt behind it (a restore).
        if (!sessionId || !pending) return;

        const attempt = pending;
        pending = null;
        if (safeGetItem(REPORTED_SESSION_KEY) === sessionId) return;
        safeSetItem(REPORTED_SESSION_KEY, sessionId);

        const method = methodFromStrategy(client?.lastAuthenticationStrategy) ?? attempt.method ?? "unknown";
        if (attempt.kind === "sign-up") trackSignUp(method);
        else trackLogin(method);
      } catch {
        /* analytics is never worth a failed sign-in */
      }
    });
  }, [addListener]);

  return null;
}
