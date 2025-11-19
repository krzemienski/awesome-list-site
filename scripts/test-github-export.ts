import { AwesomeListFormatter, generateContributingMd } from '../server/github/formatter';
import { Resource } from '@shared/schema';
import { storage } from '../server/storage';

/**
 * TIER 1: Markdown Formatter Unit Tests
 * Test AwesomeListFormatter in isolation with deterministic fixtures
 */

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
}

async function runTests() {
  console.log('\n=== TIER 1: Markdown Formatter Unit Tests ===\n');
  
  try {
    // Step 1: Fetch approved resources from database
    console.log('Step 1: Fetching approved resources from database...');
    const approvedResources = await storage.getAllApprovedResources();
    
    if (approvedResources.length === 0) {
      console.log('⚠️  No approved resources found. Tests will use mock data.');
      // Create mock resources for testing
      approvedResources.push({
        id: 1,
        title: 'FFmpeg',
        url: 'https://ffmpeg.org',
        description: 'A complete, cross-platform solution to record, convert and stream audio and video',
        category: 'Media Tools',
        subcategory: 'Encoding Tools',
        subSubcategory: 'Video Encoders',
        status: 'approved',
        githubSynced: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Resource);
    }
    
    console.log(`✓ Found ${approvedResources.length} approved resources\n`);
    
    // Step 2: Instantiate AwesomeListFormatter with test options
    console.log('Step 2: Creating AwesomeListFormatter instance...');
    const formatter = new AwesomeListFormatter(approvedResources, {
      title: 'Awesome Video',
      description: 'A curated list of awesome video tools, libraries, and resources',
      includeContributing: true,
      includeLicense: true,
      websiteUrl: 'https://awesome-video.dev',
      repoUrl: 'https://github.com/test/awesome-video'
    });
    console.log('✓ Formatter created successfully\n');
    
    // Step 3: Generate README.md
    console.log('Step 3: Generating README.md...');
    const readme = formatter.generate();
    console.log(`✓ Generated README.md (${readme.length} characters)\n`);
    
    // Step 4: Validate awesome-lint compliance
    console.log('Step 4: Validating awesome-lint compliance...\n');
    
    // Test 1: Title starts with "Awesome" prefix
    const titleMatch = readme.match(/^#\s+Awesome/m);
    addResult(
      'Title has "Awesome" prefix',
      !!titleMatch,
      titleMatch ? `Found: "${titleMatch[0]}"` : 'Title does not start with "Awesome"'
    );
    
    // Test 2: Badge directly after title (no blank line between title and badge)
    const badgeAfterTitle = /^#\s+Awesome.*?\n\n\[\!\[Awesome\]/m.test(readme);
    addResult(
      'Badge directly after title',
      badgeAfterTitle,
      badgeAfterTitle ? 'Badge found with single blank line after title' : 'Badge not positioned correctly'
    );
    
    // Test 3: Badge is present
    const hasBadge = readme.includes('[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)');
    addResult(
      'Awesome badge present',
      hasBadge,
      hasBadge ? 'Badge found' : 'Badge missing'
    );
    
    // Test 4: Table of contents with anchor links
    const hasContents = readme.includes('## Contents');
    addResult(
      'Table of contents present',
      hasContents,
      hasContents ? 'TOC section found' : 'TOC section missing'
    );
    
    // Test 5: Anchor links are properly formatted (lowercase, hyphenated)
    const anchorLinks = readme.match(/\(#[a-z0-9-]+\)/g) || [];
    const allAnchorsValid = anchorLinks.every(link => {
      const anchor = link.slice(2, -1);
      return anchor === anchor.toLowerCase() && !/[^a-z0-9-]/.test(anchor);
    });
    addResult(
      'Anchor links properly formatted',
      allAnchorsValid,
      allAnchorsValid ? `${anchorLinks.length} valid anchor links` : 'Some anchor links are invalid'
    );
    
    // Test 6: Resources grouped by category (has category headers)
    const categoryHeaders = readme.match(/^##\s+[A-Z]/gm) || [];
    const hasCategoryHeaders = categoryHeaders.length > 1; // At least one category header (besides Contents)
    addResult(
      'Resources grouped by category',
      hasCategoryHeaders,
      hasCategoryHeaders ? `Found ${categoryHeaders.length} section headers` : 'No category headers found'
    );
    
    // Test 7: Descriptions are capitalized
    const resourceLines = readme.match(/^-\s+\[.+?\]\(.+?\)\s+-\s+(.)/gm) || [];
    const descriptionsCapitalized = resourceLines.every(line => {
      const descStart = line.match(/\)\s+-\s+(.)/);
      if (!descStart) return true;
      const firstChar = descStart[1];
      return firstChar === firstChar.toUpperCase();
    });
    addResult(
      'Descriptions capitalized',
      descriptionsCapitalized,
      descriptionsCapitalized ? `Checked ${resourceLines.length} descriptions` : 'Some descriptions not capitalized'
    );
    
    // Test 8: File ends with exactly one newline
    const endsWithSingleNewline = readme.endsWith('\n') && !readme.endsWith('\n\n');
    addResult(
      'File ends with single newline',
      endsWithSingleNewline,
      endsWithSingleNewline ? 'Correct' : readme.endsWith('\n\n') ? 'Multiple newlines at end' : 'No newline at end'
    );
    
    // Test 9: No double blank lines (consecutive blank lines)
    const hasDoubleBlankLines = /\n\n\n/.test(readme);
    addResult(
      'No double blank lines',
      !hasDoubleBlankLines,
      !hasDoubleBlankLines ? 'No consecutive blank lines found' : 'Found double blank lines'
    );
    
    // Test 10: Resource format is correct
    const resourceFormatMatch = /^-\s+\[.+?\]\(.+?\)\s+-\s+.+\.$/gm;
    const resourcesWithDesc = readme.match(resourceFormatMatch) || [];
    addResult(
      'Resource format correct',
      resourcesWithDesc.length > 0,
      `Found ${resourcesWithDesc.length} properly formatted resources`
    );
    
    // Test 11: Website URL is included
    const hasWebsiteUrl = readme.includes('https://awesome-video.dev');
    addResult(
      'Website URL included',
      hasWebsiteUrl,
      hasWebsiteUrl ? 'Website URL found in README' : 'Website URL missing'
    );
    
    // Step 5: Test CONTRIBUTING.md generation
    console.log('\nStep 5: Testing CONTRIBUTING.md generation...\n');
    const contributing = generateContributingMd('https://awesome-video.dev', 'https://github.com/test/awesome-video');
    
    // Test 12: CONTRIBUTING.md includes website URL
    const contributingHasUrl = contributing.includes('https://awesome-video.dev');
    addResult(
      'CONTRIBUTING.md has website URL',
      contributingHasUrl,
      contributingHasUrl ? 'Website URL found' : 'Website URL missing'
    );
    
    // Test 13: CONTRIBUTING.md has proper markdown formatting
    const hasContributingHeader = contributing.startsWith('# Contributing');
    addResult(
      'CONTRIBUTING.md proper header',
      hasContributingHeader,
      hasContributingHeader ? 'Correct header found' : 'Header missing or incorrect'
    );
    
    // Test 14: Contains submission guidelines
    const hasGuidelines = contributing.includes('## Guidelines');
    addResult(
      'CONTRIBUTING.md has guidelines',
      hasGuidelines,
      hasGuidelines ? 'Guidelines section found' : 'Guidelines section missing'
    );
    
    // Test 15: Contains format instructions
    const hasFormatInstructions = contributing.includes('- [Name](URL) - Description.');
    addResult(
      'CONTRIBUTING.md has format instructions',
      hasFormatInstructions,
      hasFormatInstructions ? 'Format instructions found' : 'Format instructions missing'
    );
    
    // Print summary
    console.log('\n=== Test Summary ===\n');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Pass Rate: ${passRate}%\n`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! The formatter is awesome-lint compliant.\n');
    } else {
      console.log('⚠️  Some tests failed. Review the output above for details.\n');
    }
    
    // Print sample output for manual review
    console.log('=== Sample README Output (first 1500 chars) ===\n');
    console.log(readme.substring(0, 1500));
    console.log('\n... (truncated)\n');
    
    console.log('=== Sample CONTRIBUTING.md Output (first 800 chars) ===\n');
    console.log(contributing.substring(0, 800));
    console.log('\n... (truncated)\n');
    
    return passed === total;
    
  } catch (error: any) {
    console.error('❌ Test execution failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
