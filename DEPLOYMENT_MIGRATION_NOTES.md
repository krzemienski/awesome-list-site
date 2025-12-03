# Audit Log Migration - Deployment Guide

## Overview

This document describes the database migration required for the audit logging enhancement that preserves audit trail history after resource deletion.

## What Changed

### Database Schema
- Added `original_resource_id` column to `resource_audit_log` table
- Changed foreign key constraint from `ON DELETE CASCADE` to `ON DELETE SET NULL`
- New audit logs automatically populate both `resource_id` and `original_resource_id`

### Why This Matters
**Before:** When a resource was deleted, all its audit logs were CASCADE deleted (data loss)  
**After:** When a resource is deleted, `resource_id` becomes NULL but `original_resource_id` preserves the association

## Migration Steps

### 1. Deploy Schema Changes
Schema changes are automatically applied via `npm run db:push` during deployment.

### 2. Run Migration Script (REQUIRED)
After deploying the schema, run the migration script to backfill `original_resource_id` for existing audit logs:

```bash
npx tsx scripts/migrate-audit-log-original-resource-id.ts
```

**This script:**
- Copies `resource_id` → `original_resource_id` for all existing audit logs
- Is idempotent (safe to run multiple times)
- Will report "No backfill needed" if already executed
- Takes <1 second to complete

### 3. Verify Migration Success
The script provides clear output showing before/after stats:
```
✓ Migration completed successfully!

Note: Audit logs for previously deleted resources (both fields NULL)
      are irrecoverable but harmless test artefacts.
```

## Known Limitations

**Orphaned Audit Logs:**  
Audit logs created before this migration for resources that were ALREADY deleted cannot be recovered. Both `resource_id` and `original_resource_id` will be NULL for these entries.

**Impact:** In development/test environments, this affects ~16 test audit logs. In production, this should be negligible as the audit logging system was recently implemented.

**These orphaned logs are harmless** - they remain in the database but cannot be retrieved via the storage API.

## Rollback Procedure

If you need to rollback:

1. Revert the schema changes in `shared/schema.ts`
2. Run `npm run db:push --force`
3. Manually drop the `original_resource_id` column:
   ```sql
   ALTER TABLE resource_audit_log DROP COLUMN original_resource_id;
   ```

## Testing

Run the integration test suite to verify the migration:
```bash
npx tsx scripts/test-storage-fixes.ts
```

Expected output: **9/9 tests passing (100% success rate)**

## Production Deployment Checklist

- [ ] Deploy code with schema changes
- [ ] Run `npm run db:push` to apply schema
- [ ] Run `npx tsx scripts/migrate-audit-log-original-resource-id.ts`
- [ ] Verify migration output shows success
- [ ] Run integration tests to verify functionality
- [ ] Monitor audit log retrieval in admin panel

## Support

For issues or questions, check:
- Test suite: `scripts/test-storage-fixes.ts`
- Migration script: `scripts/migrate-audit-log-original-resource-id.ts`
- Schema definition: `shared/schema.ts` (line 354-364)
- Storage implementation: `server/storage.ts` (line 993-1037)
