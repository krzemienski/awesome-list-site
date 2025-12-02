-- Migration: Enhanced Audit Logging
-- Purpose: Add request tracking fields for comprehensive audit trail
-- Date: 2025-12-02
-- Author: System Enhancement

-- =============================================================================
-- ADD NEW COLUMNS TO resource_audit_log
-- =============================================================================

-- Request ID for tracing across distributed systems
ALTER TABLE resource_audit_log
ADD COLUMN IF NOT EXISTS request_id TEXT;

COMMENT ON COLUMN resource_audit_log.request_id IS 'Unique request ID (UUID format) for request tracing and correlation';

-- Client IP address (supports IPv4 and IPv6)
ALTER TABLE resource_audit_log
ADD COLUMN IF NOT EXISTS ip_address TEXT;

COMMENT ON COLUMN resource_audit_log.ip_address IS 'Client IP address, extracted from X-Forwarded-For or socket';

-- User agent string
ALTER TABLE resource_audit_log
ADD COLUMN IF NOT EXISTS user_agent TEXT;

COMMENT ON COLUMN resource_audit_log.user_agent IS 'Browser/client user agent string (truncated to 500 chars)';

-- API endpoint path
ALTER TABLE resource_audit_log
ADD COLUMN IF NOT EXISTS endpoint TEXT;

COMMENT ON COLUMN resource_audit_log.endpoint IS 'API endpoint path (e.g., /api/admin/resources/:id/approve)';

-- HTTP method
ALTER TABLE resource_audit_log
ADD COLUMN IF NOT EXISTS http_method TEXT;

COMMENT ON COLUMN resource_audit_log.http_method IS 'HTTP method (GET, POST, PUT, DELETE, PATCH, SYSTEM)';

-- Session ID for tracking user sessions
ALTER TABLE resource_audit_log
ADD COLUMN IF NOT EXISTS session_id TEXT;

COMMENT ON COLUMN resource_audit_log.session_id IS 'Session identifier for tracking user sessions across requests';

-- =============================================================================
-- CREATE INDEXES FOR NEW COLUMNS
-- =============================================================================

-- Index on request_id for fast correlation queries
CREATE INDEX IF NOT EXISTS idx_audit_log_request_id
ON resource_audit_log(request_id)
WHERE request_id IS NOT NULL;

-- Index on ip_address for security investigations
CREATE INDEX IF NOT EXISTS idx_audit_log_ip_address
ON resource_audit_log(ip_address)
WHERE ip_address IS NOT NULL;

-- Composite index for user activity analysis (user + time)
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by_created
ON resource_audit_log(performed_by, created_at DESC)
WHERE performed_by IS NOT NULL;

-- Index on endpoint for API usage analysis
CREATE INDEX IF NOT EXISTS idx_audit_log_endpoint
ON resource_audit_log(endpoint)
WHERE endpoint IS NOT NULL;

-- =============================================================================
-- CREATE VIEWS FOR COMMON AUDIT QUERIES
-- =============================================================================

-- View for recent admin activity summary
CREATE OR REPLACE VIEW admin_activity_summary AS
SELECT
  performed_by,
  action,
  endpoint,
  ip_address,
  COUNT(*) as action_count,
  MAX(created_at) as last_activity,
  MIN(created_at) as first_activity
FROM resource_audit_log
WHERE performed_by IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY performed_by, action, endpoint, ip_address
ORDER BY last_activity DESC;

COMMENT ON VIEW admin_activity_summary IS 'Summary of admin actions in the last 30 days for security monitoring';

-- View for suspicious activity (multiple IPs per user or high action volume)
CREATE OR REPLACE VIEW suspicious_activity AS
SELECT
  performed_by,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(*) as total_actions,
  array_agg(DISTINCT ip_address) as ip_addresses,
  MAX(created_at) as last_activity
FROM resource_audit_log
WHERE performed_by IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY performed_by
HAVING COUNT(DISTINCT ip_address) > 3
    OR COUNT(*) > 100
ORDER BY total_actions DESC;

COMMENT ON VIEW suspicious_activity IS 'Identifies users with unusual activity patterns (multiple IPs or high volume)';

-- View for request tracing (all actions in a single request)
CREATE OR REPLACE VIEW request_trace AS
SELECT
  request_id,
  array_agg(action ORDER BY created_at) as actions,
  array_agg(resource_id ORDER BY created_at) as resources,
  MIN(created_at) as started_at,
  MAX(created_at) as completed_at,
  COUNT(*) as action_count,
  MAX(ip_address) as ip_address,
  MAX(performed_by) as performed_by,
  MAX(endpoint) as endpoint
FROM resource_audit_log
WHERE request_id IS NOT NULL
GROUP BY request_id
ORDER BY started_at DESC;

COMMENT ON VIEW request_trace IS 'Groups all audit entries by request for complete request tracing';

-- =============================================================================
-- UPDATE TABLE COMMENT
-- =============================================================================

COMMENT ON TABLE resource_audit_log IS 'Comprehensive audit log for all resource operations with request tracking. Fields: id, resource_id, action, performed_by, changes (JSONB), notes, request_id, ip_address, user_agent, endpoint, http_method, session_id, created_at';

-- =============================================================================
-- ANALYZE FOR QUERY OPTIMIZATION
-- =============================================================================

ANALYZE resource_audit_log;
