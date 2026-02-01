import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session')?.value;
  
  if (!sessionId) {
    return NextResponse.json({ isAdmin: false });
  }
  
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ isAdmin: false });
  }
  
  return NextResponse.json({ isAdmin: session.role === 'admin' });
}
