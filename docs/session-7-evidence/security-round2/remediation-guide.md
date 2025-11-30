# Security Remediation Guide - Quick Implementation

**Target Grade**: Upgrade from **C+** to **A** in 6-10 hours
**Current Grade**: C+ (6.45/10)
**Target Grade**: A (9.0+/10)

---

## Priority 1: Rate Limiting (2-4 hours)

### Option A: Express Middleware (Recommended for Quick Fix)

**Install**:
```bash
npm install express-rate-limit
```

**Implementation** (`server/index.ts`):
```typescript
import rateLimit from 'express-rate-limit';

// API rate limiter (60 req/min)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after a minute'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(60 - (Date.now() % 60000) / 1000)
    });
  }
});

// Auth rate limiter (10 req/min, stricter)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many authentication attempts, please try again later'
  }
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Stricter limit for password-based auth
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Reset on successful login
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  // Login logic
});
```

**Testing**:
```bash
# Test API rate limit
for i in {1..70}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/resources
done
# Expected: First 60 = 200, last 10 = 429

# Test auth rate limit
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/auth/user
done
# Expected: First 10 = 200, last 5 = 429
```

### Option B: Nginx (Production Recommended)

**Configuration** (`/etc/nginx/nginx.conf` or Docker nginx.conf):
```nginx
http {
  # Define rate limit zones
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;
  limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
  limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/15m;

  server {
    listen 80;
    server_name localhost;

    # General API rate limiting
    location /api/ {
      limit_req zone=api_limit burst=20 nodelay;
      limit_req_status 429;

      proxy_pass http://backend:3000;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Auth endpoints - stricter
    location /api/auth/ {
      limit_req zone=auth_limit burst=5 nodelay;
      limit_req_status 429;

      proxy_pass http://backend:3000;
    }

    # Login endpoint - very strict
    location = /api/auth/login {
      limit_req zone=login_limit burst=2 nodelay;
      limit_req_status 429;

      proxy_pass http://backend:3000;
    }
  }
}
```

**Docker Compose Update**:
```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - web
```

---

## Priority 2: Security Headers (1-2 hours)

### Implementation with Helmet

**Install**:
```bash
npm install helmet
```

**Basic Configuration** (`server/index.ts`):
```typescript
import helmet from 'helmet';

app.use(helmet({
  // X-Frame-Options: Prevent clickjacking
  frameguard: { action: 'sameorigin' },

  // X-Content-Type-Options: Prevent MIME sniffing
  noSniff: true,

  // X-XSS-Protection: Legacy browser XSS protection
  xssFilter: true,

  // Referrer-Policy: Control referrer information
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Content Security Policy (CSP)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React inline scripts
        "'unsafe-eval'", // Required for Vite HMR in development
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components/Tailwind
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://jeyldoypdkgsrfdhdcmm.supabase.co", // Supabase
        process.env.NODE_ENV === 'development' ? 'ws://localhost:*' : '', // Vite HMR
      ].filter(Boolean),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },

  // HSTS: Force HTTPS (production only)
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,

  // Permissions-Policy: Restrict browser features
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
    usb: [],
    magnetometer: [],
  }
}));

// Remove X-Powered-By header
app.disable('x-powered-by');
```

**Development-Specific CSP** (more permissive):
```typescript
// server/index.ts
const cspDirectives = process.env.NODE_ENV === 'production'
  ? {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      // ... strict production CSP
    }
  : {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws://localhost:*", "http://localhost:*"],
      // ... relaxed development CSP
    };

app.use(helmet({
  contentSecurityPolicy: { directives: cspDirectives }
}));
```

**Testing**:
```bash
curl -I http://localhost:3000/ | grep -E "X-Frame|X-Content|X-XSS|Referrer|Content-Security"

# Expected output:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
# Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

---

## Priority 3: RLS User Isolation Testing (2-3 hours)

### Step 1: Create Test Users via SQL

**Run in Supabase SQL Editor**:
```sql
-- Create test user A
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sectest-a@test.local',
  crypt('SecTestA123', gen_salt('bf')),
  NOW(),
  '{"role": "user"}'::jsonb,
  NOW(),
  NOW()
)
RETURNING id, email;

-- Save the returned ID for User A

-- Create test user B
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sectest-b@test.local',
  crypt('SecTestB123', gen_salt('bf')),
  NOW(),
  '{"role": "user"}'::jsonb,
  NOW(),
  NOW()
)
RETURNING id, email;

-- Verify users created
SELECT id, email, email_confirmed_at, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email LIKE 'sectest-%@test.local';
```

### Step 2: Get JWT Tokens

**Login as User A**:
```bash
SUPABASE_URL="https://jeyldoypdkgsrfdhdcmm.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleWxkb3lwZGtnc3JmZGhkY21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NTg0NDgsImV4cCI6MjA2MTUzNDQ0OH0.CN3NbhFk3yd_t2SkJHRu4mjDjAd-Xvzgc8oUScDg5kU"

# Login User A
RESP_A=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"sectest-a@test.local","password":"SecTestA123"}')

TOKEN_A=$(echo "$RESP_A" | jq -r '.access_token')
USER_A_ID=$(echo "$RESP_A" | jq -r '.user.id')

echo "User A Token: ${TOKEN_A:0:50}..."
echo "User A ID: $USER_A_ID"

# Login User B
RESP_B=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"sectest-b@test.local","password":"SecTestB123"}')

TOKEN_B=$(echo "$RESP_B" | jq -r '.access_token')
USER_B_ID=$(echo "$RESP_B" | jq -r '.user.id')

echo "User B Token: ${TOKEN_B:0:50}..."
echo "User B ID: $USER_B_ID"
```

### Step 3: RLS Isolation Tests

**Test Script** (`tests/security/rls-isolation-test.sh`):
```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

# Get a resource ID for testing
RESOURCE_ID=$(curl -s "${BASE_URL}/api/resources?page=1&limit=1" | jq -r '.resources[0].id')

echo "=== RLS Isolation Testing ==="
echo "Resource ID: $RESOURCE_ID"
echo ""

# Test 1: User A creates a favorite
echo "TEST 1: User A adds favorite"
curl -s -X POST "${BASE_URL}/api/favorites/${RESOURCE_ID}" \
  -H "Authorization: Bearer ${TOKEN_A}" \
  -H "Content-Type: application/json" | jq '.'

# Test 2: User A retrieves favorites (should see 1)
echo -e "\nTEST 2: User A retrieves favorites"
curl -s "${BASE_URL}/api/favorites" \
  -H "Authorization: Bearer ${TOKEN_A}" | jq '.favorites | length'

# Test 3: User B retrieves favorites (should see 0, NOT User A's)
echo -e "\nTEST 3: User B retrieves favorites (should be 0, not 1)"
USER_B_FAVORITES=$(curl -s "${BASE_URL}/api/favorites" \
  -H "Authorization: Bearer ${TOKEN_B}" | jq '.favorites | length')

if [ "$USER_B_FAVORITES" -eq 0 ]; then
  echo "✅ PASS: User B cannot see User A's favorites"
else
  echo "❌ FAIL: User B can see User A's favorites! RLS BROKEN!"
fi

# Test 4: User B attempts to DELETE User A's favorite
echo -e "\nTEST 4: User B attempts to delete User A's favorite"
DELETE_RESP=$(curl -s -X DELETE "${BASE_URL}/api/favorites/${RESOURCE_ID}" \
  -H "Authorization: Bearer ${TOKEN_B}" \
  -w "\nHTTP:%{http_code}")

HTTP_CODE=$(echo "$DELETE_RESP" | tail -1 | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "✅ PASS: User B cannot delete User A's favorite (HTTP $HTTP_CODE)"
else
  echo "❌ FAIL: User B can delete User A's favorite! RLS BROKEN!"
fi

# Test 5: Verify User A's favorite still exists
echo -e "\nTEST 5: Verify User A's favorite still exists"
USER_A_FAVORITES_AFTER=$(curl -s "${BASE_URL}/api/favorites" \
  -H "Authorization: Bearer ${TOKEN_A}" | jq '.favorites | length')

if [ "$USER_A_FAVORITES_AFTER" -eq 1 ]; then
  echo "✅ PASS: User A's favorite intact"
else
  echo "❌ FAIL: User A's favorite was deleted!"
fi

# Test 6: User B creates their own bookmark
echo -e "\nTEST 6: User B creates bookmark"
curl -s -X POST "${BASE_URL}/api/bookmarks/${RESOURCE_ID}" \
  -H "Authorization: Bearer ${TOKEN_B}" \
  -H "Content-Type: application/json" \
  -d '{"notes":"User B notes"}' | jq '.'

# Test 7: User A retrieves bookmarks (should NOT see User B's)
echo -e "\nTEST 7: User A retrieves bookmarks (should be 0)"
USER_A_BOOKMARKS=$(curl -s "${BASE_URL}/api/bookmarks" \
  -H "Authorization: Bearer ${TOKEN_A}" | jq '.bookmarks | length')

if [ "$USER_A_BOOKMARKS" -eq 0 ]; then
  echo "✅ PASS: User A cannot see User B's bookmarks"
else
  echo "❌ FAIL: User A can see User B's bookmarks! RLS BROKEN!"
fi

echo -e "\n=== RLS Isolation Tests Complete ==="
```

**Run Tests**:
```bash
chmod +x tests/security/rls-isolation-test.sh
./tests/security/rls-isolation-test.sh > docs/session-7-evidence/security-round2/rls-test-results.txt
```

### Step 4: SQL Verification

**Direct Database Test** (Supabase SQL Editor):
```sql
-- Set session to User A's JWT claims
SET request.jwt.claims.sub = 'USER_A_ID_HERE';

-- Query favorites (should only see User A's)
SELECT * FROM user_favorites WHERE user_id = 'USER_A_ID_HERE';
-- Expected: 1 row

-- Attempt to query User B's favorites as User A
SELECT * FROM user_favorites WHERE user_id = 'USER_B_ID_HERE';
-- Expected: 0 rows (RLS should block)

-- Reset session
RESET request.jwt.claims;

-- Admin bypass test
SET request.jwt.claims.sub = 'ADMIN_USER_ID';
SET request.jwt.claims.role = 'admin';

SELECT * FROM user_favorites;
-- Expected: All favorites visible (admin bypass works)
```

---

## Priority 4: CORS Configuration (30 minutes)

**Install**:
```bash
npm install cors
npm install -D @types/cors
```

**Implementation** (`server/index.ts`):
```typescript
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          'https://yourdomain.com',
          'https://www.yourdomain.com',
          process.env.WEBSITE_URL
        ].filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:5173']; // Vite dev server

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // Preflight cache (10 minutes)
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
```

**Testing**:
```bash
# Test allowed origin
curl -I http://localhost:3000/api/resources \
  -H "Origin: http://localhost:3000"
# Expected: Access-Control-Allow-Origin: http://localhost:3000

# Test blocked origin
curl -I http://localhost:3000/api/resources \
  -H "Origin: http://evil.com"
# Expected: No Access-Control-Allow-Origin header
```

---

## Validation Checklist

After implementing all fixes, verify:

### ✅ Rate Limiting
```bash
# Send 70 requests
for i in {1..70}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/resources; done | grep 429 | wc -l
# Expected: ~10 (429 responses)
```

### ✅ Security Headers
```bash
curl -I http://localhost:3000/ | grep -E "X-Frame|X-Content|X-XSS|Referrer|Content-Security|X-Powered-By"
# Expected:
# - X-Frame-Options: SAMEORIGIN
# - X-Content-Type-Options: nosniff
# - X-XSS-Protection: 1; mode=block
# - Referrer-Policy: strict-origin-when-cross-origin
# - Content-Security-Policy: (present)
# - NO X-Powered-By header
```

### ✅ RLS Isolation
```bash
./tests/security/rls-isolation-test.sh
# Expected: All tests PASS
```

### ✅ CORS
```bash
curl -I http://localhost:3000/api/resources -H "Origin: http://evil.com" | grep "Access-Control"
# Expected: No Access-Control headers (blocked)
```

---

## Expected Security Score After Fixes

| Category | Before | After | Change |
|----------|--------|-------|--------|
| **XSS Prevention** | 10/10 | 10/10 | ➡️ |
| **SQL Injection** | 10/10 | 10/10 | ➡️ |
| **Rate Limiting** | 0/10 | 9/10 | ⬆️ +9 |
| **Security Headers** | 2/10 | 9/10 | ⬆️ +7 |
| **SSRF Protection** | 9/10 | 9/10 | ➡️ |
| **RLS Isolation** | 5/10 | 10/10 | ⬆️ +5 |
| **TOTAL** | 6.45/10 | **9.15/10** | ⬆️ +2.7 |

**New Grade**: **A** (91.5%)

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Rate limiting implemented (express-rate-limit OR nginx)
- [ ] Helmet security headers configured
- [ ] X-Powered-By header removed
- [ ] RLS isolation tests passing (all 7 tests ✅)
- [ ] CORS restricted to production domain
- [ ] HTTPS/SSL certificate installed
- [ ] HSTS header enabled (if HTTPS)
- [ ] Environment variables set correctly
- [ ] Database backups configured
- [ ] Error monitoring (Sentry/LogRocket) configured
- [ ] Security audit re-run (verify Grade A)

**Estimated Total Time**: 6-10 hours
**Recommended Timeline**: 2-3 work days (with testing/validation)

---

**End of Remediation Guide**
