import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jeyldoypdkgsrfdhdcmm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleWxkb3lwZGtnc3JmZGhkY21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTg0NDgsImV4cCI6MjA2MTUzNDQ0OH0.CN3NbhFk3yd_t2SkJHRu4mjDjAd-Xvzgc8oUScDg5kU';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
});
