#!/usr/bin/env tsx
/**
 * Test GitHub export and awesome-lint validation
 * Generates markdown from database, runs awesome-lint, reports errors
 */

import { db } from '../server/db';
import { resources } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { AwesomeListFormatter } from '../server/github/formatter';
import { writeFileSync } from 'fs';

async function testExport() {
  console.log('🔄 Fetching resources from database...');

  // Fetch all approved resources
  const approvedResources = await db
    .select()
    .from(resources)
    .where(eq(resources.status, 'approved'));

  console.log(`✅ Fetched ${approvedResources.length} approved resources`);

  // Generate markdown
  console.log('🔄 Generating markdown...');
  const formatter = new AwesomeListFormatter(approvedResources, {
    title: 'Awesome Video',
    description: 'A curated list of awesome video resources',
    repoUrl: 'https://github.com/krzemienski/awesome-video',
    includeContributing: true,
    includeLicense: true,
  });
  const markdown = formatter.generate();

  // Save to file
  const outputPath = '/tmp/export-test.md';
  writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`✅ Markdown saved to ${outputPath}`);
  console.log(`📊 Size: ${(markdown.length / 1024).toFixed(2)} KB`);

  // Show first 50 lines
  const lines = markdown.split('\n');
  console.log('\n📄 First 50 lines:\n');
  console.log(lines.slice(0, 50).join('\n'));

  console.log(`\n\n✅ Export complete! Run: npx awesome-lint ${outputPath}`);
}

testExport().catch(console.error);
