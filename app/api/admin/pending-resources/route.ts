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
    const submissions = await sql`
      SELECT * FROM user_submissions 
      WHERE status = 'pending' 
      ORDER BY created_at DESC
    `;

    return NextResponse.json(submissions.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      name: s.name,
      url: s.url,
      description: s.description,
      categoryId: s.category_id,
      subcategoryId: s.subcategory_id,
      subSubcategoryId: s.sub_subcategory_id,
      status: s.status,
      createdAt: s.created_at,
    })));
  } catch (error) {
    console.error('Get pending resources error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending resources' }, { status: 500 });
  }
}
