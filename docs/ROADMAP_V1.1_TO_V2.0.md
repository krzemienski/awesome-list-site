# Feature Roadmap: v1.1.0 → v2.0.0

**Current Version**: v1.1.0 (2025-12-05)
**Planning Horizon**: 6-12 months

---

## Version Strategy

**Release Cadence:**
- Patch (v1.1.x): 2-4 weeks
- Minor (v1.x.0): 1-3 months
- Major (v2.0.0): 6-12 months

**Focus:**
- v1.1.x: Bug fixes, small improvements, polish
- v1.2.x: Performance, scale, optimization
- v1.3.x: Advanced features, integrations
- v2.0.0: Architecture evolution, breaking changes OK

---

## v1.1.1 (Patch - 2-3 Weeks)

**Theme**: Polish & Quick Fixes

### Bug Fixes (Priority: HIGH)

**1. Queue Status Display Issue**
- Current: Shows "in progress" perpetually
- Fix: Update queue status in import .then/.catch handlers
- Impact: UI clarity
- Effort: 1 hour

**2. Redis Cache Invalidation After Import**
- Current: Stale cache possible after import
- Fix: Trigger cache invalidation on import complete
- Impact: Users see new imports immediately
- Effort: 30 minutes

### Enhancements (Priority: MEDIUM)

**1. Import Rate Limiting**
- Add: Max 10 imports per hour per admin
- Reason: Prevent abuse, reduce server load
- Implementation: Rate limit middleware on import endpoint
- Effort: 1 hour

**2. AI Parsing Cost Limits**
- Add: Max 100 AI calls per import (~$0.04 cap)
- Reason: Prevent runaway costs
- Implementation: Counter + threshold check
- Effort: 1 hour

**3. UI Toggle for AI Parsing**
- Add: Checkbox in GitHubSyncPanel "Enable AI parsing (est. cost: $X)"
- Reason: Make AI parsing more accessible
- Implementation: Pass option through API
- Effort: 2 hours

**4. Resource Length Validation**
- Add: Max 200 chars for title, 500 for description
- Reason: Prevent database bloat, UI layout issues
- Implementation: Validation in parser + storage
- Effort: 1 hour

### Improvements (Priority: LOW)

**1. Homepage Limit Reduction**
- Change: limit 10000 → 50
- Add: "Load More" button
- Impact: 4.4x faster initial load
- Effort: 2 hours

**Total v1.1.1 Effort**: ~10 hours
**Release ETA**: 2-3 weeks

---

## v1.2.0 (Minor - 1-3 Months)

**Theme**: Performance & Scale

### Performance Optimizations (Priority: HIGH)

**1. Batch Resource INSERT**
- Implement: createResourcesBatch() method
- Impact: 40x faster fresh imports (20s → 0.5s for 1000 resources)
- Testing: Import 5000 resource repository
- Effort: 2 hours

**2. Full-Text Search Index**
- Add: GIN index on title + description
- Update: Queries to use to_tsvector
- Impact: 13x faster search at scale
- Testing: Search with 50,000 resources
- Effort: 3 hours

**3. Code Splitting**
- Lazy load: Admin panel, Analytics dashboard
- Impact: 2.5x faster initial load (1.75s → 0.7s)
- Bundle: 1.4MB → 550KB initial
- Effort: 4 hours

**4. Hierarchy Query Optimization**
- Batch: Query all subcategories once
- Impact: 20x faster hierarchy creation queries
- Effort: 1 hour

### Scale Features (Priority: MEDIUM)

**1. Private Repository Support**
- Implement: GitHub App authentication
- Allows: Import from private repos
- Use case: Internal awesome lists
- Effort: 8 hours

**2. Scheduled Imports**
- Add: Cron job configuration in UI
- Options: Daily, weekly, monthly
- Use case: Auto-sync with source repos
- Effort: 6 hours

**3. Batch Import**
- Feature: Select multiple repos, import all
- UI: Multi-select with progress for each
- Use case: Initial setup with many repos
- Effort: 4 hours

### Quality Improvements (Priority: LOW)

**1. Transaction Wrapping**
- Wrap: Import in database transaction
- Impact: Atomic (all-or-nothing imports)
- Rollback: Automatic on error
- Effort: 2 hours

**2. URL Normalization**
- Normalize: HTTP→HTTPS, trailing slashes, fragments
- Impact: Better duplicate detection
- Effort: 2 hours

**3. Export Format Matching**
- Detect: Input format (asterisk vs dash)
- Match: Output format to input
- Impact: Byte-identical round-trips
- Effort: 2 hours

**Total v1.2.0 Effort**: ~34 hours
**Release ETA**: 1-3 months

---

## v1.3.0 (Minor - 3-6 Months)

**Theme**: Advanced Features

### User Experience (Priority: HIGH)

**1. Import Rollback UI**
- Feature: Rollback to previous import state
- Implementation: Snapshots before each import
- UI: "Revert to state before import" button
- Effort: 6 hours

**2. Conflict Resolution UI**
- Feature: Manual review of conflicts before import
- UI: Side-by-side comparison (existing vs new)
- Options: Keep existing, use new, merge manually
- Effort: 8 hours

**3. Virtual Scrolling**
- Implement: react-window for large lists
- Impact: Smooth scrolling with 5000+ resources
- Effort: 3 hours

### Integration (Priority: MEDIUM)

**1. Webhook Integration**
- Feature: Auto-import on GitHub push event
- Setup: Configure webhook in GitHub repo settings
- Security: Signature validation
- Effort: 6 hours

**2. Import History with Diff**
- Feature: View changes between imports
- UI: Show added/updated/removed resources
- Use case: Track repository evolution
- Effort: 4 hours

**3. Import Preview (Dry Run UI)**
- Feature: Preview what would be imported
- UI: Show categories, resource counts, deviations
- Approve/cancel before actual import
- Effort: 4 hours

### Quality (Priority: LOW)

**1. URL Validation**
- Feature: Check URLs are reachable
- Optional: Can disable (slows import)
- Report: Broken links before import
- Effort: 3 hours

**2. Cost Tracking Dashboard**
- Feature: Show AI parsing costs over time
- UI: Charts, cost per import, total spent
- Alerts: If exceeding budget
- Effort: 4 hours

**Total v1.3.0 Effort**: ~38 hours
**Release ETA**: 3-6 months

---

## v2.0.0 (Major - 6-12 Months)

**Theme**: Platform Evolution
**Breaking Changes**: Allowed (major version)

### Multi-Platform Support (Priority: HIGH)

**1. GitLab Repository Support**
- Feature: Import from GitLab awesome lists
- Implementation: GitLabClient (similar to GitHubClient)
- Parser: Same (markdown format identical)
- Effort: 12 hours

**2. Bitbucket Support**
- Feature: Import from Bitbucket
- Implementation: BitbucketClient
- Effort: 8 hours

**3. Generic Markdown Import**
- Feature: Import from any markdown URL
- Validation: Must match awesome-list format
- Use case: Custom lists not on GitHub
- Effort: 4 hours

### AI-Powered Features (Priority: MEDIUM)

**1. Category Auto-Suggestion**
- Feature: AI suggests categories for uncategorized resources
- Model: Claude or GPT-4
- UI: Review and approve suggestions
- Effort: 10 hours

**2. Quality Scoring**
- Feature: AI scores resource quality (1-10)
- Factors: GitHub stars, last update, description quality
- UI: Sort by quality, filter low-quality
- Effort: 12 hours

**3. Duplicate Detection (AI)**
- Feature: Detect duplicates beyond URL matching
- Method: Title similarity, semantic matching
- UI: Merge suggestions
- Effort: 16 hours

### Architecture Evolution (Priority: HIGH)

**1. Microservices Split**
- Separate: Import service, API service, UI service
- Benefits: Independent scaling, fault isolation
- Migration: Gradual (start with import service)
- Effort: 40 hours

**2. GraphQL API**
- Replace: REST with GraphQL
- Benefits: Flexible queries, reduced over-fetching
- Impact: 50% smaller responses for most queries
- Effort: 60 hours

**3. Server-Side Rendering (SSR)**
- Implement: Next.js or similar
- Benefits: Better SEO, faster FCP
- Trade-offs: More complex deployment
- Effort: 80 hours

### Advanced Import (Priority: MEDIUM)

**1. Import Scheduling Per Repository**
- Feature: Per-repo schedules (daily, weekly, monthly)
- UI: Configure schedule for each imported repo
- Implementation: Cron + database config
- Effort: 8 hours

**2. Selective Category Import**
- Feature: Choose which categories to import
- UI: Checkbox list before import
- Use case: Import only relevant categories
- Effort: 6 hours

**3. Import Templates**
- Feature: Save import configurations
- Templates: Repo URL + options + schedule
- UI: One-click re-import with template
- Effort: 4 hours

**Total v2.0.0 Effort**: ~260 hours (~2-3 months of development)
**Release ETA**: 6-12 months

---

## Feature Comparison

| Feature | v1.0.0 | v1.1.0 | v1.2.0 | v2.0.0 |
|---------|--------|--------|--------|--------|
| Manual resource entry | ✅ | ✅ | ✅ | ✅ |
| GitHub import | ❌ | ✅ | ✅ | ✅ |
| Real-time progress | ❌ | ✅ | ✅ | ✅ |
| Deviation detection | ❌ | ✅ | ✅ | ✅ |
| AI parsing (opt-in) | ❌ | ✅ | ✅ | ✅ |
| Private repos | ❌ | ❌ | ✅ | ✅ |
| Scheduled imports | ❌ | ❌ | ✅ | ✅ |
| Batch import | ❌ | ❌ | ✅ | ✅ |
| Import rollback | ❌ | ❌ | ❌ | ✅ |
| GitLab/Bitbucket | ❌ | ❌ | ❌ | ✅ |
| AI category suggestions | ❌ | ❌ | ❌ | ✅ |
| Quality scoring | ❌ | ❌ | ❌ | ✅ |
| GraphQL API | ❌ | ❌ | ❌ | ✅ |
| SSR | ❌ | ❌ | ❌ | ✅ |

---

## Resource Allocation

### v1.1.1 (10 hours)
- Developer: 10 hours
- QA: 2 hours
- Docs: 2 hours
- **Total**: 14 hours (~2 weeks part-time)

### v1.2.0 (34 hours)
- Developer: 34 hours (performance + features)
- QA: 8 hours (scale testing)
- Docs: 4 hours
- **Total**: 46 hours (~1.5 months part-time)

### v2.0.0 (260 hours)
- Architecture: 80 hours
- Development: 140 hours
- QA: 20 hours
- Docs: 20 hours
- **Total**: 260 hours (~3 months full-time)

---

## Decision Points

### Should We Build v2.0.0?

**Evaluate After v1.2.0:**
- User adoption (how many use import feature?)
- Scale needs (are we hitting 50K+ resources?)
- Platform demand (do users want GitLab/Bitbucket?)
- ROI (is GraphQL/SSR worth the investment?)

**Criteria for v2.0.0:**
- Active users: >1000
- Resources: >50,000
- Import frequency: >100 per month
- Feature requests: Strong demand for multi-platform

**If criteria met:** Proceed with v2.0.0
**If not:** Focus on v1.x improvements

---

## Community Feedback Integration

**Collect Feedback On:**
1. Import feature usability (is it easy to use?)
2. Deviation detection (are warnings helpful?)
3. Progress tracking (is it informative?)
4. Performance (any slow operations?)
5. Missing features (what do users wish existed?)

**Channels:**
- GitHub issues (feature requests)
- User surveys (after import)
- Analytics (feature usage)
- Support tickets (pain points)

**Review Quarterly:**
- Analyze feedback
- Prioritize roadmap
- Adjust plans based on actual usage

---

## Sunset Plan

**Features to Deprecate (Future):**

**v2.0.0 Might Deprecate:**
- REST API (replace with GraphQL)
- Standard import endpoint (keep only SSE version)
- Manual category creation (AI suggestions preferred)

**Before Deprecating:**
1. Announce 6 months in advance
2. Provide migration guide
3. Keep deprecated feature for 1 major version
4. Then remove in v3.0.0

---

**Roadmap Version**: 1.0
**Last Updated**: 2025-12-05
**Planning Horizon**: Through v2.0.0
**Status**: Draft (subject to change based on feedback)
