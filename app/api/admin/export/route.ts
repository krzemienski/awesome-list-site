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
    const categories = await sql`SELECT * FROM categories ORDER BY name`;
    const subcategories = await sql`SELECT * FROM subcategories ORDER BY name`;
    const subSubcategories = await sql`SELECT * FROM sub_subcategories ORDER BY name`;
    const resources = await sql`SELECT * FROM resources ORDER BY name`;

    const exportData = {
      exportedAt: new Date().toISOString(),
      categories: categories,
      subcategories: subcategories,
      subSubcategories: subSubcategories,
      resources: resources,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="awesome-list-export.json"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
