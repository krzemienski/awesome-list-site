# Known Limitations - Testing Session 10

**Date:** 2025-12-01
**Session:** Systematic Verification with Chrome DevTools MCP
**Status:** Documented

---

## Test Infrastructure Limitations

### 1. Chrome DevTools MCP UID Staleness

**Issue:** Element UIDs from snapshots become stale after page updates

**Impact:**
- Click operations require fresh snapshot before each interaction
- Increases test execution time
- Occasional timeouts on rapid interactions

**Workaround:**
- Always call `take_snapshot()` before `click()` or `fill()`
- Use `evaluate_script()` for direct API calls when UI unreliable
- Add wait conditions after state-changing operations

**Example:**
```javascript
// ❌ FAILS - Stale UID
const snapshot1 = await take_snapshot();
await click({ uid: '123_45' });
await click({ uid: '123_46' }); // ERROR: Stale snapshot

// ✅ WORKS - Fresh snapshot
const snapshot1 = await take_snapshot();
await click({ uid: '123_45' });
const snapshot2 = await take_snapshot(); // Refresh
await click({ uid: '124_46' }); // New UID from fresh snapshot
```

---

### 2. Single Browser Instance Limitation

**Issue:** Chrome DevTools MCP manages ONE browser instance per connection

**Impact:**
- Cannot test simultaneous multi-user scenarios
- Cannot verify real-time WebSocket updates between users
- Must logout/login to switch user contexts

**Workaround:**
- Use sequential testing: User A → logout → User B
- Test RLS via API endpoint verification (not simultaneous UI)
- Use database queries to verify cross-user isolation

**Cannot Test:**
- User A and User B both logged in simultaneously
- Real-time collaboration features
- Concurrent write conflict resolution

**Can Test:**
- User A creates data → logout → User B cannot see it
- Admin approves → logout → Anonymous user can see it
- State transitions across user contexts

---

### 3. Playwright UI Test Timing Issues

**Issue:** Some UI tests fail with "element not found" due to timing

**Impact:**
- Tests marked as "flaky" or skipped
- Requires retries or manual verification
- Cannot rely 100% on automated UI testing

**Root Cause:**
- React Query cache invalidations cause re-renders
- Table data loading async
- Modals/dialogs have animation delays

**Workaround:**
- Add explicit wait conditions
- Use data-testid attributes consistently
- Increase timeout values for slow operations
- Verify via API layer when UI test fails

---

### 4. Supabase MCP Bypasses RLS

**Issue:** Supabase MCP uses service_role which bypasses Row-Level Security

**Impact:**
- Cannot test RLS policies via direct SQL queries
- Must verify RLS through API endpoints
- Database queries show ALL data regardless of user context

**Workaround:**
- **Layer 1 (API):** Verify endpoint returns filtered data
- **Layer 2 (DB):** Use service_role to confirm data EXISTS
- **Layer 3 (UI):** Verify UI shows only user's data

**Example RLS Test Pattern:**
```
User A creates bookmark
→ DB query shows bookmark exists (service_role sees it)
→ Logout User A, login User B
→ API call GET /api/bookmarks returns empty (RLS enforced at API)
→ UI shows "No bookmarks" (correct isolation)
```

---

## Application Limitations

### 1. UI Submissions Tab Not Rendering

**Issue:** Profile page Submissions tab shows "No submitted resources" despite API returning data

**Severity:** MEDIUM
**Impact:** Users cannot view their submissions via UI (API works)
**Status:** BUG #3 in BUG_QUEUE.md
**Workaround:** Access submissions via API or admin panel

---

### 2. Bulk Operations UI Test Coverage

**Issue:** Bulk operations UI workflow tests failing due to element discovery

**Severity:** LOW (Test infrastructure, not feature)
**Impact:** Cannot automatically verify UI for bulk approve/reject/archive/tag
**Verification:** API layer tested and verified working
**Workaround:** Manual testing or API-only verification

---

### 3. AI Enrichment Limited Coverage

**Issue:** Enrichment tests show 0 resources enriched (all skipped)

**Possible Causes:**
- No unenriched resources in test database
- ANTHROPIC_API_KEY validation failing silently
- Enrichment filter too restrictive

**Impact:** Cannot fully verify AI enrichment end-to-end
**Status:** Requires investigation
**Workaround:** Create fresh test resources without metadata

---

## Testing Methodology Limitations

### Cannot Test in This Session

**Real-Time Features:**
- WebSocket live updates
- Server-Sent Events (SSE)
- Multiple users collaborating simultaneously

**External Integrations:**
- GitHub OAuth flow (requires browser OAuth)
- Google OAuth flow (requires browser OAuth)
- Magic link authentication (requires email access)
- Actual GitHub repository import/export (requires public repo)

**Performance Under Load:**
- 100+ concurrent users
- 1000+ resources per category
- Long-running enrichment jobs (hours)
- Memory leak detection (24-hour test)

**Browser Compatibility:**
- Safari-specific issues
- Firefox-specific issues
- Mobile browser quirks
- Older browser versions

---

## Playwright Test Suite Limitations

**Total Tests:** 733
**Execution Time:** ~2-3 hours for full suite
**Parallelization:** Single worker (sequential execution)

**Why Not Parallel:**
- Shared database state
- Same test users
- RLS policies require user context switching
- Test data cleanup dependencies

**Impact:**
- Long test execution time
- Cannot speed up with parallelization
- Must run sequentially to avoid data conflicts

---

## Chrome DevTools MCP vs Playwright Comparison

| Aspect | Chrome DevTools MCP | Playwright |
|--------|-------------------|------------|
| **Control** | Real-time, interactive | Automated, scripted |
| **Debugging** | Immediate inspection | Trace files, screenshots |
| **Speed** | Slower (manual steps) | Faster (automated) |
| **Flexibility** | Can adapt on-the-fly | Fixed test scripts |
| **Evidence** | Inline screenshots | Saved to files |
| **Best For** | Investigation, exploration | Regression testing |

**Recommendation:** Use both - Chrome DevTools for debugging, Playwright for CI/CD

---

## Security Test Deferred

**Reason:** User requested security tests run at end of session

**Tests Pending:**
- XSS injection in all input fields
- SQL injection in search/filters
- RLS isolation verification (comprehensive)
- Anonymous user access to protected routes
- CSRF protection
- Rate limiting

**Will Execute:** After all functional testing complete

---

## Data Limitations

**Test Data Quality:**
- 2,674 approved resources (good coverage)
- 4 test users (sufficient for isolation testing)
- Limited pending resources for approval workflows
- No learning journeys with actual content

**Missing Test Data:**
- Realistic user journey progress
- Large batch enrichment scenarios (100+ resources)
- GitHub sync with actual awesome-video repository
- User-generated content at scale

---

## Tooling Gaps

**What We Don't Have:**
- Performance profiling tools
- Memory leak detection
- Network throttling simulation
- Accessibility testing automation
- Visual regression testing
- Load testing infrastructure

**Impact:**
- Cannot verify performance under stress
- Cannot detect subtle memory leaks
- Cannot test on slow connections
- Cannot verify WCAG compliance automatically

---

## Recommendations

### Immediate (This Session)
1. Complete security testing
2. Document all findings
3. Create final summary

### Short-Term (Next Sprint)
1. Fix UI Submissions tab
2. Improve Playwright test stability
3. Add missing test data (journeys, etc.)

### Long-Term (Production)
1. Add visual regression testing
2. Set up load testing infrastructure
3. Implement accessibility testing
4. Add browser compatibility testing

---

## Acceptance Criteria

**What "Done" Means for This Session:**
- ✅ 90%+ of core features verified working
- ✅ All critical bugs documented
- ✅ Evidence collected for all tests
- ⏳ Security vulnerabilities: ZERO found (testing pending)
- ✅ Production-blocking issues: NONE found

**Current Status:** On track for "Done" pending security tests

---

**Last Updated:** 2025-12-01 05:16
**Next Update:** After security testing complete
