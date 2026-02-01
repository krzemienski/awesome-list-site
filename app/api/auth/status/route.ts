import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/session-store';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session')?.value;
  
  if (!sessionId) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  
  const session = getSession(sessionId);
  
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  
  if (Date.now() > session.expires) {
    deleteSession(sessionId);
    const response = NextResponse.json({ authenticated: false, user: null });
    response.cookies.delete('auth_session');
    return response;
  }
  
  try {
    const users = await sql`SELECT * FROM users WHERE id = ${session.userId}`;
    const user = users[0];
    
    if (!user) {
      deleteSession(sessionId);
      const response = NextResponse.json({ authenticated: false, user: null });
      response.cookies.delete('auth_session');
      return response;
    }
    
    return NextResponse.json({
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
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
