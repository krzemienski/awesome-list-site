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

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Seed some sample categories
    const categories = [
      { name: 'Encoding', slug: 'encoding' },
      { name: 'Streaming', slug: 'streaming' },
      { name: 'Players', slug: 'players' },
      { name: 'Tools', slug: 'tools' },
      { name: 'Documentation', slug: 'documentation' },
    ];

    for (const cat of categories) {
      await sql`
        INSERT INTO categories (name, slug)
        VALUES (${cat.name}, ${cat.slug})
        ON CONFLICT (slug) DO NOTHING
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database seeded with sample categories' 
    });
  } catch (error) {
    console.error('Seed database error:', error);
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
  }
}
