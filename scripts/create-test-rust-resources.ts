import { storage } from '../server/storage';

async function createTestResources() {
  console.log('Creating 10 test Rust resources for bulk operations testing...');

  const testResources = [
    { title: 'Test Rust CLI Tool 1', url: 'https://github.com/test/cli-1', description: 'Test CLI tool for bulk operations.', category: 'Development tools', subcategory: 'Build system' },
    { title: 'Test Rust Library 2', url: 'https://github.com/test/lib-2', description: 'Test library for bulk operations.', category: 'Libraries', subcategory: 'Database' },
    { title: 'Test Rust App 3', url: 'https://github.com/test/app-3', description: 'Test application for bulk operations.', category: 'Applications', subcategory: 'System tools' },
    { title: 'Test Rust Tool 4', url: 'https://github.com/test/tool-4', description: 'Test tool for bulk operations.', category: 'Development tools', subcategory: 'Testing' },
    { title: 'Test Rust Framework 5', url: 'https://github.com/test/framework-5', description: 'Test framework for bulk operations.', category: 'Libraries', subcategory: 'Web programming' },
    { title: 'Test Rust Utility 6', url: 'https://github.com/test/util-6', description: 'Test utility for bulk operations.', category: 'Applications', subcategory: 'Utilities' },
    { title: 'Test Rust Parser 7', url: 'https://github.com/test/parser-7', description: 'Test parser for bulk operations.', category: 'Libraries', subcategory: 'Parsing' },
    { title: 'Test Rust Game 8', url: 'https://github.com/test/game-8', description: 'Test game for bulk operations.', category: 'Applications', subcategory: 'Games' },
    { title: 'Test Rust Crypto 9', url: 'https://github.com/test/crypto-9', description: 'Test crypto library for bulk operations.', category: 'Libraries', subcategory: 'Cryptography' },
    { title: 'Test Rust Server 10', url: 'https://github.com/test/server-10', description: 'Test server for bulk operations.', category: 'Applications', subcategory: 'Web Servers' },
  ];

  const createdIds: string[] = [];

  for (const resource of testResources) {
    try {
      const created = await storage.createResource({
        ...resource,
        status: 'pending', // All start as pending for bulk approve test
        githubSynced: false,
      });

      createdIds.push(created.id);
      console.log(`✓ Created: ${resource.title} (ID: ${created.id})`);
    } catch (error: any) {
      console.error(`✗ Failed to create ${resource.title}:`, error.message);
    }
  }

  console.log(`\n✅ Created ${createdIds.length} test resources`);
  console.log('IDs:', createdIds.join(', '));

  // Save IDs for bulk operations test
  const fs = await import('fs/promises');
  await fs.writeFile('/tmp/test-resource-ids.json', JSON.stringify(createdIds, null, 2));
  console.log('Saved IDs to /tmp/test-resource-ids.json');

  return createdIds;
}

createTestResources();
