import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session')?.value;
  if (!sessionId) return false;
  const session = getSession(sessionId);
  return session?.role === 'admin';
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Return empty array - resource edits table not yet implemented
  return NextResponse.json([]);
}
