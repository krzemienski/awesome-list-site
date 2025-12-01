import Anthropic from '@anthropic-ai/sdk';
import { Resource } from '../../shared/schema';

// <important_do_not_delete>
const DEFAULT_MODEL_STR = "claude-haiku-4-5"; // Claude Haiku 4.5 (October 2025) - 4-5x faster, 1/3 cost
// </important_do_not_delete>

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

/**
 * Extract JSON from Claude's response, handling markdown code fences and extra text
 */
function extractJSON(text: string): any {
  try {
    text = text.trim();
    
    // Remove markdown code fences if present
    if (text.startsWith('```')) {
      const lines = text.split('\n');
      lines.shift(); // Remove opening fence
      if (lines[lines.length - 1].trim() === '```' || lines[lines.length - 1].trim().startsWith('```')) {
        lines.pop(); // Remove closing fence
      }
      text = lines.join('\n').trim();
    }
    
    // Find the JSON object/array in the text
    const jsonStart = text.indexOf('{') !== -1 ? text.indexOf('{') : text.indexOf('[');
    const jsonEnd = text.lastIndexOf('}') !== -1 ? text.lastIndexOf('}') + 1 : text.lastIndexOf(']') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonText = text.substring(jsonStart, jsonEnd);
      return JSON.parse(jsonText);
    }
    
    // If no JSON markers found, try parsing the whole text
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON extraction failed:', error);
    throw error;
  }
}

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
    if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
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

    // Extract JSON from response using robust extraction
    const jsonText = (response.content[0] as any).text || '{}';
    const result = extractJSON(jsonText);
    
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
    if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
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

    // Extract JSON from response using robust extraction
    const jsonText = (response.content[0] as any).text || '{}';
    const result = extractJSON(jsonText);
    
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
    console.warn('AI learning path generation failed:', error.message || error);
    const fallbackPaths = generateFallbackLearningPaths(userProfile, availableResources);
    console.log(`Generated ${fallbackPaths.length} fallback paths in AI system`);
    return fallbackPaths;
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
export function generateFallbackLearningPaths(
  userProfile: UserProfile,
  availableResources: Resource[]
): AILearningPath[] {
  console.log(`Generating fallback learning paths for user with ${userProfile.preferredCategories.length} preferred categories`);
  const paths: AILearningPath[] = [];
  
  // Get available categories from resources
  const availableCategories = Array.from(new Set(availableResources.map(r => r.category).filter(Boolean)));
  console.log(`Available categories: ${availableCategories.slice(0, 5).join(', ')}... (${availableCategories.length} total)`);
  
  // Use preferred categories first, then popular categories if none are set
  let categoriesToUse = userProfile.preferredCategories.length > 0 
    ? userProfile.preferredCategories 
    : availableCategories.slice(0, 3); // Use first 3 categories if no preferences
    
  console.log(`Categories to use for paths: ${categoriesToUse.join(', ')}`);
  
  // Create paths based on categories
  categoriesToUse.slice(0, 3).forEach((category, index) => {
    const categoryResources = availableResources
      .filter(r => r.category === category)
      .slice(0, 6);
      
    if (categoryResources.length > 0) {
      const isPreferred = userProfile.preferredCategories.includes(category);
      paths.push({
        id: `fallback_path_${category.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${index}`,
        title: `${category} Learning Path`,
        description: isPreferred 
          ? `Comprehensive learning path for ${category} based on your interests`
          : `Popular learning path for ${category} - great for ${userProfile.skillLevel} developers`,
        category,
        skillLevel: userProfile.skillLevel,
        estimatedHours: userProfile.timeCommitment === 'daily' ? 15 : userProfile.timeCommitment === 'weekly' ? 25 : 20,
        resources: categoryResources,
        prerequisites: userProfile.skillLevel === 'beginner' ? ['Basic programming knowledge'] : [],
        learningObjectives: [
          `Master ${category} concepts and fundamentals`,
          `Apply ${category} in practical projects`,
          `Understand best practices in ${category}`
        ],
        matchScore: isPreferred ? 0.9 : 0.6,
        matchReasons: isPreferred 
          ? [`Matches your interest in ${category}`, `Aligned with your ${userProfile.skillLevel} skill level`]
          : [`Popular category for ${userProfile.skillLevel} developers`, `Good foundation for video development`],
        aiGenerated: false
      });
    }
  });
  
  // If still no paths (shouldn't happen with available resources), create a general path
  if (paths.length === 0 && availableResources.length > 0) {
    paths.push({
      id: `fallback_general_path_${Date.now()}`,
      title: 'Video Development Fundamentals',
      description: 'Essential resources for video development and streaming technologies',
      category: 'General',
      skillLevel: userProfile.skillLevel,
      estimatedHours: 20,
      resources: availableResources.slice(0, 8),
      prerequisites: userProfile.skillLevel === 'beginner' ? ['Basic programming knowledge'] : [],
      learningObjectives: [
        'Understand video development basics',
        'Learn key video technologies',
        'Build practical skills'
      ],
      matchScore: 0.5,
      matchReasons: ['Comprehensive introduction to video development'],
      aiGenerated: false
    });
  }
  
  return paths;
}