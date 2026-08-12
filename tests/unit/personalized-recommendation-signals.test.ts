import { describe, expect, it } from 'vitest';
import type { Resource } from '../../shared/schema';
import {
  buildRecommendationReason,
  calculateGoalsMatch,
  calculateTimeCommitmentMatch,
  calculateTypeMatch,
} from '../../server/ai/recommendations';
import {
  calculateColdStartBlend,
  recommendationEngine,
  type RecommendationResult,
  type UserProfile,
} from '../../server/ai/recommendationEngine';
import {
  normalizeLearningFormats,
  normalizeLearningGoals,
} from '../../shared/onboarding';

function resource(
  id: number,
  title: string,
  description: string,
  resourceFormat: Resource['resourceFormat'],
): Resource {
  return {
    id,
    title,
    description,
    resourceFormat,
    url: `https://example.test/${id}`,
    category: 'Intro & Learning',
    subcategory: null,
    subSubcategory: null,
    status: 'approved',
    submittedBy: null,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    metadata: null,
    githubSynced: false,
    lastSyncedAt: null,
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
    updatedAt: new Date('2020-01-01T00:00:00.000Z'),
  };
}

function profile(
  learningGoals: string[],
  preferredResourceTypes: string[],
  timeCommitment: UserProfile['timeCommitment'] = 'weekly',
): UserProfile {
  return {
    userId: 'preference-signal-test',
    preferredCategories: ['Intro & Learning'],
    skillLevel: 'intermediate',
    learningGoals,
    preferredResourceTypes,
    timeCommitment,
    viewHistory: [],
    bookmarks: [],
    completedResources: [],
    ratings: {},
    completedJourneys: [],
    journeyProgress: [],
  };
}

describe('personalized onboarding recommendation signals', () => {
  it('normalizes and deduplicates the previous preference vocabulary', () => {
    expect(normalizeLearningGoals([
      'Learn video encoding fundamentals',
      'Master video streaming protocols',
      'Master video analytics',
      'Learn video encoding fundamentals',
      'Totally custom goal',
    ])).toEqual([
      'learn-fundamentals',
      'improve-streaming',
      'operate-infrastructure',
    ]);
    expect(normalizeLearningFormats([
      'Documentation',
      'Tutorials',
      'Framework',
      'Articles',
      'Documentation',
      'Unknown format',
    ])).toEqual(['specification', 'course', 'library', 'article']);
  });

  it('maps controlled goal IDs to distinct video-domain intents', () => {
    const encoding = resource(
      1,
      'AV1 encoding and bitrate optimization',
      'Improve codec quality and compression with FFmpeg',
      'article',
    );
    const streaming = resource(
      2,
      'Low-latency HLS live streaming',
      'Adaptive playback and buffer tuning',
      'video',
    );

    expect(calculateGoalsMatch(encoding, ['optimize-encoding'])).toBeGreaterThan(
      calculateGoalsMatch(encoding, ['improve-streaming']),
    );
    expect(calculateGoalsMatch(streaming, ['improve-streaming'])).toBeGreaterThan(
      calculateGoalsMatch(streaming, ['optimize-encoding']),
    );
  });

  it('uses canonical resourceFormat before misleading text keywords', () => {
    const canonicalVideo = resource(
      3,
      'An article-style written reference',
      'Long-form blog post and article',
      'video',
    );

    expect(calculateTypeMatch(canonicalVideo, ['video'])).toBe(1);
    expect(calculateTypeMatch(canonicalVideo, ['article'])).toBe(0);
  });

  it('names matching controlled goals and formats before category context', () => {
    const match = resource(
      4,
      'Introduction to H.264 encoding',
      'A fundamentals article about codecs and bitrate',
      'article',
    );
    const user = profile(['optimize-encoding'], ['article']);
    const reason = buildRecommendationReason(match, user, {
      skillScore: 0.8,
      goalsScore: 1,
      typeScore: 1,
      timeScore: 0,
    });

    expect(reason).toContain('Optimize encoding and quality');
    expect(reason).toContain('Articles');
    expect(reason).not.toContain('Intro & Learning');
  });

  it('uses curated formats as a deterministic time-commitment proxy', () => {
    const article = resource(6, 'Same learning topic', 'Same description', 'article');
    const course = resource(7, 'Same learning topic', 'Same description', 'course');

    expect(calculateTimeCommitmentMatch(article, 'daily')).toBe(1);
    expect(calculateTimeCommitmentMatch(course, 'daily')).toBe(0);
    expect(calculateTimeCommitmentMatch(course, 'weekly')).toBe(1);
    expect(calculateTimeCommitmentMatch(article, 'weekly')).toBe(0);
    expect(calculateTimeCommitmentMatch(article, 'flexible')).toBe(0.5);
  });

  it('changes rule-based order and reasons when only time commitment changes', () => {
    const article = resource(8, 'Same learning topic', 'Same description', 'article');
    const course = resource(9, 'Same learning topic', 'Same description', 'course');
    const engine = recommendationEngine as unknown as {
      generateRuleBasedRecommendations(
        userProfile: UserProfile,
        resources: Resource[],
        favorites: Resource[],
        bookmarks: Resource[],
        journeyResources: Resource[],
        limit: number,
      ): RecommendationResult[];
    };

    const daily = engine.generateRuleBasedRecommendations(
      profile([], [], 'daily'),
      [course, article],
      [],
      [],
      [],
      2,
    );
    const weekly = engine.generateRuleBasedRecommendations(
      profile([], [], 'weekly'),
      [course, article],
      [],
      [],
      [],
      2,
    );

    expect(daily[0].resource.resourceFormat).toBe('article');
    expect(daily[0].reason).toContain('shorter daily learning sessions');
    expect(weekly[0].resource.resourceFormat).toBe('course');
    expect(weekly[0].reason).toContain('focused weekly learning session');
  });

  it('changes the primary cold-start blend when only time commitment changes', () => {
    const article = resource(10, 'Same learning topic', 'Same description', 'article');
    const course = resource(11, 'Same learning topic', 'Same description', 'course');
    const daily = profile([], [], 'daily');
    const weekly = profile([], [], 'weekly');

    const dailyArticle = calculateColdStartBlend(article, daily, 0.5);
    const dailyCourse = calculateColdStartBlend(course, daily, 0.5);
    const weeklyArticle = calculateColdStartBlend(article, weekly, 0.5);
    const weeklyCourse = calculateColdStartBlend(course, weekly, 0.5);

    expect(dailyArticle.score).toBeGreaterThan(dailyCourse.score);
    expect(weeklyCourse.score).toBeGreaterThan(weeklyArticle.score);
    expect(dailyArticle.timeScore).toBe(1);
    expect(weeklyArticle.timeScore).toBe(0);
  });

  it('keeps goal and format labels in the established-user rule-based path', () => {
    const match = resource(
      5,
      'Introduction to H.264 encoding',
      'A fundamentals article about codecs and bitrate',
      'article',
    );
    const user = profile(['optimize-encoding'], ['article']);
    user.ratings[match.url] = 5;

    const engine = recommendationEngine as unknown as {
      generateRuleBasedRecommendations(
        userProfile: UserProfile,
        resources: Resource[],
        favorites: Resource[],
        bookmarks: Resource[],
        journeyResources: Resource[],
        limit: number,
      ): RecommendationResult[];
    };
    const [recommendation] = engine.generateRuleBasedRecommendations(
      user,
      [match],
      [match],
      [match],
      [match],
      1,
    );

    expect(recommendation.reason).toContain('Optimize encoding and quality');
    expect(recommendation.reason).toContain('Articles');
    expect(recommendation.reason).toContain(
      'Related to your active learning journey in Intro & Learning',
    );
  });
});