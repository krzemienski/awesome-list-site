import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jeyldoypdkgsrfdhdcmm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY required for database helpers');
}

// Admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Database Query Helpers for Integration Test Verification
 *
 * These functions directly query the database to verify state between UI actions.
 * Uses service role key to bypass RLS for verification purposes.
 */

/**
 * Get resource by URL
 */
export async function getResourceByUrl(url: string) {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('*')
    .eq('url', url)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`No resource found with URL: ${url}`);
  return data;
}

/**
 * Get resource by ID
 */
export async function getResourceById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`No resource found with ID: ${id}`);
  return data;
}

/**
 * Verify resource has expected status
 */
export async function verifyResourceStatus(url: string, expectedStatus: string) {
  const resource = await getResourceByUrl(url);

  if (resource.status !== expectedStatus) {
    throw new Error(
      `Expected resource status '${expectedStatus}' but got '${resource.status}'`
    );
  }

  return resource;
}

/**
 * Get user's favorites
 */
export async function getUserFavorites(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_favorites')
    .select('resource_id')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

/**
 * Verify user has expected number of favorites
 */
export async function verifyUserFavoritesCount(userId: string, expectedCount: number) {
  const favorites = await getUserFavorites(userId);

  if (favorites.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} favorites but found ${favorites.length}`
    );
  }

  return favorites;
}

/**
 * Get user's bookmarks
 */
export async function getUserBookmarks(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_bookmarks')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

/**
 * Verify user has bookmark for resource
 */
export async function verifyUserHasBookmark(userId: string, resourceId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_bookmarks')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .single();

  if (error) {
    throw new Error(`User does not have bookmark for resource: ${error.message}`);
  }

  return data;
}

/**
 * Verify user does NOT have bookmark
 */
export async function verifyUserLacksBookmark(userId: string, resourceId: string) {
  const { data } = await supabaseAdmin
    .from('user_bookmarks')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .maybeSingle();

  if (data) {
    throw new Error(`User should not have bookmark but found one`);
  }
}

/**
 * Get resources by status
 */
export async function getResourcesByStatus(status: string) {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('id, title, url, status')
    .eq('status', status);

  if (error) throw error;
  return data || [];
}

/**
 * Get resources by category
 */
export async function getResourcesByCategory(category: string) {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('id, title, url, category')
    .eq('category', category)
    .eq('status', 'approved');  // Only approved resources

  if (error) throw error;
  return data || [];
}

/**
 * Count resources matching criteria
 */
export async function countResources(filters: {
  status?: string;
  category?: string;
}) {
  let query = supabaseAdmin.from('resources').select('id', { count: 'exact', head: true });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count || 0;
}

/**
 * Cleanup test resource by URL
 */
export async function cleanupTestResource(url: string) {
  const { error } = await supabaseAdmin
    .from('resources')
    .delete()
    .eq('url', url);

  if (error) throw error;
}

/**
 * Cleanup test resources by title pattern
 */
export async function cleanupTestResources(titlePattern: string) {
  const { error } = await supabaseAdmin
    .from('resources')
    .delete()
    .like('title', titlePattern);

  if (error) throw error;
}

/**
 * Get audit log entries for resource
 */
export async function getResourceAuditLog(resourceId: string) {
  const { data, error } = await supabaseAdmin
    .from('resource_audit_log')
    .select('*')
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Verify audit log entry exists
 */
export async function verifyAuditLogEntry(resourceId: string, expectedAction: string) {
  const logs = await getResourceAuditLog(resourceId);

  const found = logs.find(log => log.action === expectedAction);

  if (!found) {
    throw new Error(
      `Expected audit log entry with action '${expectedAction}' but not found`
    );
  }

  return found;
}
