import { AwesomeListFormatter } from '../server/github/formatter';
import { storage } from '../server/storage';
import { writeFileSync } from 'fs';

async function testExport() {
  console.log('🚀 Testing export with mixed video + rust data...');

  try {
    // Get all approved resources
    const resources = await storage.getAllApprovedResources();
    console.log(`Total resources to export: ${resources.length}`);

    // Count by category type
    const videoCats = resources.filter(r =>
      !['Applications', 'Development tools', 'Libraries', 'Registries', 'Resources'].includes(r.category)
    );
    const rustCats = resources.filter(r =>
      ['Applications', 'Development tools', 'Libraries', 'Registries', 'Resources'].includes(r.category)
    );

    console.log(`Video resources: ${videoCats.length}`);
    console.log(`Rust resources: ${rustCats.length}`);

    // Generate export
    const formatter = new AwesomeListFormatter(resources, {
      title: 'Awesome Resources',
      description: 'Curated video development and Rust programming resources',
      includeContributing: true,
      includeLicense: true,
      websiteUrl: 'http://localhost:3000',
      repoUrl: 'https://github.com/krzemienski/awesome-video'
    });

    const markdown = formatter.generate();
    writeFileSync('/tmp/export-mixed-data.md', markdown);

    console.log(`✅ Export generated: ${markdown.length} characters`);
    console.log(`   Saved to: /tmp/export-mixed-data.md`);

    // Count categories in export
    const categoryCount = (markdown.match(/^## /gm) || []).filter(line =>
      !line.includes('Contents') && !line.includes('Contributing') && !line.includes('License')
    ).length;

    console.log(`   Categories in export: ${categoryCount}`);

    return markdown;
  } catch (err: any) {
    console.error('❌ Export failed:', err.message);
    throw err;
  }
}

testExport();
