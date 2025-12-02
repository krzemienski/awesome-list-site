# Bug: User Auth Fixture Tokens Expired

**Found By**: API Testing Agent (Wave 1)
**Date**: 2025-12-01 00:45
**Severity**: HIGH
**Domain**: API / Test Infrastructure
**Blocks**: All user-related API testing (bookmarks, favorites, preferences, submissions, journeys)

## Phase 1: Root Cause Investigation

**Error**: All API calls with user tokens return 401 Unauthorized

**Evidence**:
- Token expires_at: 1764547735 (about 2 hours ago)
- Current time: 1764554721
- All tests using `user-a-auth.json` or `user-b-auth.json` fail
- Error: `expect(favRes.ok()).toBeTruthy()` -> Received: false

**Reproduction**:
```bash
curl http://localhost:3000/api/favorites
# Returns: {"message":"Unauthorized"}
```

## Phase 2: Pattern Analysis

**Working Example**: Admin auth fixture
- auth.setup.ts re-authenticates admin before each test run
- Admin fixture is always fresh

**Broken Example**: User auth fixtures
- user-a-auth.json and user-b-auth.json are static files from Session 8
- JWT tokens expire after 1 hour
- No refresh mechanism for user fixtures

## Phase 3: Hypothesis

The user auth fixtures were created in Session 8 and are now stale.
The auth.setup.ts only refreshes admin auth, not user auth.

**Solution**: Extend auth.setup.ts to also authenticate User A and User B.

## Phase 4: Fix

**Root Cause**: auth.setup.ts only creates admin fixture, not user fixtures

**Files Changed**:
- tests/auth.setup.ts (extended to create all 3 fixtures)

**Verification**:
- Re-run `npx playwright test tests/api/bookmarks-favorites.spec.ts`
- All tests should pass with fresh tokens

**Status**: FIXING (API Agent implementing)
