import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();
  
  // Show loading while checking auth
  if (isLoading) {
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
  const isAdmin = user && (user as any).role === "admin";
  
  if (!isAdmin) {
    return <NotFound />;
  }
  
  // Only render children (AdminDashboard) if confirmed admin
  return <>{children}</>;
}