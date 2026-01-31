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

// Awesome List data handlers
async function handleGetAwesomeList(req: VercelRequest, res: VercelResponse) {
  // Fetch all categories with their subcategories, sub-subcategories, and resources
  const categories = await sql`SELECT * FROM categories ORDER BY name`;
  const subcategories = await sql`SELECT * FROM subcategories ORDER BY name`;
  const subSubcategories = await sql`SELECT * FROM sub_subcategories ORDER BY name`;
  const resources = await sql`SELECT * FROM resources ORDER BY name`;
  
  // Build nested structure
  const result = categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    subcategories: subcategories
      .filter((sub: any) => sub.category_id === cat.id)
      .map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        categoryId: sub.category_id,
        subSubcategories: subSubcategories
          .filter((subsub: any) => subsub.subcategory_id === sub.id)
          .map((subsub: any) => ({
            id: subsub.id,
            name: subsub.name,
            slug: subsub.slug,
            subcategoryId: subsub.subcategory_id,
            resources: resources
              .filter((r: any) => r.sub_subcategory_id === subsub.id)
              .map((r: any) => ({
                id: r.id,
                name: r.name,
                url: r.url,
                description: r.description,
                githubStars: r.github_stars,
                lastCommit: r.last_commit,
                language: r.language,
                license: r.license,
                isAwesomeList: r.is_awesome_list,
                awesomeListCount: r.awesome_list_count,
              })),
          })),
        resources: resources
          .filter((r: any) => r.subcategory_id === sub.id && !r.sub_subcategory_id)
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            url: r.url,
            description: r.description,
            githubStars: r.github_stars,
            lastCommit: r.last_commit,
            language: r.language,
            license: r.license,
            isAwesomeList: r.is_awesome_list,
            awesomeListCount: r.awesome_list_count,
          })),
      })),
    resources: resources
      .filter((r: any) => r.category_id === cat.id && !r.subcategory_id)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        url: r.url,
        description: r.description,
        githubStars: r.github_stars,
        lastCommit: r.last_commit,
        language: r.language,
        license: r.license,
        isAwesomeList: r.is_awesome_list,
        awesomeListCount: r.awesome_list_count,
      })),
  }));
  
  return res.json({
    categories: result,
    totalResources: resources.length,
    lastUpdated: new Date().toISOString(),
  });
}

async function handleGetCategories(req: VercelRequest, res: VercelResponse) {
  const categories = await sql`SELECT * FROM categories ORDER BY name`;
  return res.json(categories.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  })));
}

async function handleGetResources(req: VercelRequest, res: VercelResponse) {
  const resources = await sql`SELECT * FROM resources ORDER BY name LIMIT 100`;
  return res.json(resources.map((r: any) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    description: r.description,
    categoryId: r.category_id,
    subcategoryId: r.subcategory_id,
    subSubcategoryId: r.sub_subcategory_id,
    githubStars: r.github_stars,
    lastCommit: r.last_commit,
    language: r.language,
    license: r.license,
    isAwesomeList: r.is_awesome_list,
    awesomeListCount: r.awesome_list_count,
  })));
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
    
    // Data routes
    if (path === '/api/awesome-list' && req.method === 'GET') {
      return handleGetAwesomeList(req, res);
    }
    if (path === '/api/categories' && req.method === 'GET') {
      return handleGetCategories(req, res);
    }
    if (path === '/api/resources' && req.method === 'GET') {
      return handleGetResources(req, res);
    }
    
    // Default: return 404 for unhandled API routes
    return res.status(404).json({ message: 'API endpoint not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
