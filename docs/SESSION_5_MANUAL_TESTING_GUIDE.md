# Session 5: Manual Testing Guide

**Created**: 2025-11-30
**Purpose**: Complete 3-layer verification for 20 critical API endpoints
**Estimated Time**: 2.5 hours

---

## Prerequisites

✅ Docker containers running: `docker-compose ps` (all healthy)
✅ Admin user exists: admin@test.com / Admin123!
✅ Test resource ID: `afc5937b-28eb-486c-961f-38b5d2418b2a`

---

## Step 1: Get JWT Token

1. Open browser: `http://localhost:3000/login`
2. Login with credentials: `admin@test.com` / `Admin123!`
3. Open DevTools (F12 or Cmd+Opt+I)
4. Go to: **Application** → **Local Storage** → `http://localhost:3000`
5. Find key: `sb-jeyldoypdkgsrfdhdcmm-auth-token`
6. Copy the **access_token** value (long string starting with `eyJ...`)
7. Set environment variable:
   ```bash
   export TOKEN="[paste_token_here]"
   export ADMIN_ID="58c592c5-548b-4412-b4e2-a9df5cac5397"
   export RESOURCE_ID="afc5937b-28eb-486c-961f-38b5d2418b2a"
   ```

---

## Priority 1: User Action Endpoints

### Test 1: POST /api/bookmarks/:resourceId

**Network Layer**:
```bash
curl -X POST "http://localhost:3000/api/bookmarks/$RESOURCE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Session 5 test bookmark"}' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: `200` or `201 Created`
- Response: `{"success": true}` or similar

**Database Layer**:
```sql
-- Via Supabase MCP:
SELECT user_id, resource_id, notes, created_at
FROM user_bookmarks
WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397'
  AND resource_id = 'afc5937b-28eb-486c-961f-38b5d2418b2a';
```
- Expected: 1 row with notes="Session 5 test bookmark"

**UI Layer**:
1. Navigate to: `http://localhost:3000/bookmarks`
2. Verify: Resource appears in bookmarks list
3. Verify: Notes display correctly
4. Screenshot: Save as `/tmp/session5-bookmark-added.png`

**Result**: ✅ PASS / ❌ FAIL

---

### Test 2: GET /api/bookmarks

**Network Layer**:
```bash
curl "http://localhost:3000/api/bookmarks" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```
- Expected: `200 OK`
- Response: Array with 1 bookmark

**Database Layer**:
```sql
SELECT COUNT(*) as total FROM user_bookmarks
WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397';
```
- Expected: `total = 1`

**UI Layer**:
- Already verified in Test 1 (bookmarks page)

**Result**: ✅ PASS / ❌ FAIL

---

### Test 3: DELETE /api/bookmarks/:resourceId

**Network Layer**:
```bash
curl -X DELETE "http://localhost:3000/api/bookmarks/$RESOURCE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: `200 OK` or `204 No Content`

**Database Layer**:
```sql
SELECT COUNT(*) as total FROM user_bookmarks
WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397'
  AND resource_id = 'afc5937b-28eb-486c-961f-38b5d2418b2a';
```
- Expected: `total = 0` (deleted)

**UI Layer**:
1. Refresh: `http://localhost:3000/bookmarks`
2. Verify: Bookmark removed from list
3. Screenshot: Save as `/tmp/session5-bookmark-removed.png`

**Result**: ✅ PASS / ❌ FAIL

---

### Test 4-6: Favorites (Same Pattern)

**Test 4**: POST /api/favorites/:resourceId
**Test 5**: GET /api/favorites
**Test 6**: DELETE /api/favorites/:resourceId

Use same verification pattern as bookmarks (substitute `user_favorites` table)

---

### Test 7: POST /api/resources (Submit Resource)

**Network Layer**:
```bash
curl -X POST "http://localhost:3000/api/resources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Session 5 Test Resource",
    "url": "https://github.com/test/session5",
    "description": "Testing resource submission during Session 5 verification",
    "category": "General Tools"
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: `201 Created`
- Response: Resource object with `status: "pending"`

**Database Layer**:
```sql
SELECT id, title, status, submitted_by, created_at
FROM resources
WHERE title = 'Session 5 Test Resource';
```
- Expected: 1 row, status='pending', submitted_by=admin_id

**UI Layer**:
1. Navigate to: `http://localhost:3000/profile` (or submissions page)
2. Verify: Pending resource appears
3. Screenshot: Save as `/tmp/session5-submit-resource.png`

**Result**: ✅ PASS / ❌ FAIL

---

## Priority 2: Admin Endpoints

### Test 8: PUT /api/resources/:id/approve

**Setup**: Use the resource ID from Test 7

**Network Layer**:
```bash
# Get the resource ID from Test 7 database query
export PENDING_ID="[resource_id_from_test_7]"

curl -X PUT "http://localhost:3000/api/resources/$PENDING_ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: `200 OK`

**Database Layer**:
```sql
SELECT status, approved_by, approved_at
FROM resources
WHERE id = '[pending_id]';
```
- Expected: status='approved', approved_by=admin_id, approved_at=recent timestamp

**Audit Log Verification** (CRITICAL):
```sql
SELECT resource_id, action, performed_by, changes, created_at
FROM resource_audit_log
WHERE resource_id = '[pending_id]'
ORDER BY created_at DESC;
```
- Expected: At least 1 row with action containing 'approve'
- **This verifies audit logging works** (currently 0 rows - suspicious)

**UI Layer**:
1. Navigate to category page: `http://localhost:3000/category/general-tools`
2. Verify: Resource now appears in public list
3. Screenshot: Save as `/tmp/session5-approved-resource-public.png`

**Result**: ✅ PASS / ❌ FAIL

---

### Test 9: PUT /api/admin/resources/:id (Edit Resource)

**Network Layer**:
```bash
curl -X PUT "http://localhost:3000/api/admin/resources/$RESOURCE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated during Session 5 testing"}' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: `200 OK`

**Database Layer**:
```sql
SELECT description, updated_at
FROM resources
WHERE id = 'afc5937b-28eb-486c-961f-38b5d2418b2a';
```
- Expected: description contains "Updated during Session 5 testing"

**UI Layer**:
1. Navigate to: `http://localhost:3000/admin/resources`
2. Verify: Updated description shows in table
3. Navigate to category page
4. Verify: Public page also shows updated description

**Result**: ✅ PASS / ❌ FAIL

---

### Test 10: POST /api/admin/resources/bulk (Bulk Approve)

**Setup**: Create 3 pending resources first

**Network Layer**:
```bash
# Create 3 test resources
for i in 1 2 3; do
  curl -X POST "http://localhost:3000/api/resources" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Bulk Test Resource $i\",
      \"url\": \"https://test.com/bulk$i\",
      \"description\": \"Bulk operation test $i\",
      \"category\": \"General Tools\"
    }"
done

# Get their IDs from database, then:
curl -X POST "http://localhost:3000/api/admin/resources/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "resourceIds": ["id1", "id2", "id3"]
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: `200 OK`, response: `{"success": true, "count": 3}`

**Database Layer**:
```sql
SELECT id, title, status, approved_by, approved_at
FROM resources
WHERE title LIKE 'Bulk Test Resource%'
ORDER BY title;
```
- Expected: All 3 have status='approved', approved_by set, approved_at set

**Audit Log**:
```sql
SELECT resource_id, action, performed_by
FROM resource_audit_log
WHERE resource_id IN ('id1', 'id2', 'id3');
```
- Expected: 3 rows with action='approved' or 'bulk_approved'

**UI Layer**:
1. Navigate to: `http://localhost:3000/admin/resources`
2. Filter by status='approved'
3. Verify: 3 bulk test resources appear
4. Screenshot: Save as `/tmp/session5-bulk-approve.png`

**Result**: ✅ PASS / ❌ FAIL

---

## Priority 3: Integration Endpoints

### Test 11: POST /api/admin/export

**Network Layer**:
```bash
curl -X POST "http://localhost:3000/api/admin/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Awesome Video Test Export",
    "description": "Session 5 export test",
    "includeContributing": false
  }' \
  -o /tmp/session5-export.md \
  -w "\nHTTP Status: %{http_code}\n"
```
- Expected: `200 OK`
- File: /tmp/session5-export.md should exist

**File Verification**:
```bash
# Check file size
ls -lh /tmp/session5-export.md

# Check content
head -50 /tmp/session5-export.md

# Verify structure
grep -c "^#" /tmp/session5-export.md  # Should have headings
grep -c "^-" /tmp/session5-export.md  # Should have list items
```
- Expected: File > 100 KB, contains markdown structure

**awesome-lint Validation**:
```bash
npx awesome-lint /tmp/session5-export.md
```
- Expected: Validation passes OR lists specific issues

**Result**: ✅ PASS / ❌ FAIL

---

### Test 12: POST /api/enrichment/start

**Network Layer**:
```bash
curl -X POST "http://localhost:3000/api/enrichment/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filter":"all","batchSize":2}' \
  | jq .
```
- Expected: `200 OK` or `201 Created`
- Response: Job object with `id`, `status: "pending"`, `batchSize: 2`

**Database Layer**:
```sql
SELECT id, status, batch_size, total_resources, processed_resources
FROM enrichment_jobs
ORDER BY created_at DESC
LIMIT 1;
```
- Expected: 1 row with status='pending' or 'processing'

**Result**: ✅ PASS / ❌ FAIL

---

### Test 13: GET /api/github/sync-history

**Network Layer**:
```bash
curl "http://localhost:3000/api/github/sync-history" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```
- Expected: `200 OK`
- Response: Array (may be empty initially)

**Database Layer**:
```sql
SELECT COUNT(*) as total FROM github_sync_history;
```
- Expected: 0 or more rows

**Result**: ✅ PASS / ❌ FAIL

---

## CRITICAL: Complete Workflow Test

### Test 14: Submit → Approve → Public (End-to-End)

This tests the MOST IMPORTANT integration: user submission through to public visibility.

**Phase 1: Submit** (already tested in Test 7)
**Phase 2: Approve** (already tested in Test 8)
**Phase 3: Verify Public Visibility**:

```bash
# Test as ANONYMOUS user (no token)
curl "http://localhost:3000/api/resources?category=General+Tools&search=Session+5+Test" | jq '.resources[] | {title, status}'
```
- Expected: Find "Session 5 Test Resource" with status='approved'

**UI Verification**:
1. Open INCOGNITO browser window
2. Navigate to: `http://localhost:3000/category/general-tools`
3. Search for: "Session 5 Test"
4. Verify: Resource appears in public results
5. Screenshot: Save as `/tmp/session5-workflow-complete.png`

**Audit Trail Verification**:
```sql
SELECT
  r.title,
  r.status,
  r.submitted_by,
  r.approved_by,
  r.created_at,
  r.approved_at,
  (SELECT COUNT(*) FROM resource_audit_log WHERE resource_id = r.id) as audit_count
FROM resources r
WHERE r.title = 'Session 5 Test Resource';
```
- Expected: submitted_by set, approved_by set, audit_count >= 1

**Result**: ✅ PASS / ❌ FAIL

---

## Testing Checklist

- [ ] Test 1: POST bookmark → DB + UI verified
- [ ] Test 2: GET bookmarks → Verified
- [ ] Test 3: DELETE bookmark → DB + UI verified
- [ ] Test 4: POST favorite → DB + UI verified
- [ ] Test 5: GET favorites → Verified
- [ ] Test 6: DELETE favorite → DB + UI verified
- [ ] Test 7: POST resource (submit) → DB + UI verified
- [ ] Test 8: PUT approve → DB + Audit + UI verified
- [ ] Test 9: PUT edit resource → DB + UI verified
- [ ] Test 10: POST bulk approve → DB + Audit + UI verified
- [ ] Test 11: POST export → File + awesome-lint verified
- [ ] Test 12: POST enrichment start → DB verified
- [ ] Test 13: GET sync history → Verified
- [ ] Test 14: **Complete workflow** → All 3 phases verified

**Total Tests**: 14 endpoint tests
**Estimated Time**: 2-2.5 hours

---

## Documentation

After completing tests, document results in:
- `docs/API_TEST_RESULTS.md` - Test matrix with evidence
- Update `docs/HONEST_COMPLETION_ASSESSMENT.md` - Reflect actual completion

---

**Ready for manual testing execution.**
