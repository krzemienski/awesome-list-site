import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

const SESSION_CHECK_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Does the server see a signed-in visitor on the session cookie? */
async function serverSeesSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/user", {
      credentials: "include",
      cache: "no-store",
      signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
    });
    return res.ok && (await res.json())?.isAuthenticated === true;
  } catch {
    return false;
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
 */
export default function StaleSessionGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || checkedRef.current) return;
    checkedRef.current = true;
    if (!isSignedIn) {
      setReady(true);
      return;
    }
    void (async () => {
      const token = await withTimeout(
        getToken({ skipCache: true }).catch(() => null),
        SESSION_CHECK_TIMEOUT_MS,
      );
      if (token && (await serverSeesSession())) {
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
  }, [isLoaded, isSignedIn, getToken, signOut, queryClient]);

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Checking your sign-in status…
      </p>
    );
  }
  return <>{children}</>;
}
