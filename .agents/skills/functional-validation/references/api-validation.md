# Backend API Validation Reference

## Prerequisites

- **curl**: Pre-installed on macOS/Linux. Verify: `curl --version`
- **jq**: `brew install jq` (if `jq` not found — needed for JSON response verification)
- **Database**: Start your real database before the server. Check with `pg_isready` (Postgres) or `mysqladmin ping` (MySQL).

## The Validation Pattern

```bash
# Start → Wait → Request → Verify (always this order)
SERVER_PID=""
trap "kill $SERVER_PID 2>/dev/null" EXIT

# 1. Start the real server
PORT=8080 cargo run &  # or: go run ., npm start, uvicorn main:app
SERVER_PID=$!

# 2. Wait for healthy (poll, don't guess timing)
for i in $(seq 1 60); do
  curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1 && break
  [ "$i" -eq 60 ] && echo "Server failed to start" && exit 1
  sleep 1
done

# 3. Make real requests, capture responses
curl -s "http://localhost:$PORT/api/v1/endpoint" | tee response.json | jq .
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/v1/endpoint")

# 4. Verify response content (not just status code)
jq -e '.data | length > 0' response.json > /dev/null || echo "FAIL: No data in response"
```

## What PASS Looks Like (Not Just "200 OK")

| Verification | Good Evidence | Bad Evidence |
|-------------|--------------|-------------|
| Endpoint works | Response JSON with correct data structure + values | `200 OK` (proves endpoint exists, not correctness) |
| Error handling | `{"error": "Not found"}` with 404 status | 500 with stack trace |
| Authentication | 401 without token, 200 with valid token | Only testing the happy path |
| Pagination | Response includes `total`, `page`, `limit` fields | Only checking first page |
| Data integrity | Created item retrievable via GET with correct fields | POST returns 201 without verifying retrieval |

## Common curl Patterns

```bash
# Capture status + body + timing in one call
curl -s -w "\nHTTP:%{http_code} TIME:%{time_total}s\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' \
  "http://localhost:$PORT/api/v1/resource" | tee evidence.json

# Verify JSON field exists and has value
jq -e '.items | length > 0' evidence.json > /dev/null 2>&1 || echo "FAIL: empty items"
```

## Failure Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Connection refused | Server not running or wrong port | Check with `lsof -i :$PORT` |
| 404 on valid endpoint | Wrong API prefix (e.g., missing `/api/v1`) | Check server route definitions |
| 500 Internal Server Error | Server-side exception | Read server stderr/logs for stack trace |
| Empty response body | Route returns before query completes | Check for missing `await` or async issues |
| CORS error (from browser) | Missing CORS headers | Add CORS middleware; or use curl (no CORS enforcement) |
| Wrong data format | Backend changed JSON keys | Compare curl response with expected schema |

## Never Do

- **NEVER use `supertest`, `httptest`, or mock servers** — test the REAL running server
- **NEVER use in-memory databases** — they skip migrations and have different SQL behavior
- **NEVER test against a "test" configuration** — use production config with test data
- **NEVER skip authentication testing** — test both with and without valid credentials
