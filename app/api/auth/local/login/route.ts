import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { setSession, generateSessionId } from '@/lib/session-store';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }
    
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = users[0];
    
    if (!user || !user.password) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }
    
    // Create session
    const sessionId = generateSessionId();
    setSession(sessionId, {
      userId: user.id,
      email: user.email,
      role: user.role || 'user',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
    
    response.cookies.set('auth_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}
