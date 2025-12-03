import { storage } from '../server/storage';

async function checkHierarchy() {
  console.log('🔍 Checking hierarchy state after import...');

  try {
    const categories = await storage.listCategories();
    console.log(`\nCategories table: ${categories.length} total`);

    const rustCategories = categories.filter(c =>
      ['Applications', 'Development tools', 'Libraries', 'Registries', 'Resources'].includes(c.name)
    );

    console.log(`Rust categories found: ${rustCategories.length}`);
    rustCategories.forEach(c => console.log(`  - ${c.name} (slug: ${c.slug})`));

    // Check resources with Rust categories
    const rustResources = await storage.listResources({
      category: 'Applications',
      status: 'approved',
      limit: 10
    });

    console.log(`\nResources in "Applications" category: ${rustResources.total}`);
    console.log('Sample resources:');
    rustResources.resources.slice(0, 5).forEach(r => {
      console.log(`  - ${r.title} (${r.category}/${r.subcategory || 'no-sub'})`);
    });

    // Total count
    const allResources = await storage.listResources({ limit: 1, status: 'approved' });
    console.log(`\nTotal approved resources in database: ${allResources.total}`);

  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

checkHierarchy();
