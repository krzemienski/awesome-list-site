import { storage } from '../server/storage';
import { AwesomeListFormatter } from '../server/github/formatter';
import * as fs from 'fs/promises';

async function testExport() {
  try {
    console.log('📤 Testing export functionality...\n');

    // Get all approved resources
    const allResources = await storage.getAllApprovedResources();
    console.log(`✅ Fetched ${allResources.length} approved resources\n`);

    // Create formatter
    const formatter = new AwesomeListFormatter(allResources, {
      title: 'Awesome Video',
      description: 'A curated list of awesome video resources.',
      includeContributing: true,
      includeLicense: true,
      websiteUrl: 'http://localhost:3000',
      repoUrl: 'https://github.com/krzemienski/awesome-video'
    });

    // Generate markdown
    const markdown = formatter.generate();

    console.log(`✅ Generated markdown: ${markdown.length} characters\n`);

    // Save to file
    await fs.writeFile('/tmp/export-test.md', markdown);

    console.log('✅ Saved to /tmp/export-test.md\n');

    // Count structure
    const lines = markdown.split('\n');
    const categoryCount = lines.filter(l => l.startsWith('## ')).length;
    const subcategoryCount = lines.filter(l => l.startsWith('### ')).length;
    const resourceCount = lines.filter(l => l.match(/^\* \[/)).length;

    console.log('📊 Structure:');
    console.log(`   Categories (##): ${categoryCount}`);
    console.log(`   Subcategories (###): ${subcategoryCount}`);
    console.log(`   Resources (* [): ${resourceCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

testExport();
