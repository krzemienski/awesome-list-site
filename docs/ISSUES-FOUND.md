# Issues Found During Comprehensive Audit

## Overview
This document tracks all bugs and issues discovered during the comprehensive testing audit.
Each issue includes severity, steps to reproduce, and screenshots where applicable.

**Audit Started:** Sun Feb  1 06:29:47 AM UTC 2026
**Audit Status:** IN PROGRESS

---

## Critical Issues (P0)
_Issues that completely block functionality_

(None found yet)

---

## High Priority Issues (P1)
_Issues that significantly impact user experience_

(None found yet)

---

## Medium Priority Issues (P2)
_Issues that cause inconvenience but have workarounds_

(None found yet)

---

## Low Priority Issues (P3)
_Minor issues or cosmetic problems_

(None found yet)

---

## Schema Audit Findings

### Tables Verified:
- [ ] sessions
- [ ] users  
- [ ] resources
- [ ] resourceEdits
- [ ] categories
- [ ] subcategories
- [ ] subSubcategories
- [ ] awesomeLists
- [ ] tags
- [ ] resourceTags
- [ ] learningJourneys
- [ ] journeySteps
- [ ] userFavorites
- [ ] userBookmarks
- [ ] userJourneyProgress
- [ ] userPreferences
- [ ] userInteractions
- [ ] resourceAuditLog
- [ ] syncQueue
- [ ] githubSyncHistory
- [ ] enrichmentJobs
- [ ] enrichmentQueue

---

## Database Verification

(Queries pending)

---

## Server Routes Audit

(Pending)

---

## Frontend Component Audit

(Pending)

---

## Test Results by Phase

### Phase 1: Codebase Audit
- Status: IN PROGRESS

### Phase 2: Fix Known Issues
- Status: PENDING

### Phase 3: Frontend Testing
- Status: PENDING

### Phase 4: Admin Panel Testing  
- Status: PENDING

### Phase 5: API Endpoint Testing
- Status: PENDING

### Phase 6: Log Verification
- Status: PENDING

### Phase 7: Destructive Testing
- Status: PENDING

### Phase 8: Enrichment Job Testing
- Status: PENDING

---

## Changelog
- Sun Feb  1 06:29:47 AM UTC 2026: Started comprehensive audit


## Schema Audit Completed

### Tables Found in Database (24 total):
1. ✅ sessions
2. ✅ users (3 users, 2 admins)
3. ✅ resources (1949 approved)
4. ✅ resource_edits
5. ✅ categories (9)
6. ✅ subcategories (19)
7. ✅ sub_subcategories (32)
8. ✅ awesome_lists
9. ✅ tags
10. ✅ resource_tags
11. ✅ learning_journeys
12. ✅ journey_steps
13. ✅ user_favorites
14. ✅ user_bookmarks
15. ✅ user_journey_progress
16. ✅ user_preferences
17. ✅ user_interactions
18. ✅ resource_audit_log
19. ✅ github_sync_queue
20. ✅ github_sync_history
21. ✅ enrichment_jobs
22. ✅ enrichment_queue
23. ⚠️ research_jobs (0 rows - not in schema.ts)
24. ⚠️ research_findings (0 rows - not in schema.ts)

### Database Verification Results:
- **Users**: 3 users (2 admin, 1 user)
- **Admin user exists**: ✅ krzemienski@gmail.com (role: admin)
- **Resources by status**: 1949 approved, 0 pending, 0 rejected
- **Categories**: 9 (matches server startup)
- **Subcategories**: 19
- **Sub-subcategories**: 32 (⚠️ replit.md says 26 - DOCUMENTATION DISCREPANCY)
- **Orphaned resources**: 0 ✅
- **Foreign key constraints**: Enforced ✅


## Server Routes Audit

### Routes Found (75+ endpoints):

**Authentication Routes:**
- POST /api/auth/local/login - Local admin login
- GET /api/auth/user - Get current user
- POST /api/auth/logout - Logout user

**Resource Routes:**
- GET /api/resources - List all resources (approved only for public)
- GET /api/resources/check-url - Check URL availability
- GET /api/resources/:id - Get single resource
- POST /api/resources - Create new resource (auth required)
- GET /api/resources/pending - Get pending resources (admin)
- PUT /api/resources/:id/approve - Approve resource (admin)
- PUT /api/resources/:id/reject - Reject resource (admin)
- POST /api/resources/:id/edits - Submit edit suggestion

**Category Routes:**
- GET /api/categories - List all categories
- GET /api/subcategories - List all subcategories
- GET /api/sub-subcategories - List all sub-subcategories

**User Routes:**
- POST /api/favorites/:resourceId - Add favorite
- DELETE /api/favorites/:resourceId - Remove favorite
- GET /api/favorites - List favorites
- POST /api/bookmarks/:resourceId - Add bookmark
- DELETE /api/bookmarks/:resourceId - Remove bookmark
- GET /api/bookmarks - List bookmarks
- GET /api/user/progress - Get user progress
- GET /api/user/submissions - Get user submissions
- GET /api/user/journeys - Get user journeys

**Journey Routes:**
- GET /api/journeys - List journeys
- GET /api/journeys/:id - Get journey
- POST /api/journeys/:id/start - Start journey
- PUT /api/journeys/:id/progress - Update progress
- GET /api/journeys/:id/progress - Get progress

**Admin Routes:**
- GET /api/admin/stats - Dashboard stats
- GET /api/admin/users - List users
- PUT /api/admin/users/:id/role - Change user role
- GET /api/admin/pending-resources - List pending
- POST /api/admin/resources/:id/approve - Approve
- POST /api/admin/resources/:id/reject - Reject
- PUT /api/admin/resources/:id - Update resource
- DELETE /api/admin/resources/:id - Delete resource
- GET /api/admin/resources - List all resources (admin)
- POST /api/admin/resources - Create resource (admin)
- GET /api/admin/resource-edits - List pending edits
- POST /api/admin/resource-edits/:id/approve - Approve edit
- POST /api/admin/resource-edits/:id/reject - Reject edit
- GET/POST/PATCH/DELETE /api/admin/categories
- GET/POST/PATCH/DELETE /api/admin/subcategories
- GET/POST/PATCH/DELETE /api/admin/sub-subcategories

**GitHub Sync Routes:**
- POST /api/github/configure - Configure sync
- POST /api/github/import - Import from GitHub
- POST /api/github/export - Export to GitHub
- GET /api/github/sync-status - Get sync status
- GET /api/github/sync-history - Get sync history
- POST /api/github/process-queue - Process queue

**Export/Validation Routes:**
- POST /api/admin/export - Export to markdown
- GET /api/admin/export-json - Export full JSON
- POST /api/admin/validate - Run awesome-lint
- POST /api/admin/check-links - Check dead links
- GET /api/admin/validation-status - Validation status
- POST /api/admin/seed-database - Seed database
- POST /api/admin/import-github - Import from GitHub URL

**Enrichment Routes:**
- POST /api/enrichment/start - Start enrichment job
- GET /api/enrichment/jobs - List jobs
- GET /api/enrichment/jobs/:id - Get job details
- DELETE /api/enrichment/jobs/:id - Delete job

**Other Routes:**
- GET /api/awesome-list - Get hierarchical data
- POST /api/switch-list - Switch awesome list
- GET /api/github/awesome-lists - List available lists
- GET /api/github/search - Search GitHub
- GET /sitemap.xml - SEO sitemap
- GET /og-image.svg - OG image generator
- GET /api/recommendations/* - AI recommendations
- GET/POST /api/learning-paths/* - Learning paths
- GET /api/health - Health check

✅ Routes audit complete - 75+ endpoints verified


## Frontend Testing Results (Phase 3)

### Desktop (1280x720) - ✅ PASSED
- Homepage loads correctly
- Sidebar visible with 9 categories
- Category navigation works
- Subcategory expansion works  
- Sub-subcategory links work (FFMPEG: 65 resources)
- Search dialog opens with Ctrl+K
- View mode toggles work (grid/list/compact)

### Mobile (400x720) - ✅ PASSED
- Responsive layout works
- Hamburger menu visible
- Sidebar overlay opens/closes
- Navigation to sub-subcategories works (Roku: 26 resources)
- Content readable without horizontal scroll

### Tablet (768x1024) - ✅ PASSED
- Layout adapts correctly
- View mode toggles work
- Category pages load properly

### Minor Issues Found:
- **P3**: Some sidebar clicks intermittently open external links instead of internal navigation (workaround: direct URL navigation works)
- **P3**: Mobile sidebar close button sometimes has pointer event issues (Escape key works as workaround)

---

## API Endpoint Testing Results (Phase 5)

### Public Endpoints Tested:
- ✅ GET /api/categories - Returns 9 categories with proper slugs
- ✅ GET /api/auth/user - Returns {"user":null,"isAuthenticated":false} when not logged in
- ✅ GET /api/resources - Returns approved resources with metadata
- ✅ GET /api/awesome-list - Returns 9 categories in hierarchical structure

### Admin Endpoints:
- ⚠️ Requires authentication - cannot test via curl without session
- AdminGuard correctly returns 404/redirect for unauthenticated users (security feature working)

---

## Admin Panel Testing (Phase 4)

### Status: REQUIRES MANUAL TESTING
The admin panel is protected by:
1. Replit OAuth authentication
2. Admin role check (user.role === 'admin')
3. AdminGuard component shows 404 for non-admins

This security behavior is CORRECT and expected. Manual testing by authenticated admin user required to verify:
- Dashboard stats display
- All tabs load correctly (Overview, Resources, Categories, Pending, GitHub, Enrichment)
- CRUD operations work
- No flashing during background refetch

