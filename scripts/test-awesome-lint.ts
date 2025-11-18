/**
 * Test script to validate that exported markdown passes awesome-lint
 */

import { db } from '../server/db';
import { resources } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { AwesomeListFormatter } from '../server/github/formatter';
import { validateAwesomeList, formatValidationReport } from '../server/validation/awesomeLint';
import { writeFileSync } from 'fs';

async function testAwesomeLint() {
  console.log('🧪 Testing awesome-lint validation for database export...\n');

  try {
    // Fetch all approved resources from database
    console.log('📊 Fetching approved resources from database...');
    const approvedResources = await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'approved'))
      .execute();

    console.log(`✅ Found ${approvedResources.length} approved resources\n`);

    // Generate markdown using formatter
    console.log('📝 Generating markdown with AwesomeListFormatter...');
    const formatter = new AwesomeListFormatter(approvedResources, {
      title: 'Awesome Video',
      description: 'A curated list of awesome video resources, tools, and learning materials.',
      includeContributing: true,
      includeLicense: true,
      websiteUrl: 'https://awesome-video.replit.app',
      repoUrl: 'https://github.com/krzemienski/awesome-video'
    });

    const markdown = formatter.generate();
    console.log(`✅ Generated ${markdown.split('\n').length} lines of markdown\n`);

    // Save to file for inspection
    writeFileSync('/tmp/exported-readme.md', markdown);
    console.log('💾 Saved to: /tmp/exported-readme.md\n');

    // Validate with awesome-lint
    console.log('🔍 Validating with awesome-lint...\n');
    const validationResult = validateAwesomeList(markdown);

    // Generate and display report
    const report = formatValidationReport(validationResult);
    console.log(report);
    console.log('\n');

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    if (validationResult.valid) {
      console.log('✅ SUCCESS: Exported markdown PASSES awesome-lint validation!');
    } else {
      console.log('❌ FAILED: Exported markdown has validation errors');
      console.log(`   - Errors: ${validationResult.errors.length}`);
      console.log(`   - Warnings: ${validationResult.warnings.length}`);
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Exit with appropriate code
    process.exit(validationResult.valid ? 0 : 1);

  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

testAwesomeLint();
