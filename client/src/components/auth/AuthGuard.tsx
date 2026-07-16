import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // If not loading and not authenticated, redirect and show message.
    // BUG-008 (run14): send the user to /login carrying the originally
    // requested page in ?next= so a successful sign-in returns them here
    // (Login already honors a validated ?next= param). wouter's useLocation()
    // is path-only, so read pathname+search off window.location directly.
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access this page",
        variant: "destructive"
      });
      const next = window.location.pathname + window.location.search;
      setLocation(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isLoading, isAuthenticated, setLocation, toast]);
  
  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Only render children if authenticated
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  
  return <>{children}</>;
}
