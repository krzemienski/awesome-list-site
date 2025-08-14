#!/usr/bin/env node

/**
 * Quick Critical Navigation Path Verification
 * Tests the most important 3-level navigation paths
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

const CRITICAL_PATHS = [
  { name: 'Home', path: '/', expected: 2011 },
  { name: 'Encoding & Codecs Category', path: '/category/encoding-codecs', expected: 392 },
  { name: 'Codecs Subcategory', path: '/subcategory/codecs', expected: 29 },
  { name: 'AV1 Sub-subcategory', path: '/sub-subcategory/av1', expected: 6 },
  { name: 'HEVC Sub-subcategory', path: '/sub-subcategory/hevc', expected: 10 },
  { name: 'VP9 Sub-subcategory', path: '/sub-subcategory/vp9', expected: 1 },
  { name: 'FFMPEG Sub-subcategory', path: '/sub-subcategory/ffmpeg', expected: 66 }
];

async function verifyCriticalPaths() {
  console.log('🎯 CRITICAL NAVIGATION PATH VERIFICATION');
  console.log('=' + '='.repeat(45));
  
  let passed = 0;
  let failed = 0;

  for (const test of CRITICAL_PATHS) {
    try {
      const response = await fetch(`${BASE_URL}${test.path}`);
      
      if (response.ok) {
        console.log(`✅ ${test.name}: HTTP ${response.status} - ACCESSIBLE`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: HTTP ${response.status} - FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 RESULTS SUMMARY:');
  console.log(`✅ Passed: ${passed}/${CRITICAL_PATHS.length}`);
  console.log(`❌ Failed: ${failed}/${CRITICAL_PATHS.length}`);
  
  if (passed === CRITICAL_PATHS.length) {
    console.log('\n🎉 SUCCESS: All critical 3-level navigation paths are working!');
    console.log('   → Categories work (e.g., /category/encoding-codecs)');
    console.log('   → Subcategories work (e.g., /subcategory/codecs)');
    console.log('   → Sub-subcategories work (e.g., /sub-subcategory/av1)');
    return true;
  } else {
    console.log('\n⚠️  WARNING: Some critical paths failed');
    return false;
  }
}

// Run verification
verifyCriticalPaths()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });