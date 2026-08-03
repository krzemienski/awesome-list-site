import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, ApiError } from '@/lib/queryClient';
import { notifyCrossTabSync } from '@/lib/crossTabSync';
import { safeRemoveItem } from '@/lib/safeStorage';
import { mpIdentify, mpReset } from '@/lib/mixpanel';
import { phIdentify, phReset } from '@/lib/posthog';
import { useToast } from '@/hooks/use-toast';

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
 * Task 169 (cold-load perf): index.html kicks off the /api/auth/user fetch
 * before the JS bundle is parsed (window.__authUserEarlyFetch). Consume it
 * once here; any failure falls through to a normal fetch with the same
 * error semantics as the default query fetcher (ApiError carrying status).
 */
async function fetchAuthUser(): Promise<AuthResponse> {
  let res: Response | undefined;
  if (typeof window !== 'undefined') {
    const early: Promise<Response> | undefined = (window as any).__authUserEarlyFetch;
    if (early) {
      (window as any).__authUserEarlyFetch = undefined;
      try {
        res = await early;
      } catch {
        res = undefined; // network failure on the early attempt — refetch below
      }
    }
  }
  if (!res) {
    res = await fetch('/api/auth/user', { credentials: 'include' });
  }
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new ApiError(res.status, text);
  }
  return await res.json();
}

export function useAuth() {
  const { toast } = useToast();
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
    // NB-028 (run18): an errored auth query used to restart its full retry
    // cycle every time an observer remounted. Router's skeleton gate flips
    // page components in/out of the tree on auth pending<->error transitions,
    // so retryOnMount:true produced an unbounded remount/refetch storm
    // (~26 req/45s) with a permanent skeleton. Failed auth checks now stay
    // failed until the user explicitly retries (refetchAuth) or navigates
    // with a full reload.
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
  }, [authedUser?.id]);

  const requestLogout = async (path: string) => {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        signal: logoutRequestSignal(),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Sign out failed');
      }
      const authCheck = await fetch('/api/auth/user', {
        credentials: 'include',
        cache: 'no-store',
        signal: logoutRequestSignal(),
      });
      const authState = authCheck.ok ? await authCheck.json() : null;
      if (!authCheck.ok || authState?.isAuthenticated !== false) {
        throw new Error('The server could not confirm that your session ended');
      }
      return await response.json();
  };

  const finishLogout = () => {
      // Clear auth cache only after the server confirms invalidation.
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.setQueryData(['/api/auth/user'], { user: null, isAuthenticated: false });
      safeRemoveItem('submit-resource-draft');
      mpReset();
      phReset();
      notifyCrossTabSync();
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
    mutationFn: () => {
      setLogoutError(null);
      return requestLogout('/api/auth/logout');
    },
    onSuccess: finishLogout,
    onError: handleLogoutError,
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => {
      setLogoutError(null);
      return requestLogout('/api/auth/logout-all');
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