import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const resources = await sql`SELECT * FROM resources ORDER BY name LIMIT 100`;
    return NextResponse.json(resources.map((r: any) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      description: r.description,
      categoryId: r.category_id,
      subcategoryId: r.subcategory_id,
      subSubcategoryId: r.sub_subcategory_id,
      githubStars: r.github_stars,
      lastCommit: r.last_commit,
      language: r.language,
      license: r.license,
      isAwesomeList: r.is_awesome_list,
      awesomeListCount: r.awesome_list_count,
    })));
  } catch (error) {
    console.error('Resources error:', error);
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
  }
}
