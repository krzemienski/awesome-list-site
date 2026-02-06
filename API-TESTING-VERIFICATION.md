# API Endpoint Testing Verification Guide

## Overview

This document provides comprehensive testing verification for the centralized error handling middleware implementation. All 94+ route handlers have been migrated from try-catch blocks to the new asyncHandler + ApiError pattern.

## Testing Environment Setup

1. **Start the development server:**
   ```bash
   npm run dev
   # Server should start on port 3000 (or PORT env variable)
   ```

2. **Verify server starts without errors:**
   - Check console for successful startup message
   - Ensure no error stack traces during initialization
   - Confirm database migrations run successfully

## Test Categories

### 1. Error Handling Test Routes (Development Only)

These routes were added to verify the error middleware works correctly.

| Endpoint | Method | Expected Status | Expected Response |
|----------|--------|----------------|-------------------|
| `/api/test/error/validation` | GET | 400 | `{"message": "Validation failed", "errors": [...]}` |
| `/api/test/error/unauthorized` | GET | 401 | `{"message": "Authentication required"}` |
| `/api/test/error/forbidden` | GET | 403 | `{"message": "Insufficient permissions"}` |
| `/api/test/error/notfound` | GET | 404 | `{"message": "Resource not found"}` |
| `/api/test/error/server` | GET | 500 | `{"message": "Internal server error", "stack": "..."}` (dev only) |
| `/api/test/error/generic` | GET | 500 | `{"message": "Something went wrong"}` |
| `/api/test/error/async` | GET | 500 | `{"message": "Async operation failed"}` |
| `/api/test/error/success` | GET | 200 | `{"message": "Success!"}` |

**Test Commands:**
```bash
# Test ValidationError (400)
curl http://localhost:3000/api/test/error/validation

# Test UnauthorizedError (401)
curl http://localhost:3000/api/test/error/unauthorized

# Test ForbiddenError (403)
curl http://localhost:3000/api/test/error/forbidden

# Test NotFoundError (404)
curl http://localhost:3000/api/test/error/notfound

# Test InternalServerError (500)
curl http://localhost:3000/api/test/error/server

# Test Generic Error (500)
curl http://localhost:3000/api/test/error/generic

# Test Async Error (500)
curl http://localhost:3000/api/test/error/async

# Test Success (200)
curl http://localhost:3000/api/test/error/success
```

**Verification Checklist:**
- [ ] All error responses return JSON with `message` field
- [ ] ValidationError includes `errors` array with detailed validation failures
- [ ] Stack traces appear in development mode for 500 errors
- [ ] Status codes match the error type
- [ ] No console errors or unhandled promise rejections

### 2. Authentication Endpoints

| Endpoint | Method | Auth Required | Expected Behavior |
|----------|--------|--------------|-------------------|
| `/api/auth/user` | GET | Yes | Returns user info or 401 if not authenticated |
| `/api/auth/logout` | POST | Yes | Logs out user or 401 if not authenticated |

**Test Commands:**
```bash
# Without authentication - should return 401
curl http://localhost:3000/api/auth/user

# With valid session - should return user object
curl -H "Cookie: session=..." http://localhost:3000/api/auth/user
```

**Verification Checklist:**
- [ ] Unauthenticated requests return 401 with `{"message": "..."}`
- [ ] Error response is consistent JSON format
- [ ] No stack traces in error responses (client errors)

### 3. Resource CRUD Operations

| Endpoint | Method | Auth Required | Expected Behavior |
|----------|--------|--------------|-------------------|
| `/api/resources` | GET | No | Returns list of resources (200) |
| `/api/resources/:id` | GET | No | Returns single resource or 404 |
| `/api/resources` | POST | Yes | Creates resource or 401/400 |
| `/api/resources/:id` | PUT | Yes (Admin) | Updates resource or 401/403/404 |
| `/api/resources/:id` | DELETE | Yes (Admin) | Deletes resource or 401/403/404 |
| `/api/resources/pending` | GET | Yes (Admin) | Returns pending resources or 401/403 |
| `/api/resources/:id/approve` | PUT | Yes (Admin) | Approves resource or 401/403/404 |
| `/api/resources/:id/reject` | PUT | Yes (Admin) | Rejects resource or 401/403/404 |

**Test Commands:**
```bash
# Get all resources (public)
curl http://localhost:3000/api/resources

# Get specific resource (public)
curl http://localhost:3000/api/resources/1

# Get non-existent resource - should return 404
curl http://localhost:3000/api/resources/99999

# Create resource without auth - should return 401
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'

# Create resource with invalid data - should return 400
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"invalid": "data"}'
```

**Verification Checklist:**
- [ ] GET requests work without authentication
- [ ] POST/PUT/DELETE require authentication (401 if not authenticated)
- [ ] Admin endpoints return 403 if not admin
- [ ] Non-existent resources return 404 with JSON error
- [ ] Invalid input returns 400 with validation errors
- [ ] All error responses have consistent JSON format

### 4. Category Endpoints

| Endpoint | Method | Expected Behavior |
|----------|--------|-------------------|
| `/api/categories` | GET | Returns all categories (200) |
| `/api/subcategories` | GET | Returns all subcategories (200) |
| `/api/sub-subcategories` | GET | Returns all sub-subcategories (200) |

**Test Commands:**
```bash
# Get categories
curl http://localhost:3000/api/categories

# Get subcategories
curl http://localhost:3000/api/subcategories

# Get sub-subcategories
curl http://localhost:3000/api/sub-subcategories
```

**Verification Checklist:**
- [ ] All endpoints return 200 with JSON arrays
- [ ] No authentication required
- [ ] Responses are properly formatted

### 5. User Favorites and Bookmarks

| Endpoint | Method | Auth Required | Expected Behavior |
|----------|--------|--------------|-------------------|
| `/api/favorites` | GET | Yes | Returns user's favorites or 401 |
| `/api/favorites/:resourceId` | POST | Yes | Adds favorite or 401/404 |
| `/api/favorites/:resourceId` | DELETE | Yes | Removes favorite or 401/404 |
| `/api/bookmarks` | GET | Yes | Returns user's bookmarks or 401 |
| `/api/bookmarks/:resourceId` | POST | Yes | Adds bookmark or 401/404 |
| `/api/bookmarks/:resourceId` | DELETE | Yes | Removes bookmark or 401/404 |

**Test Commands:**
```bash
# Get favorites without auth - should return 401
curl http://localhost:3000/api/favorites

# Get bookmarks without auth - should return 401
curl http://localhost:3000/api/bookmarks

# Add favorite to non-existent resource - should return 404
curl -X POST http://localhost:3000/api/favorites/99999 \
  -H "Cookie: session=..."
```

**Verification Checklist:**
- [ ] All endpoints require authentication (401 if not authenticated)
- [ ] Non-existent resources return 404
- [ ] All error responses have consistent JSON format

### 6. Admin Operations

| Endpoint | Method | Auth Required | Expected Behavior |
|----------|--------|--------------|-------------------|
| `/api/admin/stats` | GET | Admin | Returns stats or 401/403 |
| `/api/admin/users` | GET | Admin | Returns users or 401/403 |
| `/api/admin/categories` | POST/PUT/DELETE | Admin | CRUD operations or 401/403 |

**Test Commands:**
```bash
# Access admin stats without auth - should return 401
curl http://localhost:3000/api/admin/stats

# Access admin stats as non-admin - should return 403
curl -H "Cookie: session=..." http://localhost:3000/api/admin/stats
```

**Verification Checklist:**
- [ ] All admin endpoints require authentication (401)
- [ ] Non-admin users receive 403 Forbidden
- [ ] All error responses have consistent JSON format

### 7. SEO and Public Endpoints

| Endpoint | Method | Expected Behavior |
|----------|--------|-------------------|
| `/sitemap.xml` | GET | Returns XML sitemap (200) |
| `/og-image.svg` | GET | Returns SVG image (200) |

**Test Commands:**
```bash
# Get sitemap
curl http://localhost:3000/sitemap.xml

# Get OG image
curl http://localhost:3000/og-image.svg
```

**Verification Checklist:**
- [ ] Both endpoints return 200
- [ ] Sitemap returns valid XML
- [ ] OG image returns valid SVG
- [ ] No authentication required

### 8. GitHub and Discovery Endpoints

| Endpoint | Method | Expected Behavior |
|----------|--------|-------------------|
| `/api/github/awesome-lists` | GET | Returns awesome lists (200) |
| `/api/github/search` | GET | Returns search results (200) |
| `/api/awesome-list` | GET | Returns current list (200) |

**Test Commands:**
```bash
# Discover awesome lists
curl http://localhost:3000/api/github/awesome-lists

# Search GitHub
curl "http://localhost:3000/api/github/search?q=javascript"

# Get current awesome list
curl http://localhost:3000/api/awesome-list
```

**Verification Checklist:**
- [ ] All endpoints return 200
- [ ] No authentication required for discovery
- [ ] Responses are properly formatted JSON

### 9. Learning Paths and Recommendations

| Endpoint | Method | Auth Required | Expected Behavior |
|----------|--------|--------------|-------------------|
| `/api/recommendations` | GET | Optional | Returns recommendations |
| `/api/recommendations/init` | GET | No | Initializes recommendation engine |
| `/api/learning-paths/suggested` | GET | Yes | Returns suggested paths or 401 |
| `/api/learning-paths/generate` | POST | Yes | Generates custom path or 401/400 |

**Test Commands:**
```bash
# Get recommendations (public)
curl http://localhost:3000/api/recommendations

# Get suggested learning paths without auth - should return 401
curl http://localhost:3000/api/learning-paths/suggested
```

**Verification Checklist:**
- [ ] Public endpoints work without auth
- [ ] Protected endpoints return 401 if not authenticated
- [ ] Invalid input returns 400 with validation errors

### 10. User Progress and Submissions

| Endpoint | Method | Auth Required | Expected Behavior |
|----------|--------|--------------|-------------------|
| `/api/user/progress` | GET | Yes | Returns user progress or 401 |
| `/api/user/submissions` | GET | Yes | Returns user submissions or 401 |

**Test Commands:**
```bash
# Get user progress without auth - should return 401
curl http://localhost:3000/api/user/progress

# Get user submissions without auth - should return 401
curl http://localhost:3000/api/user/submissions
```

**Verification Checklist:**
- [ ] Both endpoints require authentication
- [ ] Unauthenticated requests return 401
- [ ] Error responses have consistent JSON format

### 11. Non-existent Routes (404 Handling)

**Test Commands:**
```bash
# Test non-existent API route
curl http://localhost:3000/api/nonexistent/route

# Test non-existent nested route
curl http://localhost:3000/api/foo/bar/baz
```

**Verification Checklist:**
- [ ] Non-existent routes return 404
- [ ] Error response is JSON: `{"message": "..."}`
- [ ] No stack traces for 404 errors

## Error Response Format Verification

All error responses should follow this consistent format:

### Client Errors (400-499):
```json
{
  "message": "Human-readable error message"
}
```

### Validation Errors (400):
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "path": ["field", "name"],
      "message": "Field-specific error message"
    }
  ]
}
```

### Server Errors (500+) - Development Mode:
```json
{
  "message": "Internal server error",
  "stack": "Error stack trace..."
}
```

### Server Errors (500+) - Production Mode:
```json
{
  "message": "Internal server error"
}
```

## Global Verification Checklist

### Error Handling:
- [ ] All error responses are valid JSON
- [ ] All error responses include a `message` field
- [ ] Validation errors include an `errors` array with details
- [ ] Stack traces only appear in development mode (500 errors)
- [ ] Stack traces DO NOT appear in production mode
- [ ] Client errors (400-499) use appropriate status codes
- [ ] Server errors (500+) use appropriate status codes

### Status Codes:
- [ ] 200 - Successful GET requests
- [ ] 201 - Successful POST requests (resource creation)
- [ ] 400 - Validation errors (invalid input)
- [ ] 401 - Authentication required (not logged in)
- [ ] 403 - Forbidden (insufficient permissions)
- [ ] 404 - Resource not found
- [ ] 409 - Conflict (duplicate resources)
- [ ] 500 - Internal server errors

### Console Output:
- [ ] No unhandled promise rejections
- [ ] No uncaught exceptions
- [ ] Server errors (500+) are logged to console.error
- [ ] Client errors (400-499) are not logged (or only in dev mode)
- [ ] Request logging shows correct status codes

### Code Quality:
- [ ] All route handlers use `asyncHandler` wrapper
- [ ] No manual `try-catch` blocks in route handlers (except intentional nested cases)
- [ ] All error responses throw `ApiError` subclasses
- [ ] No direct calls to `res.status().json()` for errors in migrated routes
- [ ] Imports for `asyncHandler` and error classes are present

## Summary

This comprehensive testing verification ensures:

1. **Consistent Error Handling**: All API endpoints return errors in the same JSON format
2. **Appropriate Status Codes**: Each error type uses the correct HTTP status code
3. **Security**: Stack traces are hidden in production mode
4. **Developer Experience**: Helpful error messages and validation details
5. **Code Quality**: All routes use the centralized error handling system

## Test Execution

To execute these tests:

1. Start the development server: `npm run dev`
2. Run through each test category systematically
3. Verify each endpoint returns the expected status code
4. Verify each error response has the correct JSON format
5. Check console for any errors or warnings
6. Test both authenticated and unauthenticated scenarios
7. Test both valid and invalid input scenarios

## Expected Outcome

✅ **All API endpoints return responses** (no crashes or hangs)
✅ **Error responses are consistent JSON** with `message` field
✅ **404 errors for non-existent resources**
✅ **401 errors for unauthenticated requests**
✅ **403 errors for unauthorized access**
✅ **400 errors for validation failures** with error details
✅ **500 errors for server errors** (with stack in dev mode only)
✅ **No console errors or unhandled promise rejections**

## Notes

- Test error routes (`/api/test/error/*`) will be removed after verification (subtask 4-2)
- The testing should be performed in both development and production modes
- Production mode testing should verify that stack traces are not exposed
- All tests should be re-run after removing test routes to ensure no regression
