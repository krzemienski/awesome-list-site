import Anthropic from '@anthropic-ai/sdk';
import { Resource } from '../../shared/schema';

// <important_do_not_delete>
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";
// </important_do_not_delete>

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export interface AIRecommendationResult {
  resourceId: string;
  score: number;
  reason: string;
  category: string;
  confidenceLevel: number;
  aiGenerated: boolean;
}

export interface AILearningPath {
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
  aiGenerated: boolean;
}

/**
 * Generate AI-powered personalized recommendations using Claude
 */
export async function generateAIRecommendations(
  userProfile: UserProfile,
  availableResources: Resource[],
  limit: number = 10
): Promise<AIRecommendationResult[]> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Anthropic API key not configured, falling back to rule-based recommendations');
      return generateFallbackRecommendations(userProfile, availableResources, limit);
    }

    // Create a focused dataset for AI analysis (limit to 100 most relevant resources)
    const relevantResources = availableResources
      .filter(resource => {
        // Filter out already viewed/completed resources
        return !userProfile.viewHistory.includes(resource.url) && 
               !userProfile.completedResources.includes(resource.url);
      })
      .filter(resource => {
        // If user has preferred categories, prioritize those
        if (userProfile.preferredCategories.length > 0) {
          return userProfile.preferredCategories.includes(resource.category || '');
        }
        return true;
      })
      .slice(0, 100); // Limit for API efficiency

    const prompt = `You are an AI recommendation system for video development resources. Analyze this user profile and recommend the most relevant resources.

USER PROFILE:
- Skill Level: ${userProfile.skillLevel}
- Preferred Categories: ${userProfile.preferredCategories.join(', ')}
- Learning Goals: ${userProfile.learningGoals.join(', ')}
- Time Commitment: ${userProfile.timeCommitment}
- Resources Types Preference: ${userProfile.preferredResourceTypes.join(', ')}
- Recently Rated Highly: ${Object.entries(userProfile.ratings).filter(([_, rating]) => rating >= 4).map(([url, _]) => url).slice(0, 5).join(', ')}

AVAILABLE RESOURCES (JSON format):
${JSON.stringify(relevantResources.slice(0, 50).map(r => ({
  url: r.url,
  title: r.title,
  description: r.description,
  category: r.category,
  subcategory: r.subcategory
})), null, 2)}

Please provide ${Math.min(limit, 8)} personalized recommendations. For each recommendation, provide:
1. resourceId (the URL)
2. score (0-1, how well it matches the user)
3. reason (why you recommend this specific resource)
4. confidenceLevel (0-1, how confident you are in this match)

Respond in JSON format:
{
  "recommendations": [
    {
      "resourceId": "url",
      "score": 0.85,
      "reason": "specific reason based on user profile",
      "confidenceLevel": 0.9
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      system: "You are an expert at analyzing user preferences and recommending video development resources. Focus on matching user skill level, learning goals, and preferred categories. Provide thoughtful, personalized explanations for each recommendation.",
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000
    });

    const result = JSON.parse((response.content[0] as any).text || '{}');
    
    const recommendations: AIRecommendationResult[] = result.recommendations?.map((rec: any) => {
      const resource = availableResources.find(r => r.url === rec.resourceId);
      return {
        resourceId: rec.resourceId,
        score: Math.max(0, Math.min(1, rec.score || 0.5)),
        reason: rec.reason || 'AI-generated recommendation',
        category: resource?.category || 'Unknown',
        confidenceLevel: Math.max(0, Math.min(1, rec.confidenceLevel || 0.7)),
        aiGenerated: true
      };
    }) || [];

    return recommendations;

  } catch (error: any) {
    console.warn('AI recommendation generation failed:', error.message);
    return generateFallbackRecommendations(userProfile, availableResources, limit);
  }
}

/**
 * Generate AI-powered learning paths using Claude
 */
export async function generateAILearningPaths(
  userProfile: UserProfile,
  availableResources: Resource[]
): Promise<AILearningPath[]> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Anthropic API key not configured, falling back to rule-based learning paths');
      return generateFallbackLearningPaths(userProfile, availableResources);
    }

    const prompt = `Create personalized learning paths for this user based on their profile and available resources.

USER PROFILE:
- Skill Level: ${userProfile.skillLevel}
- Learning Goals: ${userProfile.learningGoals.join(', ')}
- Preferred Categories: ${userProfile.preferredCategories.join(', ')}
- Time Commitment: ${userProfile.timeCommitment}

AVAILABLE RESOURCE CATEGORIES:
${Array.from(new Set(availableResources.map(r => r.category))).slice(0, 10).join(', ')}

Create 3 learning paths that would help this user achieve their goals. Each path should:
1. Have a clear progression from current skill level
2. Include 4-6 resources in logical order
3. Match their time commitment and interests
4. Have clear learning objectives

Respond in JSON format:
{
  "learningPaths": [
    {
      "title": "Path name",
      "description": "What this path teaches",
      "category": "main category", 
      "skillLevel": "target skill level",
      "estimatedHours": 20,
      "prerequisites": ["prerequisite knowledge"],
      "learningObjectives": ["objective 1", "objective 2"],
      "matchScore": 0.85,
      "matchReasons": ["why this matches the user"]
    }
  ]
}`;

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      system: "You are an expert learning path designer for video development technologies. Create structured, progressive learning experiences that match user skill levels and goals.",
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000
    });

    const result = JSON.parse((response.content[0] as any).text || '{}');
    
    const learningPaths: AILearningPath[] = result.learningPaths?.map((path: any, index: number) => {
      // Find relevant resources for this path
      const pathResources = availableResources
        .filter(r => r.category === path.category || 
                    userProfile.preferredCategories.includes(r.category || ''))
        .slice(0, 6);

      return {
        id: `ai_path_${path.category?.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${index}`,
        title: path.title || 'AI-Generated Learning Path',
        description: path.description || 'Personalized learning path',
        category: path.category || 'General',
        skillLevel: path.skillLevel || userProfile.skillLevel,
        estimatedHours: path.estimatedHours || 20,
        resources: pathResources,
        prerequisites: path.prerequisites || [],
        learningObjectives: path.learningObjectives || [],
        matchScore: Math.max(0, Math.min(1, path.matchScore || 0.8)),
        matchReasons: path.matchReasons || ['AI-generated match'],
        aiGenerated: true
      };
    }) || [];

    return learningPaths;

  } catch (error: any) {
    console.warn('AI learning path generation failed:', error.message);
    return generateFallbackLearningPaths(userProfile, availableResources);
  }
}

/**
 * Fallback recommendations when AI is not available
 */
function generateFallbackRecommendations(
  userProfile: UserProfile,
  availableResources: Resource[],
  limit: number
): AIRecommendationResult[] {
  const recommendations: AIRecommendationResult[] = [];
  
  availableResources.forEach(resource => {
    if (userProfile.viewHistory.includes(resource.url) || 
        userProfile.completedResources.includes(resource.url)) {
      return;
    }
    
    let score = 0;
    let reason = 'Rule-based recommendation';
    
    // Category preference (40% weight)
    if (userProfile.preferredCategories.includes(resource.category || '')) {
      score += 0.4;
      reason = `Matches your interest in ${resource.category}`;
    }
    
    // Skill level matching (30% weight)
    const resourceText = `${resource.title} ${resource.description}`.toLowerCase();
    if (userProfile.skillLevel === 'beginner' && 
        (resourceText.includes('beginner') || resourceText.includes('intro') || resourceText.includes('basic'))) {
      score += 0.3;
    } else if (userProfile.skillLevel === 'advanced' && 
               (resourceText.includes('advanced') || resourceText.includes('expert') || resourceText.includes('professional'))) {
      score += 0.3;
    } else if (userProfile.skillLevel === 'intermediate') {
      score += 0.2; // Intermediate can benefit from most resources
    }
    
    // Learning goals alignment (30% weight)
    const goalKeywords = userProfile.learningGoals.join(' ').toLowerCase();
    if (goalKeywords && resourceText.includes(goalKeywords)) {
      score += 0.3;
    }
    
    if (score > 0.2) {
      recommendations.push({
        resourceId: resource.url,
        score,
        reason,
        category: resource.category || 'Unknown',
        confidenceLevel: 0.6, // Lower confidence for rule-based
        aiGenerated: false
      });
    }
  });
  
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Fallback learning paths when AI is not available
 */
function generateFallbackLearningPaths(
  userProfile: UserProfile,
  availableResources: Resource[]
): AILearningPath[] {
  const paths: AILearningPath[] = [];
  
  // Create paths based on preferred categories
  userProfile.preferredCategories.slice(0, 3).forEach((category, index) => {
    const categoryResources = availableResources
      .filter(r => r.category === category)
      .slice(0, 6);
      
    if (categoryResources.length > 0) {
      paths.push({
        id: `fallback_path_${category.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${index}`,
        title: `${category} Learning Path`,
        description: `Comprehensive learning path for ${category}`,
        category,
        skillLevel: userProfile.skillLevel,
        estimatedHours: 25,
        resources: categoryResources,
        prerequisites: [],
        learningObjectives: [`Master ${category} concepts`, `Apply ${category} in practice`],
        matchScore: 0.7,
        matchReasons: [`Matches your interest in ${category}`],
        aiGenerated: false
      });
    }
  });
  
  return paths;
}