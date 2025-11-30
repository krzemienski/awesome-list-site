# Session 6: Complete User Experience Validation
**Shannon Execution Plan**

**Plan ID**: session-6-user-features-validation
**Created**: 2025-11-30
**Complexity**: 0.72/1.0 (VERY COMPLEX)
**Duration**: 11 hours (8h testing + 3h bug fixing buffer)
**Tasks**: 150 granular tasks
**NO MOCKS**: ✅ Real browser + Real DB testing only

---

## Shannon Complexity Analysis

| Dimension | Score |
|-----------|-------|
| Technical Depth | 7/10 |
| Integration Complexity | 8/10 |
| State Management | 8/10 |
| Error Scenarios | 9/10 |
| Performance | 4/10 |
| Security | 6/10 |
| Documentation | 7/10 |
| Testing Complexity | 10/10 |

**Overall**: 0.72/1.0 → **VERY COMPLEX**

---

## Objective

**Test EVERY user-facing feature** as real end user to verify complete user experience works.

**Workflows to Verify** (6 total):
1. Account Creation & First Login
2. Favorites Flow (add, profile view, remove)
3. Profile & User Stats
4. Search & Filtering (text, category, combined)
5. Learning Journeys (browse, enroll, progress, complete)
6. User Preferences & Recommendations

**Success = All 6 workflows pass 3-tier validation with bugs fixed**

**Project Impact**: 27% → 45% completion (adds 6 features)

---

## Prerequisites

- ✅ Session 5 complete (bookmark + approval workflows working)
- ✅ Docker healthy
- ✅ Database verified
- ✅ superpowers-chrome + Supabase MCP available

---

## Workflow 1: Account Creation (Tasks 1-20, 2 hours)

### Task 1: Navigate to Signup Page
**Duration**: 2 min | **Tool**: superpowers-chrome (navigate)

```
navigate to http://localhost:3000/login
Check page.md for "Sign up" button or link
```

**Validation**: Signup option visible
**If FAIL**: STOP → systematic-debugging

---

### Task 2: Click Sign Up Button
**Duration**: 2 min | **Tool**: superpowers-chrome (click)

```
Click selector: "button:has-text('Sign up'), a:has-text('Sign up')"
```

**Validation**: Signup form appears OR modal opens
**Evidence**: screenshot.png

---

### Task 3: Fill Signup Email
**Duration**: 2 min | **Tool**: superpowers-chrome (type)

```
Type into: input[type='email']
Value: "newuser-session6@example.com"
```

**Validation**: Field populated

---

### Task 4: Fill Signup Password
**Duration**: 2 min

```
Type into: input[type='password']
Value: "TestUser123!"
```

---

### Task 5: Submit Signup Form
**Duration**: 3 min

```
Click: button[type='submit'] OR type "\n" in password field
```

**Validation**: Success message OR redirect OR email confirmation notice

**If FAIL**: Signup broken → STOP

---

### Task 6: Verify User Created in Database
**Duration**: 3 min | **Tool**: Supabase MCP

```sql
SELECT id, email, created_at, user_metadata
FROM auth.users
WHERE email = 'newuser-session6@example.com';
```

**Validation**: 1 row returned, user created

**If FAIL**: Signup UI succeeded but user not in DB → Auth bug → STOP

---

### Task 7-20: [Email verification, first login, verify session, profile setup]

**[Structure continues with same granularity...]**

---

## Workflow 2: Favorites Flow (Tasks 21-45, 2 hours)

**Similar structure to Session 5 bookmark workflow**:
- Navigate to category
- Click favorite button (star icon)
- Verify database (user_favorites table)
- Navigate to profile
- Verify favorite shown
- Remove favorite
- Verify deletion
- UI updates correctly

---

## Workflow 3: Profile & Stats (Tasks 46-60, 1 hour)

**Test user profile accuracy**:
- Navigate to /profile
- Verify stats correct (bookmark count, favorite count, submission count)
- Test profile tabs (Overview, Favorites, Bookmarks, Submissions)
- Verify data matches database

---

## Workflow 4: Search & Filter (Tasks 61-90, 1.5 hours)

**Test all search/filter combinations**:
- Search by text ("ffmpeg")
- Verify results accuracy
- Filter by category
- Combined search + filter
- Clear filters
- Test debouncing (300ms delay)
- Verify query params in URL

---

## Workflow 5: Learning Journeys (Tasks 91-130, 2 hours)

**PREREQUISITE**: Seed at least 1 learning journey first

**Steps**:
- Admin creates journey via SQL or admin panel
- User browses /journeys page
- User views journey details
- User enrolls in journey
- Verify user_journey_progress row created
- User marks step complete
- Verify completedSteps updated in database
- User views progress on profile
- Verify UI shows completion percentage

---

## Workflow 6: Preferences & Recommendations (Tasks 131-150, 1.5 hours)

**Test personalization**:
- User sets preferences (categories, skill level)
- Verify user_preferences table updated
- Request recommendations
- Verify recommendations change based on preferences
- Test AI vs rule-based fallback

---

## Documentation (Tasks 151-155, 30 min)

- Update API_TEST_RESULTS.md (add all Session 6 endpoints)
- Update HONEST_COMPLETION_ASSESSMENT.md (27% → 45%)
- Create SESSION_6_COMPLETE.md
- Commit changes
- Create summary

---

## Batch Structure

**5 Batches with Checkpoints**:
1. Batch 1: Account + Favorites (Tasks 1-45, 2.5h)
2. Batch 2: Profile + Stats (Tasks 46-60, 1h)
3. Batch 3: Search & Filter (Tasks 61-90, 1.5h)
4. Batch 4: Learning Journeys (Tasks 91-130, 2h)
5. Batch 5: Preferences + Docs (Tasks 131-155, 1.5h)

**Total**: 11 hours with bug fixing

---

## Expected Bugs

- Favorites button not found (selector issue)
- Profile stats incorrect (counting logic bug)
- Search debouncing not working (timing issue)
- Journey enrollment fails (RLS or API bug)
- Preferences don't persist (localStorage or DB issue)
- Recommendations don't update (cache issue)
- Form validation errors
- React Query cache staleness

**Expect**: 8-12 bugs
**Buffer**: 3 hours (25 min per bug average)

---

## Success Criteria

- ✅ All 6 user workflows functional
- ✅ 0 blocking bugs remaining
- ✅ Evidence for each workflow (screenshots + SQL)
- ✅ Honest 45% overall completion

---

**Plan Status**: Ready for Execution after Session 5
