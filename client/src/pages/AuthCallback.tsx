import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Handle OAuth callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Successful authentication - redirect to home
        setLocation('/');
      } else {
        // No session - redirect to login
        setLocation('/login');
      }
    });
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg">Completing authentication...</p>
        <p className="text-sm text-muted-foreground mt-2">Please wait</p>
      </div>
    </div>
  );
}
