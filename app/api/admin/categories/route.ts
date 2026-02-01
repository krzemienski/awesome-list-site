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
    const categories = await sql`SELECT * FROM categories ORDER BY name`;
    return NextResponse.json(categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })));
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug } = await request.json();
    
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const [category] = await sql`
      INSERT INTO categories (name, slug)
      VALUES (${name}, ${slug})
      RETURNING *
    `;

    return NextResponse.json({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
