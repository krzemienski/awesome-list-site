import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables! Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY');
}

// Service role client (for admin operations, bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Anon client (for public operations, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Middleware: Extract user from Authorization header JWT token
 * Adds req.user with { id, email, role, metadata } if valid token
 */
export async function extractUser(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT token and get user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      req.user = null;
    } else {
      // Extract user info and role from metadata
      req.user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'user',
        metadata: user.user_metadata
      };
    }
  } catch (error) {
    console.error('Auth token verification error:', error);
    req.user = null;
  }

  next();
}

/**
 * Middleware: Require authentication
 * Returns 401 if user not authenticated
 */
export const isAuthenticated: RequestHandler = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

/**
 * Middleware: Require admin role
 * Returns 403 if user is not admin
 */
export const isAdmin: RequestHandler = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};
