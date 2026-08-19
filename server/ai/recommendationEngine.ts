import { storage } from '../storage';
import { Resource, type UserRecommendationFeedback } from '@shared/schema';
import type {
  RecommendationExplanation,
  RecommendationFeedbackValue,
} from '@shared/recommendations';
import {
  generateAIRecommendations as generateClaudeRecommendations,
  generateAILearningPaths,
  calculateSkillMatch,
  calculateGoalsMatch,
  calculateTypeMatch,
  calculateTimeCommitmentMatch,
  buildRecommendationExplanation,
  skillPhrase,
} from './recommendations';
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
  explanation: RecommendationExplanation;
  feedback: RecommendationFeedbackValue | null;
  personalized: boolean;
}

export interface RecommendationFeedbackInfluence {
  byCategory: Map<string, {
    helpful: number;
    notForMe: number;
    alreadyKnown: number;
  }>;
}

export function buildRecommendationFeedbackInfluence(
  resources: Resource[],
  feedbackRows: Array<Pick<UserRecommendationFeedback, 'resourceId' | 'feedback'>>,
): RecommendationFeedbackInfluence {
  const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
  const byCategory = new Map<string, {
    helpful: number;
    notForMe: number;
    alreadyKnown: number;
  }>();
  for (const row of feedbackRows) {
    const category = resourcesById.get(row.resourceId)?.category;
    if (!category) continue;
    const counts = byCategory.get(category) ?? {
      helpful: 0,
      notForMe: 0,
      alreadyKnown: 0,
    };
    if (row.feedback === 'helpful') counts.helpful += 1;
    if (row.feedback === 'not_for_me') counts.notForMe += 1;
    if (row.feedback === 'already_known') counts.alreadyKnown += 1;
    byCategory.set(category, counts);
  }
  return { byCategory };
}

/**
 * Bounded category-level influence. Off-topic feedback is deliberately
 * stronger than a helpful boost; "already known" only applies a small novelty
 * penalty because it does not imply dislike of the topic.
 */
export function calculateRecommendationFeedbackAdjustment(
  resource: Resource,
  influence: RecommendationFeedbackInfluence,
): number {
  const counts = resource.category
    ? influence.byCategory.get(resource.category)
    : undefined;
  if (!counts) return 0;
  return Math.max(
    -0.36,
    Math.min(
      0.16,
      Math.min(counts.helpful * 0.08, 0.16)
        - Math.min(counts.notForMe * 0.18, 0.36)
        - Math.min(counts.alreadyKnown * 0.05, 0.1),
    ),
  );
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

export function calculateColdStartBlend(
  resource: Resource,
  profile: Pick<
    UserProfile,
    'skillLevel' | 'learningGoals' | 'preferredResourceTypes' | 'timeCommitment'
  >,
  popularity: number,
) {
  const skillScore = calculateSkillMatch(resource, profile.skillLevel);
  const goalsScore = calculateGoalsMatch(resource, profile.learningGoals);
  const typeScore = calculateTypeMatch(resource, profile.preferredResourceTypes);
  const timeScore = calculateTimeCommitmentMatch(resource, profile.timeCommitment);
  const score =
    0.32 * popularity +
    0.2 * skillScore +
    0.17 * goalsScore +
    0.16 * typeScore +
    0.15 * timeScore;
  return { skillScore, goalsScore, typeScore, timeScore, score };
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
    forceRefresh: boolean = false,
    includeLearningPaths: boolean = true
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
    let recommendationFeedback: UserRecommendationFeedback[] = [];

    // Get user preferences and interactions from database and enrich the profile
    try {
      const [dbPreferences, viewHistory, interactions, journeyProgressList, feedbackRows] = await Promise.all([
        storage.getUserPreferences(userProfile.userId),
        typeof (storage as any).getUserViewHistory === 'function' ? (storage as any).getUserViewHistory(userProfile.userId) : Promise.resolve([]),
        typeof (storage as any).getUserInteractions === 'function' ? (storage as any).getUserInteractions(userProfile.userId) : Promise.resolve([]),
        storage.listUserJourneyProgress(userProfile.userId),
        userProfile.userId === 'anonymous'
          ? Promise.resolve([])
          : storage.getRecommendationFeedback(userProfile.userId),
      ]);
      recommendationFeedback = feedbackRows;

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
        enrichedProfile.viewHistory = viewHistory.map((r: any) => r.url);
      }

      // Extract completed resources and ratings from interactions
      const completedInteractions = interactions.filter((i: any) => i.interactionType === 'complete');
      if (completedInteractions.length > 0) {
        const completedUrls = await Promise.all(
          completedInteractions.map(async (i: any) => {
            const resource = await storage.getResource(i.resourceId);
            return resource?.url;
          })
        );
        enrichedProfile.completedResources = completedUrls.filter(Boolean) as string[];
      }

      // Extract ratings from interactions
      const ratingInteractions = interactions.filter((i: any) => i.interactionType === 'rate' && i.interactionValue !== null);
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

    // BUG-013 (run13): the cache key must include the profile inputs that
    // shape the result. Previously `${userId}_${limit}` meant every anonymous
    // profile (userId "anonymous") shared ONE cache entry, so changing
    // categories/skill/goals returned identical recommendations for 30 min.
    const profileFingerprint = [
      [...(enrichedProfile.preferredCategories || [])].sort().join(','),
      enrichedProfile.skillLevel || '',
      [...(enrichedProfile.learningGoals || [])].sort().join(','),
      [...(enrichedProfile.preferredResourceTypes || [])].sort().join(','),
      enrichedProfile.timeCommitment || '',
      [...recommendationFeedback]
        .sort((a, b) => a.resourceId - b.resourceId)
        .map((row) => `${row.resourceId}:${row.feedback}`)
        .join(','),
    ].join('|');
    const cacheKey = `${enrichedProfile.userId}::${limit}::${profileFingerprint}`;
    
    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = this.recommendationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        // Also get learning paths using enriched profile
        const learningPaths = includeLearningPaths ? await this.generateLearningPathRecommendations(enrichedProfile) : [];
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
          resources = awesomeListData.resources.map((r: Resource, index: number) => ({
            id: index + 1,
            title: r.title || 'Untitled',
            url: r.url,
            description: r.description || '',
            category: r.category,
            subcategory: r.subcategory,
            subSubcategory: r.subSubcategory,
            status: 'approved',
            createdAt: new Date(),
            metadata: null,
            updatedAt: new Date(),
            submittedBy: null,
            approvedBy: null,
            approvedAt: null,
            resourceFormat: r.resourceFormat || 'unknown',
            githubSynced: false,
            lastSyncedAt: null,
          } as Resource));
        }
      }

      // Fetch user's favorites, bookmarks, and completed journey resources for better personalization
      const [favorites, bookmarks, completedJourneyResources] = await Promise.all([
        this.getUserFavorites(enrichedProfile.userId),
        this.getUserBookmarks(enrichedProfile.userId),
        typeof (storage as any).getCompletedJourneyResources === 'function' ? (storage as any).getCompletedJourneyResources(enrichedProfile.userId) : Promise.resolve([])
      ]);

      // Update enriched profile with actual data
      enrichedProfile.bookmarks = bookmarks.map(r => r.url);

      // Add completed journey resources to completedResources list
      const completedJourneyUrls = completedJourneyResources.map((r: any) => r.url);
      enrichedProfile.completedResources = [
        ...enrichedProfile.completedResources,
        ...completedJourneyUrls.filter((url: string) => !enrichedProfile.completedResources.includes(url))
      ];

      const feedbackByResourceId = new Map(
        recommendationFeedback.map((row) => [row.resourceId, row.feedback]),
      );
      const feedbackInfluence = buildRecommendationFeedbackInfluence(
        resources,
        recommendationFeedback,
      );
      const excludedByFeedback = new Set(
        recommendationFeedback
          .filter((row) =>
            row.feedback === 'hidden'
            || row.feedback === 'already_known'
            || row.feedback === 'not_for_me',
          )
          .map((row) => row.resourceId),
      );

      // Filter out already viewed/completed resources (including journey resources)
      const eligibleResources = resources.filter(resource =>
        !enrichedProfile.viewHistory.includes(resource.url) &&
        !enrichedProfile.completedResources.includes(resource.url) &&
        !excludedByFeedback.has(resource.id)
      );

      let recommendations: RecommendationResult[] = [];

      // Cold-start detection: Check if user has minimal interaction history
      const isColdStart = enrichedProfile.viewHistory.length === 0 &&
                          enrichedProfile.completedResources.length === 0 &&
                          Object.keys(enrichedProfile.ratings).length === 0 &&
                          bookmarks.length === 0;

      // Debug: Log cold-start detection (audit cycle-01 F007: dev-only —
      // production must not spam per-request behavioral debug lines).
      const debugRecommendations = process.env.NODE_ENV !== 'production';
      if (debugRecommendations) console.log('[COLD-START DEBUG]', {
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

        if (debugRecommendations) console.log('[PERSONALIZATION DEBUG]', {
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
        if (debugRecommendations) console.log('[COLD-START] Generating popular resources for new user:', enrichedProfile.userId);
        // Run16 BUG-004: the cold-start path previously ignored the user's
        // explicitly selected preferred categories entirely (they only fed the
        // rule-based scorer, which cold-start never reaches) and hard-coded
        // "for getting started" regardless of skill level. Now the popular
        // pool is filtered to the preferred categories first, off-preference
        // rows are only appended when the preferred pool can't fill the list,
        // and those padded rows say so honestly.
        const preferred = (enrichedProfile.preferredCategories || []).filter(Boolean);
        const preferredPool = preferred.length > 0
          ? eligibleResources.filter(r => r.category && preferred.includes(r.category))
          : eligibleResources;
        // NB-007 (run18): the old path took the top-`limit` popular resources
        // and stamped a FIXED positional confidence ladder (85 − 3·rank →
        // rendered as 0.85→0.60) that ignored Skill/Goals/Types entirely, so
        // changing those inputs never changed the results. Now a 3×-wide
        // popularity pool is re-ranked by a deterministic blend of popularity
        // + skill + goals + resource-type + schedule fit, so every advertised input
        // shifts both membership and scores (deterministic per config — the
        // cache key already fingerprints these inputs).
        const blend = (resource: Resource, index: number, poolSize: number) => {
          const popularity = poolSize > 1 ? 1 - index / (poolSize - 1) : 1;
          const components = calculateColdStartBlend(resource, enrichedProfile, popularity);
          const feedbackAdjustment = calculateRecommendationFeedbackAdjustment(
            resource,
            feedbackInfluence,
          );
          return {
            ...components,
            score: Math.max(0, Math.min(1, components.score + feedbackAdjustment)),
            feedbackAdjustment,
          };
        };
        const popularCandidates = await this.getPopularResources(preferredPool, Math.max(limit * 10, 100));
        const rankedPreferred = popularCandidates
          .map((resource, index) => ({ resource, comps: blend(resource, index, popularCandidates.length) }))
          .sort((a, b) => b.comps.score - a.comps.score)
          .slice(0, limit);
        const chosenUrls = new Set(rankedPreferred.map(r => r.resource.url));
        // Run16 BUG-004: off-preference rows are only appended when the
        // preferred pool can't fill the list, and those padded rows say so.
        const padCandidates = preferred.length > 0 && rankedPreferred.length < limit
          ? await this.getPopularResources(
              eligibleResources.filter(r => !chosenUrls.has(r.url)),
              (limit - rankedPreferred.length) * 3
            )
          : [];
        const rankedPad = padCandidates
          .map((resource, index) => ({ resource, comps: blend(resource, index, padCandidates.length) }))
          .sort((a, b) => b.comps.score - a.comps.score)
          .slice(0, limit - rankedPreferred.length);
        // NB-042: reasons come from the ONE shared deterministic builder, so
        // the same resource + profile reads identically on every page.
        recommendations = rankedPreferred.map(({ resource, comps }) => {
          const explanation = buildRecommendationExplanation(resource, enrichedProfile, {
            ...comps,
            popular: true,
            positiveFeedback: comps.feedbackAdjustment > 0 ? resource.category : undefined,
          });
          return {
            resource,
            confidence: Math.min(95, Math.max(55, Math.round(40 + comps.score * 55))),
            reason: explanation.summary,
            explanation,
            type: 'rule_based' as const,
            score: comps.score,
            feedback: feedbackByResourceId.get(resource.id) ?? null,
            personalized: enrichedProfile.userId !== 'anonymous',
          };
        });
        recommendations.push(...rankedPad.map(({ resource, comps }) => {
          const baseExplanation = buildRecommendationExplanation(resource, enrichedProfile, {
            ...comps,
            popular: true,
            positiveFeedback: comps.feedbackAdjustment > 0 ? resource.category : undefined,
          });
          const explanation = {
            ...baseExplanation,
            summary: `${baseExplanation.summary} — added because your selected categories had few unseen resources`,
          };
          return {
            resource,
            confidence: Math.min(90, Math.max(50, Math.round(35 + comps.score * 55))),
            reason: explanation.summary,
            explanation,
            type: 'rule_based' as const,
            score: comps.score,
            feedback: feedbackByResourceId.get(resource.id) ?? null,
            personalized: enrichedProfile.userId !== 'anonymous',
          };
        }));

        // Cache and return early for cold-start users
        this.recommendationCache.set(cacheKey, {
          recommendations,
          timestamp: Date.now()
        });

        const learningPaths = includeLearningPaths ? await this.generateLearningPathRecommendations(enrichedProfile) : [];

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

            const feedbackAdjustment = calculateRecommendationFeedbackAdjustment(
              resource,
              feedbackInfluence,
            );
            const skillScore = calculateSkillMatch(resource, enrichedProfile.skillLevel);
            const goalsScore = calculateGoalsMatch(resource, enrichedProfile.learningGoals);
            const typeScore = calculateTypeMatch(resource, enrichedProfile.preferredResourceTypes);
            const timeScore = calculateTimeCommitmentMatch(resource, enrichedProfile.timeCommitment);
            const explanation = buildRecommendationExplanation(resource, enrichedProfile, {
              skillScore,
              goalsScore,
              typeScore,
              timeScore,
              positiveFeedback: feedbackAdjustment > 0 ? resource.category : undefined,
            });
            return {
              resource,
              confidence: Math.max(
                0,
                Math.min(100, Math.round(rec.confidenceLevel * 100 + feedbackAdjustment * 100)),
              ),
              reason: explanation.summary,
              explanation,
              type: 'ai_powered' as const,
              score: Math.max(0, Math.min(1, rec.score + feedbackAdjustment)),
              aiGenerated: true, // Preserve AI flag
              feedback: feedbackByResourceId.get(resource.id) ?? null,
              personalized: true,
            };
          })
            .filter(Boolean)
            .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0)) as RecommendationResult[];
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
          remainingSlots,
          feedbackInfluence,
          feedbackByResourceId,
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

      // Generate learning path recommendations (skipped when the caller does
      // not consume them — avoids a blocking ~9s Claude call on the hot path)
      const learningPaths = includeLearningPaths ? await this.generateLearningPathRecommendations(enrichedProfile) : [];

      return {
        recommendations,
        learningPaths
      };

    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Keep operational failures distinct from a valid "no eligible matches"
      // result. The API layer turns this into a non-2xx response, allowing the
      // client to preserve its last useful recommendations and offer a retry.
      throw error;
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
    limit: number,
    feedbackInfluence: RecommendationFeedbackInfluence = { byCategory: new Map() },
    feedbackByResourceId: Map<number, RecommendationFeedbackValue> = new Map(),
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
        // NB-042 (run18): same skill vocabulary as buildRecommendationReason —
        // the phrase always names the user's OWN configured level.
        reasons.push(`a good fit ${skillPhrase(userProfile.skillLevel)}`);
      }

      // Learning goals alignment (15% weight)
      const goalsScore = this.calculateGoalsAlignment(resource, userProfile.learningGoals);
      score += goalsScore * 15;

      // Canonical resource-format match (15% weight). The helper compares the
      // stored resources.resource_format value and only falls back to keywords
      // for legacy rows explicitly marked unknown.
      const typeScore = calculateTypeMatch(resource, userProfile.preferredResourceTypes);
      score += typeScore * 15;

      // Time-commitment fit (12% weight). Duration is not cataloged, so the
      // shared helper uses curated format as the honest proxy: article/video/
      // tool/community for shorter daily blocks; course/book/specification/
      // library-style resources for a focused weekly session.
      const timeScore = calculateTimeCommitmentMatch(resource, userProfile.timeCommitment);
      score += timeScore * 12;

      const feedbackAdjustment = calculateRecommendationFeedbackAdjustment(
        resource,
        feedbackInfluence,
      );
      score += feedbackAdjustment * 100;

      // Recency bonus (5% weight)
      if (resource.createdAt) {
        const daysSinceCreation = (Date.now() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) {
          score += 5;
          reasons.push(`recently added`);
        }
      }

      if (score > 20) { // Minimum threshold
        // Preference evidence is always first and uses controlled human labels.
        // Keep at most one behavioral context after it so history can explain
        // the boost without hiding the goal/format that shaped this result.
        const journeyContext = resource.category && journeyCategoryFrequency.has(resource.category)
          ? resource.category
          : undefined;
        const explanation = buildRecommendationExplanation(resource, userProfile, {
          skillScore,
          goalsScore,
          typeScore,
          timeScore,
          journeyContext,
          positiveFeedback: feedbackAdjustment > 0 ? resource.category : undefined,
        });
        recommendations.push({
          resource,
          confidence: Math.min(Math.round(score), 100),
          reason: explanation.summary,
          explanation,
          type: 'rule_based',
          score: Math.max(0, Math.min(1, score / 100)),
          feedback: feedbackByResourceId.get(resource.id) ?? null,
          personalized: userProfile.userId !== 'anonymous',
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
    // NB-042 (run18): delegates to the shared helper so every scoring path
    // agrees on what "matches the user's level" means.
    return calculateSkillMatch(resource, skillLevel);
  }

  /**
   * Calculate alignment with learning goals
   */
  private calculateGoalsAlignment(resource: Resource, learningGoals: string[]): number {
    // NB-042 (run18): delegates to the shared helper (see above).
    return calculateGoalsMatch(resource, learningGoals);
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
      // Fetch interaction-based popularity for ALL resources in a single
      // aggregate query. (Previously this fired one query per resource via
      // Promise.all — ~2k concurrent queries that exhausted the DB pool and
      // made cold-start recommendations hang.)
      const scores = await storage.getResourcePopularityScores();
      const scoreMap = new Map(scores.map(s => [s.resourceId, s.score]));

      // Sort by popularity (0 for resources with no interactions, preserving
      // input order among ties) and return the top `limit`.
      return resources
        .map(resource => ({ resource, popularityScore: scoreMap.get(resource.id) ?? 0 }))
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
    const state: RecommendationFeedbackValue =
      feedback === 'clicked'
        ? 'helpful'
        : feedback === 'completed'
          ? 'already_known'
          : 'not_for_me';
    await this.setFeedbackState(userId, resourceId, state, { legacyRating: rating });
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
    const state: RecommendationFeedbackValue =
      feedback_type === 'helpful'
        ? 'helpful'
        : feedback_type === 'already_known'
          ? 'already_known'
          : 'not_for_me';
    await this.setFeedbackState(userId, resourceId, state, context);
  }

  public async setFeedbackState(
    userId: string,
    resourceId: number,
    feedback: RecommendationFeedbackValue | null,
    context?: Record<string, unknown>,
  ): Promise<void> {
    await storage.setRecommendationFeedback(userId, resourceId, feedback);
    await storage.logResourceAudit(
      resourceId,
      feedback
        ? `recommendation_feedback_${feedback}`
        : 'recommendation_feedback_restored',
      userId,
      { feedback, ...context },
      feedback
        ? `User marked recommendation as ${feedback}`
        : 'User restored recommendation feedback',
    );
    this.clearUserCache(userId);
  }

  private clearUserCache(userId: string): void {
    const prefix = `${userId}::`;
    for (const key of this.recommendationCache.keys()) {
      if (key.startsWith(prefix)) this.recommendationCache.delete(key);
    }
  }
}

// Export singleton instance
export const recommendationEngine = RecommendationEngine.getInstance();