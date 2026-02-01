import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';

const sql = neon(process.env.DATABASE_URL!);

async function isAdmin(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session')?.value;
  if (!sessionId) return false;
  const session = getSession(sessionId);
  return session?.role === 'admin';
}

export async function GET() {
  if (!(await isAdmin(new Request('')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [resourceCount] = await sql`SELECT COUNT(*) as count FROM resources`;
    const [categoryCount] = await sql`SELECT COUNT(*) as count FROM categories`;
    const [subcategoryCount] = await sql`SELECT COUNT(*) as count FROM subcategories`;
    const [subSubcategoryCount] = await sql`SELECT COUNT(*) as count FROM sub_subcategories`;
    const [userCount] = await sql`SELECT COUNT(*) as count FROM users`;
    const [pendingSubmissions] = await sql`SELECT COUNT(*) as count FROM user_submissions WHERE status = 'pending'`;
    
    return NextResponse.json({
      totalResources: parseInt(resourceCount.count),
      totalCategories: parseInt(categoryCount.count),
      totalSubcategories: parseInt(subcategoryCount.count),
      totalSubSubcategories: parseInt(subSubcategoryCount.count),
      totalUsers: parseInt(userCount.count),
      pendingSubmissions: parseInt(pendingSubmissions.count),
      pendingEdits: 0,
      brokenLinks: 0,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
