/**
 * Personalized Resource Recommendation Engine
 * 
 * This module provides intelligent resource recommendations and learning path suggestions
 * based on user preferences, behavior patterns, and resource characteristics.
 */

import { Resource } from "@shared/schema";

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
  resourceId: string;
  score: number;
  reason: string;
  category: string;
  confidenceLevel: number;
}

export interface LearningPathSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  skillLevel: string;
  estimatedHours: number;
  resources: Resource[];
  prerequisites: string[];
  learningObjectives: string[];
  matchScore: number;
  matchReasons: string[];
}

export class RecommendationEngine {
  private resources: Resource[];
  private categoryWeights: Record<string, number> = {};
  private skillLevelMapping: Record<string, string[]> = {
    beginner: ['intro-learning', 'learning-resources', 'introduction', 'general-tools'],
    intermediate: ['encoding-tools', 'media-tools', 'ffmpeg', 'infrastructure-delivery'],
    advanced: ['drm', 'encoding-codecs', 'infrastructure-delivery', 'community-events']
  };

  constructor(resources: Resource[]) {
    this.resources = resources;
    this.calculateCategoryWeights();
  }

  /**
   * Calculate category weights based on resource distribution
   */
  private calculateCategoryWeights(): void {
    const categoryCount: Record<string, number> = {};
    this.resources.forEach(resource => {
      categoryCount[resource.category] = (categoryCount[resource.category] || 0) + 1;
    });

    const totalResources = this.resources.length;
    Object.keys(categoryCount).forEach(category => {
      // Weight inversely proportional to frequency (rare categories get higher weight)
      this.categoryWeights[category] = 1 / (categoryCount[category] / totalResources);
    });
  }

  /**
   * Generate personalized resource recommendations
   */
  generateRecommendations(
    userProfile: UserProfile, 
    limit: number = 10,
    excludeViewed: boolean = true
  ): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];

    for (const resource of this.resources) {
      // Skip already viewed/completed resources if requested
      if (excludeViewed && (
        userProfile.viewHistory.includes(resource.id.toString()) ||
        userProfile.completedResources.includes(resource.id.toString())
      )) {
        continue;
      }

      const score = this.calculateResourceScore(resource, userProfile);
      const reason = this.generateRecommendationReason(resource, userProfile);
      const confidenceLevel = this.calculateConfidenceLevel(resource, userProfile);

      recommendations.push({
        resourceId: resource.id.toString(),
        score,
        reason,
        category: resource.category,
        confidenceLevel
      });
    }

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate recommendation score for a resource
   */
  private calculateResourceScore(resource: Resource, userProfile: UserProfile): number {
    let score = 0;

    // Category preference score (40% weight)
    if (userProfile.preferredCategories.includes(resource.category)) {
      score += 0.4 * (this.categoryWeights[resource.category] || 1);
    }

    // Skill level matching (25% weight)
    const skillCategories = this.skillLevelMapping[userProfile.skillLevel] || [];
    if (skillCategories.includes(resource.category)) {
      score += 0.25;
    }

    // Learning goals alignment (20% weight)
    const goalKeywords = userProfile.learningGoals.join(' ').toLowerCase();
    const resourceText = `${resource.title} ${resource.description}`.toLowerCase();
    const goalAlignment = this.calculateTextSimilarity(goalKeywords, resourceText);
    score += 0.2 * goalAlignment;

    // User rating history (10% weight)
    const avgRating = this.calculateAverageRating(userProfile.ratings);
    if (avgRating > 0) {
      // Boost score for resources similar to highly rated ones
      score += 0.1 * (avgRating / 5);
    }

    // Bookmark similarity (5% weight)
    const bookmarkSimilarity = this.calculateBookmarkSimilarity(resource, userProfile);
    score += 0.05 * bookmarkSimilarity;

    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    const intersection = words1.filter(word => words2.includes(word));
    return intersection.length / Math.max(words1.length, words2.length);
  }

  /**
   * Calculate average rating from user's rating history
   */
  private calculateAverageRating(ratings: Record<string, number>): number {
    const values = Object.values(ratings);
    if (values.length === 0) return 0;
    return values.reduce((sum, rating) => sum + rating, 0) / values.length;
  }

  /**
   * Calculate similarity to bookmarked resources
   */
  private calculateBookmarkSimilarity(resource: Resource, userProfile: UserProfile): number {
    if (userProfile.bookmarks.length === 0) return 0;

    const bookmarkedResources = this.resources.filter(r => 
      userProfile.bookmarks.includes(r.id.toString())
    );

    let maxSimilarity = 0;
    for (const bookmarked of bookmarkedResources) {
      // Category match
      if (bookmarked.category === resource.category) {
        maxSimilarity = Math.max(maxSimilarity, 0.8);
      }
      
      // Text similarity
      const textSim = this.calculateTextSimilarity(
        `${bookmarked.title} ${bookmarked.description}`,
        `${resource.title} ${resource.description}`
      );
      maxSimilarity = Math.max(maxSimilarity, textSim);
    }

    return maxSimilarity;
  }

  /**
   * Generate human-readable recommendation reason
   */
  private generateRecommendationReason(resource: Resource, userProfile: UserProfile): string {
    const reasons: string[] = [];

    if (userProfile.preferredCategories.includes(resource.category)) {
      reasons.push(`matches your interest in ${resource.category}`);
    }

    const skillCategories = this.skillLevelMapping[userProfile.skillLevel] || [];
    if (skillCategories.includes(resource.category)) {
      reasons.push(`suitable for ${userProfile.skillLevel} level`);
    }

    if (userProfile.learningGoals.length > 0) {
      const goalKeywords = userProfile.learningGoals.join(' ').toLowerCase();
      const resourceText = `${resource.title} ${resource.description}`.toLowerCase();
      if (this.calculateTextSimilarity(goalKeywords, resourceText) > 0.2) {
        reasons.push('aligns with your learning goals');
      }
    }

    if (userProfile.bookmarks.length > 0) {
      const bookmarkSimilarity = this.calculateBookmarkSimilarity(resource, userProfile);
      if (bookmarkSimilarity > 0.3) {
        reasons.push('similar to your bookmarked resources');
      }
    }

    return reasons.length > 0 ? reasons.join(', ') : 'recommended for you';
  }

  /**
   * Calculate confidence level for recommendation
   */
  private calculateConfidenceLevel(resource: Resource, userProfile: UserProfile): number {
    let confidence = 0;

    // More interactions = higher confidence
    const totalInteractions = userProfile.viewHistory.length + 
                             userProfile.bookmarks.length + 
                             userProfile.completedResources.length;
    confidence += Math.min(totalInteractions / 50, 0.4); // Max 0.4 from interactions

    // Preference specificity
    if (userProfile.preferredCategories.length > 0) {
      confidence += 0.3;
    }

    // Learning goals specificity
    if (userProfile.learningGoals.length > 0) {
      confidence += 0.2;
    }

    // Rating history
    if (Object.keys(userProfile.ratings).length > 5) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * Generate learning path suggestions
   */
  generateLearningPaths(userProfile: UserProfile, limit: number = 5): LearningPathSuggestion[] {
    const pathSuggestions: LearningPathSuggestion[] = [];

    // Define common learning paths based on categories and skill levels
    const pathTemplates = this.getLearningPathTemplates();

    for (const template of pathTemplates) {
      const matchScore = this.calculatePathMatchScore(template, userProfile);
      if (matchScore > 0.3) { // Only include relevant paths
        const pathResources = this.selectPathResources(template, userProfile);
        const matchReasons = this.generatePathMatchReasons(template, userProfile);

        pathSuggestions.push({
          id: `path_${template.category}_${template.skillLevel}`,
          title: template.title,
          description: template.description,
          category: template.category,
          skillLevel: template.skillLevel,
          estimatedHours: template.estimatedHours,
          resources: pathResources,
          prerequisites: template.prerequisites,
          learningObjectives: template.learningObjectives,
          matchScore,
          matchReasons
        });
      }
    }

    return pathSuggestions
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Get predefined learning path templates
   */
  private getLearningPathTemplates() {
    return [
      {
        title: "Video Encoding Fundamentals",
        description: "Master the basics of video encoding and compression",
        category: "encoding-codecs",
        skillLevel: "beginner",
        estimatedHours: 20,
        prerequisites: [],
        learningObjectives: [
          "Understand video compression principles",
          "Learn about different codecs",
          "Practice with encoding tools"
        ],
        resourceCategories: ["encoding-codecs", "encoding-tools", "intro-learning"]
      },
      {
        title: "FFmpeg Mastery Path",
        description: "Become proficient with FFmpeg for video processing",
        category: "ffmpeg",
        skillLevel: "intermediate",
        estimatedHours: 30,
        prerequisites: ["basic video concepts"],
        learningObjectives: [
          "Master FFmpeg command line",
          "Understand advanced filtering",
          "Optimize encoding workflows"
        ],
        resourceCategories: ["ffmpeg", "encoding-tools", "general-tools"]
      },
      {
        title: "Streaming Infrastructure",
        description: "Build and manage video streaming infrastructure",
        category: "infrastructure-delivery",
        skillLevel: "advanced",
        estimatedHours: 40,
        prerequisites: ["networking basics", "video encoding"],
        learningObjectives: [
          "Design streaming architecture",
          "Implement CDN solutions",
          "Monitor streaming performance"
        ],
        resourceCategories: ["infrastructure-delivery", "adaptive-streaming", "cloud-platforms"]
      },
      {
        title: "Mobile Video Development",
        description: "Develop video applications for mobile platforms",
        category: "mobile-web-players",
        skillLevel: "intermediate",
        estimatedHours: 25,
        prerequisites: ["mobile development basics"],
        learningObjectives: [
          "Implement mobile video players",
          "Optimize for mobile networks",
          "Handle device-specific features"
        ],
        resourceCategories: ["mobile-web-players", "android", "ios-tvos"]
      }
    ];
  }

  /**
   * Calculate how well a learning path matches user profile
   */
  private calculatePathMatchScore(template: any, userProfile: UserProfile): number {
    let score = 0;

    // Skill level match (40% weight)
    if (template.skillLevel === userProfile.skillLevel) {
      score += 0.4;
    } else if (
      (template.skillLevel === 'intermediate' && userProfile.skillLevel === 'beginner') ||
      (template.skillLevel === 'advanced' && userProfile.skillLevel === 'intermediate')
    ) {
      score += 0.2; // Next level paths get partial credit
    }

    // Category interest (35% weight)
    const categoryMatch = template.resourceCategories.some((cat: string) =>
      userProfile.preferredCategories.includes(cat)
    );
    if (categoryMatch) {
      score += 0.35;
    }

    // Learning goals alignment (25% weight)
    if (userProfile.learningGoals.length > 0) {
      const goalText = userProfile.learningGoals.join(' ').toLowerCase();
      const pathText = `${template.title} ${template.description} ${template.learningObjectives.join(' ')}`.toLowerCase();
      const alignment = this.calculateTextSimilarity(goalText, pathText);
      score += 0.25 * alignment;
    }

    return score;
  }

  /**
   * Select resources for a learning path
   */
  private selectPathResources(template: any, userProfile: UserProfile): Resource[] {
    const pathResources: Resource[] = [];
    
    for (const category of template.resourceCategories) {
      const categoryResources = this.resources
        .filter(r => r.category === category)
        .slice(0, 3); // Limit per category
      
      pathResources.push(...categoryResources);
    }

    // Prioritize resources user hasn't seen
    const unseenResources = pathResources.filter(r => 
      !userProfile.viewHistory.includes(r.id.toString()) &&
      !userProfile.completedResources.includes(r.id.toString())
    );

    return unseenResources.slice(0, 8); // Limit total path resources
  }

  /**
   * Generate reasons why a path matches the user
   */
  private generatePathMatchReasons(template: any, userProfile: UserProfile): string[] {
    const reasons: string[] = [];

    if (template.skillLevel === userProfile.skillLevel) {
      reasons.push(`Perfect for your ${userProfile.skillLevel} skill level`);
    }

    const categoryMatch = template.resourceCategories.some((cat: string) =>
      userProfile.preferredCategories.includes(cat)
    );
    if (categoryMatch) {
      reasons.push('Matches your preferred categories');
    }

    if (userProfile.learningGoals.length > 0) {
      reasons.push('Aligns with your learning goals');
    }

    if (userProfile.timeCommitment === 'daily' && template.estimatedHours <= 30) {
      reasons.push('Suitable for daily learning commitment');
    }

    return reasons;
  }
}