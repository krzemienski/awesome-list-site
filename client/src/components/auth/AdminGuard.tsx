import { useAuth } from "@/hooks/useAuth";
import { Link as WLink } from "wouter";
import { Shield } from "lucide-react";

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // Check if user is admin before mounting any admin components
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display font-medium tracking-tight text-2xl sm:text-3xl text-[var(--text)] mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[var(--accent)]" />
          Admin Dashboard
        </h1>
        <div className="alert warn border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4 rounded-lg" role="alert">
          <p className="text-sm text-[var(--text)] mb-3">
            You must be signed in as an administrator to view this page.
          </p>
          <WLink href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline" data-testid="link-admin-login">
            Sign in to continue →
          </WLink>
        </div>
      </div>
    );
  }
  
  // Only render children (AdminDashboard) if confirmed admin
  return <>{children}</>;
}