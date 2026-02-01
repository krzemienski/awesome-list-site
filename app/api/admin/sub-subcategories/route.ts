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
    const subSubcategories = await sql`SELECT * FROM sub_subcategories ORDER BY name`;
    return NextResponse.json(subSubcategories.map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      subcategoryId: s.subcategory_id,
    })));
  } catch (error) {
    console.error('Get sub-subcategories error:', error);
    return NextResponse.json({ error: 'Failed to fetch sub-subcategories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug, subcategoryId } = await request.json();
    
    const [subSubcategory] = await sql`
      INSERT INTO sub_subcategories (name, slug, subcategory_id)
      VALUES (${name}, ${slug}, ${subcategoryId})
      RETURNING *
    `;

    return NextResponse.json({
      id: subSubcategory.id,
      name: subSubcategory.name,
      slug: subSubcategory.slug,
      subcategoryId: subSubcategory.subcategory_id,
    }, { status: 201 });
  } catch (error) {
    console.error('Create sub-subcategory error:', error);
    return NextResponse.json({ error: 'Failed to create sub-subcategory' }, { status: 500 });
  }
}
