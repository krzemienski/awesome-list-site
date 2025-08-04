import { Resource } from "../client/src/types/awesome-list";

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
  private categoryKeywords: Record<string, string[]>;

  constructor(resources: Resource[]) {
    this.resources = resources;
    this.categoryKeywords = this.buildCategoryKeywords();
  }

  private buildCategoryKeywords(): Record<string, string[]> {
    const keywords: Record<string, string[]> = {};
    
    // Build keyword associations for each category
    this.resources.forEach(resource => {
      if (!keywords[resource.category]) {
        keywords[resource.category] = [];
      }
      
      // Extract keywords from title and description
      const text = `${resource.title} ${resource.description}`.toLowerCase();
      const words = text.match(/\b\w{3,}\b/g) || [];
      
      words.forEach(word => {
        if (!keywords[resource.category].includes(word)) {
          keywords[resource.category].push(word);
        }
      });
    });
    
    return keywords;
  }

  generateRecommendations(
    userProfile: UserProfile, 
    limit: number = 10, 
    excludeViewed: boolean = true
  ): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];
    
    this.resources.forEach(resource => {
      // Skip if user has already viewed and excludeViewed is true
      if (excludeViewed && userProfile.viewHistory.includes(resource.url)) {
        return;
      }
      
      // Skip completed resources
      if (userProfile.completedResources.includes(resource.url)) {
        return;
      }
      
      const score = this.calculateRecommendationScore(resource, userProfile);
      const reason = this.generateRecommendationReason(resource, userProfile);
      const confidenceLevel = this.calculateConfidenceLevel(resource, userProfile);
      
      if (score > 0.1) { // Only include resources with meaningful scores
        recommendations.push({
          resourceId: resource.url,
          score,
          reason,
          category: resource.category,
          confidenceLevel
        });
      }
    });
    
    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateRecommendationScore(resource: Resource, userProfile: UserProfile): number {
    let score = 0;
    
    // Category preference scoring (40% weight)
    if (userProfile.preferredCategories.includes(resource.category)) {
      score += 0.4;
    }
    
    // Learning goals alignment (30% weight)
    const goalsScore = this.calculateGoalsAlignment(resource, userProfile.learningGoals);
    score += goalsScore * 0.3;
    
    // Resource type preference (15% weight)
    const typeScore = this.calculateResourceTypeScore(resource, userProfile.preferredResourceTypes);
    score += typeScore * 0.15;
    
    // Skill level appropriateness (10% weight)
    const skillScore = this.calculateSkillLevelScore(resource, userProfile.skillLevel);
    score += skillScore * 0.1;
    
    // Historical preference boosting (5% weight)
    const historyScore = this.calculateHistoryScore(resource, userProfile);
    score += historyScore * 0.05;
    
    return Math.min(score, 1.0);
  }

  private calculateGoalsAlignment(resource: Resource, learningGoals: string[]): number {
    if (learningGoals.length === 0) return 0.5; // Neutral if no goals set
    
    let alignment = 0;
    const resourceText = `${resource.title} ${resource.description}`.toLowerCase();
    
    learningGoals.forEach(goal => {
      const goalWords = goal.toLowerCase().split(/\s+/);
      const matchingWords = goalWords.filter(word => 
        resourceText.includes(word) && word.length > 2
      );
      
      if (matchingWords.length > 0) {
        alignment += matchingWords.length / goalWords.length;
      }
    });
    
    return Math.min(alignment / learningGoals.length, 1.0);
  }

  private calculateResourceTypeScore(resource: Resource, preferredTypes: string[]): number {
    if (preferredTypes.length === 0) return 0.5; // Neutral if no preferences
    
    const resourceText = `${resource.title} ${resource.description}`.toLowerCase();
    let typeScore = 0;
    
    preferredTypes.forEach(type => {
      if (resourceText.includes(type.toLowerCase())) {
        typeScore += 1;
      }
    });
    
    return Math.min(typeScore / preferredTypes.length, 1.0);
  }

  private calculateSkillLevelScore(resource: Resource, skillLevel: string): number {
    const resourceText = `${resource.title} ${resource.description}`.toLowerCase();
    
    const skillIndicators = {
      beginner: ['basic', 'intro', 'getting started', 'tutorial', 'beginner', 'simple', 'easy'],
      intermediate: ['guide', 'how to', 'implementation', 'practical', 'examples'],
      advanced: ['advanced', 'expert', 'deep dive', 'optimization', 'performance', 'complex', 'architecture']
    };
    
    const indicators = skillIndicators[skillLevel as keyof typeof skillIndicators] || [];
    const matches = indicators.filter(indicator => resourceText.includes(indicator));
    
    if (matches.length > 0) {
      return 1.0;
    }
    
    return 0.5; // Neutral score if no skill indicators found
  }

  private calculateHistoryScore(resource: Resource, userProfile: UserProfile): number {
    // Boost resources similar to previously viewed ones
    let historyScore = 0;
    const viewedCategories = new Set<string>();
    
    this.resources.forEach(res => {
      if (userProfile.viewHistory.includes(res.url)) {
        viewedCategories.add(res.category);
      }
    });
    
    if (viewedCategories.has(resource.category)) {
      historyScore += 0.5;
    }
    
    // Boost based on ratings
    const avgRating = Object.values(userProfile.ratings).reduce((sum, rating) => sum + rating, 0) / 
                     Math.max(Object.values(userProfile.ratings).length, 1);
    
    if (avgRating > 4) {
      historyScore += 0.3;
    }
    
    return Math.min(historyScore, 1.0);
  }

  private calculateConfidenceLevel(resource: Resource, userProfile: UserProfile): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence if user has clear preferences
    if (userProfile.preferredCategories.length > 0) confidence += 0.1;
    if (userProfile.learningGoals.length > 0) confidence += 0.1;
    if (userProfile.viewHistory.length > 5) confidence += 0.1;
    if (userProfile.preferredResourceTypes.length > 0) confidence += 0.1;
    
    // Lower confidence for edge cases
    if (userProfile.preferredCategories.length === 0 && userProfile.learningGoals.length === 0) {
      confidence -= 0.2;
    }
    
    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  private generateRecommendationReason(resource: Resource, userProfile: UserProfile): string {
    const reasons: string[] = [];
    
    if (userProfile.preferredCategories.includes(resource.category)) {
      reasons.push(`matches your interest in ${resource.category}`);
    }
    
    // Check learning goals alignment
    const resourceText = `${resource.title} ${resource.description}`.toLowerCase();
    const matchingGoals = userProfile.learningGoals.filter(goal => 
      goal.toLowerCase().split(/\s+/).some(word => 
        resourceText.includes(word) && word.length > 2
      )
    );
    
    if (matchingGoals.length > 0) {
      reasons.push(`aligns with your goal: "${matchingGoals[0]}"`);
    }
    
    // Check skill level
    const skillIndicators = {
      beginner: ['basic', 'intro', 'getting started', 'tutorial'],
      intermediate: ['guide', 'how to', 'implementation'],
      advanced: ['advanced', 'expert', 'optimization']
    };
    
    const indicators = skillIndicators[userProfile.skillLevel as keyof typeof skillIndicators] || [];
    const hasSkillMatch = indicators.some(indicator => resourceText.includes(indicator));
    
    if (hasSkillMatch) {
      reasons.push(`suitable for ${userProfile.skillLevel} level`);
    }
    
    if (reasons.length === 0) {
      reasons.push(`popular in ${resource.category} category`);
    }
    
    return reasons.slice(0, 2).join(' and ');
  }

  generateLearningPaths(userProfile: UserProfile, limit: number = 5): LearningPathSuggestion[] {
    const paths: LearningPathSuggestion[] = [];
    
    // Group resources by category for path creation
    const categorizedResources = this.groupResourcesByCategory();
    
    // Generate paths for user's preferred categories
    userProfile.preferredCategories.forEach((category, index) => {
      if (index >= limit) return;
      
      const categoryResources = categorizedResources[category] || [];
      if (categoryResources.length < 3) return; // Need at least 3 resources for a path
      
      const path = this.createLearningPath(category, categoryResources, userProfile);
      if (path) {
        paths.push(path);
      }
    });
    
    // Fill remaining slots with popular categories
    const popularCategories = Object.entries(categorizedResources)
      .sort(([,a], [,b]) => b.length - a.length)
      .map(([category]) => category)
      .filter(category => !userProfile.preferredCategories.includes(category))
      .slice(0, limit - paths.length);
    
    popularCategories.forEach(category => {
      const categoryResources = categorizedResources[category] || [];
      if (categoryResources.length >= 3) {
        const path = this.createLearningPath(category, categoryResources, userProfile);
        if (path) {
          paths.push(path);
        }
      }
    });
    
    return paths.slice(0, limit);
  }

  private groupResourcesByCategory(): Record<string, Resource[]> {
    const grouped: Record<string, Resource[]> = {};
    
    this.resources.forEach(resource => {
      if (!grouped[resource.category]) {
        grouped[resource.category] = [];
      }
      grouped[resource.category].push(resource);
    });
    
    return grouped;
  }

  private createLearningPath(
    category: string, 
    resources: Resource[], 
    userProfile: UserProfile
  ): LearningPathSuggestion | null {
    if (resources.length < 3) return null;
    
    // Sort resources by skill level progression
    const sortedResources = this.sortResourcesBySkillProgression(resources, userProfile.skillLevel);
    
    // Select diverse resources for the path
    const pathResources = this.selectDiverseResources(sortedResources.slice(0, 8));
    
    const pathId = `path_${category.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    
    const learningObjectives = this.generateLearningObjectives(category, pathResources);
    const prerequisites = this.generatePrerequisites(category, userProfile.skillLevel);
    const matchReasons = this.generatePathMatchReasons(category, userProfile);
    const matchScore = this.calculatePathMatchScore(category, userProfile);
    
    return {
      id: pathId,
      title: `${category} Mastery Path`,
      description: `A comprehensive learning journey to master ${category} development with curated video resources.`,
      category,
      skillLevel: userProfile.skillLevel,
      estimatedHours: pathResources.length * 2, // Estimate 2 hours per resource
      resources: pathResources,
      prerequisites,
      learningObjectives,
      matchScore,
      matchReasons
    };
  }

  private sortResourcesBySkillProgression(resources: Resource[], userSkillLevel: string): Resource[] {
    const skillOrder = ['beginner', 'intermediate', 'advanced'];
    const userSkillIndex = skillOrder.indexOf(userSkillLevel);
    
    return resources.sort((a, b) => {
      const aText = `${a.title} ${a.description}`.toLowerCase();
      const bText = `${b.title} ${b.description}`.toLowerCase();
      
      // Determine skill level of each resource
      const aSkillLevel = this.determineResourceSkillLevel(aText);
      const bSkillLevel = this.determineResourceSkillLevel(bText);
      
      const aIndex = skillOrder.indexOf(aSkillLevel);
      const bIndex = skillOrder.indexOf(bSkillLevel);
      
      // Start from user's level and progress upward
      const aDistance = Math.abs(aIndex - userSkillIndex);
      const bDistance = Math.abs(bIndex - userSkillIndex);
      
      return aDistance - bDistance;
    });
  }

  private determineResourceSkillLevel(resourceText: string): string {
    const beginnerKeywords = ['basic', 'intro', 'getting started', 'tutorial', 'beginner', 'simple'];
    const advancedKeywords = ['advanced', 'expert', 'optimization', 'performance', 'architecture'];
    
    const beginnerCount = beginnerKeywords.filter(keyword => resourceText.includes(keyword)).length;
    const advancedCount = advancedKeywords.filter(keyword => resourceText.includes(keyword)).length;
    
    if (beginnerCount > advancedCount) return 'beginner';
    if (advancedCount > beginnerCount) return 'advanced';
    return 'intermediate';
  }

  private selectDiverseResources(resources: Resource[]): Resource[] {
    // Select resources that cover different aspects
    const selected: Resource[] = [];
    const usedKeywords = new Set<string>();
    
    resources.forEach(resource => {
      const keywords = this.extractKeywords(`${resource.title} ${resource.description}`);
      const hasNewKeywords = keywords.some(keyword => !usedKeywords.has(keyword));
      
      if (hasNewKeywords || selected.length < 3) {
        selected.push(resource);
        keywords.forEach(keyword => usedKeywords.add(keyword));
      }
    });
    
    return selected.slice(0, 6); // Limit to 6 resources per path
  }

  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .match(/\b\w{4,}\b/g) // Words with 4+ characters
      ?.filter(word => !['that', 'this', 'with', 'from', 'they', 'have', 'will', 'been', 'were'].includes(word))
      ?.slice(0, 10) || [];
  }

  private generateLearningObjectives(category: string, resources: Resource[]): string[] {
    const objectives = [
      `Master fundamental concepts in ${category}`,
      `Build practical skills through hands-on projects`,
      `Understand best practices and industry standards`
    ];
    
    // Add specific objectives based on resources
    const commonKeywords = this.findCommonKeywords(resources);
    commonKeywords.slice(0, 2).forEach(keyword => {
      objectives.push(`Learn ${keyword} implementation and optimization`);
    });
    
    return objectives;
  }

  private findCommonKeywords(resources: Resource[]): string[] {
    const keywordCounts: Record<string, number> = {};
    
    resources.forEach(resource => {
      const keywords = this.extractKeywords(`${resource.title} ${resource.description}`);
      keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });
    
    return Object.entries(keywordCounts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .map(([keyword]) => keyword);
  }

  private generatePrerequisites(category: string, skillLevel: string): string[] {
    const basePrereqs = {
      beginner: ['Basic programming knowledge', 'Understanding of web technologies'],
      intermediate: ['Solid programming foundation', 'Experience with development tools'],
      advanced: ['Expert programming skills', 'System architecture knowledge']
    };
    
    return basePrereqs[skillLevel as keyof typeof basePrereqs] || basePrereqs.beginner;
  }

  private generatePathMatchReasons(category: string, userProfile: UserProfile): string[] {
    const reasons: string[] = [];
    
    if (userProfile.preferredCategories.includes(category)) {
      reasons.push(`You've shown interest in ${category}`);
    }
    
    const matchingGoals = userProfile.learningGoals.filter(goal => 
      goal.toLowerCase().includes(category.toLowerCase())
    );
    
    if (matchingGoals.length > 0) {
      reasons.push(`Aligns with your learning goals`);
    }
    
    reasons.push(`Suitable for ${userProfile.skillLevel} level`);
    
    if (userProfile.timeCommitment === 'daily') {
      reasons.push(`Matches your daily learning commitment`);
    }
    
    return reasons;
  }

  private calculatePathMatchScore(category: string, userProfile: UserProfile): number {
    let score = 0.5; // Base score
    
    if (userProfile.preferredCategories.includes(category)) {
      score += 0.3;
    }
    
    const hasMatchingGoals = userProfile.learningGoals.some(goal => 
      goal.toLowerCase().includes(category.toLowerCase())
    );
    
    if (hasMatchingGoals) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }
}