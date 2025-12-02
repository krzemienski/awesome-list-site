# Bug: Profile Submissions Tab Shows "No submitted resources" Despite Data Existing

**Found By:** Coordinator - API Layer Testing
**Date:** 2025-12-01 05:00
**Severity:** MEDIUM
**Domain:** Frontend UI
**Blocks:** User workflow tests (profile submissions view)

## Phase 1: Root Cause Investigation

**Error:**
- UI displays "No submitted resources"
- API returns 24 resources correctly
- Database contains resources with submitted_by = user ID

**Reproduction Steps:**
1. Login as testuser-a@test.com
2. Submit new resource via POST /api/resources
3. Navigate to /profile
4. Click "Submissions" tab
5. Expected: List of submitted resources
6. Actual: "No submitted resources" message

**Evidence:**
- API Response: GET /api/user/submissions returns 24 resources
- Database: 24 resources with submitted_by = 'cc2b69a5-7563-4770-830b-d4ce5aec0d84'
- UI Screenshot: /tmp/evidence/bug-submissions-tab.png
- Network log: API call succeeds with 200, returns data

## Phase 2: Pattern Analysis

**Working example:** Bookmarks tab correctly displays user_bookmarks data
**Difference:** Submissions tab not mapping API response correctly

**API Response Structure:**
```json
{
  "resources": [...],
  "edits": [],
  "totalResources": 24,
  "totalEdits": 0
}
```

**Hypothesis:** Frontend expecting different response structure or not accessing `.resources` property

## Phase 3: Hypothesis

**Theory:** Profile component not correctly accessing `submissions.resources` array from API response

**Files to check:**
- client/src/pages/Profile.tsx
- Component that renders submissions tab

## Phase 4: Fix

**Status:** OPEN
**Assigned To:** Frontend investigation needed
**Priority:** MEDIUM (does not block API testing)

**Workaround:** API endpoints verified functional via evaluate_script calls

---

**API Layer Status:** ✅ POST /api/resources WORKS
**UI Layer Status:** ❌ Frontend rendering broken
