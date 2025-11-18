import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface AdminStats {
  users: number;
  resources: number;
  journeys: number;
  pendingApprovals: number;
}

export function useAdmin() {
  const { user } = useAuth();
  const isAdmin = user && (user as any).role === "admin";
  
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin, // Only fetch if user is admin
    staleTime: 30000, // 30 seconds
  });

  return {
    stats: isAdmin ? stats : undefined,
    isLoading: isAdmin ? isLoading : false,
  };
}