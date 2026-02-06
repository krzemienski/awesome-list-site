/**
 * Unit Tests for recommendation-engine.ts
 *
 * Tests the recommendation engine logic including:
 * - User profile-based recommendations
 * - Learning path generation
 * - Scoring algorithms
 * - Confidence level calculation
 * - Edge cases and filtering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationEngine, UserProfile, RecommendationResult, LearningPathSuggestion } from '../../server/recommendation-engine';
import { Resource } from '../../client/src/types/awesome-list';

describe('RecommendationEngine - Initialization', () => {
  it('should initialize with empty resources', () => {
    const engine = new RecommendationEngine([]);
    const recommendations = engine.generateRecommendations(createBasicUserProfile(), 10);
    expect(recommendations).toEqual([]);
  });

  it('should initialize with valid resources', () => {
    const resources = createMockResources();
    const engine = new RecommendationEngine(resources);
    expect(engine).toBeDefined();
  });

  it('should build category keywords on initialization', () => {
    const resources = createMockResources();
    const engine = new RecommendationEngine(resources);
    const userProfile = createUserProfile(['Frontend']);
    const recommendations = engine.generateRecommendations(userProfile, 5);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe('RecommendationEngine - Basic Recommendations', () => {
  let engine: RecommendationEngine;
  let resources: Resource[];

  beforeEach(() => {
    resources = createMockResources();
    engine = new RecommendationEngine(resources);
  });

  it('should generate recommendations for user with preferred categories', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend']);
    const recommendations = engine.generateRecommendations(userProfile, 5);

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.length).toBeLessThanOrEqual(5);
  });

  it('should return recommendations sorted by score (highest first)', () => {
    const userProfile = createUserProfile(['Frontend'], ['learning React']);
    const recommendations = engine.generateRecommendations(userProfile, 10);

    for (let i = 1; i < recommendations.length; i++) {
      expect(recommendations[i - 1].score).toBeGreaterThanOrEqual(recommendations[i].score);
    }
  });

  it('should include recommendation reason for each result', () => {
    const userProfile = createUserProfile(['Frontend']);
    const recommendations = engine.generateRecommendations(userProfile, 5);

    recommendations.forEach(rec => {
      expect(rec.reason).toBeDefined();
      expect(rec.reason.length).toBeGreaterThan(0);
    });
  });

  it('should include confidence level for each recommendation', () => {
    const userProfile = createUserProfile(['Frontend']);
    const recommendations = engine.generateRecommendations(userProfile, 5);

    recommendations.forEach(rec => {
      expect(rec.confidenceLevel).toBeDefined();
      expect(rec.confidenceLevel).toBeGreaterThan(0);
      expect(rec.confidenceLevel).toBeLessThanOrEqual(1);
    });
  });

  it('should respect the limit parameter', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend']);
    const recommendations = engine.generateRecommendations(userProfile, 3);

    expect(recommendations.length).toBeLessThanOrEqual(3);
  });
});

describe('RecommendationEngine - Category Preference Scoring', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine(createMockResources());
  });

  it('should prioritize resources from preferred categories', () => {
    const userProfile = createUserProfile(['Frontend']);
    const recommendations = engine.generateRecommendations(userProfile, 10);

    const frontendRecs = recommendations.filter(r => r.category === 'Frontend');
    expect(frontendRecs.length).toBeGreaterThan(0);
  });

  it('should include resources from non-preferred categories with lower scores', () => {
    const userProfile = createUserProfile(['Frontend']);
    const recommendations = engine.generateRecommendations(userProfile, 20);

    const nonFrontendRecs = recommendations.filter(r => r.category !== 'Frontend');
    expect(nonFrontendRecs.length).toBeGreaterThan(0);

    if (recommendations.length > 1) {
      const topScore = recommendations[0].score;
      const bottomScore = recommendations[recommendations.length - 1].score;
      expect(topScore).toBeGreaterThanOrEqual(bottomScore);
    }
  });

  it('should handle user with no category preferences', () => {
    const userProfile = createUserProfile([]);
    const recommendations = engine.generateRecommendations(userProfile, 5);

    expect(recommendations).toBeDefined();
  });

  it('should handle user with multiple category preferences', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend', 'Database']);
    const recommendations = engine.generateRecommendations(userProfile, 10);

    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe('RecommendationEngine - Learning Goals Alignment', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine(createMockResources());
  });

  it('should recommend resources matching learning goals', () => {
    const userProfile = createUserProfile(['Frontend'], ['learn React framework']);
    const recommendations = engine.generateRecommendations(userProfile, 10);

    const reactRecs = recommendations.filter(r =>
      r.resourceId.toLowerCase().includes('react') ||
      r.reason.toLowerCase().includes('react')
    );
    expect(reactRecs.length).toBeGreaterThan(0);
  });

  it('should handle users with no learning goals', () => {
    const userProfile = createUserProfile(['Frontend'], []);
    const recommendations = engine.generateRecommendations(userProfile, 5);

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should handle multiple learning goals', () => {
    const userProfile = createUserProfile(
      ['Frontend', 'Backend'],
      ['learn React', 'master Node.js', 'understand databases']
    );
    const recommendations = engine.generateRecommendations(userProfile, 10);

    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should include goal alignment in recommendation reason', () => {
    const userProfile = createUserProfile(['Frontend'], ['learn React']);
    const recommendations = engine.generateRecommendations(userProfile, 5);

    const hasGoalReason = recommendations.some(rec =>
      rec.reason.toLowerCase().includes('goal')
    );
    expect(hasGoalReason).toBe(true);
  });
});

describe('RecommendationEngine - Skill Level Appropriateness', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    const resources = [
      createResource('Beginner React Tutorial', 'A basic intro to React for beginners', 'Frontend'),
      createResource('Advanced React Patterns', 'Expert level deep dive into advanced React optimization', 'Frontend'),
      createResource('React Guide', 'A practical guide to React implementation with examples', 'Frontend'),
      createResource('Simple Vue Tutorial', 'Easy getting started guide for Vue', 'Frontend'),
      createResource('Expert Angular Architecture', 'Complex architecture patterns for advanced developers', 'Frontend'),
    ];
    engine = new RecommendationEngine(resources);
  });

  it('should recommend beginner resources for beginner users', () => {
    const userProfile = createUserProfile(['Frontend'], [], 'beginner');
    const recommendations = engine.generateRecommendations(userProfile, 5);

    const beginnerRecs = recommendations.filter(rec =>
      rec.reason.toLowerCase().includes('beginner')
    );
    expect(beginnerRecs.length).toBeGreaterThan(0);
  });

  it('should recommend intermediate resources for intermediate users', () => {
    const userProfile = createUserProfile(['Frontend'], [], 'intermediate');
    const recommendations = engine.generateRecommendations(userProfile, 5);

    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should recommend advanced resources for advanced users', () => {
    const userProfile = createUserProfile(['Frontend'], [], 'advanced');
    const recommendations = engine.generateRecommendations(userProfile, 5);

    const advancedRecs = recommendations.filter(rec =>
      rec.reason.toLowerCase().includes('advanced')
    );
    expect(advancedRecs.length).toBeGreaterThan(0);
  });

  it('should include skill level in recommendation reason when matched', () => {
    const userProfile = createUserProfile(['Frontend'], [], 'beginner');
    const recommendations = engine.generateRecommendations(userProfile, 10);

    const hasSkillReason = recommendations.some(rec =>
      rec.reason.toLowerCase().includes('beginner level') ||
      rec.reason.toLowerCase().includes('suitable')
    );
    expect(hasSkillReason).toBe(true);
  });
});

describe('RecommendationEngine - View History Filtering', () => {
  let engine: RecommendationEngine;
  let resources: Resource[];

  beforeEach(() => {
    resources = createMockResources();
    engine = new RecommendationEngine(resources);
  });

  it('should exclude viewed resources when excludeViewed is true', () => {
    const viewedUrl = resources[0].url;
    const userProfile = createUserProfile(['Frontend']);
    userProfile.viewHistory = [viewedUrl];

    const recommendations = engine.generateRecommendations(userProfile, 20, true);

    const viewedRec = recommendations.find(r => r.resourceId === viewedUrl);
    expect(viewedRec).toBeUndefined();
  });

  it('should include viewed resources when excludeViewed is false', () => {
    const viewedUrl = resources[0].url;
    const userProfile = createUserProfile(['Frontend']);
    userProfile.viewHistory = [viewedUrl];

    const recommendations = engine.generateRecommendations(userProfile, 20, false);

    const viewedRec = recommendations.find(r => r.resourceId === viewedUrl);
    expect(viewedRec).toBeDefined();
  });

  it('should always exclude completed resources', () => {
    const completedUrl = resources[0].url;
    const userProfile = createUserProfile(['Frontend']);
    userProfile.completedResources = [completedUrl];

    const recommendations = engine.generateRecommendations(userProfile, 20, false);

    const completedRec = recommendations.find(r => r.resourceId === completedUrl);
    expect(completedRec).toBeUndefined();
  });

  it('should handle user with extensive view history', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend']);
    userProfile.viewHistory = resources.slice(0, 5).map(r => r.url);

    const recommendations = engine.generateRecommendations(userProfile, 10);

    recommendations.forEach(rec => {
      expect(userProfile.viewHistory).not.toContain(rec.resourceId);
    });
  });
});

describe('RecommendationEngine - Resource Type Preferences', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    const resources = [
      createResource('React Video Tutorial', 'A comprehensive video course on React', 'Frontend'),
      createResource('React Documentation', 'Official documentation for React library', 'Frontend'),
      createResource('React Book', 'A detailed book about React development', 'Frontend'),
      createResource('React Article', 'An article explaining React concepts', 'Frontend'),
      createResource('React Podcast', 'A podcast discussing React best practices', 'Frontend'),
    ];
    engine = new RecommendationEngine(resources);
  });

  it('should prioritize preferred resource types', () => {
    const userProfile = createUserProfile(['Frontend']);
    userProfile.preferredResourceTypes = ['video', 'tutorial'];

    const recommendations = engine.generateRecommendations(userProfile, 5);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should handle user with no resource type preferences', () => {
    const userProfile = createUserProfile(['Frontend']);
    userProfile.preferredResourceTypes = [];

    const recommendations = engine.generateRecommendations(userProfile, 5);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should handle multiple resource type preferences', () => {
    const userProfile = createUserProfile(['Frontend']);
    userProfile.preferredResourceTypes = ['video', 'documentation', 'book'];

    const recommendations = engine.generateRecommendations(userProfile, 10);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe('RecommendationEngine - Confidence Level Calculation', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine(createMockResources());
  });

  it('should have higher confidence for users with clear preferences', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend'], ['learn React', 'master Node']);
    userProfile.preferredResourceTypes = ['video', 'tutorial'];
    userProfile.viewHistory = Array(10).fill('https://example.com/resource');

    const recommendations = engine.generateRecommendations(userProfile, 5);

    recommendations.forEach(rec => {
      expect(rec.confidenceLevel).toBeGreaterThan(0.5);
    });
  });

  it('should have lower confidence for users with minimal preferences', () => {
    const userProfile = createUserProfile([], []);
    userProfile.preferredResourceTypes = [];
    userProfile.viewHistory = [];

    const recommendations = engine.generateRecommendations(userProfile, 5);

    if (recommendations.length > 0) {
      const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidenceLevel, 0) / recommendations.length;
      expect(avgConfidence).toBeLessThan(0.8);
    }
  });

  it('should cap confidence level at 1.0', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend', 'Database']);
    userProfile.learningGoals = ['goal1', 'goal2', 'goal3'];
    userProfile.preferredResourceTypes = ['video', 'tutorial', 'book'];
    userProfile.viewHistory = Array(20).fill('https://example.com/resource');

    const recommendations = engine.generateRecommendations(userProfile, 10);

    recommendations.forEach(rec => {
      expect(rec.confidenceLevel).toBeLessThanOrEqual(1.0);
    });
  });

  it('should maintain minimum confidence level', () => {
    const userProfile = createUserProfile([]);

    const recommendations = engine.generateRecommendations(userProfile, 5);

    recommendations.forEach(rec => {
      expect(rec.confidenceLevel).toBeGreaterThanOrEqual(0.1);
    });
  });
});

describe('RecommendationEngine - Score Filtering', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine(createMockResources());
  });

  it('should exclude resources with very low scores', () => {
    const userProfile = createUserProfile(['Nonexistent Category']);

    const recommendations = engine.generateRecommendations(userProfile, 50);

    recommendations.forEach(rec => {
      expect(rec.score).toBeGreaterThan(0.1);
    });
  });

  it('should ensure all scores are between 0 and 1', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend']);

    const recommendations = engine.generateRecommendations(userProfile, 20);

    recommendations.forEach(rec => {
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(1);
    });
  });
});

describe('RecommendationEngine - Learning Paths', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    const resources = createLearningPathResources();
    engine = new RecommendationEngine(resources);
  });

  it('should generate learning paths for preferred categories', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend']);

    const paths = engine.generateLearningPaths(userProfile, 5);

    expect(paths).toBeDefined();
    expect(paths.length).toBeGreaterThan(0);
  });

  it('should respect the limit parameter for learning paths', () => {
    const userProfile = createUserProfile(['Frontend', 'Backend', 'Database']);

    const paths = engine.generateLearningPaths(userProfile, 2);

    expect(paths.length).toBeLessThanOrEqual(2);
  });

  it('should include match score in learning paths', () => {
    const userProfile = createUserProfile(['Frontend']);

    const paths = engine.generateLearningPaths(userProfile, 5);

    paths.forEach(path => {
      expect(path.matchScore).toBeDefined();
      expect(path.matchScore).toBeGreaterThanOrEqual(0);
      expect(path.matchScore).toBeLessThanOrEqual(1);
    });
  });

  it('should include match reasons in learning paths', () => {
    const userProfile = createUserProfile(['Frontend']);

    const paths = engine.generateLearningPaths(userProfile, 5);

    paths.forEach(path => {
      expect(path.matchReasons).toBeDefined();
      expect(path.matchReasons.length).toBeGreaterThan(0);
    });
  });

  it('should include prerequisites in learning paths', () => {
    const userProfile = createUserProfile(['Frontend'], [], 'beginner');

    const paths = engine.generateLearningPaths(userProfile, 5);

    paths.forEach(path => {
      expect(path.prerequisites).toBeDefined();
      expect(Array.isArray(path.prerequisites)).toBe(true);
    });
  });

  it('should include learning objectives in paths', () => {
    const userProfile = createUserProfile(['Frontend']);

    const paths = engine.generateLearningPaths(userProfile, 5);

    paths.forEach(path => {
      expect(path.learningObjectives).toBeDefined();
      expect(path.learningObjectives.length).toBeGreaterThan(0);
    });
  });

  it('should estimate hours for learning paths', () => {
    const userProfile = createUserProfile(['Frontend']);

    const paths = engine.generateLearningPaths(userProfile, 5);

    paths.forEach(path => {
      expect(path.estimatedHours).toBeGreaterThan(0);
    });
  });

  it('should include multiple resources in each path', () => {
    const userProfile = createUserProfile(['Frontend']);

    const paths = engine.generateLearningPaths(userProfile, 5);

    paths.forEach(path => {
      expect(path.resources).toBeDefined();
      expect(path.resources.length).toBeGreaterThan(0);
    });
  });

  it('should skip categories with insufficient resources', () => {
    const resources = [
      createResource('Resource 1', 'Description 1', 'SmallCategory'),
      createResource('Resource 2', 'Description 2', 'SmallCategory'),
    ];
    const smallEngine = new RecommendationEngine(resources);
    const userProfile = createUserProfile(['SmallCategory']);

    const paths = smallEngine.generateLearningPaths(userProfile, 5);

    const smallCategoryPaths = paths.filter(p => p.category === 'SmallCategory');
    expect(smallCategoryPaths.length).toBe(0);
  });

  it('should generate paths for popular categories when user has few preferences', () => {
    const userProfile = createUserProfile([]);

    const paths = engine.generateLearningPaths(userProfile, 5);

    expect(paths.length).toBeGreaterThan(0);
  });

  it('should include appropriate skill level in path', () => {
    const userProfile = createUserProfile(['Frontend'], [], 'intermediate');

    const paths = engine.generateLearningPaths(userProfile, 5);

    paths.forEach(path => {
      expect(path.skillLevel).toBe('intermediate');
    });
  });
});

describe('RecommendationEngine - Learning Path Match Scoring', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine(createLearningPathResources());
  });

  it('should score higher for paths in preferred categories', () => {
    const userProfile = createUserProfile(['Frontend']);

    const paths = engine.generateLearningPaths(userProfile, 10);

    const frontendPaths = paths.filter(p => p.category === 'Frontend');
    const otherPaths = paths.filter(p => p.category !== 'Frontend');

    if (frontendPaths.length > 0 && otherPaths.length > 0) {
      const avgFrontendScore = frontendPaths.reduce((sum, p) => sum + p.matchScore, 0) / frontendPaths.length;
      const avgOtherScore = otherPaths.reduce((sum, p) => sum + p.matchScore, 0) / otherPaths.length;
      expect(avgFrontendScore).toBeGreaterThanOrEqual(avgOtherScore);
    }
  });

  it('should score higher for paths matching learning goals', () => {
    const userProfile = createUserProfile(['Frontend'], ['learn Frontend development']);

    const paths = engine.generateLearningPaths(userProfile, 5);

    const frontendPaths = paths.filter(p => p.category === 'Frontend');
    if (frontendPaths.length > 0) {
      expect(frontendPaths[0].matchScore).toBeGreaterThan(0.5);
    }
  });
});

describe('RecommendationEngine - Edge Cases', () => {
  it('should handle empty resource list', () => {
    const engine = new RecommendationEngine([]);
    const userProfile = createUserProfile(['Frontend']);

    const recommendations = engine.generateRecommendations(userProfile, 10);
    expect(recommendations).toEqual([]);

    const paths = engine.generateLearningPaths(userProfile, 5);
    expect(paths).toEqual([]);
  });

  it('should handle user profile with all empty arrays', () => {
    const engine = new RecommendationEngine(createMockResources());
    const userProfile: UserProfile = {
      userId: 'user1',
      preferredCategories: [],
      skillLevel: 'beginner',
      learningGoals: [],
      preferredResourceTypes: [],
      timeCommitment: 'flexible',
      viewHistory: [],
      bookmarks: [],
      completedResources: [],
      ratings: {}
    };

    const recommendations = engine.generateRecommendations(userProfile, 10);
    expect(recommendations).toBeDefined();
  });

  it('should handle very large limit values', () => {
    const engine = new RecommendationEngine(createMockResources());
    const userProfile = createUserProfile(['Frontend']);

    const recommendations = engine.generateRecommendations(userProfile, 1000);
    expect(recommendations.length).toBeLessThanOrEqual(createMockResources().length);
  });

  it('should handle limit of 0', () => {
    const engine = new RecommendationEngine(createMockResources());
    const userProfile = createUserProfile(['Frontend']);

    const recommendations = engine.generateRecommendations(userProfile, 0);
    expect(recommendations).toEqual([]);
  });

  it('should handle resources with special characters in descriptions', () => {
    const resources = [
      createResource('Special Chars', 'Description with "quotes" and \'apostrophes\' & symbols!', 'Frontend'),
      createResource('Unicode Test', 'Description with émojis 🚀 and ünïcödé', 'Frontend'),
      createResource('Test 3', 'Normal description', 'Frontend'),
    ];
    const engine = new RecommendationEngine(resources);
    const userProfile = createUserProfile(['Frontend']);

    const recommendations = engine.generateRecommendations(userProfile, 5);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should handle duplicate resources in different categories', () => {
    const resources = [
      createResource('Same Title', 'Description 1', 'Frontend'),
      createResource('Same Title', 'Description 2', 'Backend'),
      createResource('Unique Resource', 'Description 3', 'Frontend'),
    ];
    const engine = new RecommendationEngine(resources);
    const userProfile = createUserProfile(['Frontend', 'Backend']);

    const recommendations = engine.generateRecommendations(userProfile, 10);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should handle user ratings in scoring', () => {
    const engine = new RecommendationEngine(createMockResources());
    const userProfile = createUserProfile(['Frontend']);
    userProfile.ratings = {
      'https://github.com/resource1': 5,
      'https://github.com/resource2': 5,
      'https://github.com/resource3': 4,
    };

    const recommendations = engine.generateRecommendations(userProfile, 10);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe('RecommendationEngine - Time Commitment', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine(createLearningPathResources());
  });

  it('should include time commitment in match reasons for learning paths', () => {
    const userProfile = createUserProfile(['Frontend']);
    userProfile.timeCommitment = 'daily';

    const paths = engine.generateLearningPaths(userProfile, 5);

    const hasTimeCommitmentReason = paths.some(path =>
      path.matchReasons.some(reason => reason.toLowerCase().includes('daily'))
    );
    expect(hasTimeCommitmentReason).toBe(true);
  });

  it('should handle flexible time commitment', () => {
    const userProfile = createUserProfile(['Frontend']);
    userProfile.timeCommitment = 'flexible';

    const paths = engine.generateLearningPaths(userProfile, 5);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('should handle weekly time commitment', () => {
    const userProfile = createUserProfile(['Frontend']);
    userProfile.timeCommitment = 'weekly';

    const paths = engine.generateLearningPaths(userProfile, 5);
    expect(paths.length).toBeGreaterThan(0);
  });
});

describe('RecommendationEngine - Recommendation Reasons', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine(createMockResources());
  });

  it('should generate default reason when no specific matches found', () => {
    const userProfile = createUserProfile(['UnrelatedCategory']);
    const recommendations = engine.generateRecommendations(userProfile, 5);

    recommendations.forEach(rec => {
      expect(rec.reason).toContain('popular in');
    });
  });

  it('should mention category match in reason', () => {
    const userProfile = createUserProfile(['Frontend']);
    const recommendations = engine.generateRecommendations(userProfile, 5);

    const categoryReasons = recommendations.filter(rec =>
      rec.reason.toLowerCase().includes('frontend') ||
      rec.reason.toLowerCase().includes('interest')
    );
    expect(categoryReasons.length).toBeGreaterThan(0);
  });

  it('should limit recommendation reason to 2 main points', () => {
    const userProfile = createUserProfile(['Frontend'], ['learn React'], 'beginner');
    const recommendations = engine.generateRecommendations(userProfile, 5);

    recommendations.forEach(rec => {
      const andCount = (rec.reason.match(/\sand\s/g) || []).length;
      expect(andCount).toBeLessThanOrEqual(1);
    });
  });
});

// Helper Functions

function createBasicUserProfile(): UserProfile {
  return {
    userId: 'test-user',
    preferredCategories: [],
    skillLevel: 'beginner',
    learningGoals: [],
    preferredResourceTypes: [],
    timeCommitment: 'flexible',
    viewHistory: [],
    bookmarks: [],
    completedResources: [],
    ratings: {}
  };
}

function createUserProfile(
  categories: string[] = [],
  goals: string[] = [],
  skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): UserProfile {
  return {
    userId: 'test-user',
    preferredCategories: categories,
    skillLevel,
    learningGoals: goals,
    preferredResourceTypes: [],
    timeCommitment: 'flexible',
    viewHistory: [],
    bookmarks: [],
    completedResources: [],
    ratings: {}
  };
}

function createResource(title: string, description: string, category: string): Resource {
  return {
    id: `resource-${Math.random().toString(36).substr(2, 9)}`,
    title,
    description,
    url: `https://github.com/${title.toLowerCase().replace(/\s+/g, '-')}`,
    category,
    subcategory: '',
    tags: ['GitHub'],
    dateAdded: new Date().toISOString(),
    license: '',
    language: ''
  };
}

function createMockResources(): Resource[] {
  return [
    createResource('React Framework', 'A JavaScript library for building user interfaces', 'Frontend'),
    createResource('Vue.js', 'The progressive JavaScript framework', 'Frontend'),
    createResource('Angular', 'Platform for building mobile and desktop web applications', 'Frontend'),
    createResource('Express.js', 'Fast, unopinionated, minimalist web framework for Node.js', 'Backend'),
    createResource('Node.js Guide', 'A comprehensive guide to Node.js development', 'Backend'),
    createResource('PostgreSQL', 'The world\'s most advanced open source database', 'Database'),
    createResource('MongoDB', 'The most popular NoSQL database', 'Database'),
    createResource('Redis Cache', 'In-memory data structure store', 'Database'),
    createResource('Docker Tutorial', 'Containerization platform for developers', 'DevOps'),
    createResource('Kubernetes Guide', 'Container orchestration platform', 'DevOps'),
  ];
}

function createLearningPathResources(): Resource[] {
  return [
    createResource('Intro to React', 'A basic tutorial for React beginners', 'Frontend'),
    createResource('React Hooks Guide', 'A practical guide to React Hooks', 'Frontend'),
    createResource('Advanced React', 'Expert level React optimization techniques', 'Frontend'),
    createResource('React Testing', 'A guide to testing React applications', 'Frontend'),
    createResource('React Performance', 'Performance optimization in React apps', 'Frontend'),
    createResource('Node.js Basics', 'Getting started with Node.js', 'Backend'),
    createResource('Express Tutorial', 'Building APIs with Express', 'Backend'),
    createResource('Node.js Advanced', 'Advanced Node.js patterns', 'Backend'),
    createResource('Database Design', 'Fundamentals of database design', 'Database'),
    createResource('SQL Mastery', 'Master SQL queries', 'Database'),
    createResource('NoSQL Guide', 'Introduction to NoSQL databases', 'Database'),
  ];
}
