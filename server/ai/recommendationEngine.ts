import { storage } from '../storage';
import { Resource, User } from '@shared/schema';
import { generateAIRecommendations as generateClaudeRecommendations, generateAILearningPaths } from './recommendations';
import { claudeService } from './claudeService';

export interface UserProfile {
  userId: string;
  preferredCategories: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  preferredResourceTypes: string[];
  timeCommitment: 'daily' | 'weekly' | 'flexible';
  viewHistory: string[];
  bookmarks: string[];
  completedResources: string[];
  ratings: Record<string, number>;
  completedJourneys: number[]; // Journey IDs that are completed
  journeyProgress: Array<{
    journeyId: number;
    completedSteps: number[];
    currentStepId: number | null;
    startedAt: Date;
    lastAccessedAt: Date;
    completedAt: Date | null;
  }>;
}

export interface RecommendationResult {
  resource: Resource;
  confidence: number; // 0-100
  reason: string;
  type: 'ai_powered' | 'rule_based' | 'hybrid';
  score?: number; // Internal score for ranking
  aiGenerated?: boolean; // Flag to indicate if AI generated
}

export interface LearningPathRecommendation {
  id: number | string;
  title: string;
  difficulty: string;
  duration: string;
  resourceCount: number;
  matchScore: number; // 0-100
  category?: string;
  description?: string;
  resources?: Resource[];
}

export class RecommendationEngine {
  private static instance: RecommendationEngine;
  private recommendationCache: Map<string, { recommendations: RecommendationResult[], timestamp: number }>;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.recommendationCache = new Map();
  }

  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Generate personalized recommendations combining AI and rule-based approaches
   */
  public async generateRecommendations(
    userProfile: UserProfile,
    limit: number = 10,
    forceRefresh: boolean = false
  ): Promise<{
    recommendations: RecommendationResult[];
    learningPaths: LearningPathRecommendation[];
  }> {
    // FIXED: Clone profile before merging (done early so cache hit also uses enriched profile)
    // Ensure all required fields have default values
    const enrichedProfile: UserProfile = {
      ...userProfile,
      viewHistory: userProfile.viewHistory || [],
      bookmarks: userProfile.bookmarks || [],
      completedResources: userProfile.completedResources || [],
      preferredCategories: userProfile.preferredCategories || [],
      learningGoals: userProfile.learningGoals || [],
      preferredResourceTypes: userProfile.preferredResourceTypes || [],
      ratings: userProfile.ratings || {},
      completedJourneys: userProfile.completedJourneys || [],
      journeyProgress: userProfile.journeyProgress || []
    };

    // Get user preferences and interactions from database and enrich the profile
    try {
      const [dbPreferences, viewHistory, interactions, journeyProgressList] = await Promise.all([
        storage.getUserPreferences(userProfile.userId),
        storage.getUserViewHistory(userProfile.userId),
        storage.getUserInteractions(userProfile.userId),
        storage.listUserJourneyProgress(userProfile.userId)
      ]);

      // Merge DB preferences with provided profile (provided profile takes precedence)
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

      // Enrich view history from userInteractions table
      if (viewHistory && viewHistory.length > 0) {
        enrichedProfile.viewHistory = viewHistory.map(r => r.url);
      }

      // Extract completed resources and ratings from interactions
      const completedInteractions = interactions.filter(i => i.interactionType === 'complete');
      if (completedInteractions.length > 0) {
        const completedUrls = await Promise.all(
          completedInteractions.map(async i => {
            const resource = await storage.getResource(i.resourceId);
            return resource?.url;
          })
        );
        enrichedProfile.completedResources = completedUrls.filter(Boolean) as string[];
      }

      // Extract ratings from interactions
      const ratingInteractions = interactions.filter(i => i.interactionType === 'rate' && i.interactionValue !== null);
      if (ratingInteractions.length > 0) {
        const ratings: Record<string, number> = {};
        for (const interaction of ratingInteractions) {
          const resource = await storage.getResource(interaction.resourceId);
          if (resource && interaction.interactionValue !== null) {
            ratings[resource.url] = interaction.interactionValue;
          }
        }
        enrichedProfile.ratings = { ...enrichedProfile.ratings, ...ratings };
      }

      // Enrich journey progress from database
      if (journeyProgressList && journeyProgressList.length > 0) {
        enrichedProfile.journeyProgress = journeyProgressList.map(jp => ({
          journeyId: jp.journeyId,
          completedSteps: jp.completedSteps || [],
          currentStepId: jp.currentStepId || null,
          startedAt: jp.startedAt || new Date(),
          lastAccessedAt: jp.lastAccessedAt || new Date(),
          completedAt: jp.completedAt || null
        }));

        // Extract completed journeys (those with completedAt date)
        enrichedProfile.completedJourneys = journeyProgressList
          .filter(jp => jp.completedAt !== null)
          .map(jp => jp.journeyId);
      }
    } catch (error) {
      console.error('Error fetching user preferences and interactions, using provided profile:', error);
      // enrichedProfile already has a copy of userProfile
    }

    const cacheKey = `${enrichedProfile.userId}_${limit}`;
    
    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = this.recommendationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        // Also get learning paths using enriched profile
        const learningPaths = await this.generateLearningPathRecommendations(enrichedProfile);
        return {
          recommendations: cached.recommendations,
          learningPaths
        };
      }
    }

    try {
      // Get all available resources
      let { resources } = await storage.listResources({
        status: 'approved',
        limit: 1000 // Get more resources for better recommendations
      });

      // If no resources in database, use awesome list data
      if (!resources || resources.length === 0) {
        const awesomeListData = storage.getAwesomeListData();
        if (awesomeListData && awesomeListData.resources) {
          // Convert awesome list resources to database Resource format
          resources = awesomeListData.resources.map((r: any, index: number) => ({
            id: index + 1,
            title: r.title || r.name || 'Untitled',
            url: r.url,
            description: r.description || '',
            category: r.category,
            subcategory: r.subcategory,
            subSubcategory: r.subSubcategory,
            status: 'approved',
            createdAt: new Date()
          }));
        }
      }

      // Fetch user's favorites, bookmarks, and completed journey resources for better personalization
      const [favorites, bookmarks, completedJourneyResources] = await Promise.all([
        this.getUserFavorites(enrichedProfile.userId),
        this.getUserBookmarks(enrichedProfile.userId),
        storage.getCompletedJourneyResources(enrichedProfile.userId)
      ]);

      // Update enriched profile with actual data
      enrichedProfile.bookmarks = bookmarks.map(r => r.url);

      // Add completed journey resources to completedResources list
      const completedJourneyUrls = completedJourneyResources.map(r => r.url);
      enrichedProfile.completedResources = [
        ...enrichedProfile.completedResources,
        ...completedJourneyUrls.filter(url => !enrichedProfile.completedResources.includes(url))
      ];

      // Filter out already viewed/completed resources (including journey resources)
      const eligibleResources = resources.filter(resource =>
        !enrichedProfile.viewHistory.includes(resource.url) &&
        !enrichedProfile.completedResources.includes(resource.url)
      );

      let recommendations: RecommendationResult[] = [];

      // Cold-start detection: Check if user has minimal interaction history
      const isColdStart = enrichedProfile.viewHistory.length === 0 &&
                          enrichedProfile.completedResources.length === 0 &&
                          Object.keys(enrichedProfile.ratings).length === 0 &&
                          bookmarks.length === 0;

      // Debug: Log cold-start detection
      console.log('[COLD-START DEBUG]', {
        userId: enrichedProfile.userId,
        viewHistoryLength: enrichedProfile.viewHistory.length,
        completedResourcesLength: enrichedProfile.completedResources.length,
        ratingsCount: Object.keys(enrichedProfile.ratings).length,
        bookmarksLength: bookmarks.length,
        isColdStart
      });

      // Debug: Log personalization data for non-cold-start users
      if (!isColdStart) {
        const viewedCategories = new Map<string, number>();
        const bookmarkedCategories = new Map<string, number>();
        const journeyCategories = new Map<string, number>();

        // Extract categories from view history
        for (const viewedUrl of enrichedProfile.viewHistory) {
          const resource = resources.find(r => r.url === viewedUrl);
          if (resource?.category) {
            viewedCategories.set(resource.category, (viewedCategories.get(resource.category) || 0) + 1);
          }
        }

        // Extract categories from bookmarks
        for (const bookmark of bookmarks) {
          if (bookmark.category) {
            bookmarkedCategories.set(bookmark.category, (bookmarkedCategories.get(bookmark.category) || 0) + 1);
          }
        }

        // Extract categories from active journey resources
        for (const journeyResource of completedJourneyResources) {
          if (journeyResource.category) {
            journeyCategories.set(journeyResource.category, (journeyCategories.get(journeyResource.category) || 0) + 1);
          }
        }

        console.log('[PERSONALIZATION DEBUG]', {
          userId: enrichedProfile.userId,
          totalResources: resources.length,
          eligibleResources: eligibleResources.length,
          excludedByViews: enrichedProfile.viewHistory.length,
          excludedByCompleted: enrichedProfile.completedResources.length,
          excludedByJourneys: completedJourneyUrls.length,
          bookmarksCount: bookmarks.length,
          viewedCategories: Object.fromEntries(viewedCategories),
          bookmarkedCategories: Object.fromEntries(bookmarkedCategories),
          journeyCategories: Object.fromEntries(journeyCategories),
          preferredCategories: enrichedProfile.preferredCategories,
          activeJourneys: enrichedProfile.journeyProgress.filter(jp => !jp.completedAt).length,
          completedJourneys: enrichedProfile.completedJourneys.length
        });
      }

      // For cold-start users, use popular resources as recommendations
      if (isColdStart) {
        console.log('[COLD-START] Generating popular resources for new user:', enrichedProfile.userId);
        const popularResources = await this.getPopularResources(eligibleResources, limit);
        recommendations = popularResources.map(resource => ({
          resource,
          confidence: 75, // Medium-high confidence for popular items
          reason: 'Popular among users',
          type: 'rule_based' as const,
          score: 0.75
        }));

        // Cache and return early for cold-start users
        this.recommendationCache.set(cacheKey, {
          recommendations,
          timestamp: Date.now()
        });

        const learningPaths = await this.generateLearningPathRecommendations(enrichedProfile);

        return {
          recommendations,
          learningPaths
        };
      }

      // Try AI-powered recommendations first if API key is available
      if (claudeService.isAvailable()) {
        try {
          const aiRecommendations = await generateClaudeRecommendations(
            enrichedProfile,
            eligibleResources,
            Math.ceil(limit * 0.7) // Get 70% from AI
          );

          recommendations = aiRecommendations.map(rec => {
            const resource = eligibleResources.find(r => r.url === rec.resourceId);
            if (!resource) return null;

            return {
              resource,
              confidence: Math.round(rec.confidenceLevel * 100),
              reason: rec.reason,
              type: 'ai_powered' as const,
              score: rec.score,
              aiGenerated: true // Preserve AI flag
            };
          }).filter(Boolean) as RecommendationResult[];
        } catch (error) {
          console.warn('AI recommendations failed, falling back to rule-based:', error);
        }
      }

      // Fill remaining slots with rule-based recommendations
      const remainingSlots = limit - recommendations.length;
      if (remainingSlots > 0) {
        const ruleBasedRecs = this.generateRuleBasedRecommendations(
          enrichedProfile,
          eligibleResources,
          favorites,
          bookmarks,
          completedJourneyResources,
          remainingSlots
        );

        // Merge and deduplicate
        const existingUrls = new Set(recommendations.map(r => r.resource.url));
        const uniqueRuleBased = ruleBasedRecs.filter(rec => 
          !existingUrls.has(rec.resource.url)
        );

        recommendations = [...recommendations, ...uniqueRuleBased];
      }

      // Sort by confidence score
      recommendations.sort((a, b) => b.confidence - a.confidence);
      recommendations = recommendations.slice(0, limit);

      // Debug: Log final recommendations with categories
      console.log('[RECOMMENDATIONS DEBUG]', {
        userId: enrichedProfile.userId,
        totalRecommendations: recommendations.length,
        recommendedCategories: recommendations.map(r => ({
          category: r.resource.category,
          confidence: r.confidence,
          type: r.type,
          reason: r.reason
        }))
      });

      // Cache the results
      this.recommendationCache.set(cacheKey, {
        recommendations,
        timestamp: Date.now()
      });

      // Generate learning path recommendations
      const learningPaths = await this.generateLearningPathRecommendations(enrichedProfile);

      return {
        recommendations,
        learningPaths
      };

    } catch (error) {
      console.error('Error generating recommendations:', error);
      
      // Return empty results on error
      return {
        recommendations: [],
        learningPaths: []
      };
    }
  }

  /**
   * Generate rule-based recommendations
   */
  private generateRuleBasedRecommendations(
    userProfile: UserProfile,
    resources: Resource[],
    favorites: Resource[],
    bookmarks: Resource[],
    journeyResources: Resource[],
    limit: number
  ): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];

    // Create category frequency map from favorites, bookmarks, and journey resources
    const categoryFrequency = new Map<string, number>();
    [...favorites, ...bookmarks].forEach(resource => {
      const category = resource.category;
      if (category) {
        categoryFrequency.set(category, (categoryFrequency.get(category) || 0) + 1);
      }
    });

    // Create journey category frequency map (separate for higher weight)
    const journeyCategoryFrequency = new Map<string, number>();
    journeyResources.forEach(resource => {
      const category = resource.category;
      if (category) {
        journeyCategoryFrequency.set(category, (journeyCategoryFrequency.get(category) || 0) + 1);
      }
    });

    // Create category preference map from user ratings (feedback)
    // High ratings (4-5) boost similar categories, low ratings (1-2) reduce them
    const ratingCategoryPreference = new Map<string, { positive: number; negative: number }>();
    for (const [url, rating] of Object.entries(userProfile.ratings)) {
      // Find the resource to get its category
      const ratedResource = [...favorites, ...bookmarks, ...resources].find(r => r.url === url);
      if (ratedResource?.category) {
        const pref = ratingCategoryPreference.get(ratedResource.category) || { positive: 0, negative: 0 };
        if (rating >= 4) {
          pref.positive += 1;
        } else if (rating <= 2) {
          pref.negative += 1;
        }
        ratingCategoryPreference.set(ratedResource.category, pref);
      }
    }

    // Debug: Log category frequency for rule-based recommendations
    console.log('[RULE-BASED DEBUG] Category frequency from bookmarks/favorites:',
      Object.fromEntries(categoryFrequency)
    );
    console.log('[RULE-BASED DEBUG] Journey category frequency:',
      Object.fromEntries(journeyCategoryFrequency)
    );
    console.log('[RULE-BASED DEBUG] Rating-based category preferences:',
      Object.fromEntries(ratingCategoryPreference)
    );

    resources.forEach(resource => {
      let score = 0;
      let reasons: string[] = [];

      // Category preference scoring (40% weight)
      if (resource.category && userProfile.preferredCategories.includes(resource.category)) {
        score += 40;
        reasons.push(`matches your interest in ${resource.category}`);
      }

      // Historical preference from favorites/bookmarks (20% weight)
      if (resource.category && categoryFrequency.has(resource.category)) {
        const frequency = categoryFrequency.get(resource.category) || 0;
        score += Math.min(20, frequency * 5);
        if (frequency > 2) {
          reasons.push(`similar to your bookmarked resources`);
        }
      }

      // Learning journey category match (15% weight - strong signal of current learning focus)
      if (resource.category && journeyCategoryFrequency.has(resource.category)) {
        const frequency = journeyCategoryFrequency.get(resource.category) || 0;
        score += Math.min(15, frequency * 5);
        if (frequency > 0) {
          reasons.push(`related to your active learning journey in ${resource.category}`);
        }
      }

      // User feedback rating influence (10% weight - boost or reduce based on feedback)
      if (resource.category && ratingCategoryPreference.has(resource.category)) {
        const pref = ratingCategoryPreference.get(resource.category)!;
        const netPreference = pref.positive - pref.negative;
        const ratingScore = Math.max(-10, Math.min(10, netPreference * 3));
        score += ratingScore;
        if (netPreference > 0) {
          reasons.push(`similar to resources you rated highly`);
        } else if (netPreference < 0) {
          // Negative feedback - reduce score but don't add to reason
          score = Math.max(0, score); // Ensure score doesn't go negative
        }
      }

      // Skill level matching (20% weight)
      const skillScore = this.calculateSkillLevelMatch(resource, userProfile.skillLevel);
      score += skillScore * 20;
      if (skillScore > 0.5) {
        reasons.push(`suitable for ${userProfile.skillLevel} level`);
      }

      // Learning goals alignment (15% weight)
      const goalsScore = this.calculateGoalsAlignment(resource, userProfile.learningGoals);
      score += goalsScore * 15;
      if (goalsScore > 0.5 && userProfile.learningGoals.length > 0) {
        reasons.push(`aligns with your learning goals`);
      }

      // Recency bonus (5% weight)
      if (resource.createdAt) {
        const daysSinceCreation = (Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) {
          score += 5;
          reasons.push(`recently added`);
        }
      }

      if (score > 20) { // Minimum threshold
        recommendations.push({
          resource,
          confidence: Math.min(Math.round(score), 100),
          reason: reasons.length > 0 ? reasons.slice(0, 2).join(' and ') : 'Based on your preferences',
          type: 'rule_based',
          score: score / 100
        });
      }
    });

    // Sort and return top recommendations
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  /**
   * Calculate skill level match score
   */
  private calculateSkillLevelMatch(resource: Resource, skillLevel: string): number {
    const text = `${resource.title} ${resource.description}`.toLowerCase();
    
    const skillIndicators = {
      beginner: ['basic', 'intro', 'introduction', 'getting started', 'tutorial', 'beginner', 'fundamentals', '101'],
      intermediate: ['guide', 'how to', 'implementation', 'practical', 'hands-on', 'workshop', 'intermediate'],
      advanced: ['advanced', 'expert', 'deep dive', 'optimization', 'performance', 'architecture', 'complex', 'professional']
    };

    const indicators = skillIndicators[skillLevel as keyof typeof skillIndicators] || [];
    const matches = indicators.filter(indicator => text.includes(indicator));

    // Perfect match if multiple indicators found
    if (matches.length >= 2) return 1.0;
    if (matches.length === 1) return 0.7;
    
    // Partial credit for adjacent skill levels
    if (skillLevel === 'intermediate') return 0.5; // Intermediate can benefit from all levels
    
    return 0.3; // Base score
  }

  /**
   * Calculate alignment with learning goals
   */
  private calculateGoalsAlignment(resource: Resource, learningGoals: string[]): number {
    if (learningGoals.length === 0) return 0.5;

    const resourceText = `${resource.title} ${resource.description} ${resource.category || ''}`.toLowerCase();
    let totalAlignment = 0;

    learningGoals.forEach(goal => {
      const goalWords = goal.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      const matchingWords = goalWords.filter(word => resourceText.includes(word));
      
      if (matchingWords.length > 0) {
        totalAlignment += matchingWords.length / goalWords.length;
      }
    });

    return Math.min(totalAlignment / learningGoals.length, 1.0);
  }

  /**
   * Get user's favorite resources
   */
  private async getUserFavorites(userId: string): Promise<Resource[]> {
    try {
      return await storage.getUserFavorites(userId);
    } catch (error) {
      console.error('Error fetching user favorites:', error);
      return [];
    }
  }

  /**
   * Get user's bookmarked resources
   */
  private async getUserBookmarks(userId: string): Promise<Resource[]> {
    try {
      return await storage.getUserBookmarks(userId);
    } catch (error) {
      console.error('Error fetching user bookmarks:', error);
      return [];
    }
  }

  /**
   * Get popular resources based on view counts and interactions
   * Used for cold-start users with no personalization data
   */
  private async getPopularResources(resources: Resource[], limit: number): Promise<Resource[]> {
    try {
      // Get interaction counts for all resources
      const resourcePopularity = await Promise.all(
        resources.map(async (resource) => {
          try {
            const interactions = await storage.getResourceInteractions(resource.id);
            const viewCount = interactions.filter(i => i.interactionType === 'view').length;
            const bookmarkCount = interactions.filter(i => i.interactionType === 'bookmark').length;
            const completeCount = interactions.filter(i => i.interactionType === 'complete').length;

            // Calculate weighted popularity score
            // Views: 1 point, Bookmarks: 3 points, Completions: 5 points
            const popularityScore = viewCount + (bookmarkCount * 3) + (completeCount * 5);

            return {
              resource,
              popularityScore
            };
          } catch (error) {
            return {
              resource,
              popularityScore: 0
            };
          }
        })
      );

      // Sort by popularity and return top resources
      return resourcePopularity
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, limit)
        .map(item => item.resource);

    } catch (error) {
      console.error('Error fetching popular resources:', error);
      // Fallback: return random sample of resources
      const shuffled = [...resources].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit);
    }
  }

  /**
   * Generate learning path recommendations
   */
  private async generateLearningPathRecommendations(
    userProfile: UserProfile
  ): Promise<LearningPathRecommendation[]> {
    try {
      // Check if we should use AI or fallback
      if (claudeService.isAvailable()) {
        const { resources } = await storage.listResources({
          status: 'approved',
          limit: 500
        });

        const aiPaths = await generateAILearningPaths(userProfile, resources);
        
        return aiPaths.map(path => ({
          id: path.id,
          title: path.title,
          difficulty: path.skillLevel,
          duration: path.estimatedHours ? `${path.estimatedHours}h` : '20h',
          resourceCount: path.resources?.length || 6,
          matchScore: Math.round(path.matchScore * 100),
          category: path.category,
          description: path.description,
          resources: path.resources
        }));
      }

      // Fallback to database learning journeys
      const journeys = await storage.listLearningJourneys();
      
      // Filter and score based on user profile
      const scoredJourneys = journeys.map(journey => {
        let score = 50; // Base score

        // Category match
        if (userProfile.preferredCategories.includes(journey.category)) {
          score += 30;
        }

        // Skill level match
        if (journey.difficulty === userProfile.skillLevel) {
          score += 20;
        }

        return {
          id: journey.id,
          title: journey.title,
          difficulty: journey.difficulty || 'intermediate',
          duration: journey.estimatedDuration || '20h',
          resourceCount: 6, // Default
          matchScore: Math.min(score, 100),
          category: journey.category,
          description: journey.description
        };
      });

      // Sort by match score and return top 5
      return scoredJourneys
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);

    } catch (error) {
      console.error('Error generating learning path recommendations:', error);
      return [];
    }
  }

  /**
   * Record user feedback on a recommendation
   */
  public async recordFeedback(
    userId: string,
    resourceId: number,
    feedback: 'clicked' | 'dismissed' | 'completed',
    rating?: number
  ): Promise<void> {
    try {
      // Log feedback for future improvements
      await storage.logResourceAudit(
        resourceId,
        `recommendation_${feedback}`,
        userId,
        { rating },
        `User ${feedback} recommendation`
      );

      // Store rating as user interaction so it influences future recommendations
      if (rating !== undefined && rating !== null) {
        await storage.trackUserInteraction(
          userId,
          resourceId,
          'rate',
          rating,
          { source: 'recommendation_feedback', feedback }
        );
        console.log('[FEEDBACK DEBUG] Stored rating interaction:', {
          userId,
          resourceId,
          feedback,
          rating,
          impact: rating >= 4 ? 'positive - will boost similar resources' : 'negative - will reduce similar resources'
        });
      }

      // Also track clicked/dismissed interactions for better personalization
      if (feedback === 'clicked') {
        await storage.trackUserInteraction(
          userId,
          resourceId,
          'click',
          null,
          { source: 'recommendation_feedback' }
        );
      } else if (feedback === 'dismissed') {
        await storage.trackUserInteraction(
          userId,
          resourceId,
          'dismiss',
          null,
          { source: 'recommendation_feedback' }
        );
      }

      // Clear cache to refresh recommendations
      for (const [key] of Array.from(this.recommendationCache.entries())) {
        if (key.startsWith(userId)) {
          this.recommendationCache.delete(key);
        }
      }

      console.log('[FEEDBACK DEBUG] Cache invalidated for user:', userId);
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
    }
  }

  /**
   * Record detailed feedback on a recommendation with analytics
   */
  public async recordDetailedFeedback(
    userId: string,
    resourceId: number,
    feedback_type: 'helpful' | 'not_helpful' | 'irrelevant' | 'already_known',
    context?: {
      recommendationType?: 'ai_powered' | 'rule_based' | 'hybrid';
      confidence?: number;
      reason?: string;
      position?: number;
      sessionId?: string;
    }
  ): Promise<void> {
    try {
      // Log detailed feedback with analytics context
      await storage.logResourceAudit(
        resourceId,
        `recommendation_feedback_${feedback_type}`,
        userId,
        {
          feedback_type,
          recommendation_type: context?.recommendationType,
          confidence_score: context?.confidence,
          recommendation_reason: context?.reason,
          position_in_list: context?.position,
          session_id: context?.sessionId,
          timestamp: new Date().toISOString()
        },
        `User marked recommendation as ${feedback_type}`
      );

      // Clear cache to trigger fresh recommendations based on feedback
      for (const [key] of Array.from(this.recommendationCache.entries())) {
        if (key.startsWith(userId)) {
          this.recommendationCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Error recording detailed recommendation feedback:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const recommendationEngine = RecommendationEngine.getInstance();