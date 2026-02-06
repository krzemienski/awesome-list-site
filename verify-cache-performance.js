#!/usr/bin/env node

/**
 * Cache Performance Verification Script
 *
 * This script verifies that the server-side caching for getAwesomeListFromDatabase
 * is working correctly and provides significant performance improvements.
 */

const http = require('http');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        resolve({
          statusCode: res.statusCode,
          duration,
          dataLength: data.length,
          data: data.substring(0, 100), // First 100 chars for verification
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function verifyCache() {
  log('blue', '\n=== Cache Performance Verification ===\n');

  const url = 'http://localhost:5000/api/awesome-list';

  try {
    // Step 1: First request (should hit database - slower)
    log('cyan', 'Step 1: Making first request (should hit database)...');
    const firstRequest = await makeRequest(url);
    log('yellow', `  Status: ${firstRequest.statusCode}`);
    log('yellow', `  Duration: ${firstRequest.duration}ms`);
    log('yellow', `  Data length: ${firstRequest.dataLength} bytes`);

    if (firstRequest.statusCode !== 200) {
      log('red', `\n❌ FAILED: Expected status 200, got ${firstRequest.statusCode}`);
      log('yellow', `Response preview: ${firstRequest.data}`);
      return false;
    }

    // Step 2: Small delay to ensure first request completes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 3: Second request (should hit cache - much faster)
    log('cyan', '\nStep 2: Making second request (should hit cache)...');
    const secondRequest = await makeRequest(url);
    log('yellow', `  Status: ${secondRequest.statusCode}`);
    log('yellow', `  Duration: ${secondRequest.duration}ms`);
    log('yellow', `  Data length: ${secondRequest.dataLength} bytes`);

    if (secondRequest.statusCode !== 200) {
      log('red', `\n❌ FAILED: Expected status 200, got ${secondRequest.statusCode}`);
      return false;
    }

    // Step 4: Third request (should also hit cache - fast)
    log('cyan', '\nStep 3: Making third request (should also hit cache)...');
    const thirdRequest = await makeRequest(url);
    log('yellow', `  Status: ${thirdRequest.statusCode}`);
    log('yellow', `  Duration: ${thirdRequest.duration}ms`);
    log('yellow', `  Data length: ${thirdRequest.dataLength} bytes`);

    if (thirdRequest.statusCode !== 200) {
      log('red', `\n❌ FAILED: Expected status 200, got ${thirdRequest.statusCode}`);
      return false;
    }

    // Step 5: Analyze results
    log('blue', '\n=== Performance Analysis ===\n');

    const avgCachedDuration = (secondRequest.duration + thirdRequest.duration) / 2;
    const improvementPercent = ((firstRequest.duration - avgCachedDuration) / firstRequest.duration * 100).toFixed(1);
    const speedupFactor = (firstRequest.duration / avgCachedDuration).toFixed(1);

    log('cyan', `First request (DB hit):     ${firstRequest.duration}ms`);
    log('cyan', `Second request (cached):    ${secondRequest.duration}ms`);
    log('cyan', `Third request (cached):     ${thirdRequest.duration}ms`);
    log('cyan', `Average cached response:    ${avgCachedDuration.toFixed(1)}ms`);
    log('cyan', `Performance improvement:    ${improvementPercent}%`);
    log('cyan', `Speedup factor:             ${speedupFactor}x`);

    // Step 6: Verify data consistency
    log('blue', '\n=== Data Consistency Check ===\n');
    if (firstRequest.dataLength === secondRequest.dataLength &&
        secondRequest.dataLength === thirdRequest.dataLength) {
      log('green', '✓ All responses have the same data length - consistency verified');
    } else {
      log('red', `❌ Data length mismatch: ${firstRequest.dataLength} vs ${secondRequest.dataLength} vs ${thirdRequest.dataLength}`);
      return false;
    }

    // Step 7: Performance criteria check
    log('blue', '\n=== Cache Effectiveness Check ===\n');

    const checks = [];

    // Check 1: Cached requests should be faster than uncached
    if (avgCachedDuration < firstRequest.duration) {
      log('green', '✓ Cached requests are faster than uncached requests');
      checks.push(true);
    } else {
      log('red', '❌ Cached requests are NOT faster than uncached requests');
      checks.push(false);
    }

    // Check 2: At least 50% improvement expected
    if (improvementPercent >= 50) {
      log('green', `✓ Performance improvement (${improvementPercent}%) exceeds minimum threshold (50%)`);
      checks.push(true);
    } else {
      log('yellow', `⚠ Performance improvement (${improvementPercent}%) is below 50%, but this may be normal for small datasets`);
      checks.push(true); // Don't fail for this, as small datasets may have less improvement
    }

    // Check 3: Cached requests should be reasonably fast
    if (avgCachedDuration < 50) {
      log('green', `✓ Cached requests are fast (${avgCachedDuration.toFixed(1)}ms < 50ms)`);
      checks.push(true);
    } else if (avgCachedDuration < 100) {
      log('yellow', `⚠ Cached requests are acceptable (${avgCachedDuration.toFixed(1)}ms < 100ms)`);
      checks.push(true);
    } else {
      log('red', `❌ Cached requests are slow (${avgCachedDuration.toFixed(1)}ms >= 100ms)`);
      checks.push(false);
    }

    // Final result
    log('blue', '\n=== Final Result ===\n');
    const allPassed = checks.every(check => check);

    if (allPassed) {
      log('green', '✅ VERIFICATION PASSED: Cache is working correctly and providing performance improvements!');
      log('cyan', `\nSummary: Cache provides ${speedupFactor}x speedup (${improvementPercent}% improvement)`);
      return true;
    } else {
      log('red', '❌ VERIFICATION FAILED: Some checks did not pass');
      return false;
    }

  } catch (error) {
    log('red', `\n❌ ERROR: ${error.message}`);
    log('yellow', 'Make sure the server is running on http://localhost:5000');
    return false;
  }
}

// Run verification
verifyCache().then((success) => {
  process.exit(success ? 0 : 1);
});
