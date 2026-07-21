<overview>
End-to-end validation for Full-Stack applications (frontend + backend + database). The critical rule: validate BOTTOM-UP through the dependency stack. A frontend bug might actually be a backend bug. Isolate failures by validating each layer before testing the integration.
</overview>

<validation_order>
```
Layer 1: DATABASE    → Verify schema, seed data, connectivity
Layer 2: BACKEND API → Start server, curl endpoints, verify responses
Layer 3: FRONTEND    → Start dev server, browser automation, screenshots
Layer 4: INTEGRATION → Frontend actions produce correct backend state
```

Do NOT skip layers. If Layer 2 fails, Layer 3 and 4 results are meaningless.
</validation_order>

<layer1_database>
```bash
EVIDENCE="e2e-evidence/fullstack"
mkdir -p "$EVIDENCE"

# Verify database is running
pg_isready -h localhost 2>&1 | tee "$EVIDENCE/01-db-health.txt"

# Verify schema exists
psql "$DATABASE_URL" -c "\dt" 2>&1 | tee "$EVIDENCE/02-db-schema.txt"

# Verify seed data (if applicable)
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users" 2>&1 | tee "$EVIDENCE/03-db-seed.txt"

# Run migrations if needed
npm run migrate 2>&1 | tee "$EVIDENCE/04-db-migrate.txt"
```
</layer1_database>

<layer2_backend>
```bash
# Start backend
PORT=8080
npm run start:backend &
BACKEND_PID=$!

# Health check (poll up to 60s)
for i in $(seq 1 60); do
  curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1 && break
  [ "$i" -eq 60 ] && echo "FAIL: Backend timeout" && exit 1
  sleep 1
done
echo "Backend healthy" | tee "$EVIDENCE/05-backend-health.txt"

# Test key endpoints
curl -s "http://localhost:$PORT/api/v1/users" | tee "$EVIDENCE/06-api-users.json" | jq .
curl -s "http://localhost:$PORT/api/v1/health" | tee "$EVIDENCE/07-api-health.json" | jq .

# Verify data correctness
jq -e '.data | length > 0' "$EVIDENCE/06-api-users.json" > /dev/null \
  || echo "FAIL: No users returned from API"
```
</layer2_backend>

<layer3_frontend>
```bash
# Start frontend (backend already running from Layer 2)
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
for i in $(seq 1 30); do
  curl -sf "http://localhost:5173" > /dev/null 2>&1 && break
  [ "$i" -eq 30 ] && echo "FAIL: Frontend timeout" && exit 1
  sleep 1
done

# Browser testing with agent-browser or Playwright
agent-browser open "http://localhost:5173"
agent-browser wait --load networkidle
agent-browser screenshot "$EVIDENCE/08-frontend-home.png"

# Verify content rendered (not just page served)
agent-browser snapshot -i  # Get interactive elements
```
</layer3_frontend>

<layer4_integration>
The most critical layer. Frontend actions must produce correct backend state, and backend state must appear correctly in the frontend.

**Pattern: Create via Frontend → Verify via API → Verify in DB**
```bash
# 1. Fill form in frontend
agent-browser fill @emailField "newuser@test.com"
agent-browser fill @nameField "Test User"
agent-browser click @submitBtn
agent-browser wait --load networkidle
agent-browser screenshot "$EVIDENCE/09-form-submitted.png"

# 2. Verify via API (was the record actually created?)
curl -s "http://localhost:$PORT/api/v1/users?email=newuser@test.com" \
  | tee "$EVIDENCE/10-api-verify-created.json" | jq .
jq -e '.data[0].email == "newuser@test.com"' "$EVIDENCE/10-api-verify-created.json" \
  || echo "FAIL: User not found via API after frontend creation"

# 3. Verify in DB (is it really persisted?)
psql "$DATABASE_URL" \
  -c "SELECT id, email, name FROM users WHERE email = 'newuser@test.com'" \
  | tee "$EVIDENCE/11-db-verify-created.txt"
```

**Pattern: Create via API → Verify in Frontend**
```bash
# 1. Create via API
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"API User","email":"apiuser@test.com"}' \
  "http://localhost:$PORT/api/v1/users" \
  | tee "$EVIDENCE/12-api-create.json"

# 2. Refresh frontend and verify it appears
agent-browser open "http://localhost:5173/users"
agent-browser wait --load networkidle
agent-browser screenshot "$EVIDENCE/13-frontend-shows-api-user.png"
# READ the screenshot — verify "API User" appears in the list
```

**Pattern: Delete via Frontend → Verify removal everywhere**
```bash
# 1. Delete in UI
agent-browser click @deleteBtn
agent-browser screenshot "$EVIDENCE/14-after-delete.png"

# 2. Verify API returns 404
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:$PORT/api/v1/users/$USER_ID")
[ "$HTTP_CODE" -eq 404 ] && echo "PASS: Deleted via API" || echo "FAIL: Still exists"

# 3. Verify DB has no record
RESULT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE id = '$USER_ID'")
[ "$RESULT" -eq 0 ] && echo "PASS: Deleted in DB" || echo "FAIL: Still in DB"
```
</layer4_integration>

<journeys_to_validate>
Full-stack journeys combine frontend, backend, and database:

1. **User registration** — Form → API → DB → Confirmation page
2. **Login/Auth** — Credentials → JWT/Session → Protected route access
3. **CRUD via UI** — Create/Read/Update/Delete through frontend, verify in DB
4. **Data consistency** — Same data appears correctly in API and UI
5. **Real-time sync** — WebSocket/SSE updates appear in UI
6. **File uploads** — Upload via UI → Stored correctly → Retrievable
7. **Search/filter** — Frontend filters produce correct API queries, correct results
8. **Pagination** — Navigate pages, verify different data per page
9. **Error propagation** — Backend errors shown correctly in UI
10. **Concurrent access** — Multiple operations don't corrupt data
</journeys_to_validate>

<cleanup>
```bash
# Always clean up all processes
kill $FRONTEND_PID 2>/dev/null
kill $BACKEND_PID 2>/dev/null
agent-browser close 2>/dev/null
```
</cleanup>

<never>
- NEVER test frontend without backend running
- NEVER test backend without database running
- NEVER skip Layer 1-2 and go straight to Layer 3-4
- NEVER assume a frontend failure is a frontend bug (check backend first)
- NEVER mock API calls in the frontend for validation
- NEVER use in-memory databases
</never>
