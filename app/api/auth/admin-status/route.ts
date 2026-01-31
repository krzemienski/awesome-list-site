import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Note: In serverless, sessions don't persist across instances
// This is a limitation - consider using a database-backed session store
const sessions = new Map<string, { userId: string; email: string; role: string; expires: number }>();

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session')?.value;
  
  if (!sessionId || !sessions.has(sessionId)) {
    return NextResponse.json({ isAdmin: false });
  }
  
  const session = sessions.get(sessionId)!;
  return NextResponse.json({ isAdmin: session.role === 'admin' });
}

export { sessions };
