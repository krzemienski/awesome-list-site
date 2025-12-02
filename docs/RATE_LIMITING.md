# Rate Limiting Architecture

## Summary

Rate limiting is implemented at multiple layers for comprehensive protection.

---

## Authentication Rate Limiting

**Handled By:** Supabase Auth Service (not application code)

**Endpoints Protected by Supabase:**
- POST /auth/v1/signup (user registration)
- POST /auth/v1/token (login)
- POST /auth/v1/otp (magic link)
- POST /auth/v1/recover (password reset)

**Limits (Supabase Free Tier):**
- Signup: ~10 per hour per IP
- Login: ~60 per hour per IP
- Magic link: ~4 per hour per email
- Password reset: ~4 per hour per email

**Why Application Doesn't Need Auth Rate Limiting:**
- All auth handled client-side via Supabase SDK
- No POST /api/login or POST /api/signup endpoints exist
- Supabase enforces rate limits before requests reach our API
- Evidence: Bug #31 (429 error during validation due to Supabase rate limit)

**Production Upgrade:** Supabase Pro tier has higher auth rate limits if needed.

---

## API Rate Limiting (Application)

**Implemented By:** express-rate-limit middleware

### Public Endpoints (100 req / 15 min)

- `GET /api/resources` - List approved resources
- `GET /api/categories` - Hierarchical category tree

**Code:** `server/routes.ts` lines 51-63 (`publicApiLimiter`)

### AI Endpoints (30 req / 15 min)

- `GET /api/recommendations` - Personalized recommendations
- `POST /api/recommendations` - Generate recommendations
- `POST /api/recommendations/feedback` - Record feedback

**Code:** `server/routes.ts` lines 64-76 (`recommendationsLimiter`)
**Rationale:** Stricter limits due to Claude API costs (~$0.004 per request)

### No Rate Limiting (Authenticated + Admin Only)

**Why Not:** Admin endpoints require authentication + admin role, limiting abuse potential:
- Bulk operations
- Resource editing
- User management
- GitHub sync
- Enrichment jobs

**Future Consideration:** Add limits if abuse detected in production.

---

## Nginx Rate Limiting (Infrastructure)

**File:** `nginx.conf` (if deployed with nginx)

**Default Limits:**
- General API: 10 req/s burst 20
- Auth endpoints: 5 req/min burst 5

**Note:** Currently Docker deployment doesn't enforce nginx limits in development.

---

## Monitoring

**Check Rate Limit Headers in Responses:**
```bash
curl -I http://localhost:3000/api/resources
# Look for:
# RateLimit-Limit: 100
# RateLimit-Remaining: 99
# RateLimit-Reset: <timestamp>
```

**429 Response Format:**
```json
{
  "message": "Too many requests. Please try again later."
}
```

**Supabase Dashboard:**
- Monitor auth rate limit hits: Dashboard → Auth → Logs
- Upgrade plan if limits consistently hit

---

**Architecture:** Layered rate limiting (Supabase for auth + express-rate-limit for API)
