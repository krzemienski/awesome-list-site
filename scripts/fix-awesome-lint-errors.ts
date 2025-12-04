import { db } from '../server/db';
import { resources } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Script to fix awesome-lint validation errors
 * - Capitalize first letter of descriptions (description-capital rule)
 * - Remove spaces from URLs (url-spaces rule)
 */

async function fixAwesomeLintErrors() {
  console.log('🔧 Starting awesome-lint error fixes...\n');
  
  // Fix 1: Capitalize descriptions starting with lowercase
  console.log('Fix 1: Capitalizing descriptions...');
  const descResult = await db.execute(sql`
    UPDATE resources 
    SET description = CONCAT(UPPER(SUBSTRING(description, 1, 1)), SUBSTRING(description, 2))
    WHERE description != '' 
    AND SUBSTRING(description, 1, 1) != UPPER(SUBSTRING(description, 1, 1))
  `);
  console.log(`✅ Capitalized ${descResult.rowCount || 0} descriptions\n`);
  
  // Fix 2: Remove spaces from URLs
  console.log('Fix 2: Fixing URLs with spaces...');
  const spacedUrls = await db.execute<{ id: number; url: string }>(sql`
    SELECT id, url FROM resources WHERE url LIKE '% %'
  `);
  
  let fixedUrls = 0;
  for (const row of spacedUrls.rows) {
    // Remove extra quotes and spaces
    const cleanUrl = row.url.replace(/["\s]/g, '');
    await db.execute(sql`UPDATE resources SET url = ${cleanUrl} WHERE id = ${row.id}`);
    console.log(`  - Fixed URL for resource ${row.id}: ${row.url} → ${cleanUrl}`);
    fixedUrls++;
  }
  console.log(`✅ Fixed ${fixedUrls} URLs with spaces\n`);
  
  console.log('🎉 All awesome-lint errors fixed!');
}

fixAwesomeLintErrors()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing awesome-lint errors:', error);
    process.exit(1);
  });
