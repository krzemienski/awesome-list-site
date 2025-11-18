import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiRequest } from "@/lib/queryClient";

interface AdminStats {
  users: number;
  resources: number;
  journeys: number;
  pendingApprovals: number;
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
    retry: false, // Don't retry on 403
  });

  return {
    stats: isAdmin && !error ? stats : undefined,
    isLoading: isAdmin ? isLoading : false,
    error: isAdmin ? error : undefined,
  };
}