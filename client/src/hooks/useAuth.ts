import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session,
        isAdmin: session?.user?.user_metadata?.role === 'admin'
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session,
        isAdmin: session?.user?.user_metadata?.role === 'admin'
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    // Sign out from Supabase (clears session)
    await supabase.auth.signOut();
    
    // Explicitly clear all Supabase auth data from localStorage
    // Fix for BUG_20251201_USER_LOGOUT_TOKEN_NOT_CLEARED
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear session storage as well
    sessionStorage.clear();
    
    // Redirect to homepage
    window.location.href = '/';
  };

  return {
    user: authState.user,
    session: authState.session,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    isAdmin: authState.isAdmin,
    logout,
    error: null  // For compatibility with old useAuth interface
  };
}
