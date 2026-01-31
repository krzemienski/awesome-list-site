import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const categories = await sql`SELECT * FROM categories ORDER BY name`;
    return NextResponse.json(categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })));
  } catch (error) {
    console.error('Categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
