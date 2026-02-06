/**
 * ============================================================================
 * GITHUB SYNC MODULE - GitHub Repository Synchronization
 * ============================================================================
 *
 * This module handles bidirectional synchronization between the database
 * and GitHub awesome-list repositories. It enables importing resources from
 * existing awesome lists and exporting curated resources back to GitHub.
 *
 * FEATURES:
 * - Import: Fetch and parse awesome lists from GitHub
 * - Export: Generate and commit markdown to repositories
 * - Sync Queue: Async processing of long-running operations
 * - Validation: awesome-lint compliance checking
 * - Conflict Resolution: Duplicate detection and merging
 * - History: Audit trail of all sync operations
 *
 * IMPORT FLOW:
 * 1. Fetch raw README.md from GitHub repository
 * 2. Parse markdown into structured resource objects
 * 3. Validate against awesome-lint rules
 * 4. Resolve conflicts with existing database entries
 * 5. Insert/update resources with category hierarchy
 * 6. Record operation in sync history
 *
 * EXPORT FLOW:
 * 1. Fetch all approved resources from database
 * 2. Format as awesome-lint compliant markdown
 * 3. Validate output before committing
 * 4. Create GitHub commit or pull request
 * 5. Update sync status on exported resources
 * 6. Save snapshot for diff calculation
 *
 * CONFLICT RESOLUTION:
 * - URL-based duplicate detection
 * - Configurable actions: skip, update, create
 * - Merge descriptions intelligently
 * - Preserve local edits when importing
 * - Track conflict resolution in audit log
 *
 * QUEUE PROCESSING:
 * - Async queue for long-running sync jobs
 * - Status tracking: pending → processing → completed/failed
 * - Automatic retry with exponential backoff
 * - Priority-based scheduling
 * - Concurrent job limits
 *
 * VALIDATION:
 * - awesome-lint rule compliance
 * - URL format and accessibility
 * - Category hierarchy integrity
 * - Description length and quality
 * - Markdown syntax correctness
 *
 * SYNC HISTORY:
 * - Record of all import/export operations
 * - Diff tracking: added, updated, removed counts
 * - Commit SHA and URL references
 * - Snapshot storage for change detection
 * - Error logs and retry attempts
 *
 * See /docs/ADMIN-GUIDE.md for GitHub sync workflow documentation.
 * ============================================================================
 */

// Export github-sync module
export { githubSyncModule } from './routes';
