# BUG: Bulk Tag Assignment - Tag Input Not Passed to Backend

**Date**: 2025-11-30
**Severity**: HIGH (Feature is completely broken)
**Status**: Open
**Component**: client/src/components/admin/BulkActionsToolbar.tsx

## Summary

The "Add Tags" bulk action in the admin ResourceBrowser does not work because the tag input value is never sent to the backend API.

## Root Cause Analysis

### Phase 1: Root Cause Investigation

The bug is in `BulkActionsToolbar.tsx` lines 79-94:

```typescript
const handleTag = async () => {
  if (!tagInput.trim()) return;

  setShowTagDialog(false);
  setIsProcessing(true);
  try {
    // Pass tags as metadata in the action
    await onAction('tag', selectedIds);  // <-- BUG: tagInput is NOT passed!
    setTagInput('');
    onClearSelection();
  } catch (error) {
    console.error('Bulk tag action failed:', error);
  } finally {
    setIsProcessing(false);
  }
};
```

The `tagInput` state variable contains the comma-separated tags the user entered, but it's never passed to `onAction`.

### Phase 2: Pattern Analysis

The `onAction` signature is:
```typescript
onAction: (action: BulkAction, ids: string[]) => Promise<void>;
```

But the backend expects:
```typescript
// server/routes.ts line 1073-1078
case 'tag':
  if (!data?.tags || !Array.isArray(data.tags)) {
    return res.status(400).json({ message: 'Tags array required for tag action' });
  }
  result = await storage.bulkAddTags(resourceIds, data.tags);
  break;
```

The frontend callback signature doesn't support passing additional data for the tag action.

### Phase 3: Hypothesis

The `BulkAction` type union includes 'tag' but the component's `onAction` prop doesn't accept additional data. The parent component (`ResourceBrowser.tsx`) calls:

```typescript
const handleBulkAction = async (action: BulkAction, ids: string[]) => {
  // ...
  bulkMutation.mutate({ action, ids });  // <-- No data parameter!
};
```

### Phase 4: Implementation Fix Required

1. Update the `BulkActionsToolbarProps` interface to support data:
```typescript
interface BulkActionsToolbarProps {
  selectedIds: string[];
  onAction: (action: BulkAction, ids: string[], data?: any) => Promise<void>;
  onClearSelection: () => void;
}
```

2. Update `handleTag` to pass the tags:
```typescript
const handleTag = async () => {
  if (!tagInput.trim()) return;
  const tags = tagInput.split(',').map(t => t.trim()).filter(t => t);

  setShowTagDialog(false);
  setIsProcessing(true);
  try {
    await onAction('tag', selectedIds, { tags });  // Pass tags!
    setTagInput('');
    onClearSelection();
  } catch (error) {
    console.error('Bulk tag action failed:', error);
  } finally {
    setIsProcessing(false);
  }
};
```

3. Update `ResourceBrowser.tsx` handleBulkAction:
```typescript
const handleBulkAction = async (action: BulkAction, ids: string[], data?: any) => {
  bulkMutation.mutate({ action, ids, data });
};
```

## Impact

- **User Impact**: Admin cannot add tags to multiple resources at once
- **Workaround**: None - feature is completely broken
- **Data Impact**: No data corruption, just missing functionality

## Files to Modify

1. `client/src/components/admin/BulkActionsToolbar.tsx` - Fix handleTag function
2. `client/src/components/admin/ResourceBrowser.tsx` - Update handleBulkAction signature

## Test Verification

After fix, run:
```bash
npx playwright test tests/admin-workflows/bulk-tagging.spec.ts
```

Verify:
- 3 tags created in `tags` table
- 9 junction rows in `resource_tags` table (3 resources x 3 tags)
- Tags display on resource cards

## Related

- Backend endpoint is correct: `POST /api/admin/resources/bulk` with action='tag'
- Storage function is correct: `storage.bulkAddTags(resourceIds, tagNames)`
- Only frontend is broken
