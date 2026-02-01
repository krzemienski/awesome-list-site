import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { setSession, generateSessionId } from '@/lib/session-store';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json();
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Please provide a valid email address' }, { status: 400 });
    }
    
    // Validate password
    if (!password || password.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });
    }
    
    // Check if user exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json({ message: 'An account with this email already exists' }, { status: 409 });
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
    setSession(sessionId, {
      userId: newUser.id,
      email: newUser.email,
      role: 'user',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    
    const response = NextResponse.json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
      },
    }, { status: 201 });
    
    response.cookies.set('auth_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Registration failed' }, { status: 500 });
  }
}
