import { storage } from '../storage';
import { Resource, LearningJourney, InsertLearningJourney, InsertJourneyStep } from '@shared/schema';
import { claudeService } from './claudeService';
import { UserProfile } from './recommendationEngine';

export interface LearningPathTemplate {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  category: string;
  milestones: string[];
  prerequisites: string[];
  learningObjectives: string[];
}

export interface GeneratedLearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: string;
  category: string;
  resources: Resource[];
  milestones: PathMilestone[];
  prerequisites: string[];
  learningObjectives: string[];
  generationType: 'ai' | 'rule-based' | 'template';
  matchScore?: number;
}

export interface PathMilestone {
  id: string;
  title: string;
  description: string;
  resourceIds: string[];
  estimatedHours: number;
  order: number;
}

export class LearningPathGenerator {
  private static instance: LearningPathGenerator;
  private pathTemplates: Map<string, LearningPathTemplate[]>;

  private constructor() {
    this.pathTemplates = new Map();
    this.initializeTemplates();
  }

  public static getInstance(): LearningPathGenerator {
    if (!LearningPathGenerator.instance) {
      LearningPathGenerator.instance = new LearningPathGenerator();
    }
    return LearningPathGenerator.instance;
  }

  /**
   * Initialize predefined path templates for common learning journeys
   */
  private initializeTemplates(): void {
    // Video Encoding Path Templates
    this.pathTemplates.set('Encoding & Codecs', [
      {
        title: 'Video Encoding Fundamentals',
        description: 'Master the basics of video encoding, codecs, and compression techniques',
        difficulty: 'beginner',
        estimatedDuration: '15h',
        category: 'Encoding & Codecs',
        milestones: [
          'Understanding video basics and terminology',
          'Learning about common codecs (H.264, H.265, AV1)',
          'Hands-on encoding with FFmpeg',
          'Optimizing quality vs file size'
        ],
        prerequisites: ['Basic computer skills', 'Interest in video technology'],
        learningObjectives: [
          'Understand how video compression works',
          'Choose the right codec for your needs',
          'Use FFmpeg for basic encoding tasks',
          'Optimize video quality and file size'
        ]
      },
      {
        title: 'Advanced Video Encoding',
        description: 'Deep dive into modern codecs, optimization, and professional encoding workflows',
        difficulty: 'advanced',
        estimatedDuration: '30h',
        category: 'Encoding & Codecs',
        milestones: [
          'Advanced codec parameters and tuning',
          'HDR and color space management',
          'Hardware acceleration and performance',
          'Production-ready encoding pipelines'
        ],
        prerequisites: ['Video encoding basics', 'FFmpeg experience', 'Understanding of bitrate and quality'],
        learningObjectives: [
          'Master advanced encoding parameters',
          'Implement HDR video workflows',
          'Build scalable encoding pipelines',
          'Optimize for specific use cases'
        ]
      }
    ]);

    // Streaming Path Templates
    this.pathTemplates.set('Protocols & Transport', [
      {
        title: 'Live Streaming Basics',
        description: 'Learn the fundamentals of live streaming protocols and technologies',
        difficulty: 'beginner',
        estimatedDuration: '20h',
        category: 'Protocols & Transport',
        milestones: [
          'Understanding streaming protocols (HLS, DASH)',
          'Setting up a basic streaming server',
          'Implementing adaptive bitrate streaming',
          'Testing and monitoring streams'
        ],
        prerequisites: ['Basic networking knowledge', 'Web development basics'],
        learningObjectives: [
          'Understand HLS and DASH protocols',
          'Set up a streaming infrastructure',
          'Implement ABR streaming',
          'Monitor stream quality and performance'
        ]
      }
    ]);

    // Player Development Templates
    this.pathTemplates.set('Players & Clients', [
      {
        title: 'Web Video Player Development',
        description: 'Build custom video players for web applications',
        difficulty: 'intermediate',
        estimatedDuration: '25h',
        category: 'Players & Clients',
        milestones: [
          'HTML5 video fundamentals',
          'Building custom player controls',
          'Implementing advanced features',
          'Cross-browser compatibility'
        ],
        prerequisites: ['HTML/CSS/JavaScript', 'Basic web development'],
        learningObjectives: [
          'Build custom video player interfaces',
          'Implement playback controls and features',
          'Handle different video formats',
          'Ensure cross-platform compatibility'
        ]
      }
    ]);
  }

  /**
   * Generate a personalized learning path for a user
   */
  public async generateLearningPath(
    userProfile: UserProfile,
    category?: string,
    customGoals?: string[]
  ): Promise<GeneratedLearningPath> {
    try {
      // Determine the category to use
      const targetCategory = category || userProfile.preferredCategories[0] || 'General Tools';

      // Get available resources for the path
      let { resources } = await storage.listResources({
        status: 'approved',
        category: targetCategory,
        limit: 100
      });

      // If no resources in database, use awesome list data
      if (!resources || resources.length === 0) {
        const awesomeListData = storage.getAwesomeListData();
        if (awesomeListData && awesomeListData.resources) {
          // Filter by category and convert to database Resource format
          resources = awesomeListData.resources
            .filter((r: any) => !targetCategory || r.category === targetCategory)
            .slice(0, 100)
            .map((r: any, index: number) => ({
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

      // Try AI generation first if available
      if (claudeService.isAvailable() && resources.length > 5) {
        const aiPath = await this.generateAIPath(
          userProfile,
          resources,
          targetCategory,
          customGoals
        );
        if (aiPath) return aiPath;
      }

      // Fallback to template-based generation
      return this.generateTemplateBasedPath(
        userProfile,
        resources,
        targetCategory
      );

    } catch (error) {
      console.error('Error generating learning path:', error);
      throw new Error('Failed to generate learning path');
    }
  }

  /**
   * Generate AI-powered learning path using Claude
   */
  private async generateAIPath(
    userProfile: UserProfile,
    resources: Resource[],
    category: string,
    customGoals?: string[]
  ): Promise<GeneratedLearningPath | null> {
    try {
      const goals = customGoals || userProfile.learningGoals;
      
      const prompt = `Create a personalized learning path for video development.

User Profile:
- Skill Level: ${userProfile.skillLevel}
- Category: ${category}
- Goals: ${goals.join(', ')}
- Time Commitment: ${userProfile.timeCommitment}

Available Resources (${resources.length} total):
${resources.slice(0, 30).map((r: any) => `- ${r.title}: ${r.description?.slice(0, 100)}`).join('\n')}

Create a structured learning path with:
1. 3-5 milestones with clear progression
2. Select 4-8 resources that build on each other
3. Realistic time estimates
4. Clear prerequisites and objectives

Response format (JSON):
{
  "title": "Path title",
  "description": "What this path covers",
  "difficulty": "${userProfile.skillLevel}",
  "estimatedDuration": "20h",
  "milestones": [
    {
      "title": "Milestone 1",
      "description": "What you'll learn",
      "estimatedHours": 5,
      "resourceCount": 2
    }
  ],
  "prerequisites": ["Required knowledge"],
  "learningObjectives": ["What you'll achieve"],
  "selectedResourceIndices": [0, 2, 5, 8]
}`;

      const response = await claudeService.generateResponse(prompt, 2000);
      
      if (!response) return null;

      const pathData = JSON.parse(response);
      const selectedResources = pathData.selectedResourceIndices?.map((i: number) => resources[i]).filter(Boolean) 
        || resources.slice(0, 6);

      // Create milestones with resource distribution
      const milestones: PathMilestone[] = pathData.milestones?.map((m: any, index: number) => ({
        id: `milestone_${index + 1}`,
        title: m.title,
        description: m.description,
        resourceIds: selectedResources
          .slice(index * 2, (index + 1) * 2)
          .map((r: any) => r.url),
        estimatedHours: m.estimatedHours || 5,
        order: index + 1
      })) || [];

      return {
        id: `ai_path_${Date.now()}`,
        title: pathData.title || `${category} Learning Path`,
        description: pathData.description || `Personalized path for ${category}`,
        difficulty: pathData.difficulty || userProfile.skillLevel,
        estimatedDuration: pathData.estimatedDuration || '20h',
        category,
        resources: selectedResources,
        milestones,
        prerequisites: pathData.prerequisites || [],
        learningObjectives: pathData.learningObjectives || [],
        generationType: 'ai',
        matchScore: 90
      };

    } catch (error) {
      console.error('Error generating AI path:', error);
      return null;
    }
  }

  /**
   * Generate path using predefined templates
   */
  private generateTemplateBasedPath(
    userProfile: UserProfile,
    resources: Resource[],
    category: string
  ): GeneratedLearningPath {
    // Get templates for category
    const templates = this.pathTemplates.get(category) || [];
    
    // Find matching template by difficulty
    let template = templates.find(t => t.difficulty === userProfile.skillLevel);
    
    // Fallback to any template or create generic
    if (!template) {
      template = templates[0] || this.createGenericTemplate(category, userProfile.skillLevel);
    }

    // Select appropriate resources
    const selectedResources = this.selectResourcesForPath(
      resources,
      userProfile.skillLevel,
      template.milestones.length * 2
    );

    // Create milestones with resources
    const milestones: PathMilestone[] = template.milestones.map((milestone, index) => ({
      id: `milestone_${index + 1}`,
      title: milestone,
      description: `Complete this milestone to progress in your ${category} journey`,
      resourceIds: selectedResources
        .slice(index * 2, (index + 1) * 2)
        .map((r: any) => r.url),
      estimatedHours: parseInt(template.estimatedDuration) / template.milestones.length,
      order: index + 1
    }));

    return {
      id: `template_path_${Date.now()}`,
      title: template.title,
      description: template.description,
      difficulty: template.difficulty,
      estimatedDuration: template.estimatedDuration,
      category,
      resources: selectedResources,
      milestones,
      prerequisites: template.prerequisites,
      learningObjectives: template.learningObjectives,
      generationType: 'template',
      matchScore: 75
    };
  }

  /**
   * Create a generic template when no specific template exists
   */
  private createGenericTemplate(
    category: string,
    skillLevel: string
  ): LearningPathTemplate {
    return {
      title: `${category} ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} Path`,
      description: `A comprehensive learning journey for ${category} at ${skillLevel} level`,
      difficulty: skillLevel as 'beginner' | 'intermediate' | 'advanced',
      estimatedDuration: skillLevel === 'beginner' ? '15h' : skillLevel === 'advanced' ? '30h' : '20h',
      category,
      milestones: [
        'Foundation and core concepts',
        'Practical implementation',
        'Advanced techniques',
        'Real-world projects'
      ],
      prerequisites: skillLevel === 'beginner' ? 
        ['Basic computer skills'] : 
        ['Familiarity with ' + category.toLowerCase()],
      learningObjectives: [
        `Master ${category} fundamentals`,
        'Apply concepts in practical scenarios',
        'Build production-ready solutions',
        'Follow industry best practices'
      ]
    };
  }

  /**
   * Select appropriate resources for a learning path
   */
  private selectResourcesForPath(
    resources: Resource[],
    skillLevel: string,
    targetCount: number
  ): Resource[] {
    // Score resources by skill level appropriateness
    const scoredResources = resources.map(resource => {
      const text = `${resource.title} ${resource.description}`.toLowerCase();
      let score = 0;

      // Skill level scoring
      if (skillLevel === 'beginner') {
        if (text.includes('intro') || text.includes('basic') || text.includes('getting started')) score += 3;
        if (text.includes('advanced') || text.includes('expert')) score -= 2;
      } else if (skillLevel === 'intermediate') {
        if (text.includes('guide') || text.includes('practical') || text.includes('hands-on')) score += 2;
      } else if (skillLevel === 'advanced') {
        if (text.includes('advanced') || text.includes('optimization') || text.includes('architecture')) score += 3;
        if (text.includes('beginner') || text.includes('intro')) score -= 2;
      }

      // Diversity scoring - prefer different types
      if (text.includes('tutorial')) score += 1;
      if (text.includes('documentation')) score += 1;
      if (text.includes('example') || text.includes('demo')) score += 1;

      return { resource, score };
    });

    // Sort by score and select diverse resources
    scoredResources.sort((a, b) => b.score - a.score);

    const selected: Resource[] = [];
    const usedSubcategories = new Set<string>();

    for (const { resource } of scoredResources) {
      // Try to get diverse subcategories
      if (resource.subcategory && usedSubcategories.has(resource.subcategory)) {
        continue; // Skip if we already have this subcategory
      }

      selected.push(resource);
      if (resource.subcategory) {
        usedSubcategories.add(resource.subcategory);
      }

      if (selected.length >= targetCount) break;
    }

    // Fill remaining slots if needed
    if (selected.length < targetCount) {
      for (const { resource } of scoredResources) {
        if (!selected.includes(resource)) {
          selected.push(resource);
          if (selected.length >= targetCount) break;
        }
      }
    }

    return selected;
  }

  /**
   * Save a generated path to the database
   */
  public async saveLearningPath(
    path: GeneratedLearningPath,
    userId?: string
  ): Promise<LearningJourney> {
    try {
      // Create the learning journey
      const journey = await storage.createLearningJourney({
        title: path.title,
        description: path.description,
        difficulty: path.difficulty,
        estimatedDuration: path.estimatedDuration,
        category: path.category,
        status: 'published'
      });

      // Create journey steps from milestones
      let stepNumber = 1;
      for (const milestone of path.milestones) {
        for (const resourceUrl of milestone.resourceIds) {
          const resource = path.resources.find(r => r.url === resourceUrl);
          if (resource) {
            await storage.createJourneyStep({
              journeyId: journey.id,
              resourceId: resource.id,
              stepNumber,
              title: milestone.title,
              description: milestone.description,
              isOptional: false
            });
            stepNumber++;
          }
        }
      }

      return journey;

    } catch (error) {
      console.error('Error saving learning path:', error);
      throw new Error('Failed to save learning path');
    }
  }

  /**
   * Get suggested learning paths for a user
   */
  public async getSuggestedPaths(
    userProfile: UserProfile,
    limit: number = 5
  ): Promise<GeneratedLearningPath[]> {
    const paths: GeneratedLearningPath[] = [];

    // Generate paths for preferred categories
    for (const category of userProfile.preferredCategories.slice(0, limit)) {
      try {
        const path = await this.generateLearningPath(userProfile, category);
        paths.push(path);
      } catch (error) {
        console.error(`Error generating path for ${category}:`, error);
      }
    }

    // Fill remaining slots with popular categories
    if (paths.length < limit) {
      const popularCategories = ['Encoding & Codecs', 'Protocols & Transport', 'Players & Clients'];
      for (const category of popularCategories) {
        if (!userProfile.preferredCategories.includes(category) && paths.length < limit) {
          try {
            const path = await this.generateLearningPath(userProfile, category);
            paths.push(path);
          } catch (error) {
            console.error(`Error generating path for ${category}:`, error);
          }
        }
      }
    }

    return paths;
  }
}

// Export singleton instance
export const learningPathGenerator = LearningPathGenerator.getInstance();