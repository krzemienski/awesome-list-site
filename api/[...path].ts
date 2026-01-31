import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Initialize Neon client
const sql = neon(process.env.DATABASE_URL!);

// Simple in-memory session store for serverless (limited, but works for basic auth)
// In production, use a Redis-based session store
const sessions = new Map<string, { userId: string; email: string; role: string; expires: number }>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getSessionFromCookie(req: VercelRequest): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) return null;
  
  const match = cookies.match(/auth_session=([^;]+)/);
  return match ? match[1] : null;
}

function setSessionCookie(res: VercelResponse, sessionId: string): void {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  res.setHeader('Set-Cookie', `auth_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);
}

function clearSessionCookie(res: VercelResponse): void {
  res.setHeader('Set-Cookie', 'auth_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

// Route handlers
async function handleAuthStatus(req: VercelRequest, res: VercelResponse) {
  const sessionId = getSessionFromCookie(req);
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.json({ authenticated: false, user: null });
  }
  
  const session = sessions.get(sessionId)!;
  
  if (Date.now() > session.expires) {
    sessions.delete(sessionId);
    clearSessionCookie(res);
    return res.json({ authenticated: false, user: null });
  }
  
  // Fetch full user data from database
  const users = await sql`SELECT * FROM users WHERE id = ${session.userId}`;
  const user = users[0];
  
  if (!user) {
    sessions.delete(sessionId);
    clearSessionCookie(res);
    return res.json({ authenticated: false, user: null });
  }
  
  return res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImageUrl: user.profile_image_url,
      role: user.role,
    },
  });
}

async function handleAdminStatus(req: VercelRequest, res: VercelResponse) {
  const sessionId = getSessionFromCookie(req);
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.json({ isAdmin: false });
  }
  
  const session = sessions.get(sessionId)!;
  return res.json({ isAdmin: session.role === 'admin' });
}

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const { email, password } = req.body as { email?: string; password?: string };
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  const users = await sql`SELECT * FROM users WHERE email = ${email}`;
  const user = users[0];
  
  if (!user || !user.password) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  
  // Create session
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    userId: user.id,
    email: user.email,
    role: user.role || 'user',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  setSessionCookie(res, sessionId);
  
  return res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    },
  });
}

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  const sessionId = getSessionFromCookie(req);
  
  if (sessionId) {
    sessions.delete(sessionId);
  }
  
  clearSessionCookie(res);
  return res.json({ message: 'Logged out successfully' });
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  const { email, password, firstName, lastName } = req.body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };
  
  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  
  // Validate password
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  
  // Check if user exists
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }
  
  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUsers = await sql`
    INSERT INTO users (email, password, first_name, last_name, role)
    VALUES (${email}, ${hashedPassword}, ${firstName || null}, ${lastName || null}, 'user')
    RETURNING *
  `;
  const newUser = newUsers[0];
  
  // Create session (auto-login)
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    userId: newUser.id,
    email: newUser.email,
    role: 'user',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  
  setSessionCookie(res, sessionId);
  
  return res.status(201).json({
    message: 'Registration successful',
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
    },
  });
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const path = req.url?.replace(/\?.*$/, '') || '';
  
  try {
    // Auth routes
    if (path === '/api/auth/status' && req.method === 'GET') {
      return handleAuthStatus(req, res);
    }
    if (path === '/api/auth/admin-status' && req.method === 'GET') {
      return handleAdminStatus(req, res);
    }
    if (path === '/api/auth/local/login' && req.method === 'POST') {
      return handleLogin(req, res);
    }
    if (path === '/api/auth/logout' && req.method === 'POST') {
      return handleLogout(req, res);
    }
    if (path === '/api/auth/register' && req.method === 'POST') {
      return handleRegister(req, res);
    }
    
    // Default: return 404 for unhandled API routes
    return res.status(404).json({ message: 'API endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
