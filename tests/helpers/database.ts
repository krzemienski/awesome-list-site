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

/**
 * Get user by email from auth.users
 */
export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) throw error;

  const user = data.users.find(u => u.email === email);
  return user || null;
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Verify user has favorite for resource
 */
export async function verifyUserHasFavorite(userId: string, resourceId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Count user favorites
 */
export async function countUserFavorites(userId: string) {
  const { count, error } = await supabaseAdmin
    .from('user_favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

/**
 * Count user bookmarks
 */
export async function countUserBookmarks(userId: string) {
  const { count, error } = await supabaseAdmin
    .from('user_bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

/**
 * Get bookmark with notes
 */
export async function getBookmarkWithNotes(userId: string, resourceId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_bookmarks')
    .select('*')
    .eq('user_id', userId)
    .eq('resource_id', resourceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Delete test user favorite (cleanup)
 */
export async function cleanupUserFavorite(userId: string, resourceId: string) {
  const { error } = await supabaseAdmin
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('resource_id', resourceId);

  if (error) throw error;
}

/**
 * Delete test user bookmark (cleanup)
 */
export async function cleanupUserBookmark(userId: string, resourceId: string) {
  const { error } = await supabaseAdmin
    .from('user_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('resource_id', resourceId);

  if (error) throw error;
}

/**
 * Get learning journeys (published)
 */
export async function getLearningJourneys() {
  const { data, error } = await supabaseAdmin
    .from('learning_journeys')
    .select('*')
    .eq('status', 'published')
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get journey steps
 */
export async function getJourneySteps(journeyId: string) {
  const { data, error } = await supabaseAdmin
    .from('journey_steps')
    .select('*')
    .eq('journey_id', journeyId)
    .order('step_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get user journey progress
 */
export async function getUserJourneyProgress(userId: string, journeyId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_journey_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('journey_id', journeyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Cleanup user journey progress
 */
export async function cleanupUserJourneyProgress(userId: string, journeyId: string) {
  const { error } = await supabaseAdmin
    .from('user_journey_progress')
    .delete()
    .eq('user_id', userId)
    .eq('journey_id', journeyId);

  if (error) throw error;
}

/**
 * Create test learning journey (for seeding)
 */
export async function createTestJourney(title: string, category: string) {
  const { data, error } = await supabaseAdmin
    .from('learning_journeys')
    .insert({
      title,
      description: `Test journey for ${category}`,
      difficulty: 'beginner',
      estimated_duration: '2 hours',
      category,
      status: 'published',
      order_index: 999
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create test journey step
 */
export async function createTestJourneyStep(journeyId: string, stepNumber: number, title: string, resourceId?: string) {
  const { data, error } = await supabaseAdmin
    .from('journey_steps')
    .insert({
      journey_id: journeyId,
      step_number: stepNumber,
      title,
      description: `Step ${stepNumber} description`,
      resource_id: resourceId || null,
      is_optional: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete test journey (cleanup)
 */
export async function cleanupTestJourney(journeyId: string) {
  // First delete steps
  await supabaseAdmin
    .from('journey_steps')
    .delete()
    .eq('journey_id', journeyId);

  // Then delete journey
  const { error } = await supabaseAdmin
    .from('learning_journeys')
    .delete()
    .eq('id', journeyId);

  if (error) throw error;
}

/**
 * Search resources by title
 */
export async function searchResourcesByTitle(query: string, limit: number = 10) {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('id, title, url, category')
    .ilike('title', `%${query}%`)
    .eq('status', 'approved')
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get first approved resource (for testing)
 */
export async function getFirstApprovedResource() {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('*')
    .eq('status', 'approved')
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user submissions count
 */
export async function getUserSubmissionsCount(userId: string) {
  const { count, error } = await supabaseAdmin
    .from('resources')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', userId);

  if (error) throw error;
  return count || 0;
}

// ========================================
// TAG VERIFICATION FUNCTIONS
// ========================================

/**
 * Get tags by name
 */
export async function getTagsByNames(names: string[]) {
  const { data, error } = await supabaseAdmin
    .from('tags')
    .select('*')
    .in('name', names);

  if (error) throw error;
  return data || [];
}

/**
 * Get resource_tags junctions for resources
 */
export async function getResourceTags(resourceIds: string[]) {
  const { data, error } = await supabaseAdmin
    .from('resource_tags')
    .select('resource_id, tag_id')
    .in('resource_id', resourceIds);

  if (error) throw error;
  return data || [];
}

/**
 * Verify tags were created and assigned to resources
 */
export async function verifyBulkTagAssignment(
  resourceIds: string[],
  tagNames: string[]
): Promise<{ tags: any[]; junctions: any[]; success: boolean }> {
  // 1. Check tags were created
  const tags = await getTagsByNames(tagNames);

  // 2. Check junctions were created
  const junctions = await getResourceTags(resourceIds);

  // 3. Verify count
  const expectedJunctions = resourceIds.length * tagNames.length;
  const actualJunctions = junctions.filter(j =>
    resourceIds.includes(j.resource_id) &&
    tags.some(t => t.id === j.tag_id)
  );

  return {
    tags,
    junctions: actualJunctions,
    success: tags.length === tagNames.length && actualJunctions.length === expectedJunctions
  };
}

/**
 * Cleanup test tags
 */
export async function cleanupTestTags(tagNames: string[]) {
  // First get tag IDs
  const tags = await getTagsByNames(tagNames);
  const tagIds = tags.map(t => t.id);

  if (tagIds.length > 0) {
    // Delete junctions first
    await supabaseAdmin
      .from('resource_tags')
      .delete()
      .in('tag_id', tagIds);

    // Then delete tags
    await supabaseAdmin
      .from('tags')
      .delete()
      .in('id', tagIds);
  }
}

/**
 * Get all tags for a resource
 */
export async function getResourceTagNames(resourceId: string) {
  const { data, error } = await supabaseAdmin
    .from('resource_tags')
    .select('tag_id, tags!inner(name)')
    .eq('resource_id', resourceId);

  if (error) throw error;
  return (data || []).map((r: any) => r.tags?.name).filter(Boolean);
}
