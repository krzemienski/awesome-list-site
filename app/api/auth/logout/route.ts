import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session-store';

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session')?.value;
  
  if (sessionId) {
    deleteSession(sessionId);
  }
  
  const response = NextResponse.json({ message: 'Logged out successfully' });
  response.cookies.delete('auth_session');
  return response;
}
