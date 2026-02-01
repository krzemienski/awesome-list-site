import { fetchUrlMetadata } from './urlScraper.js';

async function testBlurhash() {
  console.log('Testing blurhash generation with sample URLs...\n');

  // Test URLs with known OG images
  const testUrls = [
    'https://github.com',
    'https://openai.com',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  ];

  for (const url of testUrls) {
    console.log(`\nFetching metadata for: ${url}`);
    console.log('-'.repeat(60));

    try {
      const metadata = await fetchUrlMetadata(url);

      if (metadata.error) {
        console.log('❌ Error:', metadata.error);
        continue;
      }

      console.log('Title:', metadata.ogTitle || metadata.title || 'N/A');
      console.log('OG Image:', metadata.ogImage || 'N/A');
      console.log('Blurhash:', metadata.ogImageBlurhash || 'N/A');

      if (metadata.ogImage && metadata.ogImageBlurhash) {
        console.log('✅ Blurhash generated successfully');
        console.log('   Length:', metadata.ogImageBlurhash.length);
      } else if (metadata.ogImage && !metadata.ogImageBlurhash) {
        console.log('⚠️  OG image found but blurhash generation failed');
      } else {
        console.log('ℹ️  No OG image found');
      }

    } catch (error: any) {
      console.log('❌ Exception:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
}

// Run the test
testBlurhash().catch(console.error);
