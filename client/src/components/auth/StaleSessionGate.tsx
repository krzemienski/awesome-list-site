import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthUnavailableCard } from "./AuthUnavailable";

const SESSION_CHECK_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Does the server see a signed-in visitor on the session cookie? null when it
 * could not be asked (offline, timeout, server error) — that is no answer.
 */
async function serverSeesSession(): Promise<boolean | null> {
  try {
    const res = await fetch("/api/auth/user", {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json())?.isAuthenticated === true;
  } catch {
    return null;
  }
}

/**
 * F1283: Clerk's <SignIn>/<SignUp> redirect Home whenever the Clerk client
 * holds a session, but the API authenticates from the __session cookie, and
 * Clerk can hold a session while that cookie stays stale: clerk-js only
 * rewrites the cookie from a focused tab or when its clerk_active_context
 * cookie names the current session, so a leftover context from an ended
 * session (or a failing token refresh) leaves the server seeing an expired
 * token. The API then treats the visitor as signed out while the auth pages
 * bounce them Home, with no way back in short of clearing cookies. On entering
 * an auth page with a Clerk session, refresh the token and ask the server: if
 * it now sees the session, resync the app's signed-out cache and let Clerk
 * redirect; if not, drop the stale client session so the form renders. The
 * check runs once per page entry, so a sign-in completed on the page still
 * takes Clerk's normal redirect.
 *
 * C5-V3-01: a check that cannot reach the network proves nothing about the
 * cookie. Treating it as stale signed a live session out of the client while
 * offline (header flipped to Visitor) — instead, hold the page on an offline
 * card and re-run the check on Retry or when the connection returns.
 */
export default function StaleSessionGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const checkedRef = useRef(false);

  const retryCheck = useCallback(() => {
    setUnreachable(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!isLoaded || checkedRef.current) return;
    checkedRef.current = true;
    if (!isSignedIn) {
      setReady(true);
      return;
    }
    const cannotCheck = () => {
      checkedRef.current = false;
      setUnreachable(true);
    };
    if (navigator.onLine === false) {
      cannotCheck();
      return;
    }
    void (async () => {
      const token = await withTimeout(
        getToken({ skipCache: true }).catch(() => null),
        SESSION_CHECK_TIMEOUT_MS,
      );
      const serverSees = await serverSeesSession();
      if (serverSees === null) {
        cannotCheck();
        return;
      }
      if (token && serverSees) {
        // The session is live after all: the auth page will send the visitor
        // on, so refresh the signed-out views cached while the cookie was stale.
        void queryClient.invalidateQueries();
      } else {
        // The no-op callback keeps the visitor here instead of Clerk's
        // after-sign-out redirect.
        await signOut(() => {}).catch(() => {});
        queryClient.setQueryData(["/api/auth/user"], { user: null, isAuthenticated: false });
      }
      setReady(true);
    })();
  }, [isLoaded, isSignedIn, getToken, signOut, queryClient, attempt]);

  if (unreachable) {
    return navigator.onLine === false ? (
      <AuthUnavailableCard
        title="Can't check your sign-in status — you're offline"
        body="Nothing was signed out. This page continues as soon as you're back online."
        onRetry={retryCheck}
      />
    ) : (
      <AuthUnavailableCard
        title="Can't check your sign-in status"
        body="Nothing was signed out. The server didn't answer — check your connection, then retry."
        onRetry={retryCheck}
      />
    );
  }
  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Checking your sign-in status…
      </p>
    );
  }
  return <>{children}</>;
}
