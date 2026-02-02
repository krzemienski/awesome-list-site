import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  console.log("[v0] awesome-list API route handler invoked");
  console.log("[v0] DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("[v0] DATABASE_URL prefix:", process.env.DATABASE_URL?.substring(0, 30) + "...");
  try {
    // Fetch all categories with their subcategories, sub-subcategories, and resources
    const categories = await sql`SELECT * FROM categories ORDER BY name`;
    console.log("[v0] Categories count:", categories.length, categories);
    const subcategories = await sql`SELECT * FROM subcategories ORDER BY name`;
    console.log("[v0] Subcategories count:", subcategories.length);
    const subSubcategories = await sql`SELECT * FROM sub_subcategories ORDER BY name`;
    console.log("[v0] SubSubcategories count:", subSubcategories.length);
    const dbResources = await sql`SELECT * FROM resources ORDER BY name`;
    console.log("[v0] Resources count:", dbResources.length, dbResources);
    
    // Map resources to expected format
    const mapResource = (r: any) => ({
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
    });
    
    // Build flat resources array (required by parser)
    const resources = dbResources.map(mapResource);
    
    // Build nested category structure
    const categoriesNested = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      subcategories: subcategories
        .filter((sub: any) => sub.category_id === cat.id)
        .map((sub: any) => ({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          categoryId: sub.category_id,
          subSubcategories: subSubcategories
            .filter((subsub: any) => subsub.subcategory_id === sub.id)
            .map((subsub: any) => ({
              id: subsub.id,
              name: subsub.name,
              slug: subsub.slug,
              subcategoryId: subsub.subcategory_id,
              resources: dbResources
                .filter((r: any) => r.sub_subcategory_id === subsub.id)
                .map(mapResource),
            })),
          resources: dbResources
            .filter((r: any) => r.subcategory_id === sub.id && !r.sub_subcategory_id)
            .map(mapResource),
        })),
      resources: dbResources
        .filter((r: any) => r.category_id === cat.id && !r.subcategory_id)
        .map(mapResource),
    }));
    
    return NextResponse.json({
      title: "Awesome Video",
      description: "A curated list of awesome video resources",
      repoUrl: "https://github.com/krzemienski/awesome-video",
      resources: resources,
      categories: categoriesNested,
      totalResources: resources.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[v0] Awesome list error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch awesome list',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
