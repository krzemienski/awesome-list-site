import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

// In-memory session store (for serverless - sessions won't persist across instances)
const sessions = new Map<string, { userId: string; email: string; role: string; expires: number }>();

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session')?.value;
  
  if (!sessionId || !sessions.has(sessionId)) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  
  const session = sessions.get(sessionId)!;
  
  if (Date.now() > session.expires) {
    sessions.delete(sessionId);
    const response = NextResponse.json({ authenticated: false, user: null });
    response.cookies.delete('auth_session');
    return response;
  }
  
  try {
    const users = await sql`SELECT * FROM users WHERE id = ${session.userId}`;
    const user = users[0];
    
    if (!user) {
      sessions.delete(sessionId);
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

// Export sessions for other routes to use
export { sessions };
