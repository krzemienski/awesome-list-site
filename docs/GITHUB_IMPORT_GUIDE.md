# GitHub Import Guide

## Overview

Import any awesome list repository following the [awesome list specification](https://github.com/sindresorhus/awesome) into your database with intelligent format handling and real-time progress tracking.

**Tested Repositories:**
- ✅ [krzemienski/awesome-video](https://github.com/krzemienski/awesome-video) - 751 resources, 2-level hierarchy
- ✅ [rust-unofficial/awesome-rust](https://github.com/rust-unofficial/awesome-rust) - 829 resources, mixed 2/3-level hierarchy

---

## How to Import

### Via Admin UI

1. Login as admin
2. Navigate to `/admin` → Click "GitHub Sync" tab
3. Enter repository URL:
   - Format: `owner/repository` OR  
   - Full URL: `https://github.com/owner/repository`
4. Click "Import Resources"
5. Monitor progress bar (real-time updates)
6. Review deviation warnings if any appear
7. Wait for "Import Complete!" notification

### Via API

```bash
# Standard import (background processing)
curl -X POST http://localhost:3000/api/github/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/owner/awesome-topic",
    "options": { "forceOverwrite": false }
  }'

# Streaming import (real-time progress)
curl -X POST http://localhost:3000/api/github/import-stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/owner/awesome-topic",
    "options": { "forceOverwrite": false }
  }'
# Returns: Server-sent events with progress updates
```

---

## Format Requirements

### Standard Structure

**Expected hierarchy:**
```
## Category              ← Becomes categories table entry
### Subcategory          ← Becomes subcategories table entry
#### Sub-subcategory     ← Becomes sub_subcategories table entry (optional)
* [Resource](URL) - Description.   ← Becomes resources table entry
```

### Supported Variations

**List Markers:**
- `* [Title](URL)` - Asterisk (standard)
- `- [Title](URL)` - Dash (common variation)
- Both supported, mixed markers detected as deviation

**Descriptions:**
- `- [Title](URL) - Description` - Standard
- `- [Title](URL)` - Missing description (empty string used)
- Both supported

**Separators:**
- `-` Dash (standard)
- `–` Em-dash (supported)
- `:` Colon (supported)

**Hierarchy Depth:**
- 2-level (## → ###) - Fully supported
- 3-level (## → ### → ####) - Fully supported
- Detected automatically, no configuration needed

### Metadata Sections (Auto-Filtered)

**Sections NOT imported as categories:**
- License
- Contributing
- Contributors
- Code of Conduct
- Registries (awesome-rust specific)
- Resources (awesome-rust specific)
- Table of Contents

---

## Format Deviation Handling

### Automatic Detection

During import, the system analyzes markdown and detects:
1. Badge presence/absence
2. List marker consistency
3. Description coverage
4. Hierarchy depth
5. Metadata section presence
6. Badge prevalence in descriptions

### Deviation Severity

**Can Proceed (≤3 deviations):**
- Import continues automatically
- Yellow warning card shows issues
- Non-critical deviations handled gracefully

**Manual Review Required (>3 deviations):**
- Import paused
- User shown list of all deviations
- Recommendation to fix source markdown first

### Example Deviations

**awesome-video:**
- Deviations: 0
- Warnings: 1 (2-level hierarchy)
- Result: ✅ Safe to import

**awesome-rust:**
- Deviations: 2 (mixed markers, metadata sections)
- Warnings: 4 (missing badge, 23% missing descriptions, #### detected, badges in content)
- Result: ✅ Safe to import (≤3 threshold)

---

## AI-Assisted Parsing

### When It's Used

AI parsing is **OPT-IN** and disabled by default. Enable it for:
- Lists with known malformed resources
- Edge cases that fail standard regex
- Experimental or non-standard awesome lists

### How to Enable

Currently requires code change (will add UI toggle in future):

```typescript
// In syncService.ts:
const parser = new AwesomeListParser(markdown);
const resources = await parser.extractResourcesWithAI(true); // Enable AI
```

### What It Handles

- Bold titles: `**[Title](url)**`
- Missing protocols in URLs
- Complex URL patterns
- Multiple markdown formats
- Ambiguous separators

### Cost

- Model: Claude Haiku 4.5
- Cost per line: ~$0.0004
- Typical usage: <2% of resources need AI
- Example: 1000 resource list with 5% edge cases = ~$0.02

---

## Progress Tracking

### Real-Time Updates

**Phases Displayed:**
1. **Fetching (10%)** - Downloading README from GitHub
2. **Parsing (30%)** - Extracting resources and hierarchy
3. **Analyzing (40%)** - Detecting format deviations
4. **Creating Hierarchy (50%)** - Populating category tables
5. **Importing Resources (50-100%)** - Creating resource entries

**UI Indicators:**
- Progress bar with percentage
- Status text ("Fetching...", "Parsing...", etc.)
- Resource counter (current/total)
- Imported/updated/skipped stats

### Status Messages

```
✓ Import Complete!
  Imported: 42
  Updated: 15
  Skipped: 694 (already existed)
```

---

## Validation After Import

### Automatic Checks

1. ✅ All resources have valid category references (no orphans)
2. ✅ No duplicate URLs (deduplication during import)
3. ✅ Hierarchy tables populated (categories, subcategories, sub-subcategories)
4. ✅ Sync history recorded
5. ✅ Audit log entries created

### Manual Verification (Recommended)

1. Navigate to a few imported categories
2. Verify resources display correctly
3. Test search for repo-specific terms
4. Export and run awesome-lint
5. Check for any layout issues

---

## Troubleshooting

### Import Fails with "Parse Error"

**Possible Causes:**
- Repository README.md not found or private
- Markdown syntax errors in source
- Network timeout to GitHub

**Solutions:**
1. Verify repository is public
2. Check README.md exists at root
3. Try fetching URL manually: `curl -L https://raw.githubusercontent.com/owner/repo/master/README.md`
4. Check for markdown lint errors in source

### Import Shows "Too Many Deviations"

**Cause**: >3 format deviations detected

**Solutions:**
1. Review deviation list in UI
2. Fix source markdown if possible
3. Or: Enable AI parsing (handles more edge cases)
4. Or: Contact maintainer for manual review

### Import Creates Incorrect Categories

**Possible Causes:**
- Metadata sections not filtered (Registries, Resources, License, etc.)
- Non-standard ## headers

**Solutions:**
1. Check if sections are in metadata filter list (parser.ts:307-310)
2. Add new metadata keywords if needed
3. Re-import after parser update

### Import Very Slow (>5 min for 500 resources)

**Possible Causes:**
- Network latency to GitHub
- Database not indexed
- Too many conflict checks

**Solutions:**
1. Check GitHub API rate limits
2. Verify database indexes on: category, status, url columns
3. Enable progress indicator to monitor bottlenecks
4. Consider increasing timeout

---

## Best Practices

1. **Always use progress indicator** - Monitor import status in real-time
2. **Review deviations first** - Check warnings before full import  
3. **Test with small repos first** - Validate parser works for your format
4. **Backup before major imports** - Save database state
5. **Monitor after import** - Verify navigation and search work correctly
6. **Run awesome-lint on export** - Validate round-trip quality

---

## Limits & Configuration

**Maximum Resources**: 10,000 per import (configurable)
**Timeout**: 5 minutes for fetch + parse + import
**Rate Limiting**: Respects GitHub API limits (5000 req/hour for authenticated)
**Concurrent Imports**: 2 maximum (prevent database contention)
**AI Parsing**: Disabled by default (opt-in)

---

## Support

**Found a bug?** Report in project issues
**Need help?** Check documentation in `docs/`
**Have a format edge case?** AI parsing can help (enable in code)

---

**Version**: 1.1.0
**Last Updated**: 2025-12-05
**Status**: Production Ready
