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
    // BUG-008 (run19): distinguish "no session" from "session without the
    // admin role" — a signed-in non-admin used to be told to "sign in", a
    // contradictory demand while their avatar was visible in the header.
    const signedInNonAdmin = Boolean(user);
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="display-h text-2xl sm:text-3xl text-[var(--text)] mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[var(--accent)]" />
          Admin Dashboard
        </h1>
        <div className="alert warn border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4 rounded-lg" role="alert">
          {signedInNonAdmin ? (
            <>
              <p className="text-sm text-[var(--text)] mb-3" data-testid="text-admin-forbidden">
                You don't have permission to view this page. It's restricted to
                administrators — your account is signed in, but doesn't have the
                admin role.
              </p>
              <WLink href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline" data-testid="link-admin-home">
                Back to home →
              </WLink>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--text)] mb-3">
                You must be signed in as an administrator to view this page.
              </p>
              <WLink href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline" data-testid="link-admin-login">
                Sign in to continue →
              </WLink>
            </>
          )}
        </div>
      </div>
    );
  }
  
  // Only render children (AdminDashboard) if confirmed admin
  return <>{children}</>;
}