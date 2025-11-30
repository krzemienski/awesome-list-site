# Bug #1: Bookmark Fails on Static Resources

**Discovered**: 2025-11-30, Session 5, Task 13
**Severity**: HIGH (Core feature broken for static resources)
**Status**: Identified, fix pending

---

## Symptoms

- User clicks "Add bookmark" button on resource
- Modal opens normally
- User clicks "Save without notes"
- Buttons disable (mutation starts)
- **ERROR**: 500 Internal Server Error
- **Console**: "Bookmark mutation error"
- Modal stays open (save failed)

---

## Root Cause

**Data Architecture Issue**:
- Application mixes 2 data sources:
  1. Static JSON (awesome-list) - IDs like "video-34"
  2. Database (Supabase) - UUIDs like "575d638b-..."

**Category.tsx line 90**:
```typescript
return [...staticResources, ...categoryDbResources];
```

**Bookmark API expects UUID**:
```
POST /api/bookmarks/:resourceId
user_bookmarks.resource_id is UUID type
```

**What Happens**:
1. User clicks bookmark on static resource (id="video-34")
2. Frontend: POST /api/bookmarks/video-34
3. Backend: Tries to insert into user_bookmarks with resource_id=video-34
4. PostgreSQL: "invalid input syntax for type uuid: 'video-34'"
5. API returns 500, frontend shows error

---

## Evidence

**Network Request**:
```
POST http://localhost:3000/api/bookmarks/video-34
Response: 500 Internal Server Error
Body: {"message":"Failed to add bookmark"}
```

**Server Logs**:
```
invalid input syntax for type uuid: "video-34"
constraint: undefined
file: 'uuid.c'
line: '133'
routine: 'string_to_uuid'
```

**Console Error**:
```
Bookmark mutation error: JSHandle@error
```

---

## Fix Options

### Option A: Hide Bookmark Button for Static Resources (Quick Fix)
```typescript
// In BookmarkButton.tsx or ResourceCard.tsx
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId);
const canBookmark = isUUID || resourceId.startsWith('db-');

if (!canBookmark) return null; // Don't render bookmark button
```

**Pros**: Quick, safe
**Cons**: Users can't bookmark ~50% of resources (static ones)

### Option B: Migrate All Static Resources to Database (Proper Fix)
```typescript
// On app initialization or admin action
// Import all static JSON resources to database if not already present
// Then remove static JSON merging
```

**Pros**: All resources bookmarkable, cleaner architecture
**Cons**: Longer fix, requires migration

### Option C: Support Non-UUID Bookmarks (Complex)
```typescript
// Change user_bookmarks.resource_id to TEXT instead of UUID
// Support both UUID and string IDs
```

**Pros**: Supports both sources
**Cons**: Database type change, migration required

---

## Recommended Fix

**Option A** (immediate) + **Option B** (Session 7)

**Immediate**: Hide bookmark/favorite for static resources
**Later**: Import all static resources to database, remove JSON merging

---

## Affected Features

- ❌ Bookmarks (static resources)
- ❌ Favorites (static resources)
- ✅ Bookmarks (database resources) - will work after fix
- ✅ Favorites (database resources) - will work after fix

---

## Test Plan After Fix

1. Hide bookmark button for static resources (id matches "video-\d+")
2. Rebuild Docker
3. Restart from Task 6 (login)
4. Navigate to category
5. Verify: Static resources have NO bookmark button
6. Find database resource (id starts with UUID or "db-")
7. Click bookmark on database resource
8. Verify: Saves successfully
9. Check database: Row created with valid UUID

---

**Bug Status**: Root cause identified, fix strategy defined, ready to implement
