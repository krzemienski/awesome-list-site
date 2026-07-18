import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiRequest } from "@/lib/queryClient";

interface AdminStats {
  users: number;
  resources: number;
  journeys: number;
  pendingApprovals: number;
  totalPublic?: number;
  totalPending?: number;
  totalDeleted?: number;
}

export function useAdmin() {
  const { user } = useAuth();
  const isAdmin = Boolean(user && (user as any).role === "admin");
  
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      // Use apiRequest to ensure credentials are included
      const response = await apiRequest('/api/admin/stats');
      return response;
    },
    enabled: isAdmin, // Only fetch if user is admin
    staleTime: 30000, // 30 seconds
    // BUG-047 (run19): the pending-approvals badge went stale until a manual
    // reload — new submissions from other sessions never appeared. Poll on an
    // interval and refetch on window focus so the count tracks reality;
    // mutations still invalidate ['/api/admin/stats'] for instant updates.
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    retry: false, // Don't retry on 403
  });

  return {
    stats: isAdmin && !error ? stats : undefined,
    isLoading: isAdmin ? isLoading : false,
    error: isAdmin ? error : undefined,
  };
}