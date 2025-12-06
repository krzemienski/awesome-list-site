# Import Feature - Code Examples & Recipes

**Version**: v1.1.0
**Purpose**: Practical code examples for common tasks
**Audience**: Developers integrating with import feature

---

## Basic Import

### Example 1: Import via API (JavaScript)

```typescript
async function importAwesomeList(repoUrl: string, adminToken: string) {
  const response = await fetch('http://localhost:3000/api/github/import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      repositoryUrl: repoUrl,
      options: {
        forceOverwrite: false
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Import failed: ${error.message}`);
  }
  
  const data = await response.json();
  console.log(`Import started: ${data.queueId}`);
  console.log(`Status: ${data.status}`);
  
  return data;
}

// Usage:
const result = await importAwesomeList(
  'https://github.com/sindresorhus/awesome',
  'your-jwt-token-here'
);
```

### Example 2: Import with Progress Tracking (SSE)

```typescript
async function importWithProgress(
  repoUrl: string,
  token: string,
  onProgress: (event: ProgressEvent) => void
): Promise<ImportResult> {
  const response = await fetch('http://localhost:3000/api/github/import-stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      repositoryUrl: repoUrl,
      options: {}
    })
  });
  
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const event = JSON.parse(line.slice(6));
        onProgress(event);
        
        if (event.status === 'complete') {
          return {
            imported: event.imported,
            updated: event.updated,
            skipped: event.skipped,
            total: event.total
          };
        } else if (event.status === 'error') {
          throw new Error(event.message);
        }
      }
    }
  }
  
  throw new Error('Stream ended without completion');
}

// Usage with React:
function ImportButton() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  
  const handleImport = async () => {
    try {
      const result = await importWithProgress(
        'https://github.com/krzemienski/awesome-video',
        token,
        (event) => {
          setProgress(event.progress);
          setStatus(event.message);
          
          if (event.deviations) {
            console.log('Deviations:', event.deviations);
          }
        }
      );
      
      alert(`Import complete! Imported: ${result.imported}, Updated: ${result.updated}, Skipped: ${result.skipped}`);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  };
  
  return (
    <div>
      <button onClick={handleImport}>Import</button>
      {progress > 0 && (
        <div>
          <div>{status}</div>
          <progress value={progress} max={100} />
        </div>
      )}
    </div>
  );
}
```

---

## Parser Usage

### Example 3: Parse Markdown Locally

```typescript
import { AwesomeListParser } from './server/github/parser';
import fs from 'fs';

// Read markdown file:
const markdown = fs.readFileSync('awesome-list.md', 'utf-8');

// Create parser:
const parser = new AwesomeListParser(markdown);

// Parse:
const parsed = parser.parse();

console.log('Title:', parsed.title);
console.log('Resources:', parsed.resources.length);
console.log('First resource:', parsed.resources[0]);

// Output:
// Title: Awesome Video
// Resources: 751
// First resource: { title: 'FFmpeg', url: 'https://ffmpeg.org', description: 'Video processing toolkit', category: 'Encoding & Codecs', ... }
```

### Example 4: Extract Hierarchy

```typescript
const parser = new AwesomeListParser(markdown);
const hierarchy = parser.extractHierarchy();

console.log('Categories:', Array.from(hierarchy.categories));
// Output: ['Video Players & Playback Libraries', 'Encoding & Codecs', ...]

console.log('Subcategories:', hierarchy.subcategories);
// Output: Map { 'Mobile Players' => 'Video Players & Playback Libraries', ... }

console.log('Sub-subcategories:', hierarchy.subSubcategories);
// Output: Map { 'iOS/tvOS' => { parent: 'Mobile Players', category: 'Video Players...' }, ... }
```

### Example 5: Detect Format Deviations

```typescript
const parser = new AwesomeListParser(markdown);
const analysis = parser.detectFormatDeviations();

console.log('Deviations:', analysis.deviations);
// Example output: ['Mixed list markers: 829 asterisk (*) vs 6 dash (-) resources']

console.log('Warnings:', analysis.warnings);
// Example output: ['Uses 2-level hierarchy (## → ###) instead of 3-level']

console.log('Can proceed?', analysis.canProceed);
// Output: true (if ≤3 deviations)

// Use in conditional logic:
if (!analysis.canProceed) {
  console.error('Too many deviations, manual review required');
  console.log('Issues:', analysis.deviations);
  return;
}

// Proceed with import:
const resources = parser.parse();
```

---

## AI Parsing

### Example 6: Enable AI Parsing

```typescript
import { AwesomeListParser } from './server/github/parser';

const markdown = `
## Category
* [Normal Resource](https://example.com) - Works fine
* **[Bold Resource](https://example.com)** - Bold title (needs AI)
* [Missing Protocol](example.com) - Needs AI to add https://
`;

// Parse with AI enabled:
const parser = new AwesomeListParser(markdown);
const resources = await parser.extractResourcesWithAI(true);  // Enable AI

console.log('Resources:', resources);
// Output includes:
// - Normal Resource (parsed by regex)
// - Bold Resource (parsed by AI, bold removed)
// - Missing Protocol (parsed by AI, https:// added)

// Check logs for AI activity:
// ✅ AI parsed: "Bold Resource" (line: 3)
// ✅ AI parsed: "Missing Protocol" (line: 4)
```

### Example 7: Estimate AI Cost

```typescript
import { estimateAICost } from './server/ai/parsingAssistant';

const markdown = fs.readFileSync('large-list.md', 'utf-8');
const parser = new AwesomeListParser(markdown);

// Detect how many might fail standard parsing:
const resources = parser.extractResources();  // Standard (no AI)
const totalLines = markdown.split('\n').filter(l => l.startsWith('*')).length;
const failedCount = totalLines - resources.length;

console.log(`Total resource lines: ${totalLines}`);
console.log(`Successfully parsed: ${resources.length}`);
console.log(`Failed parsing: ${failedCount} (would need AI)`);

const estimatedCost = estimateAICost(failedCount);
console.log(`Estimated AI cost: $${estimatedCost.toFixed(4)}`);

// Example output:
// Total resource lines: 1000
// Successfully parsed: 980
// Failed parsing: 20 (would need AI)
// Estimated AI cost: $0.0080

// Decision: Cost is low, enable AI for this import
```

---

## Database Queries

### Example 8: Query Imported Resources

```sql
-- Find all resources from specific import:
SELECT title, url, category, subcategory, sub_subcategory
FROM resources
WHERE metadata->>'sourceList' LIKE '%awesome-video%'
AND github_synced = true
ORDER BY created_at DESC
LIMIT 10;

-- Count by category:
SELECT category, COUNT(*) as count
FROM resources
WHERE github_synced = true
GROUP BY category
ORDER BY count DESC;

-- Find resources imported in last hour:
SELECT title, category, created_at
FROM resources
WHERE created_at > NOW() - INTERVAL '1 hour'
AND github_synced = true;
```

### Example 9: Hierarchy Validation

```sql
-- Check FK integrity (no orphans):
SELECT 'Orphaned Subcategories' as issue, COUNT(*) as count
FROM subcategories s
LEFT JOIN categories c ON c.id = s.category_id
WHERE c.id IS NULL

UNION ALL

SELECT 'Orphaned Sub-subcategories' as issue, COUNT(*) as count
FROM sub_subcategories ss
LEFT JOIN subcategories s ON s.id = ss.subcategory_id
WHERE s.id IS NULL;

-- Expected: 0 for both (no orphans)
```

### Example 10: Find Duplicates

```sql
-- Find duplicate URLs:
SELECT url, COUNT(*) as occurrences, 
       array_agg(id) as resource_ids,
       array_agg(title) as titles
FROM resources
GROUP BY url
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;

-- If duplicates found, keep oldest:
DELETE FROM resources
WHERE id NOT IN (
  SELECT MIN(id) FROM resources GROUP BY url
);
```

---

## Testing Examples

### Example 11: 3-Layer Validation Test

```typescript
// Test: Sub-subcategory filtering (Bug #001 fix)

// Layer 1: API
const apiResponse = await fetch(
  'http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved'
);
const apiData = await apiResponse.json();

console.log('Layer 1 (API):');
console.log('  Status:', apiResponse.status);  // Expected: 200
console.log('  Resource count:', apiData.resources.length);  // Expected: ~30, not 1000
console.log('  Sample resource:', apiData.resources[0].title);
console.assert(apiData.resources.length < 100, 'Too many resources returned!');

// Layer 2: Database
const dbResult = await db.execute(sql`
  SELECT COUNT(*)::int as count FROM resources
  WHERE sub_subcategory = 'iOS/tvOS' AND status = 'approved'
`);

console.log('Layer 2 (Database):');
console.log('  Database count:', dbResult.rows[0].count);  // Expected: ~30
console.assert(
  dbResult.rows[0].count === apiData.resources.length,
  'API and database counts dont match!'
);

// Layer 3: UI (manual check)
console.log('Layer 3 (UI):');
console.log('  Navigate to: http://localhost:3000/sub-subcategory/iostvos');
console.log('  Expected: Shows ~30 iOS/tvOS players');
console.log('  Actual: [Manual verification needed]');
console.log('  Screenshots: desktop.png, tablet.png, mobile.png');

// If all 3 layers pass: ✅ Test PASS
```

### Example 12: Performance Benchmark

```typescript
// Benchmark import performance:
async function benchmarkImport(repoUrl: string) {
  const metrics = {
    fetch: 0,
    parse: 0,
    hierarchy: 0,
    resources: 0,
    total: 0
  };
  
  const totalStart = Date.now();
  
  // Fetch:
  const fetchStart = Date.now();
  const markdown = await client.fetchFile(repoUrl, 'README.md');
  metrics.fetch = Date.now() - fetchStart;
  
  // Parse:
  const parseStart = Date.now();
  const parser = new AwesomeListParser(markdown);
  const parsed = parser.parse();
  metrics.parse = Date.now() - parseStart;
  
  // Hierarchy:
  const hierarchyStart = Date.now();
  const hierarchy = parser.extractHierarchy();
  // ... create in database
  metrics.hierarchy = Date.now() - hierarchyStart;
  
  // Resources:
  const resourcesStart = Date.now();
  // ... import resources
  metrics.resources = Date.now() - resourcesStart;
  
  metrics.total = Date.now() - totalStart;
  
  console.log('Performance Metrics:');
  console.log(`  Fetch: ${metrics.fetch}ms`);
  console.log(`  Parse: ${metrics.parse}ms`);
  console.log(`  Hierarchy: ${metrics.hierarchy}ms`);
  console.log(`  Resources: ${metrics.resources}ms`);
  console.log(`  Total: ${metrics.total}ms`);
  console.log(`  Resources/sec: ${(parsed.resources.length / (metrics.total / 1000)).toFixed(1)}`);
  
  return metrics;
}

// Benchmark both repos:
const videoMetrics = await benchmarkImport('https://github.com/krzemienski/awesome-video');
const rustMetrics = await benchmarkImport('https://github.com/rust-unofficial/awesome-rust');

// Compare:
console.log('\nComparison:');
console.log(`awesome-video: ${videoMetrics.total}ms for ${751} resources`);
console.log(`awesome-rust: ${rustMetrics.total}ms for ${829} resources`);
```

---

## Advanced Usage

### Example 13: Conditional AI Parsing

```typescript
// Enable AI only if standard parsing fails for >5% of resources:
async function smartImport(repoUrl: string) {
  const markdown = await fetchMarkdown(repoUrl);
  const parser = new AwesomeListParser(markdown);
  
  // Try standard parsing first:
  const standardResources = parser.extractResources();
  
  // Count potential resource lines:
  const resourceLines = markdown.split('\n').filter(l => 
    l.trim().startsWith('*') || l.trim().startsWith('-')
  ).length;
  
  const parseSuccessRate = standardResources.length / resourceLines;
  console.log(`Parse success rate: ${(parseSuccessRate * 100).toFixed(1)}%`);
  
  // If success rate < 95%, enable AI:
  if (parseSuccessRate < 0.95) {
    console.log('Low success rate, enabling AI parsing...');
    const aiResources = await parser.extractResourcesWithAI(true);
    console.log(`AI recovered ${aiResources.length - standardResources.length} additional resources`);
    return aiResources;
  }
  
  console.log('High success rate, AI not needed');
  return standardResources;
}
```

### Example 14: Custom Deviation Thresholds

```typescript
// Relax deviation threshold for known non-standard repos:
function canImportWithDeviations(repoUrl: string, deviations: string[]): boolean {
  // Whitelist of repos with acceptable deviations:
  const knownNonStandard = [
    'https://github.com/rust-unofficial/awesome-rust',  // Has metadata sections
    // Add more as discovered
  ];
  
  if (knownNonStandard.includes(repoUrl)) {
    return deviations.length <= 5;  // More lenient
  }
  
  return deviations.length <= 3;  // Standard threshold
}

// Usage:
const analysis = parser.detectFormatDeviations();
if (!canImportWithDeviations(repoUrl, analysis.deviations)) {
  throw new Error('Too many deviations for unknown repository');
}
```

### Example 15: Selective Category Import

```typescript
// Import only specific categories:
async function importSelectedCategories(
  repoUrl: string,
  allowedCategories: string[]
) {
  const markdown = await fetchMarkdown(repoUrl);
  const parser = new AwesomeListParser(markdown);
  const parsed = parser.parse();
  
  // Filter resources:
  const filtered = parsed.resources.filter(r => 
    allowedCategories.includes(r.category)
  );
  
  console.log(`Filtered: ${filtered.length} of ${parsed.resources.length} resources`);
  console.log(`Categories: ${allowedCategories.join(', ')}`);
  
  // Import only filtered:
  for (const resource of filtered) {
    await storage.createResource(resource);
  }
  
  return { imported: filtered.length };
}

// Usage:
await importSelectedCategories(
  'https://github.com/rust-unofficial/awesome-rust',
  ['Applications', 'Development tools']  // Skip Libraries
);
```

---

## Error Handling

### Example 16: Robust Import with Retries

```typescript
async function importWithRetry(
  repoUrl: string,
  token: string,
  maxRetries: number = 3
): Promise<ImportResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Import attempt ${attempt}/${maxRetries}...`);
      
      const result = await importRepository(repoUrl, token);
      
      console.log(`Success on attempt ${attempt}`);
      return result;
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on client errors (400, 401, 403):
      if (error.status && error.status < 500) {
        throw error;  // Permanent error, don't retry
      }
      
      // Wait before retry (exponential backoff):
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;  // 2s, 4s, 8s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Import failed after ${maxRetries} attempts`);
      }
    }
  }
  
  throw new Error('Should not reach here');
}

// Usage:
try {
  const result = await importWithRetry(
    'https://github.com/unstable/repo',
    token,
    3  // Try up to 3 times
  );
  console.log('Import succeeded:', result);
} catch (error) {
  console.error('Import failed permanently:', error);
  // Notify admin, log to monitoring system, etc.
}
```

### Example 17: Graceful Degradation

```typescript
// Import with fallbacks:
async function importWithFallbacks(repoUrl: string, token: string) {
  try {
    // Try SSE (real-time progress):
    return await importWithProgress(repoUrl, token, (e) => console.log(e));
  } catch (error) {
    console.warn('SSE import failed, falling back to standard:', error);
    
    try {
      // Fallback to standard import:
      return await importStandard(repoUrl, token);
    } catch (error2) {
      console.error('Standard import also failed:', error2);
      
      // Last resort: Manual notification:
      await notifyAdmin({
        message: `Import failed for ${repoUrl}`,
        error: error2.message,
        repo: repoUrl
      });
      
      throw error2;
    }
  }
}
```

---

## Monitoring & Observability

### Example 18: Track Import Metrics

```typescript
interface ImportMetrics {
  repoUrl: string;
  duration: number;
  resourcesImported: number;
  resourcesUpdated: number;
  resourcesSkipped: number;
  parseErrors: number;
  deviations: number;
  success: boolean;
  timestamp: Date;
}

async function trackImport(repoUrl: string): Promise<ImportMetrics> {
  const metrics: ImportMetrics = {
    repoUrl,
    duration: 0,
    resourcesImported: 0,
    resourcesUpdated: 0,
    resourcesSkipped: 0,
    parseErrors: 0,
    deviations: 0,
    success: false,
    timestamp: new Date()
  };
  
  const startTime = Date.now();
  
  try {
    const result = await syncService.importFromGitHub(repoUrl, {});
    
    metrics.duration = Date.now() - startTime;
    metrics.resourcesImported = result.imported;
    metrics.resourcesUpdated = result.updated;
    metrics.resourcesSkipped = result.skipped;
    metrics.parseErrors = result.errors.length;
    metrics.success = result.errors.length === 0;
    
    // Save to metrics database or send to analytics:
    await saveMetrics(metrics);
    
    // Log to console:
    console.log('Import Metrics:', JSON.stringify(metrics, null, 2));
    
    return metrics;
  } catch (error) {
    metrics.duration = Date.now() - startTime;
    metrics.success = false;
    await saveMetrics(metrics);
    throw error;
  }
}

async function saveMetrics(metrics: ImportMetrics) {
  // Option A: Save to database:
  await db.insert(importMetrics).values(metrics);
  
  // Option B: Send to external service (Datadog, CloudWatch, etc.):
  await fetch('https://metrics.example.com/import', {
    method: 'POST',
    body: JSON.stringify(metrics)
  });
  
  // Option C: Just log (simple):
  console.log('[METRICS]', JSON.stringify(metrics));
}
```

### Example 19: Alert on Import Failures

```typescript
async function importWithAlerting(repoUrl: string) {
  try {
    const result = await syncService.importFromGitHub(repoUrl, {});
    
    // Check for anomalies:
    if (result.errors.length > 0) {
      await sendAlert({
        level: 'warning',
        title: 'Import completed with errors',
        details: `${result.errors.length} errors during import of ${repoUrl}`,
        errors: result.errors
      });
    }
    
    // Check parse success rate:
    const total = result.imported + result.updated + result.skipped;
    const errorRate = result.errors.length / total;
    if (errorRate > 0.1) {  // >10% error rate
      await sendAlert({
        level: 'error',
        title: 'High parse error rate',
        details: `${(errorRate * 100).toFixed(1)}% of resources failed to parse from ${repoUrl}`
      });
    }
    
    return result;
  } catch (error: any) {
    // Critical: Import failed completely
    await sendAlert({
      level: 'critical',
      title: 'Import failed',
      details: `Import of ${repoUrl} failed: ${error.message}`,
      error: error.stack
    });
    
    throw error;
  }
}

async function sendAlert(alert: Alert) {
  // Implement based on your alerting system:
  // - Email
  // - Slack
  // - PagerDuty
  // - etc.
  
  console.error('[ALERT]', alert);
}
```

---

## Batch Operations

### Example 20: Import Multiple Repositories

```typescript
async function batchImport(repos: string[], token: string) {
  const results = [];
  
  for (const repo of repos) {
    console.log(`\nImporting ${repo}...`);
    
    try {
      const result = await importWithProgress(repo, token, (event) => {
        console.log(`  ${event.progress}%: ${event.message}`);
      });
      
      results.push({
        repo,
        success: true,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped
      });
      
      console.log(`✅ ${repo}: Success`);
    } catch (error: any) {
      results.push({
        repo,
        success: false,
        error: error.message
      });
      
      console.log(`❌ ${repo}: Failed - ${error.message}`);
    }
    
    // Pause between imports (be nice to servers):
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Summary:
  const successful = results.filter(r => r.success).length;
  console.log(`\nBatch Import Complete:`);
  console.log(`  Successful: ${successful}/${repos.length}`);
  console.log(`  Failed: ${repos.length - successful}`);
  
  return results;
}

// Usage:
const repos = [
  'https://github.com/sindresorhus/awesome',
  'https://github.com/avelino/awesome-go',
  'https://github.com/vinta/awesome-python'
];

const results = await batchImport(repos, token);
```

---

## Utility Functions

### Example 21: Convert Database Resources to Markdown

```typescript
async function exportToMarkdown(categoryName: string): Promise<string> {
  // Fetch resources:
  const { resources } = await storage.listResources({
    category: categoryName,
    status: 'approved',
    limit: 10000
  });
  
  // Group by subcategory:
  const bySubcategory = new Map<string, Resource[]>();
  for (const resource of resources) {
    const sub = resource.subcategory || 'Uncategorized';
    if (!bySubcategory.has(sub)) {
      bySubcategory.set(sub, []);
    }
    bySubcategory.get(sub)!.push(resource);
  }
  
  // Generate markdown:
  let markdown = `# ${categoryName}\n\n`;
  
  for (const [subcategory, resources] of bySubcategory) {
    markdown += `## ${subcategory}\n\n`;
    
    for (const resource of resources) {
      markdown += `* [${resource.title}](${resource.url})`;
      if (resource.description) {
        markdown += ` - ${resource.description}`;
      }
      markdown += '\n';
    }
    
    markdown += '\n';
  }
  
  return markdown;
}

// Usage:
const markdown = await exportToMarkdown('Applications');
fs.writeFileSync('applications.md', markdown);
console.log('Exported to applications.md');
```

### Example 22: Validate Repository Before Import

```typescript
async function validateRepository(repoUrl: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    issues: [],
    warnings: []
  };
  
  try {
    // 1. Check if reachable:
    const markdown = await client.fetchFile(repoUrl, 'README.md');
    
    // 2. Parse:
    const parser = new AwesomeListParser(markdown);
    const parsed = parser.parse();
    
    // 3. Check minimum requirements:
    if (parsed.resources.length === 0) {
      result.valid = false;
      result.issues.push('No resources found in README');
    }
    
    if (parsed.resources.length < 10) {
      result.warnings.push(`Only ${parsed.resources.length} resources (seems low)`);
    }
    
    // 4. Detect deviations:
    const deviations = parser.detectFormatDeviations();
    if (!deviations.canProceed) {
      result.valid = false;
      result.issues.push(`Too many deviations (${deviations.deviations.length})`);
      result.issues.push(...deviations.deviations);
    } else if (deviations.warnings.length > 0) {
      result.warnings.push(...deviations.warnings);
    }
    
    // 5. Check for awesome-lint compliance (future):
    // const lintResult = await runAwesomeLint(markdown);
    // if (lintResult.errors > 50) {
    //   result.warnings.push(`${lintResult.errors} awesome-lint errors`);
    // }
    
  } catch (error: any) {
    result.valid = false;
    result.issues.push(`Failed to fetch/parse: ${error.message}`);
  }
  
  return result;
}

// Usage:
const validation = await validateRepository('https://github.com/owner/repo');

if (!validation.valid) {
  console.error('Repository validation failed:');
  validation.issues.forEach(issue => console.error('  -', issue));
  return;
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:');
  validation.warnings.forEach(warn => console.warn('  -', warn));
}

console.log('✅ Repository is valid, proceeding with import...');
```

---

## Integration Examples

### Example 23: Webhook Handler (Future Feature)

```typescript
// POST /webhooks/github - Auto-import on README.md changes
app.post('/webhooks/github', async (req, res) => {
  // 1. Verify signature:
  const signature = req.headers['x-hub-signature-256'];
  const isValid = verifyGitHubSignature(req.body, signature, process.env.WEBHOOK_SECRET!);
  
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid signature' });
  }
  
  // 2. Check if README.md was modified:
  const { repository, commits } = req.body;
  const readmeChanged = commits.some((commit: any) => 
    commit.added.includes('README.md') || commit.modified.includes('README.md')
  );
  
  if (!readmeChanged) {
    return res.json({ message: 'README not changed, skipping import' });
  }
  
  // 3. Trigger import:
  const repoUrl = repository.html_url;
  console.log(`Webhook triggered import for ${repoUrl}`);
  
  // Import in background (don't block webhook response):
  syncService.importFromGitHub(repoUrl, {})
    .then(result => {
      console.log(`Webhook import completed for ${repoUrl}:`, result);
    })
    .catch(error => {
      console.error(`Webhook import failed for ${repoUrl}:`, error);
    });
  
  // Respond immediately:
  res.json({ message: 'Import triggered', repository: repoUrl });
});

function verifyGitHubSignature(payload: any, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

### Example 24: Scheduled Imports (Cron)

```typescript
import cron from 'node-cron';

// Schedule daily imports:
cron.schedule('0 2 * * *', async () => {  // 2 AM daily
  console.log('Running scheduled imports...');
  
  // Get repositories to sync:
  const repos = await db.select().from(scheduledImports).where(eq(scheduledImports.enabled, true));
  
  for (const repo of repos) {
    try {
      console.log(`Importing ${repo.url}...`);
      const result = await syncService.importFromGitHub(repo.url, {});
      
      console.log(`✅ ${repo.url}: ${result.imported} new, ${result.updated} updated`);
      
      // Update last sync time:
      await db.update(scheduledImports)
        .set({ lastSyncAt: new Date() })
        .where(eq(scheduledImports.id, repo.id));
        
    } catch (error) {
      console.error(`❌ ${repo.url}: Failed -`, error);
      
      // Update error count:
      await db.update(scheduledImports)
        .set({ 
          consecutiveErrors: sql`${scheduledImports.consecutiveErrors} + 1`,
          lastError: error.message
        })
        .where(eq(scheduledImports.id, repo.id));
    }
  }
  
  console.log('Scheduled imports complete');
});

// Disable repo if too many consecutive errors:
cron.schedule('0 3 * * *', async () => {  // 3 AM daily
  await db.update(scheduledImports)
    .set({ enabled: false })
    .where(sql`${scheduledImports.consecutiveErrors} >= 5`);
    
  console.log('Disabled repos with 5+ consecutive errors');
});
```

---

## Testing Recipes

### Example 25: Create Test Resources

```typescript
// Create test resources for development:
async function seedTestResources() {
  const testResources = [
    {
      title: 'Test Video Player',
      url: 'https://test.com/player',
      description: 'Test resource for development',
      category: 'Video Players & Playback Libraries',
      subcategory: 'Web Players',
      subSubcategory: null,
      status: 'approved',
      githubSynced: false
    },
    {
      title: 'Test iOS Player',
      url: 'https://test.com/ios-player',
      description: 'Test iOS resource',
      category: 'Video Players & Playback Libraries',
      subcategory: 'Mobile Players',
      subSubcategory: 'iOS/tvOS',
      status: 'approved',
      githubSynced: false
    }
  ];
  
  for (const resource of testResources) {
    await storage.createResource(resource);
  }
  
  console.log(`Created ${testResources.length} test resources`);
}

// Cleanup:
async function cleanupTestResources() {
  await db.delete(resources).where(sql`${resources.url} LIKE 'https://test.com/%'`);
  console.log('Cleaned up test resources');
}
```

### Example 26: Mock GitHub Responses

```typescript
// For testing without hitting GitHub:
class MockGitHubClient extends GitHubClient {
  async fetchFile(repoUrl: string, path: string, branch?: string): Promise<string> {
    // Return mock markdown:
    return `
# Awesome Test

## Category One
* [Resource A](https://example.com/a) - Description A
* [Resource B](https://example.com/b) - Description B

## Category Two
* [Resource C](https://example.com/c) - Description C
    `;
  }
}

// Use in tests:
const mockClient = new MockGitHubClient();
const markdown = await mockClient.fetchFile('mock://repo', 'README.md');
// Returns: Mock markdown (fast, no network)
```

---

## Performance Testing

### Example 27: Load Test Import Endpoint

```typescript
// Artillery config (artillery.yml):
/*
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5  # 5 requests per second

scenarios:
  - name: "Import Load Test"
    flow:
      - post:
          url: "/api/github/import"
          headers:
            Authorization: "Bearer {{token}}"
            Content-Type: "application/json"
          json:
            repositoryUrl: "https://github.com/sindresorhus/awesome"
            options: {}
*/

// Run: artillery run artillery.yml
// Metrics: Response times, success rate, errors
```

### Example 28: Benchmark Parser Performance

```typescript
async function benchmarkParser() {
  const sizes = [100, 500, 1000, 5000, 10000];
  
  for (const size of sizes) {
    // Generate test markdown:
    const markdown = generateMockMarkdown(size);  // Creates markdown with N resources
    
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const parser = new AwesomeListParser(markdown);
      const resources = parser.extractResources();
      const end = performance.now();
      
      times.push(end - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const perResource = avg / size;
    
    console.log(`${size} resources: ${avg.toFixed(1)}ms total, ${perResource.toFixed(3)}ms per resource`);
  }
}

// Example output:
// 100 resources: 12.3ms total, 0.123ms per resource
// 500 resources: 58.7ms total, 0.117ms per resource
// 1000 resources: 115.2ms total, 0.115ms per resource
// 5000 resources: 576.8ms total, 0.115ms per resource
// 10000 resources: 1152.4ms total, 0.115ms per resource
// Conclusion: Linear scaling, O(N) complexity ✅
```

---

## Quick Reference

**Import a repo:**
```bash
curl -X POST http://localhost:3000/api/github/import \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"repositoryUrl":"https://github.com/owner/repo"}'
```

**Test sub-subcategory filtering:**
```bash
curl "http://localhost:3000/api/resources?subSubcategory=iOS%2FtvOS&status=approved"
```

**Check import history:**
```bash
curl http://localhost:3000/api/github/sync-history \
  -H "Authorization: Bearer $TOKEN"
```

**Parse markdown locally:**
```typescript
import { AwesomeListParser } from './server/github/parser';
const parser = new AwesomeListParser(markdown);
const resources = parser.extractResources();
```

**Detect deviations:**
```typescript
const analysis = parser.detectFormatDeviations();
console.log(analysis.canProceed ? 'Safe to import' : 'Manual review needed');
```

---

**Examples Version**: 1.0
**Last Updated**: 2025-12-05
**Covers**: v1.1.0 import feature
**Total Examples**: 28 code samples
