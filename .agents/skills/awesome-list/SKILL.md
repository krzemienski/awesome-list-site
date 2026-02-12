---
name: awesome-list
description: Manage awesome list operations including export, validation, GitHub import/export, and awesome-lint compliance. Use when working with awesome list markdown files, validating list format, importing from or exporting to GitHub repositories, or fixing validation errors.
---

# Awesome List Management

This skill covers the full lifecycle of awesome list management in this project: exporting the database as a valid awesome-lint compliant markdown file, validating content, importing from GitHub repositories, and exporting back to GitHub.

## Architecture Overview

### Data Flow

```
GitHub Repo (README.md) → Parser → Database (PostgreSQL)
Database → Export Builder → Markdown → Validator → GitHub Repo
```

### Key Files

| File | Purpose |
|------|---------|
| `server/validation/awesomeLint.ts` | Awesome-lint validator (10 rule categories) |
| `server/github/parser.ts` | AwesomeListParser - parses markdown into structured resources |
| `server/github/syncService.ts` | GitHubSyncService - import/export with GitHub repos |
| `server/storage.ts` | `getAwesomeListFromDatabase()` builds hierarchical data |
| `server/routes.ts` | API endpoints for export/validate/import |
| `client/src/components/admin/ExportTab.tsx` | Export UI with integrated validation |
| `client/src/components/admin/GitHubSyncPanel.tsx` | GitHub sync UI |

### Database Schema (3-level hierarchy)

```
categories (id, name, slug, description, sortOrder)
  └─ subcategories (id, name, slug, categoryId, sortOrder)
       └─ sub_subcategories (id, name, slug, subcategoryId, sortOrder)
            └─ resources (id, title, url, description, status, categoryId, subcategoryId, subSubcategoryId, metadata)
```

## API Endpoints

### Export & Validate

```
POST /api/admin/export          → Downloads awesome-list.md (requires admin auth)
  Body: { title, description, includeContributing, includeLicense }

POST /api/admin/validate        → Returns validation results
  Body: { title, description, includeContributing, includeLicense }
  Response: { valid: boolean, errors: [], warnings: [], stats: {} }

GET  /api/admin/validation-status → Cached last validation result
GET  /api/admin/export-json       → Full database JSON backup
```

### GitHub Sync

```
POST /api/github/import         → Import from GitHub repo
  Body: { repoUrl: "owner/repo" OR "https://github.com/owner/repo" }

POST /api/github/export         → Export to GitHub repo
  Body: { repoUrl, commitMessage, branch }

POST /api/github/configure      → Configure target repository
GET  /api/github/sync-status    → Queue status
GET  /api/github/sync-history   → All sync history
POST /api/github/process-queue  → Manual queue processing
```

## Awesome-Lint Validation Rules

The validator in `server/validation/awesomeLint.ts` checks:

### Errors (block validity)
1. **title** - Must start with "# Awesome"
2. **badge** - Must have `[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)` on same line as title
3. **list-format** - Items must match: `- [Name](url) - Description.` (accepts both `-` and `*` markers)
4. **description-capital** - Descriptions must start with capital letter (exceptions: macOS, iOS, npm, webpack, ffmpeg, x264, x265, libav, youtube-dl, yt-dlp, esbuild, vite, deno, node, jQuery)
5. **description-period** - Descriptions must end with `.` `!` or `?`
6. **url-trailing-slash** - No trailing slashes on URLs
7. **url-spaces** - No spaces in URLs
8. **toc-format** - TOC links must use `- [Name](#anchor)` format
9. **category-nesting** - No skipped heading levels
10. **final-newline** - File must end with newline

### Warnings (informational)
- **url-https** - Prefer HTTPS over HTTP
- **capitalization** - Correct casing for tech terms (GitHub, JavaScript, TypeScript, etc.)
- **trailing-whitespace** - No trailing whitespace
- **list-marker** - Prefer `-` over `*`
- **double-blank** - No consecutive blank lines
- **license** - Should have license section

## Export Format

The exported markdown follows this structure:

```markdown
# Awesome Video [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated list of awesome video streaming resources...

## Contents

- [Category Name](#category-name)
  - [Subcategory Name](#subcategory-name)

## Category Name

### Subcategory Name

#### Sub-Subcategory Name

- [Resource Title](https://url.com) - Description ending with period.

## Contributing

...

## License

...
```

### ToC Anchor Generation

GitHub-compatible anchors: lowercase, spaces→hyphens, strip special chars except hyphens.
Special case: `&` becomes `--` (e.g., "Community & Events" → `#community--events`).

## Import Behavior

- Validation is **informational** during import (external repos may have different formatting)
- Parser accepts both `*` and `-` bullet markers with flexible whitespace
- Resources matched by URL for updates; new URLs create new resources
- Category hierarchy auto-created via `ensureCategoryHierarchy()`
- Import stores `categoryId`, `subcategoryId`, `subSubcategoryId` in resource metadata

## Common Fixes

### Adding Lowercase Exceptions

Edit `server/validation/awesomeLint.ts`, find `lowercaseExceptions` array in `validateListItems()`:

```typescript
const lowercaseExceptions = ['macOS', 'iOS', 'npm', 'webpack', 'ffmpeg', ...];
```

### Fixing Description Issues

```sql
-- Find resources with lowercase descriptions
SELECT id, title, description FROM resources 
WHERE status = 'approved' 
AND description ~ '^[a-z]'
AND description NOT SIMILAR TO '(macOS|iOS|npm|ffmpeg|webpack)%';

-- Fix a specific resource
UPDATE resources SET description = 'Capitalized description.' WHERE id = 123;
```

### Testing Export + Validation (CLI)

```bash
# Login
curl -s -c /tmp/cookies.txt -X POST http://localhost:5000/api/auth/local/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Export
curl -s -b /tmp/cookies.txt -X POST http://localhost:5000/api/admin/export \
  -H 'Content-Type: application/json' \
  -d '{"title":"Awesome Video","description":"A curated list...","includeContributing":true,"includeLicense":true}' \
  -o /tmp/awesome-list.md

# Validate
curl -s -b /tmp/cookies.txt -X POST http://localhost:5000/api/admin/validate \
  -H 'Content-Type: application/json' \
  -d '{"title":"Awesome Video","description":"A curated list...","includeContributing":true,"includeLicense":true}'
```

## Enrichment Integration

AI enrichment (`server/ai/enrichmentService.ts`) enhances resources with:
- Claude AI tagging (category, subcategory, confidence score)
- URL scraping (OG images, descriptions, favicons via Cheerio)
- Title improvement for GitHub repo-style names
- Fallback rule-based tagging when API unavailable

Enriched metadata stored in `resources.metadata` JSON field with `aiEnriched: true` flag.
