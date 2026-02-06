/**
 * ============================================================================
 * USER MODULE - User Profiles & Preferences
 * ============================================================================
 *
 * This module handles user profile management, preferences, and
 * personalization features.
 *
 * FEATURES:
 * - User profile CRUD operations
 * - Preference management (theme, notifications, etc.)
 * - Saved resources and bookmarks
 * - Learning journey tracking
 * - Activity history and analytics
 * - Account settings and privacy controls
 *
 * USER PROFILE:
 * - Basic info: username, email, display name
 * - Role: admin, moderator, user, guest
 * - Stats: resources submitted, journeys completed
 * - Timestamps: created, last login, last activity
 *
 * PREFERENCES:
 * - UI settings: theme, language, layout
 * - Notifications: email, in-app, frequency
 * - Privacy: profile visibility, activity tracking
 * - Content: default filters, sort order
 *
 * SAVED RESOURCES:
 * - Bookmark resources for later viewing
 * - Organize into custom collections
 * - Export bookmarks to JSON/markdown
 * - Share collections with other users
 *
 * ACTIVITY TRACKING:
 * - Resources viewed, submitted, edited
 * - Journeys started, in-progress, completed
 * - Comments and interactions
 * - Contribution statistics
 *
 * PRIVACY & SECURITY:
 * - Email verification required
 * - Password change with confirmation
 * - Account deletion with data export
 * - GDPR compliance for data requests
 *
 * See /docs/USER-GUIDE.md for profile management documentation.
 * ============================================================================
 */

export { userModule } from './routes';
