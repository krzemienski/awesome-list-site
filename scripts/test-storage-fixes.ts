/**
 * Integration Test for Storage Layer Fixes
 * Tests: slug uniqueness, delete protection, audit logging, awesome-lint validation
 * 
 * Run: tsx scripts/test-storage-fixes.ts
 */

import { db } from "../server/db";
import { storage } from "../server/storage";
import { sql } from "drizzle-orm";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, details?: string, error?: string) {
  results.push({ name, passed, error, details });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${color}${icon} ${name}${reset}`);
  if (details) console.log(`  ${details}`);
  if (error) console.log(`  Error: ${error}`);
}

async function testSlugUniqueness() {
  console.log('\n=== Testing Slug Uniqueness Validation ===');
  
  try {
    // Test 1: Create a category with unique slug
    const testCategory = await storage.createCategory({
      name: 'Test Category Unique',
      slug: 'test-category-unique-' + Date.now()
    });
    logTest('Create category with unique slug', true, `Created category ID: ${testCategory.id}`);
    
    // Test 2: Try to create duplicate category slug
    try {
      await storage.createCategory({
        name: 'Duplicate Test',
        slug: testCategory.slug // Same slug
      });
      logTest('Reject duplicate category slug', false, 'Should have thrown error');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        logTest('Reject duplicate category slug', true, error.message);
      } else {
        logTest('Reject duplicate category slug', false, 'Wrong error', error.message);
      }
    }
    
    // Clean up
    await storage.deleteCategory(testCategory.id);
    
  } catch (error: any) {
    logTest('Slug uniqueness test', false, undefined, error.message);
  }
  
  try {
    // Test 3: Subcategory slug uniqueness within same category
    const category1 = await storage.createCategory({
      name: 'Parent Category Test',
      slug: 'parent-cat-test-' + Date.now()
    });
    
    const subcategory = await storage.createSubcategory({
      name: 'Test Subcategory',
      slug: 'test-subcat',
      categoryId: category1.id
    });
    
    try {
      await storage.createSubcategory({
        name: 'Duplicate Subcategory',
        slug: 'test-subcat', // Same slug, same category
        categoryId: category1.id
      });
      logTest('Reject duplicate subcategory slug', false, 'Should have thrown error');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        logTest('Reject duplicate subcategory slug', true, error.message);
      } else {
        logTest('Reject duplicate subcategory slug', false, 'Wrong error', error.message);
      }
    }
    
    // Clean up
    await storage.deleteSubcategory(subcategory.id);
    await storage.deleteCategory(category1.id);
    
  } catch (error: any) {
    logTest('Subcategory slug uniqueness test', false, undefined, error.message);
  }
}

async function testDeleteProtection() {
  console.log('\n=== Testing Delete Protection ===');
  
  try {
    // Test 1: Try to delete category with resources
    const categories = await storage.listCategories();
    if (categories.length === 0) {
      logTest('Delete protection test', false, 'No categories found');
      return;
    }
    
    // Find a category with resources
    let categoryWithResources = null;
    for (const cat of categories) {
      const count = await storage.getCategoryResourceCount(cat.name);
      if (count > 0) {
        categoryWithResources = { ...cat, resourceCount: count };
        break;
      }
    }
    
    if (!categoryWithResources) {
      logTest('Find category with resources', false, 'No category has resources');
      return;
    }
    
    // Try to delete it
    try {
      await storage.deleteCategory(categoryWithResources.id);
      logTest('Prevent deleting category with resources', false, 'Should have thrown error');
    } catch (error: any) {
      if (error.message.includes('has') && error.message.includes('resources')) {
        logTest(
          'Prevent deleting category with resources',
          true,
          `Correctly blocked deletion: "${error.message}"`
        );
      } else {
        logTest('Prevent deleting category with resources', false, 'Wrong error', error.message);
      }
    }
    
  } catch (error: any) {
    logTest('Delete protection test', false, undefined, error.message);
  }
  
  try {
    // Test 2: Delete category with subcategories should fail
    const testCat = await storage.createCategory({
      name: 'Parent with Subcat',
      slug: 'parent-subcat-test-' + Date.now()
    });
    
    const testSubcat = await storage.createSubcategory({
      name: 'Child Subcategory',
      slug: 'child-subcat-test-' + Date.now(),
      categoryId: testCat.id
    });
    
    try {
      await storage.deleteCategory(testCat.id);
      logTest('Prevent deleting category with subcategories', false, 'Should have thrown error');
    } catch (error: any) {
      if (error.message.includes('subcategories')) {
        logTest('Prevent deleting category with subcategories', true, error.message);
      } else {
        logTest('Prevent deleting category with subcategories', false, 'Wrong error', error.message);
      }
    }
    
    // Clean up
    await storage.deleteSubcategory(testSubcat.id);
    await storage.deleteCategory(testCat.id);
    
  } catch (error: any) {
    logTest('Delete protection with subcategories', false, undefined, error.message);
  }
}

async function testAuditLogging() {
  console.log('\n=== Testing Audit Logging ===');
  
  try {
    // Create a test resource
    const testResource = await storage.createResource({
      title: 'Test Resource for Deletion',
      url: 'https://example.com/test-' + Date.now(),
      category: 'General Tools',
      status: 'approved'
    });
    
    console.log(`  Test resource created with ID: ${testResource.id}`);
    
    // Check if creation audit log was created
    const creationLogs = await storage.getResourceAuditLog(testResource.id, 10);
    console.log(`  Creation audit logs: ${creationLogs.length} entries - actions: ${creationLogs.map((l: any) => l.action).join(', ')}`);
    
    // Delete it
    try {
      await storage.deleteResource(testResource.id);
      console.log(`  Resource deleted successfully`);
    } catch (error: any) {
      console.log(`  ERROR deleting resource: ${error.message}`);
      throw error;
    }
    
    console.log(`  Checking deletion audit log via storage layer...`);
    
    // Now we can use the storage layer method which uses originalResourceId
    const auditLogs = await storage.getResourceAuditLog(testResource.id, 10);
    
    console.log(`  Found ${auditLogs.length} audit log entries`);
    
    // Find the deletion log
    const deleteLog = auditLogs.find((log: any) => log.action === 'deleted');
    
    if (deleteLog) {
      logTest(
        'Create audit log on resource deletion',
        true,
        `Found audit log with action='${deleteLog.action}', resourceId=${deleteLog.resourceId}, originalResourceId=${deleteLog.originalResourceId}, notes='${deleteLog.notes}'`
      );
    } else {
      console.log(`  All logs:`, auditLogs.map((l: any) => `${l.action} (resourceId=${l.resourceId}, originalResourceId=${l.originalResourceId})`).join(', '));
      logTest('Create audit log on resource deletion', false, 'No deletion audit log found');
    }
    
  } catch (error: any) {
    logTest('Audit logging test', false, undefined, error.message);
  }
  
  // Test 9: Regression test - verify old logs without originalResourceId are still retrievable
  try {
    console.log('\n=== Testing Backward Compatibility (Old Audit Logs) ===');
    
    // Create a test resource
    const oldStyleResource = await storage.createResource({
      title: 'Old Style Audit Test',
      url: `https://example.com/old-audit-${Date.now()}`,
      description: 'Testing backward compatibility',
      category: 'Intro & Learning',
      status: 'approved',
      tags: []
    });
    
    console.log(`  Created test resource ID: ${oldStyleResource.id}`);
    
    // Manually insert an old-style audit log (without originalResourceId)
    await db.execute(sql`
      INSERT INTO resource_audit_log (resource_id, action, notes)
      VALUES (${oldStyleResource.id}, 'old_style_update', 'This is an old audit log without originalResourceId')
    `);
    
    console.log(`  Inserted old-style audit log (no originalResourceId)`);
    
    // Retrieve audit logs via storage API
    const logs = await storage.getResourceAuditLog(oldStyleResource.id, 10);
    
    console.log(`  Retrieved ${logs.length} audit logs via storage API`);
    
    // Find the old-style log
    const oldStyleLog = logs.find((l: any) => l.action === 'old_style_update');
    
    if (oldStyleLog) {
      logTest(
        'Retrieve old audit logs without originalResourceId',
        true,
        `Successfully retrieved old-style log with resourceId=${oldStyleLog.resourceId}, originalResourceId=${oldStyleLog.originalResourceId}`
      );
    } else {
      console.log(`  All retrieved logs:`, logs.map((l: any) => `${l.action} (resId=${l.resourceId}, origId=${l.originalResourceId})`).join(', '));
      logTest('Retrieve old audit logs without originalResourceId', false, 'Old-style audit log not found via storage API');
    }
    
    // Clean up
    await storage.deleteResource(oldStyleResource.id, 'admin');
    
  } catch (error: any) {
    logTest('Backward compatibility test', false, undefined, error.message);
  }
}

async function testAwesomeLintValidation() {
  console.log('\n=== Testing awesome-lint Validation in GitHub Export ===');
  
  try {
    const { GitHubSyncService } = await import('../server/github/syncService');
    const { AwesomeListFormatter } = await import('../server/github/formatter');
    
    // Get some test resources
    const { resources } = await storage.listResources({ 
      page: 1, 
      limit: 10, 
      status: 'approved' 
    });
    
    if (resources.length === 0) {
      logTest('awesome-lint validation test', false, 'No resources found');
      return;
    }
    
    // Test 1: Valid markdown should pass
    const formatter = new AwesomeListFormatter(resources, {
      title: 'Test Awesome List',
      description: 'A test awesome list',
      includeContributing: true,
      includeLicense: true,
      websiteUrl: 'https://example.com',
      repoUrl: 'https://github.com/test/test'
    });
    
    const validMarkdown = formatter.generate();
    
    const { validateAwesomeList } = await import('../server/validation/awesomeLint');
    const validationResult = validateAwesomeList(validMarkdown);
    
    if (validationResult.valid) {
      logTest(
        'awesome-lint validates generated markdown',
        true,
        `Passed with ${validationResult.warnings.length} warnings, 0 errors`
      );
    } else {
      logTest(
        'awesome-lint validates generated markdown',
        false,
        `Failed with ${validationResult.errors.length} errors`,
        validationResult.errors.map(e => `Line ${e.line}: ${e.message}`).join(', ')
      );
    }
    
    // Test 2: Invalid markdown should fail
    const invalidMarkdown = `# Invalid List
    
No awesome badge here!

- [Bad Item](http://example.com/) - description without capital.
`;
    
    const invalidResult = validateAwesomeList(invalidMarkdown);
    
    if (!invalidResult.valid && invalidResult.errors.length > 0) {
      logTest(
        'awesome-lint catches validation errors',
        true,
        `Correctly found ${invalidResult.errors.length} errors`
      );
    } else {
      logTest('awesome-lint catches validation errors', false, 'Should have found errors');
    }
    
  } catch (error: any) {
    logTest('awesome-lint validation test', false, undefined, error.message);
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Storage Layer Fixes - Integration Test Suite         ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  try {
    await testSlugUniqueness();
    await testDeleteProtection();
    await testAuditLogging();
    await testAwesomeLintValidation();
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Test Results Summary                                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    
    console.log(`\nTotal Tests: ${total}`);
    console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
    console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n\x1b[31mFailed Tests:\x1b[0m');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}`);
        if (r.error) console.log(`    Error: ${r.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n\x1b[32m✓ All tests passed!\x1b[0m');
      process.exit(0);
    }
    
  } catch (error: any) {
    console.error('\n\x1b[31mTest suite failed:\x1b[0m', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
