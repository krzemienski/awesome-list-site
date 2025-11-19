import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();
  
  console.log('[AdminGuard] Rendering', { isLoading, user, userRole: user?.role });
  
  // Show loading while checking auth
  if (isLoading) {
    console.log('[AdminGuard] Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // Check if user is admin before mounting any admin components
  const isAdmin = user && user.role === "admin";
  
  console.log('[AdminGuard] isAdmin check:', { user, role: user?.role, isAdmin });
  
  if (!isAdmin) {
    console.log('[AdminGuard] Access denied - returning NotFound');
    return <NotFound />;
  }
  
  console.log('[AdminGuard] Access granted - rendering admin children');
  // Only render children (AdminDashboard) if confirmed admin
  return <>{children}</>;
}