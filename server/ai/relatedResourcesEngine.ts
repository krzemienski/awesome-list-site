import { storage } from '../storage';
import { Resource } from '@shared/schema';
import { embeddingService } from './embeddingService';
import { UserProfile } from './recommendationEngine';

export interface RelatedResourceResult {
  resource: Resource;
  score: number; // Cosine similarity score (0-1)
  confidence: number; // 0-100
  relationshipType: 'similar' | 'prerequisite' | 'next-step';
  reason: string;
}

export interface RelatedResourcesResponse {
  similar: RelatedResourceResult[];
  prerequisites: RelatedResourceResult[];
  nextSteps: RelatedResourceResult[];
  totalFound: number;
}

/**
 * Related Resources Engine - Semantic Similarity for Resource Discovery
 *
 * Uses vector embeddings and cosine similarity to find semantically related
 * resources, prerequisites, and next learning steps.
 *
 * CAPABILITIES:
 * - Semantic Similarity: Find related resources based on content meaning
 * - Prerequisites Detection: Identify foundational resources to learn first
 * - Next Steps Suggestion: Recommend advanced resources for progression
 * - Intelligent Caching: Store pre-computed relationships for fast loading
 *
 * SIMILARITY ALGORITHM:
 * - Uses cosine similarity between 1536-dimensional embedding vectors
 * - Scores range from -1 (opposite) to 1 (identical)
 * - Typical related resources score above 0.7
 *
 * RELATIONSHIP TYPES:
 * - similar: High semantic similarity (score > 0.7)
 * - prerequisite: Foundational knowledge (lower complexity)
 * - next-step: Advanced progression (higher complexity)
 *
 * PERFORMANCE:
 * - In-memory cache with 5-minute TTL
 * - Database cache for persistent storage
 * - Cache invalidation on resource updates
 */
export class RelatedResourcesEngine {
  private static instance: RelatedResourcesEngine;
  private relatedResourcesCache: Map<number, { results: RelatedResourcesResponse, timestamp: number }>;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_SIMILARITY_THRESHOLD = 0.5; // Minimum score to be considered related
  private readonly HIGH_SIMILARITY_THRESHOLD = 0.7; // High confidence threshold

  private constructor() {
    this.relatedResourcesCache = new Map();
  }

  public static getInstance(): RelatedResourcesEngine {
    if (!RelatedResourcesEngine.instance) {
      RelatedResourcesEngine.instance = new RelatedResourcesEngine();
    }
    return RelatedResourcesEngine.instance;
  }

  /**
   * Compute cosine similarity between two embedding vectors
   *
   * @param vec1 - First embedding vector
   * @param vec2 - Second embedding vector
   * @returns Similarity score between -1 and 1 (higher = more similar)
   */
  public computeCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
      throw new Error('Invalid vectors for cosine similarity computation');
    }

    // Compute dot product
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    // Compute norms
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    // Avoid division by zero
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    // Cosine similarity
    return dotProduct / (norm1 * norm2);
  }

  /**
   * Find related resources for a given resource
   *
   * @param resourceId - The resource to find related items for
   * @param limit - Maximum number of related resources per category
   * @param forceRefresh - Bypass cache and recompute
   * @param userProfile - Optional user profile for personalized recommendations
   * @returns Related resources categorized by relationship type
   */
  public async findRelatedResources(
    resourceId: number,
    limit: number = 5,
    forceRefresh: boolean = false,
    userProfile?: UserProfile
  ): Promise<RelatedResourcesResponse> {
    // Enrich user profile with database preferences if provided
    let enrichedProfile: UserProfile | undefined = undefined;
    if (userProfile) {
      enrichedProfile = await this.enrichUserProfile(userProfile);
    }

    // Check in-memory cache first (only use cache if no user profile for personalization)
    if (!forceRefresh && !enrichedProfile) {
      const cached = this.relatedResourcesCache.get(resourceId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.results;
      }
    }

    // Check database cache (only if no user profile)
    if (!forceRefresh && !enrichedProfile) {
      try {
        const dbCache = await storage.getRelatedResourcesCache(resourceId);
        if (dbCache && this.isCacheValid(dbCache)) {
          const results = await this.reconstructResultsFromCache(dbCache);

          // Update in-memory cache
          this.relatedResourcesCache.set(resourceId, {
            results,
            timestamp: Date.now()
          });

          return results;
        }
      } catch (error) {
        console.error('Error retrieving cache:', error);
      }
    }

    // Compute fresh results with personalization
    const results = await this.computeRelatedResources(resourceId, limit, enrichedProfile);

    // Only cache non-personalized results
    if (!enrichedProfile) {
      this.relatedResourcesCache.set(resourceId, {
        results,
        timestamp: Date.now()
      });

      await this.storeCacheInDatabase(resourceId, results);
    }

    return results;
  }

  /**
   * Get prerequisite resources (foundational knowledge to learn first)
   *
   * @param resourceId - The resource to find prerequisites for
   * @param limit - Maximum number of prerequisites
   * @param userProfile - Optional user profile for personalized recommendations
   * @returns Array of prerequisite resources
   */
  public async getPrerequisites(
    resourceId: number,
    limit: number = 5,
    userProfile?: UserProfile
  ): Promise<RelatedResourceResult[]> {
    const results = await this.findRelatedResources(resourceId, limit, false, userProfile);
    return results.prerequisites;
  }

  /**
   * Get next step resources (advanced progression)
   *
   * @param resourceId - The resource to find next steps for
   * @param limit - Maximum number of next steps
   * @param userProfile - Optional user profile for personalized recommendations
   * @returns Array of next step resources
   */
  public async getNextSteps(
    resourceId: number,
    limit: number = 5,
    userProfile?: UserProfile
  ): Promise<RelatedResourceResult[]> {
    const results = await this.findRelatedResources(resourceId, limit, false, userProfile);
    return results.nextSteps;
  }

  /**
   * Invalidate cache for a specific resource
   * Useful when a resource is updated or deleted
   *
   * @param resourceId - The resource to invalidate cache for
   */
  public async invalidateCache(resourceId: number): Promise<void> {
    // Clear in-memory cache
    this.relatedResourcesCache.delete(resourceId);

    // Clear database cache
    try {
      await storage.deleteRelatedResourcesCache(resourceId);
    } catch (error) {
      console.error('Error invalidating database cache:', error);
    }
  }

  /**
   * Clear all caches (useful for development/testing)
   */
  public clearAllCaches(): void {
    this.relatedResourcesCache.clear();
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Enrich user profile with database preferences
   */
  private async enrichUserProfile(userProfile: UserProfile): Promise<UserProfile> {
    const enrichedProfile: UserProfile = {
      ...userProfile,
      viewHistory: userProfile.viewHistory || [],
      bookmarks: userProfile.bookmarks || [],
      completedResources: userProfile.completedResources || [],
      preferredCategories: userProfile.preferredCategories || [],
      learningGoals: userProfile.learningGoals || [],
      preferredResourceTypes: userProfile.preferredResourceTypes || [],
      ratings: userProfile.ratings || {}
    };

    try {
      const dbPreferences = await storage.getUserPreferences(userProfile.userId);
      if (dbPreferences) {
        enrichedProfile.preferredCategories = userProfile.preferredCategories.length > 0
          ? userProfile.preferredCategories
          : dbPreferences.preferredCategories || [];

        enrichedProfile.skillLevel = userProfile.skillLevel || dbPreferences.skillLevel || 'beginner';

        enrichedProfile.learningGoals = userProfile.learningGoals.length > 0
          ? userProfile.learningGoals
          : dbPreferences.learningGoals || [];

        enrichedProfile.preferredResourceTypes = userProfile.preferredResourceTypes.length > 0
          ? userProfile.preferredResourceTypes
          : dbPreferences.preferredResourceTypes || [];

        enrichedProfile.timeCommitment = userProfile.timeCommitment || dbPreferences.timeCommitment || 'flexible';
      }
    } catch (error) {
      console.error('Error fetching user preferences, using provided profile:', error);
    }

    return enrichedProfile;
  }

  /**
   * Apply user preferences to filter and boost related resources
   */
  private applyUserPreferences(
    similarities: Array<{ resource: Resource; score: number }>,
    userProfile: UserProfile
  ): Array<{ resource: Resource; score: number }> {
    return similarities
      .filter(({ resource }) => {
        // Filter out already viewed or completed resources
        if (userProfile.viewHistory.includes(resource.url)) {
          return false;
        }
        if (userProfile.completedResources.includes(resource.url)) {
          return false;
        }
        return true;
      })
      .map(({ resource, score }) => {
        let boostedScore = score;

        // Boost resources in preferred categories (15% boost)
        if (resource.category && userProfile.preferredCategories.includes(resource.category)) {
          boostedScore *= 1.15;
        }

        // Boost bookmarked resources (10% boost)
        if (userProfile.bookmarks.includes(resource.url)) {
          boostedScore *= 1.1;
        }

        // Boost resources aligned with learning goals (10% boost per matching goal)
        const resourceText = `${resource.title} ${resource.description || ''} ${resource.category || ''}`.toLowerCase();
        userProfile.learningGoals.forEach(goal => {
          const goalWords = goal.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          const matchingWords = goalWords.filter(word => resourceText.includes(word));
          if (matchingWords.length / goalWords.length > 0.5) {
            boostedScore *= 1.1;
          }
        });

        // Cap boost at 1.5x to maintain semantic similarity importance
        boostedScore = Math.min(boostedScore, score * 1.5);

        return { resource, score: boostedScore };
      });
  }

  /**
   * Compute related resources using embeddings and cosine similarity
   */
  private async computeRelatedResources(
    resourceId: number,
    limit: number,
    userProfile?: UserProfile
  ): Promise<RelatedResourcesResponse> {
    // Get the source resource and its embedding
    const { resources } = await storage.listResources({ limit: 10000 });
    const sourceResource = resources.find(r => r.id === resourceId);

    if (!sourceResource) {
      throw new Error(`Resource ${resourceId} not found`);
    }

    const sourceEmbedding = await storage.getResourceEmbedding(resourceId);

    if (!sourceEmbedding || !sourceEmbedding.embedding) {
      // No embedding available - return empty results
      return {
        similar: [],
        prerequisites: [],
        nextSteps: [],
        totalFound: 0
      };
    }

    // Get all resources with embeddings
    const allEmbeddings = await this.getAllResourceEmbeddings();

    // Compute similarities
    const similarities: Array<{
      resource: Resource;
      score: number;
    }> = [];

    for (const { resource, embedding } of allEmbeddings) {
      // Skip the source resource itself
      if (resource.id === resourceId) {
        continue;
      }

      const score = this.computeCosineSimilarity(
        sourceEmbedding.embedding as number[],
        embedding
      );

      // Only include resources above minimum threshold
      if (score >= this.MIN_SIMILARITY_THRESHOLD) {
        similarities.push({ resource, score });
      }
    }

    // Apply user profile personalization if provided
    let filteredSimilarities = similarities;
    if (userProfile) {
      filteredSimilarities = this.applyUserPreferences(similarities, userProfile);
    }

    // Sort by similarity score (descending)
    filteredSimilarities.sort((a, b) => b.score - a.score);

    // Categorize into relationship types with user preferences
    const similar = this.categorizeSimilar(filteredSimilarities, limit, userProfile);
    const prerequisites = this.categorizePrerequisites(filteredSimilarities, sourceResource, limit, userProfile);
    const nextSteps = this.categorizeNextSteps(filteredSimilarities, sourceResource, limit, userProfile);

    return {
      similar,
      prerequisites,
      nextSteps,
      totalFound: filteredSimilarities.length
    };
  }

  /**
   * Get all resources with their embeddings
   */
  private async getAllResourceEmbeddings(): Promise<Array<{ resource: Resource, embedding: number[] }>> {
    const { resources } = await storage.listResources({
      status: 'approved',
      limit: 10000
    });

    const results: Array<{ resource: Resource, embedding: number[] }> = [];

    for (const resource of resources) {
      const embeddingData = await storage.getResourceEmbedding(resource.id);
      if (embeddingData && embeddingData.embedding) {
        results.push({
          resource,
          embedding: embeddingData.embedding as number[]
        });
      }
    }

    return results;
  }

  /**
   * Categorize similar resources (high semantic similarity)
   */
  private categorizeSimilar(
    similarities: Array<{ resource: Resource; score: number }>,
    limit: number,
    userProfile?: UserProfile
  ): RelatedResourceResult[] {
    return similarities
      .slice(0, limit)
      .map(({ resource, score }) => ({
        resource,
        score,
        confidence: Math.round(score * 100),
        relationshipType: 'similar' as const,
        reason: this.generateReason(score, 'similar', resource, userProfile)
      }));
  }

  /**
   * Categorize prerequisites (foundational resources)
   *
   * Heuristic: Similar resources from simpler categories or
   * resources with "beginner", "intro", "basics" in title
   */
  private categorizePrerequisites(
    similarities: Array<{ resource: Resource; score: number }>,
    sourceResource: Resource,
    limit: number,
    userProfile?: UserProfile
  ): RelatedResourceResult[] {
    let prerequisites = similarities
      .filter(({ resource }) => this.isLikelyPrerequisite(resource, sourceResource));

    // Boost prerequisites for beginner users
    if (userProfile?.skillLevel === 'beginner') {
      prerequisites = prerequisites.map(item => ({
        ...item,
        score: item.score * 1.2 // Boost by 20% for beginners
      }));
      prerequisites.sort((a, b) => b.score - a.score);
    }

    const topPrerequisites = prerequisites.slice(0, limit);

    return topPrerequisites.map(({ resource, score }) => ({
      resource,
      score,
      confidence: Math.round(Math.min(score, 1.0) * 100),
      relationshipType: 'prerequisite' as const,
      reason: this.generateReason(score, 'prerequisite', resource, userProfile)
    }));
  }

  /**
   * Categorize next steps (advanced resources)
   *
   * Heuristic: Similar resources from more advanced categories or
   * resources with "advanced", "deep dive", "mastering" in title
   */
  private categorizeNextSteps(
    similarities: Array<{ resource: Resource; score: number }>,
    sourceResource: Resource,
    limit: number,
    userProfile?: UserProfile
  ): RelatedResourceResult[] {
    let nextSteps = similarities
      .filter(({ resource }) => this.isLikelyNextStep(resource, sourceResource));

    // Boost next steps for advanced users
    if (userProfile?.skillLevel === 'advanced') {
      nextSteps = nextSteps.map(item => ({
        ...item,
        score: item.score * 1.2 // Boost by 20% for advanced users
      }));
      nextSteps.sort((a, b) => b.score - a.score);
    }

    const topNextSteps = nextSteps.slice(0, limit);

    return topNextSteps.map(({ resource, score }) => ({
      resource,
      score,
      confidence: Math.round(Math.min(score, 1.0) * 100),
      relationshipType: 'next-step' as const,
      reason: this.generateReason(score, 'next-step', resource, userProfile)
    }));
  }

  /**
   * Check if a resource is likely a prerequisite
   */
  private isLikelyPrerequisite(resource: Resource, sourceResource: Resource): boolean {
    const title = resource.title.toLowerCase();
    const description = (resource.description || '').toLowerCase();

    // Keywords indicating beginner/foundational content
    const beginnerKeywords = [
      'beginner', 'intro', 'introduction', 'basics', 'fundamentals',
      'getting started', 'tutorial', 'learn', 'guide', '101'
    ];

    const hasBeginnerKeyword = beginnerKeywords.some(keyword =>
      title.includes(keyword) || description.includes(keyword)
    );

    return hasBeginnerKeyword;
  }

  /**
   * Check if a resource is likely a next step
   */
  private isLikelyNextStep(resource: Resource, sourceResource: Resource): boolean {
    const title = resource.title.toLowerCase();
    const description = (resource.description || '').toLowerCase();

    // Keywords indicating advanced/next-level content
    const advancedKeywords = [
      'advanced', 'expert', 'mastering', 'deep dive', 'in-depth',
      'professional', 'comprehensive', 'complete guide', 'best practices'
    ];

    const hasAdvancedKeyword = advancedKeywords.some(keyword =>
      title.includes(keyword) || description.includes(keyword)
    );

    return hasAdvancedKeyword;
  }

  /**
   * Generate a human-readable reason for the relationship
   */
  private generateReason(
    score: number,
    relationshipType: 'similar' | 'prerequisite' | 'next-step',
    resource: Resource,
    userProfile?: UserProfile
  ): string {
    const confidence = score >= this.HIGH_SIMILARITY_THRESHOLD ? 'high' : 'moderate';
    const reasons: string[] = [];

    // Add base reason
    switch (relationshipType) {
      case 'similar':
        reasons.push(`${confidence === 'high' ? 'Highly' : 'Moderately'} similar content`);
        break;
      case 'prerequisite':
        reasons.push(`Foundational knowledge`);
        break;
      case 'next-step':
        reasons.push(`Advanced progression`);
        break;
    }

    // Add personalization context if user profile is available
    if (userProfile) {
      // Category match
      if (resource.category && userProfile.preferredCategories.includes(resource.category)) {
        reasons.push(`matches your interest in ${resource.category}`);
      }

      // Skill level alignment
      if (relationshipType === 'prerequisite' && userProfile.skillLevel === 'beginner') {
        reasons.push(`recommended for your skill level`);
      } else if (relationshipType === 'next-step' && userProfile.skillLevel === 'advanced') {
        reasons.push(`aligned with your advanced level`);
      }
    }

    return reasons.slice(0, 2).join(', ');
  }

  /**
   * Check if database cache is still valid
   */
  private isCacheValid(cache: any): boolean {
    const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
    const cacheAge = Date.now() - new Date(cache.lastUpdatedAt).getTime();
    return cacheAge < MAX_CACHE_AGE;
  }

  /**
   * Reconstruct results from database cache
   */
  private async reconstructResultsFromCache(cache: any): Promise<RelatedResourcesResponse> {
    const relatedIds = cache.relatedResourceIds as number[];
    const scores = cache.scores as Record<number, number>;
    const metadata = cache.metadata as {
      relationshipTypes?: Record<number, 'similar' | 'prerequisite' | 'next-step'>;
    };

    // Fetch all related resources
    const { resources } = await storage.listResources({ limit: 10000 });
    const resourceMap = new Map(resources.map(r => [r.id, r]));

    const similar: RelatedResourceResult[] = [];
    const prerequisites: RelatedResourceResult[] = [];
    const nextSteps: RelatedResourceResult[] = [];

    for (const relatedId of relatedIds) {
      const resource = resourceMap.get(relatedId);
      if (!resource) continue;

      const score = scores[relatedId] || 0;
      const relationshipType = metadata.relationshipTypes?.[relatedId] || 'similar';

      const result: RelatedResourceResult = {
        resource,
        score,
        confidence: Math.round(score * 100),
        relationshipType,
        reason: this.generateReason(score, relationshipType, resource)
      };

      switch (relationshipType) {
        case 'similar':
          similar.push(result);
          break;
        case 'prerequisite':
          prerequisites.push(result);
          break;
        case 'next-step':
          nextSteps.push(result);
          break;
      }
    }

    return {
      similar,
      prerequisites,
      nextSteps,
      totalFound: relatedIds.length
    };
  }

  /**
   * Store computed results in database cache
   */
  private async storeCacheInDatabase(
    resourceId: number,
    results: RelatedResourcesResponse
  ): Promise<void> {
    try {
      const allRelated = [
        ...results.similar,
        ...results.prerequisites,
        ...results.nextSteps
      ];

      const relatedResourceIds = allRelated.map(r => r.resource.id);
      const scores: Record<number, number> = {};
      const relationshipTypes: Record<number, 'similar' | 'prerequisite' | 'next-step'> = {};

      for (const item of allRelated) {
        scores[item.resource.id] = item.score;
        relationshipTypes[item.resource.id] = item.relationshipType;
      }

      await storage.storeRelatedResourcesCache({
        resourceId,
        relatedResourceIds,
        scores,
        metadata: {
          relationshipTypes,
          computedAt: new Date().toISOString(),
          model: 'text-embedding-3-small'
        }
      });
    } catch (error) {
      console.error('Error storing cache in database:', error);
      // Don't throw - cache storage failure shouldn't break the request
    }
  }
}

// Export singleton instance
export const relatedResourcesEngine = RelatedResourcesEngine.getInstance();
