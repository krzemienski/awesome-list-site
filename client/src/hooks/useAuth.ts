import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { whenClerkLoaded } from '@/lib/clerk-bridge';
import { queryClient, ApiError, renewSessionToken } from '@/lib/queryClient';
import { notifyCrossTabSync } from '@/lib/crossTabSync';
import { safeRemoveItem } from '@/lib/safeStorage';
import { initMixpanel, mpIdentify, mpReset, optOutMixpanel } from '@/lib/mixpanel';
import { initPosthog, phIdentify, phReset, optOutPosthog } from '@/lib/posthog';
import { initAmplitude, optOutAmplitude } from '@/lib/amplitude';
import { initGA, optOutGA, trackLoggedOut, trackPageView } from '@/lib/analytics';
import { setAdminAnalyticsSession } from '@/lib/analytics-suppression';
import { useToast } from '@/hooks/use-toast';

/**
 * Per-device state that belongs to the person who just signed out: the
 * private submit draft, analytics identities, and other tabs' auth view.
 * Every sign-out path (account menu and the /logout route) runs this.
 */
export function clearSignedInClientState(): void {
  safeRemoveItem('submit-resource-draft');
  mpReset();
  phReset();
  // Every sign-out path ends with a full reload, so a visitor's analytics
  // start again on the next page.
  setAdminAnalyticsSession(false);
  notifyCrossTabSync();
}

// Whether this tab has stopped its vendor SDKs for an admin session. The
// localStorage marker is shared by every tab, so it cannot tell a tab that
// started its SDKs as a visitor before another tab set it.
let vendorsStoppedForAdmin = false;

/**
 * Admin sessions send nothing to any analytics tool. The marker makes the
 * next load quiet before auth resolves. Each tab that learns the user is an
 * admin stops the SDKs it already started under a visitor's grant; when a
 * non-admin account replaces an admin marker, the SDKs start again (each
 * init still checks consent and QA paths).
 */
function syncAdminAnalytics(role: string | undefined): boolean {
  const isAdmin = role === 'admin';
  const markerChanged = setAdminAnalyticsSession(isAdmin);
  if (isAdmin && !vendorsStoppedForAdmin) {
    vendorsStoppedForAdmin = true;
    optOutGA();
    optOutMixpanel();
    optOutPosthog();
    optOutAmplitude();
  } else if (!isAdmin && (markerChanged || vendorsStoppedForAdmin)) {
    vendorsStoppedForAdmin = false;
    initGA();
    initMixpanel();
    initPosthog();
    initAmplitude();
    // This page's view was dropped while the marker suppressed it.
    trackPageView(window.location.href);
  }
  return isAdmin;
}

interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  provider?: string;
  role?: string;
  createdAt?: string;
  // Run22 BUG-020: pending private account-deletion request (null = none).
  deletionRequestedAt?: string | null;
}

interface AuthResponse {
  user: User | null;
  isAuthenticated: boolean;
}

const LOGOUT_REQUEST_TIMEOUT_MS = 5_000;

function logoutRequestSignal(): AbortSignal {
  return AbortSignal.timeout(LOGOUT_REQUEST_TIMEOUT_MS);
}

/**
 * End both kinds of session, then confirm the server no longer sees one.
 * Every sign-out path (account menu and the /logout route) runs this.
 */
export async function signOutAndVerify(): Promise<void> {
  // Clear the owner password cookie too (no-op for Clerk-only sessions),
  // or the server would still see the admin after Clerk signs out.
  await fetch('/api/auth/admin-logout', {
    method: 'POST',
    credentials: 'include',
    signal: logoutRequestSignal(),
  });
  // Clerk loads on demand (backlog X-03); waiting for it to load matters on a
  // direct /logout load, where signOut() would otherwise only queue
  // (C3-V3-02). The bridged signOut skips Clerk's after-sign-out navigation;
  // callers do the full reload once the server confirms.
  const clerk = await whenClerkLoaded();
  await clerk.signOut();
  const authCheck = await fetch('/api/auth/user', {
    credentials: 'include',
    cache: 'no-store',
    signal: logoutRequestSignal(),
  });
  const authState = authCheck.ok ? await authCheck.json() : null;
  if (!authCheck.ok || authState?.isAuthenticated !== false) {
    throw new Error('The server could not confirm that your session ended');
  }
}

/**
 * Task #307 (Clerk migration): sessions are Clerk cookies now, but the app's
 * identity endpoint stays /api/auth/user — it overlays app-specific columns
 * (role, deletionRequestedAt, joined display name) that Clerk doesn't own.
 * The hook's return surface is unchanged; only the sign-out path switched
 * from POST /api/auth/logout to Clerk's signOut().
 */
async function requestAuthUser(): Promise<AuthResponse> {
  const res = await fetch('/api/auth/user', { credentials: 'include' });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new ApiError(res.status, text);
  }
  return await res.json();
}

// C3-V5A-07 (cycle-4 reverify): the server answers an expired __session cookie with 200
// {isAuthenticated:false}, not a 401. After a drop longer than staleTime this
// refetch ran before Clerk refreshed the cookie and signed a live admin out.
// When Clerk still holds a session, refresh the token and ask once more.
async function fetchAuthUser(): Promise<AuthResponse> {
  const auth = await requestAuthUser();
  if (auth.isAuthenticated || !(await renewSessionToken())) return auth;
  return requestAuthUser();
}

export function useAuth() {
  const { toast } = useToast();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/user'],
    queryFn: fetchAuthUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry on 401 - user is simply not authenticated
      if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 401) return false;
      return failureCount < 2;
    },
    // NB-028 (run18): failed auth checks stay failed until the user explicitly
    // retries (refetchAuth) or navigates with a full reload — retryOnMount
    // used to produce a remount/refetch storm behind a permanent skeleton.
    retryOnMount: false,
  });

  // Task #232: Mixpanel identity — identify on login AND session restore
  // (any render where an authed user is present). mpIdentify de-dupes by user
  // id internally, so this effect firing across many useAuth() consumers is
  // harmless. Reset lives in the logout mutation below.
  const authedUser = data?.user ?? null;
  useEffect(() => {
    if (authedUser?.id && !syncAdminAnalytics(authedUser.role)) {
      const identity = {
        id: authedUser.id,
        name: authedUser.name,
        email: authedUser.email,
        role: authedUser.role,
        createdAt: authedUser.createdAt,
      };
      mpIdentify(identity);
      phIdentify(identity);
    }
    // Identify once per signed-in user id (session start/restore), not on
    // every profile-field refetch. Admins are never identified.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedUser?.id]);

  const finishLogout = (scope: 'this_device' | 'all_devices') => {
      // Before clearSignedInClientState resets the analytics identities, so
      // the event is attributed to the account that signed out.
      trackLoggedOut(scope);
      // Clear auth cache only after the server confirms invalidation.
      void queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.setQueryData(['/api/auth/user'], { user: null, isAuthenticated: false });
      clearSignedInClientState();
      window.location.href = '/';
  };

  const handleLogoutError = (error: Error) => {
    const message = `${error.message}. You are still signed in; please try again.`;
    setLogoutError(message);
    toast({
      title: 'Sign out failed',
      description: message,
      variant: 'destructive',
      duration: Infinity,
    });
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      setLogoutError(null);
      await signOutAndVerify();
    },
    onSuccess: () => finishLogout('this_device'),
    onError: handleLogoutError,
  });

  // "Sign out all devices": revoke every Clerk session server-side, then end
  // the local one. The server call must come first — after revocation the
  // local session is already dead, signOut() just clears the client state.
  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      setLogoutError(null);
      const response = await fetch('/api/auth/logout-all', {
        method: 'POST',
        credentials: 'include',
        signal: logoutRequestSignal(),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Sign out failed');
      }
      await signOutAndVerify();
    },
    onSuccess: () => finishLogout('all_devices'),
    onError: handleLogoutError,
  });

  return {
    user: data?.user ?? null,
    isLoading,
    // True while a "not signed in" answer could still turn into "signed in":
    // the first check is in flight, or an anonymous answer is being re-asked
    // (Clerk restoring a session invalidates the cache after the first load).
    // Click-time auth gates must wait this out instead of treating the
    // provisional `isAuthenticated: false` as a signed-out visitor.
    isAuthPending: isLoading || (isFetching && !data?.isAuthenticated),
    isAuthenticated: data?.isAuthenticated ?? false,
    error,
    refetchAuth: refetch,
    logout: logoutMutation.mutate,
    logoutAll: logoutAllMutation.mutate,
    logoutError,
    isLoggingOut: logoutMutation.isPending || logoutAllMutation.isPending,
  };
}
