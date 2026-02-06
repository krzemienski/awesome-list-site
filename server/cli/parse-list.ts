#!/usr/bin/env tsx

import { fetchAwesomeList } from '../parser.js';

/**
 * CLI tool for validating and parsing awesome lists
 * Usage: tsx server/cli/parse-list.ts <url>
 */

interface ParseResult {
  success: boolean;
  url: string;
  title?: string;
  description?: string;
  resourceCount?: number;
  categoryCount?: number;
  tagCount?: number;
  parseTime?: number;
  errors?: string[];
  warnings?: string[];
}

function printHeader() {
  console.log('\n🚀 Awesome List Parser & Validator');
  console.log('=====================================');
}

function printUsage() {
  console.log('\nUsage:');
  console.log('  npm run parse-list <url>');
  console.log('  # OR directly:');
  console.log('  tsx server/cli/parse-list.ts <url>');
  console.log('\nExamples:');
  console.log('  npm run parse-list https://raw.githubusercontent.com/sindresorhus/awesome/main/readme.md');
  console.log('  npm run parse-list https://raw.githubusercontent.com/avelino/awesome-go/main/README.md');
  console.log('  npm run parse-list https://raw.githubusercontent.com/vinta/awesome-python/master/README.md');
  console.log('\nSupported formats:');
  console.log('  ✅ GitHub raw URLs (raw.githubusercontent.com)');
  console.log('  ✅ GitLab raw URLs');
  console.log('  ✅ Standard awesome-list markdown format');
}

function printResult(result: ParseResult) {
  console.log('\n📊 Parsing Results:');
  console.log('===================');
  
  if (result.success) {
    console.log('✅ Status: SUCCESS');
    console.log(`📄 Title: ${result.title}`);
    console.log(`📝 Description: ${result.description}`);
    console.log(`📊 Resources found: ${result.resourceCount}`);
    console.log(`📁 Categories: ${result.categoryCount}`);
    console.log(`🏷️  Tags extracted: ${result.tagCount}`);
    console.log(`⏱️  Parse time: ${result.parseTime}s`);
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    console.log('\n🎉 Your awesome list is ready to deploy!');
  } else {
    console.log('❌ Status: FAILED');
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors found:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n💡 Common fixes:');
    console.log('   - Ensure the URL is a raw GitHub/GitLab URL');
    console.log('   - Check that the repository is public');
    console.log('   - Verify the markdown follows awesome-list format');
    console.log('   - Use ## for main categories and ### for subcategories');
    console.log('   - Format resources as: - [Name](url) - Description');
  }
}

function printTips() {
  console.log('\n💡 Pro Tips:');
  console.log('============');
  console.log('• Use raw GitHub URLs: raw.githubusercontent.com/user/repo/branch/file.md');
  console.log('• Follow the standard awesome-list format for best results');
  console.log('• Categories should use ## headings, subcategories use ###');
  console.log('• Each resource should be: - [Name](url) - Description');
  console.log('• Include at least 5 resources for a valid awesome list');
  console.log('• Repository should be public and accessible');
}

async function parseAwesomeList(url: string): Promise<ParseResult> {
  const startTime = Date.now();
  
  try {
    const data = await fetchAwesomeList(url);
    const parseTime = (Date.now() - startTime) / 1000;
    
    // Calculate statistics
    const categories = Array.from(new Set(data.resources.map(r => r.category)));
    const tags = Array.from(new Set(data.resources.flatMap(r => r.tags || [])));
    
    return {
      success: true,
      url,
      title: data.title,
      description: data.description,
      resourceCount: data.resources.length,
      categoryCount: categories.length,
      tagCount: tags.length,
      parseTime: Number(parseTime.toFixed(2)),
      warnings: [] // Add any warnings here
    };
    
  } catch (error: unknown) {
    const parseTime = (Date.now() - startTime) / 1000;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      url,
      parseTime: Number(parseTime.toFixed(2)),
      errors: [errorMessage]
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  printHeader();
  
  if (args.length === 0) {
    console.log('\n❌ Error: No URL provided');
    printUsage();
    process.exit(1);
  }
  
  const url = args[0];
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    printTips();
    process.exit(0);
  }
  
  console.log(`\n🔍 Validating: ${url}`);
  console.log('⏳ Fetching and parsing...\n');
  
  try {
    const result = await parseAwesomeList(url);
    printResult(result);
    
    if (!result.success) {
      printTips();
      process.exit(1);
    }
    
  } catch (error: unknown) {
    console.log('\n💥 Unexpected error occurred:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   ${errorMessage}`);
    printTips();
    process.exit(1);
  }
}

// Handle CLI interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Parsing interrupted by user');
  process.exit(0);
});

// Run the CLI
main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('\n💥 Fatal error:', errorMessage);
  process.exit(1);
});