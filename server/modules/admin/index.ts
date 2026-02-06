/**
 * ============================================================================
 * ADMIN MODULE - Administrative Operations
 * ============================================================================
 *
 * This module provides administrative tools for site management,
 * moderation, and system monitoring.
 *
 * FEATURES:
 * - User management (roles, permissions, bans)
 * - Resource moderation queue and approval
 * - System health monitoring and metrics
 * - Audit logs and activity tracking
 * - Bulk operations for data management
 * - Configuration and settings management
 *
 * USER MANAGEMENT:
 * - View all users with filtering and search
 * - Modify roles and permissions
 * - Suspend or ban accounts
 * - View user activity and contributions
 * - Send system notifications
 * - Export user data for GDPR requests
 *
 * MODERATION QUEUE:
 * - Review pending resource submissions
 * - Approve, reject, or request changes
 * - Batch approval for trusted contributors
 * - Flag inappropriate or spam content
 * - Duplicate detection and merging
 * - Edit resource metadata before approval
 *
 * SYSTEM MONITORING:
 * - Health checks: database, API, external services
 * - Performance metrics: response times, error rates
 * - Resource usage: CPU, memory, storage
 * - API rate limits and quotas
 * - Background job queue status
 * - Cache hit rates and effectiveness
 *
 * AUDIT LOGS:
 * - All admin actions with timestamps
 * - User authentication events
 * - Resource CRUD operations
 * - Configuration changes
 * - Export to CSV or JSON
 * - Retention policy enforcement
 *
 * BULK OPERATIONS:
 * - Mass resource approval/rejection
 * - Batch category assignment
 * - Tag normalization across resources
 * - Data import/export
 * - Database migrations and cleanup
 *
 * SECURITY:
 * - Admin-only access with permission checks
 * - Two-factor authentication for sensitive ops
 * - Action confirmation for destructive operations
 * - IP allowlisting for admin endpoints
 * - Audit trail for compliance
 *
 * See /docs/ADMIN-GUIDE.md for administrative procedures.
 * ============================================================================
 */

export { adminModule } from './routes';
