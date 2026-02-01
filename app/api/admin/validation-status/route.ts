import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

const sql = neon(process.env.DATABASE_URL!);

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

  try {
    // Return validation status - in a real implementation this would track validation jobs
    return NextResponse.json({
      isValidating: false,
      lastValidation: null,
      brokenLinks: 0,
      totalChecked: 0,
    });
  } catch (error) {
    console.error('Validation status error:', error);
    return NextResponse.json({ error: 'Failed to fetch validation status' }, { status: 500 });
  }
}
