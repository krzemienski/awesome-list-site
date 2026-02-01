#!/usr/bin/env node
/**
 * End-to-end test script for category hierarchy CRUD operations
 *
 * This script verifies that the refactored HierarchyRepository pattern
 * works identically to the original implementation by testing:
 * 1. Create category
 * 2. Create subcategory under category
 * 3. Create sub-subcategory under subcategory
 * 4. Update each level
 * 5. Delete in reverse order (sub-subcategory → subcategory → category)
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin'
};

// Test data
const testCategory = {
  name: 'Test Category E2E',
  slug: 'test-category-e2e',
  description: 'End-to-end test category for HierarchyRepository refactor verification',
  icon: '🧪'
};

const testSubcategory = {
  name: 'Test Subcategory E2E',
  slug: 'test-subcategory-e2e',
  description: 'End-to-end test subcategory'
};

const testSubSubcategory = {
  name: 'Test Sub-Subcategory E2E',
  slug: 'test-sub-subcategory-e2e',
  description: 'End-to-end test sub-subcategory'
};

// Store IDs for cleanup
let categoryId, subcategoryId, subSubcategoryId;
let authCookie;

/**
 * Make HTTP request
 */
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (authCookie) {
      options.headers['Cookie'] = authCookie;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        // Save auth cookie if present
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          authCookie = setCookie.map(c => c.split(';')[0]).join('; ');
        }

        try {
          const jsonBody = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, body: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Login as admin
 */
async function login() {
  console.log('\n📝 Logging in as admin...');
  const response = await makeRequest('POST', '/api/login', ADMIN_CREDENTIALS);

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  console.log('✅ Login successful');
  return response;
}

/**
 * Test 1: Create category
 */
async function testCreateCategory() {
  console.log('\n🔵 Test 1: Creating category...');
  const response = await makeRequest('POST', '/api/admin/categories', testCategory);

  if (response.status !== 200) {
    throw new Error(`Failed to create category: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  categoryId = response.body.id;
  console.log(`✅ Category created successfully (ID: ${categoryId})`);
  console.log(`   Name: ${response.body.name}, Slug: ${response.body.slug}`);

  return response.body;
}

/**
 * Test 2: Create subcategory
 */
async function testCreateSubcategory() {
  console.log('\n🔵 Test 2: Creating subcategory...');
  const subcategoryData = {
    ...testSubcategory,
    categoryId
  };

  const response = await makeRequest('POST', '/api/admin/subcategories', subcategoryData);

  if (response.status !== 200) {
    throw new Error(`Failed to create subcategory: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  subcategoryId = response.body.id;
  console.log(`✅ Subcategory created successfully (ID: ${subcategoryId})`);
  console.log(`   Name: ${response.body.name}, Parent Category ID: ${response.body.categoryId}`);

  return response.body;
}

/**
 * Test 3: Create sub-subcategory
 */
async function testCreateSubSubcategory() {
  console.log('\n🔵 Test 3: Creating sub-subcategory...');
  const subSubcategoryData = {
    ...testSubSubcategory,
    subcategoryId
  };

  const response = await makeRequest('POST', '/api/admin/sub-subcategories', subSubcategoryData);

  if (response.status !== 200) {
    throw new Error(`Failed to create sub-subcategory: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  subSubcategoryId = response.body.id;
  console.log(`✅ Sub-subcategory created successfully (ID: ${subSubcategoryId})`);
  console.log(`   Name: ${response.body.name}, Parent Subcategory ID: ${response.body.subcategoryId}`);

  return response.body;
}

/**
 * Test 4: Update category
 */
async function testUpdateCategory() {
  console.log('\n🔵 Test 4: Updating category...');
  const updateData = {
    name: 'Test Category E2E (Updated)',
    description: 'Updated description for end-to-end test'
  };

  const response = await makeRequest('PATCH', `/api/admin/categories/${categoryId}`, updateData);

  if (response.status !== 200) {
    throw new Error(`Failed to update category: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  console.log(`✅ Category updated successfully`);
  console.log(`   New Name: ${response.body.name}`);
  console.log(`   New Description: ${response.body.description}`);

  return response.body;
}

/**
 * Test 5: Update subcategory
 */
async function testUpdateSubcategory() {
  console.log('\n🔵 Test 5: Updating subcategory...');
  const updateData = {
    name: 'Test Subcategory E2E (Updated)',
    description: 'Updated subcategory description'
  };

  const response = await makeRequest('PATCH', `/api/admin/subcategories/${subcategoryId}`, updateData);

  if (response.status !== 200) {
    throw new Error(`Failed to update subcategory: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  console.log(`✅ Subcategory updated successfully`);
  console.log(`   New Name: ${response.body.name}`);

  return response.body;
}

/**
 * Test 6: Update sub-subcategory
 */
async function testUpdateSubSubcategory() {
  console.log('\n🔵 Test 6: Updating sub-subcategory...');
  const updateData = {
    name: 'Test Sub-Subcategory E2E (Updated)',
    description: 'Updated sub-subcategory description'
  };

  const response = await makeRequest('PATCH', `/api/admin/sub-subcategories/${subSubcategoryId}`, updateData);

  if (response.status !== 200) {
    throw new Error(`Failed to update sub-subcategory: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  console.log(`✅ Sub-subcategory updated successfully`);
  console.log(`   New Name: ${response.body.name}`);

  return response.body;
}

/**
 * Test 7: Delete sub-subcategory
 */
async function testDeleteSubSubcategory() {
  console.log('\n🔵 Test 7: Deleting sub-subcategory...');
  const response = await makeRequest('DELETE', `/api/admin/sub-subcategories/${subSubcategoryId}`);

  if (response.status !== 200) {
    throw new Error(`Failed to delete sub-subcategory: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  console.log(`✅ Sub-subcategory deleted successfully`);

  return response.body;
}

/**
 * Test 8: Delete subcategory
 */
async function testDeleteSubcategory() {
  console.log('\n🔵 Test 8: Deleting subcategory...');
  const response = await makeRequest('DELETE', `/api/admin/subcategories/${subcategoryId}`);

  if (response.status !== 200) {
    throw new Error(`Failed to delete subcategory: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  console.log(`✅ Subcategory deleted successfully`);

  return response.body;
}

/**
 * Test 9: Delete category
 */
async function testDeleteCategory() {
  console.log('\n🔵 Test 9: Deleting category...');
  const response = await makeRequest('DELETE', `/api/admin/categories/${categoryId}`);

  if (response.status !== 200) {
    throw new Error(`Failed to delete category: ${response.status} - ${JSON.stringify(response.body)}`);
  }

  console.log(`✅ Category deleted successfully`);

  return response.body;
}

/**
 * Verify server is running
 */
async function checkServer() {
  console.log('🔍 Checking if server is running...');
  try {
    await makeRequest('GET', '/api/categories');
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start the server with: npm run dev');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

/**
 * Cleanup in case of failure
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up...');

  try {
    if (subSubcategoryId) {
      await makeRequest('DELETE', `/api/admin/sub-subcategories/${subSubcategoryId}`);
      console.log('  ✓ Deleted sub-subcategory');
    }
  } catch (e) {
    console.log(`  ⚠️  Could not delete sub-subcategory: ${e.message}`);
  }

  try {
    if (subcategoryId) {
      await makeRequest('DELETE', `/api/admin/subcategories/${subcategoryId}`);
      console.log('  ✓ Deleted subcategory');
    }
  } catch (e) {
    console.log(`  ⚠️  Could not delete subcategory: ${e.message}`);
  }

  try {
    if (categoryId) {
      await makeRequest('DELETE', `/api/admin/categories/${categoryId}`);
      console.log('  ✓ Deleted category');
    }
  } catch (e) {
    console.log(`  ⚠️  Could not delete category: ${e.message}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Category Hierarchy CRUD End-to-End Verification Test');
  console.log('  Testing HierarchyRepository Refactor');
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    // Check if server is running
    const serverRunning = await checkServer();
    if (!serverRunning) {
      process.exit(1);
    }

    // Login
    await login();

    // Run tests in sequence
    await testCreateCategory();
    await testCreateSubcategory();
    await testCreateSubSubcategory();
    await testUpdateCategory();
    await testUpdateSubcategory();
    await testUpdateSubSubcategory();
    await testDeleteSubSubcategory();
    await testDeleteSubcategory();
    await testDeleteCategory();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ ALL TESTS PASSED!');
    console.log('  The refactored HierarchyRepository works correctly.');
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════════');
    console.error('  ❌ TEST FAILED');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error(`  Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);

    // Attempt cleanup
    await cleanup();

    console.error('\n═══════════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run tests
runTests();
