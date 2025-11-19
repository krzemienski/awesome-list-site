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
  const { data, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/user'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 - user is simply not authenticated
      if (error?.status === 401) return false;
      return failureCount < 3;
    }
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
    logout: logoutMutation.mutate
  };
}