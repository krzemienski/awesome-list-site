# Comprehensive End-to-End Testing Plan
**Awesome List Platform - Complete System Validation**

---

## 📊 **Current Database State (Baseline)**
- **Categories**: 9 top-level
- **Subcategories**: 19 second-level
- **Sub-subcategories**: 32 third-level
- **Resources**: 2,646 approved
- **Source**: awesome-video repository (from static JSON seed)

---

## 🎯 **Testing Objectives**

1. **Import Verification**: Test GitHub import with 2 different awesome lists
2. **CRUD Operations**: 25+ micro-detail edit scenarios
3. **Frontend Sync**: Verify all changes appear on public site
4. **Export Validation**: Confirm awesome-lint compliance after modifications
5. **Bug Discovery & Fixes**: Iterative debugging workflow

---

# PHASE 1: GitHub Import Testing

## 1.1 awesome-video Import (Fresh Import Test)
**Objective**: Verify GitHub import system parses live repository correctly

### Test Cases:
- [ ] **T1.1.1**: Import awesome-video (https://github.com/krzemienski/awesome-video)
  - **Expected**: Parse 1,500+ resources from live README
  - **Expected**: Detect category hierarchy (## → ### → ####)
  - **Verify**: All resources have githubSynced=true
  - **Verify**: sourceList metadata preserved

- [ ] **T1.1.2**: Verify category hierarchy parsing
  - **Expected**: All 3 levels parsed correctly
  - **Verify**: "Video Players & Playback Libraries" (Level 1)
  - **Verify**: "Mobile Players" (Level 2)
  - **Verify**: Nested items assigned to correct levels
  - **Document**: Total categories created from GitHub

- [ ] **T1.1.3**: Test conflict detection with existing data
  - **Scenario**: Database already has 2,646 resources from JSON seed
  - **Expected**: Detect duplicates by URL
  - **Expected**: Skip or update based on conflict resolution
  - **Verify**: No duplicate resources created
  - **Log**: Import/update/skip counts

- [ ] **T1.1.4**: Modify 1 resource in awesome-video README, re-import
  - **Action**: Edit description of known resource
  - **Expected**: Detect 1 updated resource
  - **Expected**: Merge descriptions (keep longer/newer one)
  - **Verify**: Audit log shows "updated from GitHub"

## 1.2 awesome-rust Import (New Repository Test)
**Objective**: Test parser with different awesome list format and content

### Test Cases:
- [ ] **T1.2.1**: Import awesome-rust (https://github.com/rust-unofficial/awesome-rust)
  - **Expected**: Parse main categories successfully
  - **Log**: Any parsing errors for non-standard formats
  - **Document**: Format deviations from awesome-spec
  - **Expected**: >500 resources imported

- [ ] **T1.2.2**: Count imported resources and categories
  - **Verify**: Rust-related categories created (e.g., "Applications", "Development Tools")
  - **Verify**: No conflicts with awesome-video categories
  - **Verify**: Category name normalization working

- [ ] **T1.2.3**: Check category normalization edge cases
  - **Test**: Categories with special characters (e.g., "C++ Libraries", "AI/ML")
  - **Expected**: Special chars removed: "C Libraries", "AIML"
  - **Verify**: Consistent slug generation
  - **Verify**: No database constraint errors

### Parser Edge Cases to Test:
- [ ] **T1.2.4**: Resources without descriptions (`[Name](url)` only)
  - **Expected**: Import with empty description ("")
  - **Verify**: No parsing errors or null values

- [ ] **T1.2.5**: Resources with emoji in title (e.g., "🚀 Rocket")
  - **Expected**: Emoji preserved in title
  - **Verify**: Slug generation handles emoji correctly
  - **Verify**: Frontend displays emoji properly

- [ ] **T1.2.6**: Resources with different separators
  - **Test**: `- [Name](url) - Description` (hyphen)
  - **Test**: `- [Name](url) – Description` (en-dash)
  - **Test**: `- [Name](url): Description` (colon)
  - **Expected**: All formats parsed correctly

- [ ] **T1.2.7**: Multi-line descriptions (if any)
  - **Document**: How parser handles line breaks
  - **Expected**: Truncate or concatenate intelligently
  - **Verify**: No broken markdown in database

---

# PHASE 2: Admin Panel CRUD Operations (25+ Scenarios)

## 2.1 Category Management (8 scenarios)

### Create Operations:
- [ ] **T2.1.1**: Create new category "Testing & QA Tools"
  - **Action**: Admin → Categories → Create
  - **Input**: name="Testing & QA Tools", slug="testing-qa-tools"
  - **Expected**: Category created successfully
  - **Verify**: Shows in categories list with ID
  - **Verify**: Appears in sidebar navigation
  - **Verify**: Resource count = 0

- [ ] **T2.1.2**: Attempt duplicate category slug
  - **Action**: Create category with slug="players-clients" (already exists)
  - **Expected**: ERROR "Category with slug 'players-clients' already exists"
  - **Verify**: No duplicate created in database
  - **Verify**: User sees error toast notification
  - **Verify**: Form validation prevents submission

- [ ] **T2.1.3**: Create category with special characters
  - **Input**: name="AI/ML & Deep Learning", slug="ai-ml-deep-learning"
  - **Expected**: Special characters allowed in name
  - **Verify**: Slug normalized correctly (no special chars)
  - **Verify**: Category displays properly in UI
  - **Verify**: No encoding issues

### Update Operations:
- [ ] **T2.1.4**: Rename existing category
  - **Action**: Edit "General Tools" → "Developer Tools"
  - **Expected**: Name updated in categories table
  - **Verify**: All resources under this category still associated
  - **Verify**: Sidebar reflects new name immediately
  - **Verify**: Frontend category page shows new name
  - **Verify**: Resource count preserved

- [ ] **T2.1.5**: Change category slug
  - **Action**: Edit "players-clients" slug → "video-players-clients"
  - **Expected**: Slug updated successfully
  - **Verify**: URL routing still works
  - **Verify**: No broken links on frontend
  - **Verify**: Sidebar navigation uses new slug

### Delete Operations:
- [ ] **T2.1.6**: Delete empty category
  - **Action**: Delete "Testing & QA Tools" (0 resources, 0 subcategories)
  - **Expected**: SUCCESS - category deleted
  - **Verify**: Removed from categories table
  - **Verify**: Not visible in sidebar
  - **Verify**: Frontend shows 404 for old category page

- [ ] **T2.1.7**: Attempt to delete category with resources
  - **Action**: Try to delete "Players & Clients" (has resources)
  - **Expected**: ERROR "Cannot delete category...has X resources"
  - **Verify**: Category NOT deleted
  - **Verify**: Delete protection working correctly
  - **Verify**: Error message shows exact resource count

- [ ] **T2.1.8**: Attempt to delete category with subcategories
  - **Action**: Try to delete category that has subcategories (even if 0 resources)
  - **Expected**: ERROR "Cannot delete category...has X subcategories"
  - **Verify**: Category NOT deleted
  - **Verify**: Protection prevents orphaned subcategories
  - **Verify**: Error message shows subcategory count

## 2.2 Subcategory Management (8 scenarios)

### Create Operations:
- [ ] **T2.2.1**: Add new subcategory to existing category
  - **Action**: Admin → Subcategories → Create
  - **Input**: name="Command-line Players", categoryId=[Players & Clients ID]
  - **Expected**: Subcategory created with correct parent
  - **Verify**: Shows under "Players & Clients" in sidebar
  - **Verify**: Resource count = 0
  - **Verify**: categoryId foreign key correct

- [ ] **T2.2.2**: Create subcategory with same name in different category
  - **Input**: name="Mobile", categoryId=[Encoding & Codecs ID]
  - **Note**: "Mobile" already exists under "Players & Clients"
  - **Expected**: SUCCESS - slug uniqueness is per-category
  - **Verify**: Both "Mobile" subcategories exist independently
  - **Verify**: Different IDs in database
  - **Verify**: Sidebar shows both under different parents

- [ ] **T2.2.3**: Attempt duplicate subcategory in same category
  - **Input**: name="Web Players", categoryId=[Players & Clients ID]
  - **Note**: "Web Players" already exists in this category
  - **Expected**: ERROR "Subcategory with slug 'web-players' already exists in this category"
  - **Verify**: Duplicate prevented
  - **Verify**: Validation enforced

### Update Operations (CRITICAL - Moving Subcategories):
- [ ] **T2.2.4**: Move subcategory to different parent category
  - **Action**: Move "Web Players" from "Players & Clients" → "Infrastructure & Delivery"
  - **Expected**: categoryId updated successfully
  - **Verify**: Resources remain with subcategory (data integrity)
  - **Verify**: Sidebar shows subcategory under new parent
  - **Verify**: Frontend navigation reflects change
  - **Verify**: Old parent's subcategory list updated
  - **Verify**: New parent's subcategory list updated

- [ ] **T2.2.5**: Rename subcategory
  - **Action**: Rename "Web Players" → "Browser-Based Players"
  - **Expected**: Name updated in subcategories table
  - **Verify**: All resources still associated (category assignment unchanged)
  - **Verify**: Sidebar shows new name
  - **Verify**: Frontend displays new name
  - **Verify**: Slug updated accordingly

- [ ] **T2.2.6**: Change subcategory slug only
  - **Action**: Edit slug "web-players" → "browser-players"
  - **Expected**: Slug updated, name unchanged
  - **Verify**: URL routing works with new slug
  - **Verify**: No 404 errors on frontend
  - **Verify**: Sidebar links use new slug

### Delete Operations:
- [ ] **T2.2.7**: Delete empty subcategory
  - **Action**: Delete "Command-line Players" (0 resources, 0 sub-subcategories)
  - **Expected**: SUCCESS - deleted
  - **Verify**: Removed from database
  - **Verify**: Removed from sidebar
  - **Verify**: Parent category still exists

- [ ] **T2.2.8**: Attempt to delete subcategory with resources
  - **Action**: Try to delete "Web Players" (has resources)
  - **Expected**: ERROR "Cannot delete subcategory...has X resources"
  - **Verify**: Deletion blocked
  - **Verify**: Error shows resource count
  - **Verify**: Subcategory remains in database

## 2.3 Sub-Subcategory Management (4 scenarios)

- [ ] **T2.3.1**: Create sub-subcategory under subcategory
  - **Input**: name="React Players", subcategoryId=[Web Players ID]
  - **Expected**: Third level created successfully
  - **Verify**: Hierarchy: Players & Clients → Web Players → React Players
  - **Verify**: Sidebar shows 3-level nesting correctly
  - **Verify**: Resource count = 0

- [ ] **T2.3.2**: Move sub-subcategory to different subcategory
  - **Action**: Move "React Players" → "Frameworks & UI Components"
  - **Expected**: subcategoryId updated
  - **Verify**: Resources follow sub-subcategory (if any)
  - **Verify**: Sidebar reflects new parent
  - **Verify**: Old parent's list updated
  - **Verify**: Data integrity maintained

- [ ] **T2.3.3**: Delete empty sub-subcategory
  - **Action**: Delete "React Players" (0 resources)
  - **Expected**: SUCCESS
  - **Verify**: Removed from hierarchy
  - **Verify**: Parent subcategory still exists
  - **Verify**: No orphaned resources

- [ ] **T2.3.4**: Attempt to delete sub-subcategory with resources
  - **Action**: Try to delete sub-subcategory that has resources
  - **Expected**: ERROR with resource count
  - **Verify**: Deletion blocked
  - **Verify**: Delete protection working at 3rd level

## 2.4 Resource Management (18 scenarios)

### Create Operations:
- [ ] **T2.4.1**: Add new resource to category only (no subcategory)
  - **Input**: title="New Video Tool", url="https://example.com/tool", category="General Tools"
  - **Expected**: Resource created with status="approved"
  - **Verify**: Shows in Resources table
  - **Verify**: Appears on frontend under "General Tools"
  - **Verify**: Category resource count incremented (+1)
  - **Verify**: subcategory and subSubcategory are null

- [ ] **T2.4.2**: Add resource to subcategory (2 levels)
  - **Input**: title="React Player Pro", url="https://example.com/react-player", category="Players & Clients", subcategory="Web Players"
  - **Expected**: Resource assigned to 2-level hierarchy
  - **Verify**: Shows under "Web Players" in sidebar
  - **Verify**: Subcategory resource count incremented
  - **Verify**: Category count also incremented (aggregated)

- [ ] **T2.4.3**: Add resource to sub-subcategory (3 levels deep)
  - **Input**: title="Vue.js Video Player", category="Players & Clients", subcategory="Frameworks & UI Components", subSubcategory="Web Players"
  - **Expected**: Full 3-level assignment
  - **Verify**: Nested correctly in sidebar (3 levels)
  - **Verify**: All 3 levels show incremented counts
  - **Verify**: Resource appears on deepest level page

- [ ] **T2.4.4**: Add resource with status="pending"
  - **Input**: Same as T2.4.1 but status="pending"
  - **Expected**: Resource created successfully
  - **Verify**: Shows in "Approvals" tab in admin
  - **Verify**: NOT visible on public frontend
  - **Verify**: Can be approved/rejected later

- [ ] **T2.4.5**: Add resource with empty description
  - **Input**: description=""
  - **Expected**: SUCCESS - description defaults to ""
  - **Verify**: No validation errors
  - **Verify**: Frontend handles empty description gracefully

### Update Operations:
- [ ] **T2.4.6**: Edit resource title
  - **Action**: Change "FFmpeg" → "FFmpeg 7.0"
  - **Expected**: Title updated in resources table
  - **Verify**: Frontend shows new title
  - **Verify**: URL unchanged
  - **Verify**: Description unchanged
  - **Verify**: updatedAt timestamp changed

- [ ] **T2.4.7**: Edit resource description
  - **Action**: Update description with 500+ characters (long text)
  - **Expected**: Long description saved successfully
  - **Verify**: Frontend displays full description
  - **Verify**: No truncation in database
  - **Verify**: No character limit issues

- [ ] **T2.4.8**: Change resource URL
  - **Action**: Update URL from old domain → new domain
  - **Expected**: URL updated successfully
  - **Verify**: Frontend link points to new URL
  - **Verify**: Click-through works (link opens correctly)
  - **Verify**: Title and description unchanged

- [ ] **T2.4.9**: Move resource to different category (same level)
  - **Action**: Move resource from "Players & Clients" → "General Tools"
  - **Expected**: category field updated
  - **Verify**: Resource shows under new category in sidebar
  - **Verify**: Old category count decremented (-1)
  - **Verify**: New category count incremented (+1)
  - **Verify**: Resource removed from old category page
  - **Verify**: Resource appears on new category page

- [ ] **T2.4.10**: Move resource from category-only to subcategory
  - **Action**: Add subcategory="Web Players" to resource that only had category
  - **Expected**: Hierarchy deepened from 1 to 2 levels
  - **Verify**: Resource now nested under subcategory
  - **Verify**: Category count unchanged (still under same category)
  - **Verify**: Subcategory count incremented
  - **Verify**: Shows in subcategory section on frontend

- [ ] **T2.4.11**: Move resource from subcategory back to category-only
  - **Action**: Remove subcategory assignment (set to null)
  - **Expected**: Resource now at category level only
  - **Verify**: Shows at top of category (not under subcategory)
  - **Verify**: Subcategory count decremented
  - **Verify**: Category count unchanged
  - **Verify**: Hierarchy flattened to 1 level

- [ ] **T2.4.12**: Change resource from subcategory to different category+subcategory (cross-branch move)
  - **Action**: Move "React Player Pro" from "Players→Web Players" to "General Tools→Build Scripts"
  - **Expected**: Both category AND subcategory updated
  - **Verify**: Resource shows in completely different hierarchy branch
  - **Verify**: Old category count -1
  - **Verify**: Old subcategory count -1
  - **Verify**: New category count +1
  - **Verify**: New subcategory count +1
  - **Verify**: All 4 counts updated correctly

- [ ] **T2.4.13**: Change resource status: pending → approved
  - **Action**: Approve pending resource from T2.4.4
  - **Expected**: status="approved", approvedAt timestamp set
  - **Verify**: Resource appears on frontend now
  - **Verify**: Removed from pending list in admin
  - **Verify**: approvedBy field set (if user tracking enabled)

- [ ] **T2.4.14**: Change resource status: approved → rejected (should fail)
  - **Action**: Try to reject an already-approved resource
  - **Expected**: ERROR (can only reject pending resources)
  - **Verify**: Status unchanged
  - **Verify**: Validation enforced

- [ ] **T2.4.15**: Add tags to resource
  - **Action**: Add tags=["video", "player", "react"]
  - **Expected**: Tags saved as array
  - **Verify**: Frontend displays tags
  - **Verify**: Search includes tags (if tag search implemented)

### Delete Operations:
- [ ] **T2.4.16**: Delete resource
  - **Action**: Delete "New Video Tool" from T2.4.1
  - **Expected**: Resource deleted from resources table
  - **Verify**: Audit log entry created
  - **Verify**: originalResourceId preserved in audit log
  - **Verify**: Category count decremented
  - **Verify**: Removed from frontend
  - **Verify**: Resource page returns 404

- [ ] **T2.4.17**: Verify audit log preservation after delete
  - **Action**: Query audit_log for deleted resource
  - **Expected**: originalResourceId field has deleted resource ID
  - **Verify**: Audit entry shows action="deleted"
  - **Verify**: Audit entry has deletion timestamp
  - **Verify**: Can trace resource history even after deletion
  - **Verify**: Migration script worked correctly

### Edge Cases:
- [ ] **T2.4.18**: Add resource with duplicate URL (conflict detection)
  - **Input**: URL that already exists in database
  - **Expected**: System behavior depends on implementation
  - **Document**: How system handles URL duplicates (allow/prevent/warn)
  - **Verify**: Consistent behavior

---

# PHASE 3: Frontend Sync Verification

## 3.1 Category Changes Visibility (4 tests)
- [ ] **T3.1.1**: Create category → refresh homepage
  - **Expected**: New category appears in sidebar
  - **Verify**: Navigation link clickable
  - **Verify**: Category page loads (even if empty)
  - **Verify**: No JavaScript errors in console

- [ ] **T3.1.2**: Rename category → refresh
  - **Expected**: Sidebar shows new name
  - **Verify**: URL slug updated (if slug changed)
  - **Verify**: Old URLs redirect or show 404
  - **Verify**: Breadcrumbs updated

- [ ] **T3.1.3**: Delete category → refresh
  - **Expected**: Category removed from sidebar
  - **Verify**: URL returns 404
  - **Verify**: No broken links on homepage
  - **Verify**: No console errors

- [ ] **T3.1.4**: Move subcategory → refresh
  - **Expected**: Subcategory appears under new parent
  - **Verify**: Old parent no longer lists it
  - **Verify**: Sidebar hierarchy correct

## 3.2 Resource Changes Visibility (6 tests)
- [ ] **T3.2.1**: Add resource → refresh category page
  - **Expected**: New resource card appears
  - **Verify**: Title, description, URL all correct
  - **Verify**: Resource count badge updated (+1)
  - **Verify**: Card renders properly

- [ ] **T3.2.2**: Edit resource description → refresh
  - **Expected**: Updated description shows on card
  - **Verify**: No caching issues
  - **Verify**: Change reflected immediately

- [ ] **T3.2.3**: Move resource to different category → refresh both pages
  - **Expected**: Resource removed from old category page
  - **Expected**: Resource appears in new category page
  - **Verify**: Counts updated on both pages
  - **Verify**: No duplicate cards

- [ ] **T3.2.4**: Delete resource → refresh
  - **Expected**: Resource card removed
  - **Verify**: No "undefined" or error states
  - **Verify**: Count badge decremented (-1)
  - **Verify**: No blank spaces or layout issues

- [ ] **T3.2.5**: Approve pending resource → refresh
  - **Expected**: Resource now visible on public site
  - **Verify**: Shows in correct category
  - **Verify**: All fields display correctly

- [ ] **T3.2.6**: Move resource between hierarchy levels → refresh
  - **Expected**: Resource appears at new depth
  - **Verify**: Nesting correct (category vs subcategory vs sub-subcategory)
  - **Verify**: Sidebar counts accurate

## 3.3 Search Functionality After Changes (2 tests)
- [ ] **T3.3.1**: Add new resource → search for its title
  - **Expected**: Fuzzy search finds new resource
  - **Verify**: Search results include new item
  - **Verify**: Search index updated

- [ ] **T3.3.2**: Edit resource title → search old title
  - **Expected**: No results (old title gone)
  - **Verify**: Search new title finds it
  - **Verify**: Search index refreshed

## 3.4 Mobile Responsiveness Check (2 tests)
- [ ] **T3.4.1**: Test all changes on mobile viewport (390x844)
  - **Verify**: Sidebar collapses correctly
  - **Verify**: Touch targets ≥44x44px (WCAG AAA)
  - **Verify**: No horizontal scroll
  - **Verify**: Cards stack properly

- [ ] **T3.4.2**: Test landscape mobile (844x390)
  - **Verify**: Layout adapts
  - **Verify**: Sidebar behavior correct
  - **Verify**: No UI breaks

---

# PHASE 4: Export & awesome-lint Validation

## 4.1 Export After CRUD Operations (6 tests)
- [ ] **T4.1.1**: Export markdown after all edits
  - **Action**: Admin → Export → Export Markdown
  - **Expected**: Download awesome-list.md file
  - **Verify**: File size reasonable (>100KB)
  - **Verify**: Valid markdown syntax

- [ ] **T4.1.2**: Run awesome-lint validation
  - **Action**: Admin → Validation → Run Validation
  - **Expected**: 0 errors (warnings acceptable)
  - **Verify**: All modified resources included
  - **Verify**: Category hierarchy preserved
  - **Verify**: awesome-spec compliance

- [ ] **T4.1.3**: Verify new categories in export
  - **Expected**: "Testing & QA Tools" appears as `## Testing & QA Tools`
  - **Verify**: Markdown headers correct (##, ###, ####)
  - **Verify**: New resources under new category

- [ ] **T4.1.4**: Verify moved resources in export
  - **Expected**: Resources appear under NEW category/subcategory
  - **Verify**: Not duplicated in old location
  - **Verify**: Only one instance in file

- [ ] **T4.1.5**: Verify renamed resources in export
  - **Expected**: New titles in markdown links: `- [New Title](url)`
  - **Verify**: Descriptions updated
  - **Verify**: URLs correct

- [ ] **T4.1.6**: Verify deleted resources NOT in export
  - **Expected**: Deleted resources absent
  - **Verify**: Count matches (total resources - deletions)
  - **Verify**: No broken markdown

## 4.2 GitHub Export (Actual Commit) (1 test)
- [ ] **T4.2.1**: Export to GitHub repository (if configured)
  - **Action**: Admin → GitHub → Export to GitHub
  - **Input**: Repository URL, commit message
  - **Expected**: Commit created with markdown file
  - **Verify**: GitHub shows commit in history
  - **Verify**: awesome-lint passes on GitHub CI (if configured)
  - **Note**: May require GitHub authentication

---

# PHASE 5: Bug Discovery & Iteration Workflow

## 5.1 Bug Tracking Template
For each bug discovered:

```markdown
### Bug #X: [Short Description]
**Found During**: [Test Case ID]
**Severity**: Critical / High / Medium / Low
**Component**: Frontend / Backend / Database / Parser

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**: 

**Actual Behavior**: 

**Error Message/Screenshot**: 

**Root Cause**: [After investigation]

**Fix Applied**: 
- [ ] Code changes made
- [ ] Tests pass
- [ ] Verified fix works

**Re-test**: [Test Case ID to re-run]
```

## 5.2 Common Bug Scenarios to Watch For

### Database Constraints:
- [ ] Foreign key violations when moving resources
- [ ] Slug uniqueness violations
- [ ] Cascade delete not working (orphaned resources)
- [ ] NULL constraint violations

### Frontend Issues:
- [ ] Cache not invalidating after edits
- [ ] Sidebar not updating after category changes
- [ ] Resource counts incorrect
- [ ] 404 errors after slug changes
- [ ] Search index not updating
- [ ] React Query stale data

### Parser Issues:
- [ ] Non-standard markdown format not parsed
- [ ] Special characters breaking parser
- [ ] Category hierarchy depth > 3 levels
- [ ] Empty descriptions causing errors
- [ ] Emoji/unicode handling

### API Errors:
- [ ] 500 errors on malformed requests
- [ ] 403 forbidden on non-admin actions
- [ ] Duplicate resource creation
- [ ] Merge conflicts on concurrent edits
- [ ] Transaction rollback failures

---

# PHASE 6: Performance & Scale Testing

## 6.1 Large Dataset Tests (2 tests)
- [ ] **T6.1.1**: Import both awesome-video + awesome-rust (3000+ resources total)
  - **Verify**: Database handles large inserts
  - **Verify**: Frontend pagination works
  - **Verify**: Search performance acceptable (<500ms)
  - **Verify**: No memory leaks

- [ ] **T6.1.2**: Bulk edit 100 resources (change category)
  - **Verify**: Transaction completes successfully
  - **Verify**: All counts updated correctly
  - **Verify**: No deadlocks or timeouts
  - **Verify**: Audit logs created for all

## 6.2 Concurrent Editing (1 test)
- [ ] **T6.2.1**: Two admins edit same resource simultaneously
  - **Expected**: Last write wins OR conflict detection
  - **Document**: Current concurrency handling behavior
  - **Verify**: No data corruption

---

# PHASE 7: Final Validation Checklist

## 7.1 Data Integrity (5 checks)
- [ ] No orphaned resources (resources without valid categories)
- [ ] No orphaned subcategories (subcategories without parent categories)
- [ ] No orphaned sub-subcategories
- [ ] All resource counts accurate across all hierarchy levels
- [ ] All audit logs preserved with originalResourceId

## 7.2 Feature Completeness (8 checks)
- [ ] Import: awesome-video ✓
- [ ] Import: awesome-rust ✓
- [ ] Create: Categories, Subcategories, Sub-subcategories, Resources ✓
- [ ] Read: All hierarchy levels visible ✓
- [ ] Update: All fields editable ✓
- [ ] Delete: With proper protection ✓
- [ ] Export: awesome-lint compliant ✓
- [ ] GitHub: Commit to repository ✓

## 7.3 User Experience (6 checks)
- [ ] Admin UI intuitive and clear
- [ ] Error messages helpful and specific
- [ ] Loading states shown during async operations
- [ ] Success confirmations visible (toasts)
- [ ] Mobile-friendly (tested on 390x844 and 844x390)
- [ ] No console errors or warnings

---

# SUMMARY STATISTICS

**Total Test Cases**: 93+
- Phase 1 (Import): 11 tests
- Phase 2 (CRUD): 46 tests
  - Categories: 8 tests
  - Subcategories: 8 tests
  - Sub-subcategories: 4 tests
  - Resources: 18 tests
  - Edge cases: 8 tests
- Phase 3 (Frontend): 14 tests
- Phase 4 (Export): 7 tests
- Phase 5 (Bugs): Variable (document as found)
- Phase 6 (Performance): 3 tests
- Phase 7 (Final): 19 checks

---

# SUCCESS CRITERIA

✅ **Phase 1**: Both awesome lists imported successfully (0 critical errors)
✅ **Phase 2**: All 46 CRUD scenarios pass
✅ **Phase 3**: Frontend reflects all admin changes in real-time
✅ **Phase 4**: Export validates with 0 awesome-lint errors
✅ **Phase 5**: All discovered bugs fixed and verified
✅ **Phase 6**: Performance acceptable with 3000+ resources
✅ **Phase 7**: Production-ready state achieved

---

# TESTING EXECUTION NOTES

**Test Environment**: Development database (PostgreSQL)
**Admin Credentials**: admin@example.com / admin123
**Testing Method**: Manual E2E through admin UI (not automated scripts)
**Documentation**: Screenshot critical steps, log all bugs
**Bug Fixes**: Immediate iteration - fix, verify, continue
**Browser**: Chrome/Firefox latest (test both)

**Estimated Duration**: 6-8 hours for complete testing cycle
**Tools**: 
- Browser DevTools (console, network tab)
- PostgreSQL client (Drizzle Studio or pgAdmin)
- awesome-lint CLI
- Screenshot tool

**Test Data Preservation**:
- Export database snapshot before testing
- Can rollback if critical data corruption occurs
- Audit logs track all changes

---

**Document Version**: 1.0
**Last Updated**: December 3, 2025
**Status**: ✅ Ready for Execution
**Next Step**: Begin Phase 1.1 - awesome-video import test
