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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, description, categoryId, subcategoryId, subSubcategoryId } = body;

    const [resource] = await sql`
      UPDATE resources SET 
        name = ${name}, 
        url = ${url}, 
        description = ${description || null},
        category_id = ${categoryId || null},
        subcategory_id = ${subcategoryId || null},
        sub_subcategory_id = ${subSubcategoryId || null},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    return NextResponse.json({
      id: resource.id,
      name: resource.name,
      url: resource.url,
      description: resource.description,
    });
  } catch (error) {
    console.error('Update resource error:', error);
    return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await sql`DELETE FROM resources WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete resource error:', error);
    return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
  }
}
