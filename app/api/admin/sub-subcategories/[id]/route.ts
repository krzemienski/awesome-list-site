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
    const { name, slug, subcategoryId } = await request.json();

    const [subSubcategory] = await sql`
      UPDATE sub_subcategories SET name = ${name}, slug = ${slug}, subcategory_id = ${subcategoryId}
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    return NextResponse.json({
      id: subSubcategory.id,
      name: subSubcategory.name,
      slug: subSubcategory.slug,
      subcategoryId: subSubcategory.subcategory_id,
    });
  } catch (error) {
    console.error('Update sub-subcategory error:', error);
    return NextResponse.json({ error: 'Failed to update sub-subcategory' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await sql`DELETE FROM sub_subcategories WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete sub-subcategory error:', error);
    return NextResponse.json({ error: 'Failed to delete sub-subcategory' }, { status: 500 });
  }
}
