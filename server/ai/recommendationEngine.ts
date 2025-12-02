import { storage } from '../storage';
import { Resource } from '@shared/schema';
import { generateAIRecommendations as generateClaudeRecommendations, generateAILearningPaths } from './recommendations';
import { claudeService } from './claudeService';
import { createSystemAuditContext } from '../middleware/requestContext';

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
}

export interface RecommendationResult {
  resource: Resource;
  confidence: number; // 0-100
  reason: string;
  type: 'ai_powered' | 'rule_based' | 'hybrid';
  score?: number; // Internal score for ranking
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
  private readonly DEFAULT_LEARNING_PATH_RESOURCE_COUNT = 6;

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
    const enrichedProfile: UserProfile = { ...userProfile };

    // Get user preferences from database and enrich the profile
    try {
      const dbPreferences = await storage.getUserPreferences(userProfile.userId);
      if (dbPreferences) {
        // Merge DB preferences with provided profile (provided profile takes precedence)
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

      // Database is the single source of truth - no fallback needed

      // Fetch user's favorites and bookmarks for better personalization
      const [favorites, bookmarks] = await Promise.all([
        this.getUserFavorites(enrichedProfile.userId),
        this.getUserBookmarks(enrichedProfile.userId)
      ]);

      // Update enriched profile with actual data
      enrichedProfile.bookmarks = bookmarks.map(r => r.url);
      
      // Filter out already viewed/completed resources
      const eligibleResources = resources.filter(resource => 
        !enrichedProfile.viewHistory.includes(resource.url) &&
        !enrichedProfile.completedResources.includes(resource.url)
      );

      let recommendations: RecommendationResult[] = [];

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
              score: rec.score
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
    limit: number
  ): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];

    // Create category frequency map from favorites and bookmarks
    const categoryFrequency = new Map<string, number>();
    [...favorites, ...bookmarks].forEach(resource => {
      const category = resource.category;
      if (category) {
        categoryFrequency.set(category, (categoryFrequency.get(category) || 0) + 1);
      }
    });

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
          resourceCount: path.resources?.length || this.DEFAULT_LEARNING_PATH_RESOURCE_COUNT,
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
          resourceCount: this.DEFAULT_LEARNING_PATH_RESOURCE_COUNT,
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
    resourceId: string,
    feedback: 'clicked' | 'dismissed' | 'completed',
    rating?: number
  ): Promise<void> {
    try {
      // Log feedback for future improvements with system audit context
      await storage.logResourceAudit(
        resourceId, // UUID string // Already a string UUID
        `recommendation_${feedback}`,
        userId,
        { rating },
        `User ${feedback} recommendation`,
        createSystemAuditContext('recommendation-feedback')
      );

      // Clear cache to refresh recommendations
      for (const [key] of Array.from(this.recommendationCache.entries())) {
        if (key.startsWith(userId)) {
          this.recommendationCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
    }
  }
}

// Export singleton instance
export const recommendationEngine = RecommendationEngine.getInstance();