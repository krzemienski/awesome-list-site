<overview>
End-to-end validation for Backend APIs. Start the REAL server with a REAL database, make REAL HTTP requests with curl, verify response bodies contain correct data — not just status codes. Never use supertest, httptest, or mock servers.
</overview>

<prerequisites>
- **curl**: Pre-installed on macOS/Linux. Verify: `curl --version`
- **jq**: `brew install jq` / `apt install jq` (needed for JSON verification)
- **Database**: Start your real database BEFORE the server
  - Postgres: `pg_isready -h localhost`
  - MySQL: `mysqladmin ping -h localhost`
  - SQLite: file exists and is readable
  - MongoDB: `mongosh --eval "db.runCommand({ping:1})"`
</prerequisites>

<validation_pattern>
```bash
# Start → Wait → Request → Verify (always this order)
SERVER_PID=""
trap "kill $SERVER_PID 2>/dev/null" EXIT
EVIDENCE="e2e-evidence/api"
mkdir -p "$EVIDENCE"

# 1. Start the REAL server
PORT=8080
npm start &  # or: cargo run, go run ., uvicorn main:app, rails s
SERVER_PID=$!

# 2. Wait for healthy (poll, don't guess timing)
for i in $(seq 1 60); do
  curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1 && break
  [ "$i" -eq 60 ] && echo "FAIL: Server failed to start after 60s" && exit 1
  sleep 1
done

# 3. Make REAL requests, capture responses
curl -s -w "\nHTTP:%{http_code} TIME:%{time_total}s\n" \
  -H "Content-Type: application/json" \
  "http://localhost:$PORT/api/v1/resource" \
  | tee "$EVIDENCE/01-get-resource.json"

# 4. Verify response CONTENT (not just status code)
jq -e '.data | length > 0' "$EVIDENCE/01-get-resource.json" > /dev/null \
  || echo "FAIL: No data in response"
```
</validation_pattern>

<journeys_to_validate>
For backend APIs, validate these journey categories:

1. **Health check** — Health endpoint returns 200 with correct body
2. **CRUD operations** — Create, Read, Update, Delete for each resource
   - POST creates → GET retrieves created item → matches what was sent
   - PUT/PATCH updates → GET shows updated values
   - DELETE removes → GET returns 404
3. **Authentication** — 401 without token, 200 with valid token, 403 for wrong role
4. **Input validation** — Invalid payloads return 4xx with descriptive error
5. **Pagination** — Response includes total, page, limit; next page has different items
6. **Error handling** — Missing resources return 404, server errors return 500 with safe message
7. **Database integrity** — After mutations, query DB directly to verify records
8. **Performance** — Response times within acceptable bounds for each endpoint
</journeys_to_validate>

<curl_patterns>
```bash
# GET with auth and timing
curl -s -w "\nHTTP:%{http_code} TIME:%{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  "http://localhost:$PORT/api/v1/users" \
  | tee "$EVIDENCE/get-users.json"

# POST with JSON body
curl -s -w "\nHTTP:%{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test User","email":"test@example.com"}' \
  "http://localhost:$PORT/api/v1/users" \
  | tee "$EVIDENCE/create-user.json"

# Verify JSON field exists and has value
jq -e '.id != null' "$EVIDENCE/create-user.json" > /dev/null 2>&1 \
  || echo "FAIL: no id in create response"

# Capture HTTP status separately
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:$PORT/api/v1/nonexistent")
[ "$HTTP_CODE" -eq 404 ] && echo "PASS: 404 for missing" || echo "FAIL: got $HTTP_CODE"

# Auth test: must fail without token
HTTP_NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:$PORT/api/v1/protected")
[ "$HTTP_NO_AUTH" -eq 401 ] && echo "PASS: 401 without auth" || echo "FAIL: got $HTTP_NO_AUTH"
```
</curl_patterns>

<database_verification>
After any mutation (POST, PUT, DELETE), verify directly in the database:

```bash
# Postgres
psql "$DATABASE_URL" -c "SELECT * FROM users WHERE email = 'test@example.com'" \
  | tee "$EVIDENCE/db-verify-user.txt"

# SQLite
sqlite3 "$DB_PATH" "SELECT * FROM users WHERE email = 'test@example.com'" \
  | tee "$EVIDENCE/db-verify-user.txt"

# MySQL
mysql -u root -p"$MYSQL_PASSWORD" "$DB_NAME" \
  -e "SELECT * FROM users WHERE email = 'test@example.com'" \
  | tee "$EVIDENCE/db-verify-user.txt"

# MongoDB
mongosh "$MONGO_URI" --eval 'db.users.findOne({email: "test@example.com"})' \
  | tee "$EVIDENCE/db-verify-user.txt"
```
</database_verification>

<pass_criteria_examples>
| Verification | Good Evidence | Bad Evidence |
|-------------|--------------|----------------|
| Endpoint works | JSON with correct data structure + values | `200 OK` alone |
| Error handling | `{"error": "Not found"}` with 404 | 500 with stack trace |
| Authentication | 401 without token, 200 with token | Only testing happy path |
| Pagination | total, page, limit fields correct | Only checking first page |
| Data integrity | Created item retrievable via GET | POST 201 without verifying retrieval |
</pass_criteria_examples>

<failure_troubleshooting>
| Symptom | Cause | Fix |
|---------|-------|-----|
| Connection refused | Server not running / wrong port | `lsof -i :$PORT` |
| 404 on valid endpoint | Wrong API prefix | Check route definitions |
| 500 Internal Server Error | Backend exception | Read server stderr/logs |
| Empty response body | Route returns before query | Check for missing `await` |
| CORS error (browser) | Missing CORS middleware | Use curl (no CORS) or add middleware |
| Wrong data format | JSON keys changed | Compare response with expected schema |
</failure_troubleshooting>

<never>
- NEVER use `supertest`, `httptest`, or mock HTTP servers
- NEVER use in-memory databases (SQLite :memory:, H2)
- NEVER test against "test" configurations
- NEVER skip authentication testing
- NEVER verify only status codes — verify response CONTENT
</never>
