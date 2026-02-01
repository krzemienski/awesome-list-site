# Database Migration and Upgrade Guide

Complete guide for database schema changes, migrations, and safe upgrade procedures for the Awesome List Site.

## Table of Contents

- [Overview](#overview)
- [Migration Strategies](#migration-strategies)
  - [db:push vs Migrations](#dbpush-vs-migrations)
  - [When to Use Each Approach](#when-to-use-each-approach)
- [Development Workflow](#development-workflow)
- [Production Workflow](#production-workflow)
- [Upgrade Procedures](#upgrade-procedures)
- [One-Off Migration Scripts](#one-off-migration-scripts)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Reference](#reference)

---

## Overview

The Awesome List Site uses **Drizzle ORM** for database schema management with PostgreSQL. The project supports two migration strategies:

1. **Schema Push** (`db:push`) - Direct schema synchronization for development
2. **Migrations** (`db:migrate`) - Version-controlled SQL migrations for production

**Key Files:**
- **Schema Definition**: `shared/schema.ts` - Single source of truth for database schema
- **Migration Config**: `drizzle.config.ts` - Drizzle Kit configuration
- **Migration Folder**: `migrations/` - Generated SQL migration files
- **Migration Scripts**: `scripts/migrate*.ts` - One-off data migration utilities

**Related Documentation:**
- [DATABASE.md](./DATABASE.md) - Complete schema reference
- [SETUP.md](./SETUP.md) - Development environment setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide

---

## Migration Strategies

### db:push vs Migrations

Drizzle ORM provides two approaches for managing schema changes:

#### Schema Push (`db:push`)

**What it does:**
- Compares `shared/schema.ts` with current database state
- Generates and executes SQL to synchronize schema
- **No migration files** are created
- Changes are applied immediately

**Advantages:**
- ✅ Fast iteration during development
- ✅ No migration file management
- ✅ Simple workflow for solo developers
- ✅ Automatic schema synchronization

**Disadvantages:**
- ❌ No migration history
- ❌ No rollback capability
- ❌ Risky for production environments
- ❌ Can't review SQL before execution
- ❌ Team coordination challenges

**Command:**
```bash
npm run db:push
```

#### Migrations (`db:migrate`)

**What it does:**
- Generates versioned SQL migration files
- Maintains migration history in `migrations/` folder
- Applies migrations sequentially
- Tracks applied migrations in database

**Advantages:**
- ✅ Full migration history
- ✅ Review SQL before applying
- ✅ Rollback support
- ✅ Team-friendly (commit migration files)
- ✅ Production-safe
- ✅ Audit trail of schema changes

**Disadvantages:**
- ❌ Slower development iteration
- ❌ More complex workflow
- ❌ Migration file conflicts in teams

**Commands:**
```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations to database
npx tsx scripts/migrate.ts
```

### When to Use Each Approach

| Scenario | Recommended Approach | Rationale |
|----------|---------------------|-----------|
| **Local development** | `db:push` | Fast iteration, no migration management |
| **Feature branches** | `db:push` or Migrations | Use migrations if sharing branch |
| **Production deployment** | **Migrations** | Safety, rollback, audit trail |
| **Team collaboration** | **Migrations** | Avoid conflicts, track changes |
| **Data-sensitive changes** | **Migrations** | Review SQL, test before apply |
| **Prototyping** | `db:push` | Rapid schema experimentation |

**Current Project Approach:**
- Development uses **`db:push`** for rapid iteration
- Production **should use migrations** (planned migration to migration-based workflow)
- One-off data migrations use custom scripts in `scripts/`

---

## Development Workflow

### Making Schema Changes

#### Step 1: Edit Schema

Modify the schema in `shared/schema.ts`:

```typescript
// Example: Add a new column to resources table
export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  // ... existing columns ...

  // NEW: Add view count tracking
  viewCount: integer('view_count').default(0).notNull(),
});
```

#### Step 2: Push to Database

For development, use `db:push`:

```bash
npm run db:push
```

**What happens:**
1. Drizzle Kit compares schema with database
2. Shows proposed changes
3. Prompts for confirmation
4. Executes SQL to synchronize

**Example output:**
```
~ drizzle-kit push

Pulling schema from database...
Comparing schema...

[+] Adding column "view_count" to "resources" (integer, default 0, not null)

Apply changes? (y/n) › y

✓ Changes applied successfully
```

#### Step 3: Verify Changes

Check schema in database:

```bash
npm run db:studio
```

Or verify programmatically:

```typescript
import { db } from './server/db';
import { resources } from './shared/schema';

// Test new column
const resource = await db.query.resources.findFirst();
console.log(resource.viewCount); // Should be 0
```

#### Step 4: Restart Dev Server

```bash
npm run dev
```

TypeScript types are automatically updated from `shared/schema.ts`.

### Handling Schema Conflicts

**If you get "schema drift" errors:**

```bash
# Option 1: Force push (⚠️ destructive)
npm run db:push -- --force

# Option 2: Drop and recreate (⚠️ loses data)
# In db:studio, manually drop conflicting tables
npm run db:push

# Option 3: Manual SQL (safest)
psql $DATABASE_URL -c "ALTER TABLE resources ADD COLUMN view_count INTEGER DEFAULT 0;"
```

**Best practice:** Always backup data before force-pushing.

---

## Production Workflow

### Using Migrations for Production

For production deployments, generate and apply versioned migrations:

#### Step 1: Generate Migration

After editing `shared/schema.ts`:

```bash
npx drizzle-kit generate
```

**Output:**
```
Generating migration...
✓ Created migration: migrations/0001_add_view_count.sql

Review the migration file before applying!
```

#### Step 2: Review Generated SQL

Open `migrations/0001_add_view_count.sql`:

```sql
-- Migration: Add view count to resources
ALTER TABLE "resources" ADD COLUMN "view_count" INTEGER DEFAULT 0 NOT NULL;
```

**Review checklist:**
- ✅ SQL is correct and safe
- ✅ No destructive operations (DROP without backup)
- ✅ Defaults are set for NOT NULL columns
- ✅ Indexes are added for new query patterns
- ✅ Foreign keys reference existing tables

#### Step 3: Test Migration Locally

```bash
# Apply migration to local database
npx tsx scripts/migrate.ts
```

**Verify:**
```bash
npm run dev
# Test features using the new column
```

#### Step 4: Commit Migration File

```bash
git add migrations/0001_add_view_count.sql
git add shared/schema.ts
git commit -m "feat: add view count tracking to resources"
git push
```

#### Step 5: Deploy to Production

**Deployment platforms auto-run migrations** if configured (see [DEPLOYMENT.md](./DEPLOYMENT.md)).

For manual deployment:

```bash
# On production server
git pull
npm install
npx tsx scripts/migrate.ts  # Apply migrations
npm run build
npm run start
```

### Migration Safety Checklist

Before deploying migrations to production:

- [ ] Migration tested in development
- [ ] Migration tested on production-like data
- [ ] Backward compatibility verified (old code works during deployment)
- [ ] Rollback plan prepared
- [ ] Downtime window scheduled (if needed)
- [ ] Database backup created
- [ ] Team notified of deployment

### Zero-Downtime Migrations

For large tables or high-traffic applications:

**1. Additive Changes (Safe)**
```sql
-- Adding nullable columns (instant)
ALTER TABLE resources ADD COLUMN view_count INTEGER;

-- Adding indexes concurrently (no locks)
CREATE INDEX CONCURRENTLY idx_resources_view_count ON resources(view_count);
```

**2. Multi-Step Migrations (Complex Changes)**

**Example: Renaming a column**

**Step 1:** Add new column
```sql
ALTER TABLE resources ADD COLUMN new_name TEXT;
UPDATE resources SET new_name = old_name;
```
Deploy code that writes to both columns.

**Step 2:** Switch reads to new column
Deploy code that reads from `new_name`.

**Step 3:** Drop old column
```sql
ALTER TABLE resources DROP COLUMN old_name;
```

**3. Avoid During Peak Hours**
- Run migrations during low-traffic periods
- Use `LOCK TIMEOUT` to prevent long locks:
```sql
SET LOCAL lock_timeout = '2s';
ALTER TABLE resources ADD COLUMN view_count INTEGER;
```

---

## Upgrade Procedures

### Upgrading After Pulling Changes

When pulling code with database changes:

#### Step 1: Check for Schema Changes

```bash
git pull
git log --oneline -- shared/schema.ts migrations/
```

Look for commits touching schema or migrations.

#### Step 2: Identify Migration Strategy

**If `migrations/` folder has new files:**
```bash
ls -la migrations/
```

Run migrations:
```bash
npx tsx scripts/migrate.ts
```

**If only `shared/schema.ts` changed (no migration files):**

Development approach:
```bash
npm run db:push
```

#### Step 3: Check for One-Off Migration Scripts

```bash
git log --oneline -- scripts/migrate-*.ts
```

**If new migration scripts exist**, check the commit message or script header for instructions.

**Example:**
```bash
# Run one-off migration
npx tsx scripts/migrate-audit-log-original-resource-id.ts
```

#### Step 4: Restart Application

```bash
npm run dev  # Development
npm run start  # Production
```

#### Step 5: Verify Database State

```bash
npm run db:studio
```

Check that:
- New tables/columns exist
- Data is preserved
- Foreign keys are intact

### Common Upgrade Scenarios

#### Scenario 1: New Column Added

**Indicators:**
- `shared/schema.ts` modified
- No migration files

**Action:**
```bash
npm run db:push
npm run dev
```

#### Scenario 2: Data Migration Required

**Indicators:**
- New `scripts/migrate-*.ts` file
- Commit message mentions "backfill" or "data migration"

**Action:**
```bash
npx tsx scripts/migrate-<name>.ts
npm run dev
```

#### Scenario 3: Breaking Schema Change

**Indicators:**
- Migration file with `DROP` or `ALTER ... DROP`
- Commit message mentions "breaking change"

**Action:**
1. **Backup database first:**
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

2. Apply migration:
```bash
npx tsx scripts/migrate.ts
```

3. Test thoroughly before deploying to production

#### Scenario 4: Migration Conflicts (Team Development)

**Problem:** Two developers created migrations independently.

**Solution:**

1. Pull latest changes:
```bash
git pull
```

2. Regenerate migrations:
```bash
# Delete your local migration file
rm migrations/0001_your_migration.sql

# Regenerate to include both changes
npx drizzle-kit generate
```

3. Review and test combined migration
4. Commit and push

---

## One-Off Migration Scripts

### When to Use One-Off Scripts

Use custom migration scripts when:

1. **Data transformation** - Backfilling, reformatting, cleaning
2. **Complex logic** - Multi-table updates, conditional transformations
3. **Performance-sensitive** - Batch processing, large datasets
4. **Validation required** - Pre/post-migration checks

**Don't use for:**
- Simple schema changes (use `db:push` or `drizzle-kit generate`)
- Standard SQL (add to migration files instead)

### Anatomy of a Migration Script

**Template:** (`scripts/migrate-example.ts`)

```typescript
#!/usr/bin/env tsx
/**
 * Migration Script: [Brief Description]
 *
 * What it does:
 * - [Specific action 1]
 * - [Specific action 2]
 *
 * Run this migration [when/why]:
 * - After deploying schema changes for [feature]
 * - Only run ONCE
 *
 * Safe to re-run: [YES/NO - explain]
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Migration: [Brief Title]             ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    // Step 1: Pre-migration validation
    console.log('Step 1: Checking current state...');
    const beforeStats = await db.execute(sql`
      SELECT COUNT(*) as count FROM table_name WHERE condition
    `);
    console.log(`  Records to migrate: ${beforeStats.rows[0].count}`);

    // Step 2: Perform migration
    console.log('\nStep 2: Performing migration...');
    const result = await db.execute(sql`
      UPDATE table_name
      SET column = value
      WHERE condition
    `);
    console.log(`  Updated ${result.rowCount} records`);

    // Step 3: Post-migration validation
    console.log('\nStep 3: Verifying results...');
    const afterStats = await db.execute(sql`
      SELECT COUNT(*) as count FROM table_name WHERE new_condition
    `);

    if (afterStats.rows[0].count === beforeStats.rows[0].count) {
      console.log('✓ Migration completed successfully!\n');
    } else {
      console.log('⚠ Warning: Record counts don\'t match');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
```

### Real Example: Audit Log Migration

See `scripts/migrate-audit-log-original-resource-id.ts` for a production example:

**Purpose:** Backfill `originalResourceId` to preserve audit history when resources are deleted.

**Key features:**
- Pre-migration statistics
- Idempotent (safe to re-run)
- Post-migration verification
- Clear output formatting

**Run it:**
```bash
npx tsx scripts/migrate-audit-log-original-resource-id.ts
```

### Writing Your Own Migration Script

#### Step 1: Create Script File

```bash
touch scripts/migrate-<feature-name>.ts
chmod +x scripts/migrate-<feature-name>.ts
```

#### Step 2: Follow Template Structure

Use the template above, replacing:
- `[Brief Description]` with migration purpose
- `[Specific actions]` with what data changes
- SQL queries with actual migration logic

#### Step 3: Make It Idempotent

**Bad (runs every time):**
```typescript
await db.execute(sql`
  UPDATE resources SET view_count = 0
`);
```

**Good (skips if already done):**
```typescript
const needsUpdate = await db.execute(sql`
  SELECT COUNT(*) as count FROM resources WHERE view_count IS NULL
`);

if (needsUpdate.rows[0].count === 0) {
  console.log('✓ Migration already applied, skipping...');
  return;
}

await db.execute(sql`
  UPDATE resources SET view_count = 0 WHERE view_count IS NULL
`);
```

#### Step 4: Add Validation

Always verify before and after:

```typescript
// Before
const before = await db.execute(sql`
  SELECT COUNT(*) as total,
         COUNT(*) FILTER (WHERE view_count IS NULL) as nulls
  FROM resources
`);

// Migrate
await db.execute(sql`UPDATE ...`);

// After
const after = await db.execute(sql`
  SELECT COUNT(*) as total,
         COUNT(*) FILTER (WHERE view_count IS NULL) as nulls
  FROM resources
`);

if (after.rows[0].nulls !== 0) {
  throw new Error('Migration incomplete: NULL values remain');
}
```

#### Step 5: Document in Commit Message

```bash
git add scripts/migrate-feature.ts
git commit -m "feat: add migration for feature

Migration script backfills view_count column for all resources.

Run after deploying this commit:
  npx tsx scripts/migrate-feature.ts

Safe to re-run: YES (checks for NULL before updating)"
```

### Running Migration Scripts

**Development:**
```bash
npx tsx scripts/migrate-<name>.ts
```

**Production:**
```bash
# SSH to production server
ssh user@server

# Navigate to app directory
cd /path/to/app

# Run migration
NODE_ENV=production npx tsx scripts/migrate-<name>.ts
```

**Automated (CI/CD):**

Add to deployment script:
```bash
# deploy.sh
git pull
npm install
npx tsx scripts/migrate.ts  # Apply Drizzle migrations
npx tsx scripts/migrate-<name>.ts  # Run one-off migration
npm run build
npm run start
```

---

## Best Practices

### Schema Design

#### 1. Always Use Defaults for NOT NULL Columns

**Bad:**
```typescript
export const resources = pgTable('resources', {
  viewCount: integer('view_count').notNull(),  // ❌ Breaks existing rows
});
```

**Good:**
```typescript
export const resources = pgTable('resources', {
  viewCount: integer('view_count').notNull().default(0),  // ✅ Safe
});
```

#### 2. Use Proper Foreign Key Constraints

**Consider cascading behavior:**
```typescript
export const resourceAuditLog = pgTable('resource_audit_log', {
  resourceId: integer('resource_id').references(() => resources.id, {
    onDelete: 'set null',  // Preserve audit log when resource deleted
  }),
  originalResourceId: integer('original_resource_id'),  // Denormalized backup
});
```

#### 3. Add Indexes for Query Patterns

```typescript
export const resources = pgTable('resources', {
  // ... columns ...
}, (table) => ({
  categoryIdx: index('idx_resources_category').on(table.category),
  statusIdx: index('idx_resources_status').on(table.status),
  submittedByIdx: index('idx_resources_submitted_by').on(table.submittedBy),
}));
```

See [DATABASE.md](./DATABASE.md#performance-indexes) for full index documentation.

#### 4. Use Timestamps for Audit Trails

```typescript
export const resources = pgTable('resources', {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Migration Best Practices

#### 1. Test Migrations on Production-Like Data

```bash
# Create local copy of production data
pg_dump $PRODUCTION_DATABASE_URL > prod-dump.sql
psql $LOCAL_DATABASE_URL < prod-dump.sql

# Test migration
npx tsx scripts/migrate.ts
```

#### 2. Write Reversible Migrations

**For each migration, document rollback:**

```sql
-- migrations/0001_add_view_count.sql
-- Forward migration
ALTER TABLE resources ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;

-- Rollback (manual):
-- ALTER TABLE resources DROP COLUMN view_count;
```

**Commit rollback instructions:**
```bash
git commit -m "feat: add view count

Migration: Add view_count column

Rollback:
  psql \$DATABASE_URL -c 'ALTER TABLE resources DROP COLUMN view_count;'"
```

#### 3. Version Control Everything

**Always commit:**
- ✅ `shared/schema.ts` changes
- ✅ Generated migration files (`migrations/*.sql`)
- ✅ One-off migration scripts (`scripts/migrate-*.ts`)
- ✅ Updated documentation

**Never commit:**
- ❌ Database dumps
- ❌ Sensitive data
- ❌ Local `.env` files

#### 4. Coordinate Team Migrations

**Before pushing schema changes:**

1. Check for conflicting PRs:
```bash
git fetch origin
git log origin/main --oneline -- shared/schema.ts migrations/
```

2. Communicate in team chat:
```
@team I'm pushing a schema change (adding view_count column).
Migration file: migrations/0001_add_view_count.sql
After pulling, run: npx tsx scripts/migrate.ts
```

3. Update relevant documentation

#### 5. Use Transactions for Multi-Step Migrations

```typescript
import { db } from '../server/db';

await db.transaction(async (tx) => {
  // Step 1: Add column
  await tx.execute(sql`ALTER TABLE resources ADD COLUMN temp TEXT`);

  // Step 2: Backfill data
  await tx.execute(sql`UPDATE resources SET temp = title WHERE temp IS NULL`);

  // Step 3: Make NOT NULL
  await tx.execute(sql`ALTER TABLE resources ALTER COLUMN temp SET NOT NULL`);
});
```

**Benefits:**
- All-or-nothing execution
- Automatic rollback on error
- Consistent state

---

## Troubleshooting

### Common Issues

#### Issue 1: "Migration already applied" Error

**Symptoms:**
```
Error: Migration 0001_add_view_count.sql already applied
```

**Cause:** Migration file already executed, tracked in `__drizzle_migrations` table.

**Solution:**

Check migration status:
```sql
SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;
```

**If migration truly needs to re-run:**
```sql
DELETE FROM __drizzle_migrations WHERE name = '0001_add_view_count';
```

Then re-run:
```bash
npx tsx scripts/migrate.ts
```

#### Issue 2: "Column already exists" Error

**Symptoms:**
```
ERROR: column "view_count" of relation "resources" already exists
```

**Cause:** Schema already updated manually or via `db:push`, but migration file exists.

**Solution:**

**Option A: Mark migration as applied** (safest)
```sql
INSERT INTO __drizzle_migrations (hash, name, created_at)
VALUES (
  'abc123',  -- Get from migration file name
  '0001_add_view_count',
  NOW()
);
```

**Option B: Modify migration** to skip if exists:
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE resources ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;
```

#### Issue 3: "Cannot add NOT NULL column" Error

**Symptoms:**
```
ERROR: column "view_count" contains null values
```

**Cause:** Adding NOT NULL column to table with existing rows without DEFAULT.

**Solution:**

**Fix migration to use DEFAULT:**
```sql
ALTER TABLE resources ADD COLUMN view_count INTEGER DEFAULT 0 NOT NULL;
```

**Or two-step migration:**
```sql
-- Step 1: Add as nullable
ALTER TABLE resources ADD COLUMN view_count INTEGER;

-- Step 2: Backfill
UPDATE resources SET view_count = 0 WHERE view_count IS NULL;

-- Step 3: Make NOT NULL
ALTER TABLE resources ALTER COLUMN view_count SET NOT NULL;
```

#### Issue 4: Schema Drift

**Symptoms:**
```
Error: Database schema differs from schema.ts
```

**Cause:** Manual database changes or failed migrations.

**Solution:**

**Check differences:**
```bash
npx drizzle-kit introspect
```

**Option A: Reset to schema** (⚠️ destructive):
```bash
npm run db:push -- --force
```

**Option B: Update schema.ts** to match database:
```bash
npx drizzle-kit pull
```

This generates `shared/schema.ts` from current database state.

#### Issue 5: Foreign Key Constraint Violations

**Symptoms:**
```
ERROR: insert or update on table "resource_audit_log" violates foreign key constraint
```

**Cause:** Referenced record deleted, or foreign key points to non-existent ID.

**Solution:**

**Temporarily disable constraints** (development only):
```sql
SET session_replication_role = 'replica';
-- Run migration
SET session_replication_role = 'origin';
```

**Fix data before migration:**
```sql
-- Find orphaned records
SELECT * FROM resource_audit_log
WHERE resource_id NOT IN (SELECT id FROM resources);

-- Clean up or reassign
DELETE FROM resource_audit_log WHERE resource_id NOT IN (SELECT id FROM resources);
```

**Use proper cascade behavior:**
```typescript
resourceId: integer('resource_id').references(() => resources.id, {
  onDelete: 'set null',  // or 'cascade'
}),
```

#### Issue 6: Performance Issues During Migration

**Symptoms:**
- Migration hangs
- Database locks
- Timeout errors

**Solution:**

**Check active locks:**
```sql
SELECT
  pid,
  state,
  query,
  age(clock_timestamp(), query_start) as age
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY age DESC;
```

**Kill blocking queries:**
```sql
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = 12345;
```

**Use concurrent operations:**
```sql
-- Create index without locking
CREATE INDEX CONCURRENTLY idx_resources_view_count ON resources(view_count);

-- Add column (instant for nullable)
ALTER TABLE resources ADD COLUMN view_count INTEGER;
```

**Batch large updates:**
```typescript
const batchSize = 1000;
let offset = 0;

while (true) {
  const result = await db.execute(sql`
    UPDATE resources
    SET view_count = 0
    WHERE id IN (
      SELECT id FROM resources WHERE view_count IS NULL LIMIT ${batchSize}
    )
  `);

  if (result.rowCount === 0) break;
  offset += batchSize;
  console.log(`Processed ${offset} records...`);
}
```

### Getting Help

**Check logs:**
```bash
# Application logs
npm run dev  # Check console output

# Database logs (if accessible)
tail -f /var/log/postgresql/postgresql-*.log
```

**Database inspection:**
```bash
# Open database studio
npm run db:studio

# Or use psql
psql $DATABASE_URL
```

**Useful SQL queries:**
```sql
-- List all tables
\dt

-- Describe table schema
\d resources

-- Check migration history
SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Related documentation:**
- [DATABASE.md](./DATABASE.md) - Schema reference
- [SETUP.md](./SETUP.md) - Development setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [Drizzle ORM Migrations Guide](https://orm.drizzle.team/docs/migrations)

---

## Reference

### Quick Command Reference

```bash
# Development
npm run db:push              # Push schema changes (development)
npm run db:studio            # Open database GUI
npx drizzle-kit introspect   # Check schema differences

# Production Migrations
npx drizzle-kit generate     # Generate migration from schema
npx tsx scripts/migrate.ts   # Apply Drizzle migrations

# One-Off Migrations
npx tsx scripts/migrate-<name>.ts  # Run custom migration script

# Database Operations
psql $DATABASE_URL                  # Open PostgreSQL shell
pg_dump $DATABASE_URL > backup.sql  # Backup database
psql $DATABASE_URL < backup.sql     # Restore database
```

### Migration Checklist Template

Use this checklist for production migrations:

```markdown
## Migration Checklist: [Feature Name]

### Pre-Migration
- [ ] Schema changes tested locally
- [ ] Migration file generated and reviewed
- [ ] Backward compatibility verified
- [ ] Database backup created
- [ ] Team notified
- [ ] Maintenance window scheduled (if needed)

### Migration
- [ ] Migration file committed to git
- [ ] Migration applied to staging environment
- [ ] Smoke tests passed on staging
- [ ] Migration applied to production
- [ ] Application restarted

### Post-Migration
- [ ] Database schema verified (db:studio)
- [ ] Application functionality tested
- [ ] Performance metrics checked
- [ ] Rollback plan documented
- [ ] Documentation updated

### Rollback (if needed)
- [ ] Rollback SQL prepared
- [ ] Application reverted to previous version
- [ ] Database state verified
- [ ] Incident documented
```

### File Locations

| File | Purpose | When to Modify |
|------|---------|----------------|
| `shared/schema.ts` | Schema definition | Adding/modifying tables or columns |
| `drizzle.config.ts` | Drizzle configuration | Changing database or migration folder |
| `migrations/*.sql` | Version-controlled migrations | Auto-generated, review before applying |
| `scripts/migrate.ts` | Migration runner | Rarely (standard Drizzle runner) |
| `scripts/migrate-*.ts` | One-off data migrations | New custom data transformation |
| `server/db.ts` | Database connection | Connection pooling or SSL config |

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db  # Database connection string

# Optional (Migration-related)
NODE_ENV=production                                 # Enables auto-migrations on startup
DRIZZLE_MIGRATIONS_FOLDER=./migrations              # Custom migration folder (default: ./migrations)
```

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for complete reference.

### Additional Resources

**Drizzle ORM Documentation:**
- [Drizzle Kit Push](https://orm.drizzle.team/kit-docs/overview#prototyping-with-db-push)
- [Drizzle Migrations](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg)

**PostgreSQL Documentation:**
- [ALTER TABLE Reference](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Concurrent Index Creation](https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY)
- [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

**Project Documentation:**
- [DATABASE.md](./DATABASE.md) - Complete schema documentation
- [SETUP.md](./SETUP.md) - Development environment setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview

---

**Last Updated:** 2024-01-20
**Maintainer:** Development Team
**Questions?** Open an issue or contact the team lead
