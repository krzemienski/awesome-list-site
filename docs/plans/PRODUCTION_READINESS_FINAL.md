# Production Readiness - Final Push

**Project:** Awesome Video Resources
**Current State:** Beta-ready (82% verified, logout fixed, password reset implemented)
**Goal:** 100% production-ready deployment
**Estimated Total:** 8-16 hours

---

## Phase 1: Complete Preferences Editing

**Type:** API + UI
**Estimated:** 2-3 hours
**Files:**
- server/routes.ts (1 endpoint)
- client/src/pages/Profile.tsx (UI forms)
- server/validation/schemas.ts (preference schema)

**Tasks:**
- [ ] Add POST /api/user/preferences endpoint to routes.ts (after line 697)
- [ ] Add Zod validation schema for preferences
- [ ] Create preferences editing form in Profile.tsx
- [ ] Add save button and onSubmit handler
- [ ] Test save → verify DB → verify persistence
- [ ] Re-enable Settings button in Profile.tsx

**Verification Criteria:**
- [ ] POST /api/user/preferences returns 200
- [ ] Database row created/updated in user_preferences table
- [ ] UI form submits without errors
- [ ] Saved preferences persist across page reload
- [ ] Settings button functional

**Exit Criteria:** Users can edit and save all preference fields (categories, skill level, goals, resource types, time commitment)

---

## Phase 2: Fix awesome-lint Errors (84 total)

**Type:** Database + Integration
**Estimated:** 4-8 hours
**Files:**
- server/github/formatter.ts (markdown generation)
- server/storage.ts or migration file (database deduplication)
- server/validation/awesomeLint.ts (if validator adjustments needed)

### Phase 2a: Database URL Deduplication (48 errors)

**Tasks:**
- [ ] Query resources for duplicate URLs: `SELECT url, COUNT(*) FROM resources GROUP BY url HAVING COUNT(*) > 1`
- [ ] Identify 48 duplicate URLs
- [ ] Decide keep strategy (keep first? keep in primary category? manual review?)
- [ ] Create migration or script to merge/delete duplicates
- [ ] Update references (favorites, bookmarks, etc.) to kept resource
- [ ] Run migration
- [ ] Verify: awesome-lint error count drops by ~48

**Verification:**
- [ ] No duplicate URLs in database
- [ ] All favorites/bookmarks still reference valid resources
- [ ] awesome-lint duplicate link errors eliminated

### Phase 2b: Formatter Improvements (36 errors)

**Tasks:**
- [ ] Fix description casing (18 errors) - Capitalize first letter in formatter
- [ ] Fix punctuation (6 errors) - Normalize quotes, remove duplicate periods
- [ ] Fix invalid list items (4 errors) - Validate link format
- [ ] Fix badge positioning (3 errors) - Ensure badge directly after title
- [ ] Fix inline padding (2 errors) - Strip spaces in `[Name]( url )`
- [ ] Fix TOC anchors (1 error) - Handle special characters like `&`
- [ ] Fix invalid URL (1 error) - Validate or skip malformed URLs
- [ ] Test export, run awesome-lint, verify 0 errors

**Verification:**
- [ ] awesome-lint returns 0 errors
- [ ] Generated markdown follows awesome specification
- [ ] All categories have proper ## headers
- [ ] All resources in `- [Name](url) - Description.` format
- [ ] Descriptions end with period
- [ ] Alphabetical order maintained

**Exit Criteria:** `npx awesome-lint /tmp/export-test.md` returns **0 errors**

---

## Phase 3: Performance Validation

**Type:** Testing + Optimization
**Estimated:** 2-4 hours
**Files:**
- docs/lighthouse/*.json (test results)
- vite.config.ts (if re-optimizing)
- client/src/App.tsx (if re-optimizing)

### Phase 3a: Lighthouse Baseline (Current State)

**Tasks:**
- [ ] Run Lighthouse on homepage: `npx lighthouse http://localhost:3000 --output=json --output-path=docs/lighthouse/homepage-baseline.json`
- [ ] Run Lighthouse on category page: `npx lighthouse http://localhost:3000/category/encoding-codecs --output=json`
- [ ] Run Lighthouse on admin page (with auth)
- [ ] Extract metrics: FCP, LCP, CLS, TBT, TTI
- [ ] Document baseline (expect ~8.9s FCP per Session 9)

**Verification:**
- [ ] Lighthouse reports generated
- [ ] Baseline metrics documented
- [ ] Identified bottlenecks (large bundle, render blocking, etc.)

### Phase 3b: Reapply Optimizations (Carefully)

**Tasks:**
- [ ] Analyze what broke in commit 9f8f05e (SearchDialog lazy loading? Manual chunks?)
- [ ] Test lazy loading ONE component at a time
- [ ] Verify no "Cannot access 'S'" error after each change
- [ ] Test manual chunks ONE vendor at a time
- [ ] Verify no circular dependency errors
- [ ] Rebuild, test, iterate
- [ ] Run Lighthouse after optimizations

**Verification:**
- [ ] FCP < 1.8s (target)
- [ ] LCP < 2.5s (target)
- [ ] CLS < 0.1 (already good)
- [ ] No build errors
- [ ] App renders correctly
- [ ] All pages functional

**Exit Criteria:** Lighthouse scores meet targets AND app works correctly

---

## Phase 4: Comprehensive Test Suite Execution

**Type:** Testing
**Estimated:** 1-2 hours
**Files:** N/A (running existing tests)

**Tasks:**
- [ ] Run auth tests: `TEST_BASE_URL=http://localhost:3000 npx playwright test tests/auth.setup.ts`
- [ ] Run integration tests: `npx playwright test tests/integration/`
- [ ] Run admin workflow tests: `npx playwright test tests/admin-workflows/`
- [ ] Run user workflow tests: `npx playwright test tests/user-workflows/`
- [ ] Run security tests: `npx playwright test tests/security/`
- [ ] Run performance tests: `npx playwright test tests/performance/`
- [ ] Run API tests: `npx playwright test tests/api/`
- [ ] Document results: pass count, fail count, duration

**Verification Criteria:**
- [ ] Auth tests: 100% pass
- [ ] Integration tests: 100% pass
- [ ] Admin workflow: ≥90% pass
- [ ] User workflow: ≥90% pass
- [ ] Security: ≥95% pass
- [ ] Performance: ≥80% pass (some may be slow without optimization)
- [ ] API: 100% pass

**Exit Criteria:** ≥90% overall pass rate (175+/195 tests passing)

---

## Phase 5: Final Production Commit

**Type:** Documentation + Deployment
**Estimated:** 30 minutes
**Files:**
- docs/DEPLOYMENT_CERTIFICATION_2025-12-02.md (update)
- CLAUDE.md (update to 100% verified)
- git commit

**Tasks:**
- [ ] Update deployment certification with final metrics
- [ ] Update CLAUDE.md status to "Production Ready"
- [ ] Document all test results
- [ ] Create final commit with comprehensive message
- [ ] Tag release: `git tag v1.0.0-production`
- [ ] Update README.md if needed

**Verification:**
- [ ] All documentation accurate
- [ ] Git history clean
- [ ] Release tagged
- [ ] Deployment guide complete

**Exit Criteria:** Application certified for production deployment

---

## Success Criteria

**Production ready when ALL of the following are true:**

### Functionality
- [x] Logout works correctly (localStorage cleared)
- [x] Password reset implemented and working
- [ ] Preferences editing complete and tested
- [x] All core features working (browse, search, admin, user)
- [x] Database stable (40 tables, 2,764 resources)

### Quality
- [ ] awesome-lint 0 errors (currently 84)
- [ ] Test suite ≥90% passing (currently partial)
- [ ] Performance targets met (FCP < 1.8s, LCP < 2.5s)
- [x] Security validated (XSS, SQLi, RLS all tested)
- [x] No critical bugs (3 logout bugs fixed)

### Documentation
- [x] API documented (70 endpoints)
- [x] Deployment guide complete
- [x] Developer guide complete
- [ ] Known issues documented
- [ ] Release notes created

---

## Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|------------|
| Phase 1 | Low | Preferences is straightforward CRUD |
| Phase 2a | Medium | Database changes require careful migration |
| Phase 2b | Medium | Formatter logic complex, needs thorough testing |
| Phase 3 | High | Optimization broke app once (Bug #32) |
| Phase 4 | Low | Tests already exist, just running them |
| Phase 5 | Low | Documentation only |

**Highest Risk:** Phase 3 (performance optimization) - broke app in commit 9f8f05e

**Mitigation:** Test incrementally, verify after each change, keep rollback plan

---

## Timeline Estimates

| Phase | Optimistic | Realistic | Pessimistic |
|-------|-----------|-----------|-------------|
| Phase 1 | 2h | 3h | 4h |
| Phase 2a | 2h | 4h | 6h |
| Phase 2b | 2h | 4h | 6h |
| Phase 3 | 1h | 3h | 6h |
| Phase 4 | 1h | 2h | 3h |
| Phase 5 | 30min | 30min | 1h |
| **Total** | **8.5h** | **16.5h** | **26h** |

**With current progress:**
- Phase 1: 50% done (backend method added, endpoint + UI remain)
- Realistic estimate: **12-14 hours remaining**

---

## Notes

**Testing Strategy:** Inline per phase (test as you build)
**Deployment Strategy:** Deploy after all phases complete
**Context Management:** Each phase can be completed in one session
**Rollback Plan:** Git commits after each phase for easy rollback

---

**Next Action:** Start Phase 1 (complete preferences editing) or continue where left off
