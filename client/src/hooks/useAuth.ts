import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  provider?: string;
  role?: string;
  createdAt?: string;
}

interface AuthResponse {
  user: User | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const { data, isLoading, error, refetch } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/user'],
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

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      return response.json();
    },
    onSuccess: () => {
      // Clear auth cache and redirect to home
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.setQueryData(['/api/auth/user'], { user: null, isAuthenticated: false });
      window.location.href = '/';
    }
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: data?.isAuthenticated ?? false,
    error,
    refetchAuth: refetch,
    logout: logoutMutation.mutate
  };
}