import { useEffect } from "react";
import { useClerk } from "@clerk/react";
import type { ClientResource, UserResource } from "@clerk/react/types";
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
// The transition this listens for is "signed out → session". Every completed
// attempt in this page produces it; a restore never does, because Clerk hands
// the listener its loaded state with the restored session already present.
// Multi-step attempts (an emailed code, a new-device check) also pass by with a
// live `status`, which is kept as a hint. One-step attempts (email + password,
// no extra check) never surface one: on awesome.video both a password sign-in
// and a sign-up arrived as a bare session with `signIn`/`signUp` already null.
// So sign-up vs sign-in is read off the account itself — a sign-up's session is
// created in the same instant as its user. The session id we last reported is
// persisted as an idempotent guard: Clerk emits several updates per completion
// and shares localStorage across tabs.
//
// No PII: only strategy/provider names and timestamps are read.
// `signIn.identifier` and `signUp.emailAddress` hold the visitor's email and
// are never touched.

const REPORTED_SESSION_KEY = "av_auth_conversion_session";
// The account whose sign-up this browser already reported: any later session
// for it (sign out, sign straight back in) is a sign-in, however young the
// account still is.
const SIGNED_UP_USER_KEY = "av_auth_signed_up_user";

// A sign-up's user and session are created in the same request (observed:
// 16 ms apart; email verification happens before either exists). A sign-in
// needs a fresh form submission, so it cannot land inside this window.
const SIGN_UP_SESSION_WINDOW_MS = 10_000;

type AttemptKind = "sign-up" | "sign-in";
interface PendingAttempt {
  kind: AttemptKind;
  method?: string;
}

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

/** The strategy an in-flight attempt is using, if it has committed to one yet. */
function attemptStrategy(client: ClientResource | null | undefined, kind: AttemptKind): string | undefined {
  if (kind === "sign-up") {
    const signUp = client?.signUp;
    return (
      methodFromStrategy(signUp?.verifications?.externalAccount?.strategy) ??
      methodFromStrategy(signUp?.verifications?.emailAddress?.strategy)
    );
  }
  return methodFromStrategy(client?.signIn?.firstFactorVerification?.strategy);
}

/** How a brand-new account was created: its OAuth provider, else its password. */
function signUpMethodFromUser(user: UserResource | null | undefined): string | undefined {
  const provider = user?.externalAccounts?.[0]?.provider;
  if (provider) return methodFromStrategy(provider);
  return user?.passwordEnabled ? "password" : undefined;
}

function isNewAccount(user: UserResource | null | undefined, sessionCreatedAt: Date | undefined): boolean {
  const userCreatedAt = user?.createdAt?.getTime();
  const sessionAt = sessionCreatedAt?.getTime();
  if (userCreatedAt === undefined || sessionAt === undefined) return false;
  return Math.abs(sessionAt - userCreatedAt) <= SIGN_UP_SESSION_WINDOW_MS;
}

export default function AuthConversionTracker() {
  const clerk = useClerk();

  useEffect(() => {
    let pending: PendingAttempt | null = null;
    let sawSignedOut = false;

    return clerk.addListener(({ client, session, user }) => {
      // Clerk runs its listeners inline while it propagates auth state, so an
      // exception here would escape into the sign-in itself. Measurement must
      // never be able to break the flow it measures.
      try {
        // Check sign-up first: an OAuth "sign in" with no account is
        // transferred into a sign-up, and that is a registration.
        const kind = client?.signUp?.status ? "sign-up" : client?.signIn?.status ? "sign-in" : null;
        if (kind) {
          // Keep the strategy once it appears — a later update in the same
          // attempt may no longer carry it.
          const method = attemptStrategy(client, kind) ?? (pending?.kind === kind ? pending.method : undefined);
          pending = { kind, method };
        }

        if (!session) {
          if (clerk.loaded) sawSignedOut = true;
          return;
        }
        // A session with neither a signed-out moment nor an attempt before it
        // is a restore or a token refresh.
        if (!sawSignedOut && !pending) return;

        const attempt = pending;
        pending = null;
        sawSignedOut = false;
        if (safeGetItem(REPORTED_SESSION_KEY) === session.id) return;
        safeSetItem(REPORTED_SESSION_KEY, session.id);

        const alreadySignedUp = !!user && safeGetItem(SIGNED_UP_USER_KEY) === user.id;
        if (!alreadySignedUp && (attempt?.kind === "sign-up" || isNewAccount(user, session.createdAt))) {
          if (user) safeSetItem(SIGNED_UP_USER_KEY, user.id);
          trackSignUp(signUpMethodFromUser(user) ?? attempt?.method ?? "unknown");
        } else {
          trackLogin(methodFromStrategy(client?.lastAuthenticationStrategy) ?? attempt?.method ?? "unknown");
        }
      } catch {
        /* analytics is never worth a failed sign-in */
      }
    });
  }, [clerk]);

  return null;
}
