import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useClerk } from '@clerk/react';
import { queryClient, ApiError, renewSessionToken } from '@/lib/queryClient';
import { notifyCrossTabSync } from '@/lib/crossTabSync';
import { safeRemoveItem } from '@/lib/safeStorage';
import { mpIdentify, mpReset } from '@/lib/mixpanel';
import { phIdentify, phReset } from '@/lib/posthog';
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
  notifyCrossTabSync();
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
  const { signOut } = useClerk();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery<AuthResponse>({
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
    if (authedUser?.id) {
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
    // every profile-field refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedUser?.id]);

  /** Sign out via Clerk, then confirm the server no longer sees a session. */
  const clerkSignOutAndVerify = async () => {
    // Clear the owner password cookie too (no-op for Clerk-only sessions),
    // or the server would still see the admin after Clerk signs out.
    await fetch('/api/auth/admin-logout', {
      method: 'POST',
      credentials: 'include',
      signal: logoutRequestSignal(),
    });
    // The no-op callback stops Clerk routing to its after-sign-out URL;
    // finishLogout does the full reload once the server confirms (C3-V3-02).
    await signOut(() => {});
    const authCheck = await fetch('/api/auth/user', {
      credentials: 'include',
      cache: 'no-store',
      signal: logoutRequestSignal(),
    });
    const authState = authCheck.ok ? await authCheck.json() : null;
    if (!authCheck.ok || authState?.isAuthenticated !== false) {
      throw new Error('The server could not confirm that your session ended');
    }
  };

  const finishLogout = () => {
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
      await clerkSignOutAndVerify();
    },
    onSuccess: finishLogout,
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
      await clerkSignOutAndVerify();
    },
    onSuccess: finishLogout,
    onError: handleLogoutError,
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: data?.isAuthenticated ?? false,
    error,
    refetchAuth: refetch,
    logout: logoutMutation.mutate,
    logoutAll: logoutAllMutation.mutate,
    logoutError,
    isLoggingOut: logoutMutation.isPending || logoutAllMutation.isPending,
  };
}
