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

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let resources;
    let countResult;

    if (search) {
      resources = await sql`
        SELECT * FROM resources 
        WHERE name ILIKE ${'%' + search + '%'} OR url ILIKE ${'%' + search + '%'}
        ORDER BY name
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as count FROM resources 
        WHERE name ILIKE ${'%' + search + '%'} OR url ILIKE ${'%' + search + '%'}
      `;
    } else {
      resources = await sql`SELECT * FROM resources ORDER BY name LIMIT ${limit} OFFSET ${offset}`;
      countResult = await sql`SELECT COUNT(*) as count FROM resources`;
    }

    return NextResponse.json({
      resources: resources.map((r: any) => ({
        id: r.id,
        name: r.name,
        url: r.url,
        description: r.description,
        categoryId: r.category_id,
        subcategoryId: r.subcategory_id,
        subSubcategoryId: r.sub_subcategory_id,
        githubStars: r.github_stars,
        language: r.language,
        license: r.license,
      })),
      total: parseInt(countResult[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Get resources error:', error);
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, url, description, categoryId, subcategoryId, subSubcategoryId } = body;

    const [resource] = await sql`
      INSERT INTO resources (name, url, description, category_id, subcategory_id, sub_subcategory_id)
      VALUES (${name}, ${url}, ${description || null}, ${categoryId || null}, ${subcategoryId || null}, ${subSubcategoryId || null})
      RETURNING *
    `;

    return NextResponse.json({
      id: resource.id,
      name: resource.name,
      url: resource.url,
      description: resource.description,
    }, { status: 201 });
  } catch (error) {
    console.error('Create resource error:', error);
    return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
  }
}
