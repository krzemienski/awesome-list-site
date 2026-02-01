import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
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
  try {
    const subcategories = await sql`SELECT * FROM subcategories ORDER BY name`;
    return NextResponse.json(subcategories.map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      categoryId: s.category_id,
    })));
  } catch (error) {
    console.error('Get subcategories error:', error);
    return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug, categoryId } = await request.json();
    
    const [subcategory] = await sql`
      INSERT INTO subcategories (name, slug, category_id)
      VALUES (${name}, ${slug}, ${categoryId})
      RETURNING *
    `;

    return NextResponse.json({
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
      categoryId: subcategory.category_id,
    }, { status: 201 });
  } catch (error) {
    console.error('Create subcategory error:', error);
    return NextResponse.json({ error: 'Failed to create subcategory' }, { status: 500 });
  }
}
