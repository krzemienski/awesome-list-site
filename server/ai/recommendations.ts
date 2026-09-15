import { z } from 'zod';
import { Resource } from '../../shared/schema';
import {
  LEARNING_FORMAT_OPTIONS,
  LEARNING_GOAL_OPTIONS,
  type LearningGoal,
  type LearningTimeCommitment,
} from '../../shared/onboarding';
import type { RecommendationExplanation } from '../../shared/recommendations';
import {
  createStructuredMessage,
  isAnthropicConfigured,
  resolveFlowModel,
  StructuredOutputError,
} from './anthropicConfig';

/** Schema for the AI recommendation call — enforced by the API's structured output. */
const AIRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      resourceId: z.string().describe('The resource URL exactly as given in the AVAILABLE RESOURCES list'),
      score: z.number().describe('0-1, how well the resource matches the user'),
      reason: z.string().describe('Specific reason grounded in the user profile'),
      confidenceLevel: z.number().describe('0-1, confidence in this match'),
    }),
  ),
});
type AIRecommendationResponse = z.infer<typeof AIRecommendationSchema>['recommendations'][number];

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
  explanation: RecommendationExplanation;
}

// ---------------------------------------------------------------------------
// NB-007 / NB-042 (run18): shared scoring + reason helpers.
// Every non-AI recommendation path (cold-start popularity blend, rule-based
// scorer, Claude-unavailable fallback) must derive scores from the SAME
// advertised inputs (skill, goals, resource types, and schedule) and phrase
// its reason through ONE deterministic builder, so the same resource + the
// same profile always reads identically on /profile and /advanced.
// ---------------------------------------------------------------------------

const SKILL_INDICATORS: Record<string, string[]> = {
  beginner: ['basic', 'intro', 'introduction', 'getting started', 'tutorial', 'beginner', 'fundamentals', '101'],
  intermediate: ['guide', 'how to', 'implementation', 'practical', 'hands-on', 'workshop', 'intermediate'],
  advanced: ['advanced', 'expert', 'deep dive', 'optimization', 'performance', 'architecture', 'complex', 'professional'],
};

const SKILL_LEVEL_ORDER = ['beginner', 'intermediate', 'advanced'] as const;

// NB-007 (run25): monotonic skill-level weighting that survives sparse
// metadata. Prior cycles keyed the skill score entirely off SKILL_INDICATORS
// keyword hits and returned a flat 0.5 when a resource had none — but MOST of
// the corpus has no such keyword in its title/description, so beginner and
// advanced profiles collapsed to byte-identical rankings (only the sparse
// keyword-bearing tail reordered). The fix estimates a per-resource
// COMPLEXITY in [0,1] that is (a) primarily driven by the difficulty keyword
// signal when present and (b) falls back to a deterministic technical-density
// proxy (technical vocabulary + content length) that VARIES across resources
// instead of collapsing to a constant. The skill score is then a monotonic
// affinity curve: score = 1 − |complexity − levelTarget|, where levelTarget is
// beginner→0.0, intermediate→0.5, advanced→1.0. Because complexity varies
// across the corpus, a beginner profile ranks low-complexity resources highest
// while an advanced profile ranks high-complexity resources highest, so the
// two produce materially different orders (not just a reordered tail). The
// curve is monotonic in the user's level for any fixed resource complexity, so
// its effect survives normalization, tie-breaking, filtering, and final
// sorting. Goals/types scoring is untouched.

// Deterministic technical-density fallback vocabulary. Presence of these
// tokens (in title/description) signals higher inherent complexity when no
// explicit beginner/intermediate/advanced keyword is present.
const COMPLEXITY_TECH_TOKENS = [
  'api', 'sdk', 'protocol', 'architecture', 'kernel', 'pipeline', 'encoding',
  'codec', 'latency', 'throughput', 'buffer', 'manifest', 'transcode', 'drm',
  'hls', 'dash', 'rtmp', 'webrtc', 'ffmpeg', 'gpu', 'container', 'orchestration',
  'cluster', 'scalable', 'distributed', 'low-level', 'internals', 'specification',
];

// Estimate a resource's inherent complexity in [0,1]. Deterministic: the same
// resource always yields the same value, so rankings are stable across calls.
export function estimateResourceComplexity(resource: Resource): number {
  const text = `${resource.title} ${resource.description || ''}`.toLowerCase();
  // (a) Explicit difficulty keyword signal — anchor each level to a complexity
  // point (beginner→0.0, intermediate→0.5, advanced→1.0) and take the
  // hit-weighted average. Hits capped at 2 per level so repetition can't
  // dominate.
  let signalSum = 0;
  let signalWeight = 0;
  for (let i = 0; i < SKILL_LEVEL_ORDER.length; i++) {
    const anchor = i / (SKILL_LEVEL_ORDER.length - 1); // 0, 0.5, 1
    const indicators = SKILL_INDICATORS[SKILL_LEVEL_ORDER[i]];
    const hits = Math.min(indicators.filter(indicator => text.includes(indicator)).length, 2);
    if (hits === 0) continue;
    signalSum += anchor * hits;
    signalWeight += hits;
  }
  if (signalWeight > 0) return signalSum / signalWeight;
  // (b) Fallback: technical-density proxy that varies across the corpus.
  const techHits = COMPLEXITY_TECH_TOKENS.filter(token => text.includes(token)).length;
  const techScore = Math.min(techHits / 4, 1); // 0..1, saturates at 4 tokens
  const lenScore = Math.min(text.length / 600, 1); // longer entries skew complex
  const complexity = 0.3 + 0.5 * techScore + 0.2 * lenScore;
  return Math.max(0, Math.min(1, complexity));
}

export function calculateSkillMatch(resource: Resource, skillLevel: string): number {
  const userIdx = SKILL_LEVEL_ORDER.indexOf(skillLevel as (typeof SKILL_LEVEL_ORDER)[number]);
  if (userIdx === -1) return 0.5; // unknown profile level → neutral
  const levelTarget = userIdx / (SKILL_LEVEL_ORDER.length - 1); // 0, 0.5, 1
  const complexity = estimateResourceComplexity(resource);
  // Monotonic affinity: max at complexity == levelTarget, falling off linearly
  // with distance. Beginner favors low-complexity, advanced favors high, so the
  // two never collapse to identical orders when complexity varies.
  return 1 - Math.abs(complexity - levelTarget);
}

export function calculateGoalsMatch(resource: Resource, learningGoals: string[]): number {
  if (!learningGoals || learningGoals.length === 0) return 0.5;
  const resourceText = `${resource.title} ${resource.description || ''} ${resource.category || ''}`.toLowerCase();
  const matches = getMatchingLearningGoals(resource, learningGoals);
  const scores = learningGoals.map(goal => {
    const keywords = goalKeywords(goal);
    const hits = keywords.filter(keyword => resourceText.includes(keyword)).length;
    // One strong intent term is meaningful; additional terms increase
    // confidence without allowing keyword repetition to dominate.
    return hits === 0 ? 0 : Math.min(1, 0.6 + (hits - 1) * 0.2);
  });
  if (matches.length === 0) return 0;
  return Math.min(scores.reduce((sum, score) => sum + score, 0) / learningGoals.length, 1);
}

const GOAL_KEYWORDS: Record<LearningGoal, readonly string[]> = {
  'learn-fundamentals': [
    'fundamental', 'beginner', 'introduction', 'intro', 'getting started',
    'tutorial', 'basics', 'overview', 'concept',
  ],
  'build-video-apps': [
    'application', ' app ', 'sdk', 'api', 'player', 'integration', 'framework',
    'library', 'web', 'mobile',
  ],
  'improve-streaming': [
    'streaming', 'live stream', 'hls', 'dash', 'webrtc', 'latency', 'playback',
    'adaptive bitrate', 'buffer', 'cdn',
  ],
  'optimize-encoding': [
    'encoding', 'encoder', 'codec', 'transcod', 'compression', 'bitrate',
    'quality', 'av1', 'h.264', 'h264', 'h.265', 'hevc', 'vp9', 'ffmpeg',
  ],
  'operate-infrastructure': [
    'infrastructure', 'server', 'cloud', 'cdn', 'delivery', 'pipeline',
    'monitoring', 'scalab', 'deploy', 'orchestration', 'kubernetes', 'operations',
  ],
  'keep-current': [
    'standard', 'specification', 'news', 'newsletter', 'community', 'conference',
    'research', 'update', 'latest', 'emerging', 'release',
  ],
};

function goalKeywords(goal: string): readonly string[] {
  if (goal in GOAL_KEYWORDS) return GOAL_KEYWORDS[goal as LearningGoal];
  // Keep anonymous/legacy callers useful while treating hyphens as separators.
  return goal.toLowerCase().split(/[\s-]+/).filter(word => word.length > 2);
}

export function getMatchingLearningGoals(resource: Resource, learningGoals: string[]): string[] {
  const resourceText = ` ${resource.title} ${resource.description || ''} ${resource.category || ''} `.toLowerCase();
  return learningGoals.filter(goal =>
    goalKeywords(goal).some(keyword => resourceText.includes(keyword)),
  );
}

export function learningGoalLabel(goal: string): string {
  return LEARNING_GOAL_OPTIONS.find(option => option.value === goal)?.label
    ?? goal.replace(/-/g, ' ');
}

// Keyword hints are only a fallback for legacy resources whose canonical
// resourceFormat is unknown. Onboarding values otherwise compare directly to
// resources.resource_format.
const TYPE_KEYWORDS: Record<string, string[]> = {
  documentation: ['documentation', 'docs', 'reference', 'specification', 'spec', 'api'],
  tutorial: ['tutorial', 'guide', 'how to', 'walkthrough', 'getting started', 'learn'],
  tool: ['tool', 'cli', 'utility', 'analyzer', 'inspector', 'editor', 'converter', 'validator'],
  library: ['library', 'sdk', 'package', 'module', 'player'],
  framework: ['framework'],
  service: ['service', 'cloud', 'hosted', 'saas', 'platform'],
  'case study': ['case study', 'case-study', 'postmortem', 'lessons learned', 'how we'],
  'community resource': ['community', 'forum', 'awesome', 'slack', 'discord', 'newsletter', 'meetup'],
  video: ['video', 'talk', 'presentation', 'webinar', 'conference', 'youtube', 'recording'],
  article: ['article', 'blog', 'post', 'write-up', 'writeup'],
  course: ['course', 'class', 'training', 'workshop', 'bootcamp'],
  book: ['book', 'ebook', 'handbook'],
};

function normalizeTypeKey(rawType: string): string {
  const lower = rawType.toLowerCase().trim();
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('s')) return lower.slice(0, -1);
  return lower;
}

export function calculateTypeMatch(resource: Resource, preferredResourceTypes: string[]): number {
  if (!preferredResourceTypes || preferredResourceTypes.length === 0) return 0.5; // neutral
  return getMatchingResourceTypes(resource, preferredResourceTypes).length /
    preferredResourceTypes.length;
}

const FORMAT_ALIASES: Record<string, readonly string[]> = {
  library: ['library', 'sdk'],
  community: ['community'],
};

export function getMatchingResourceTypes(resource: Resource, preferredResourceTypes: string[]): string[] {
  const canonicalFormat = normalizeTypeKey(resource.resourceFormat || 'unknown');
  const hasCanonicalFormat = canonicalFormat !== 'unknown';
  const text = `${resource.title} ${resource.description || ''}`.toLowerCase();

  return preferredResourceTypes.filter(rawType => {
    const key = normalizeTypeKey(rawType);
    const acceptedFormats = FORMAT_ALIASES[key] || [key];
    if (hasCanonicalFormat) return acceptedFormats.includes(canonicalFormat);
    const keywords = TYPE_KEYWORDS[key] || [key];
    return keywords.some(keyword => text.includes(keyword));
  });
}

export function learningFormatLabel(format: string): string {
  return LEARNING_FORMAT_OPTIONS.find(option => option.value === format)?.label
    ?? format.replace(/-/g, ' ');
}

// The catalog does not carry durations, so time fit uses the curated resource
// format as an explicit, stable proxy. Short-session formats are easy to sample
// in small daily blocks; focused-session formats generally reward a longer,
// uninterrupted block. Unknown/other formats and "flexible" profiles remain
// neutral rather than making unsupported duration claims.
const SHORT_SESSION_FORMATS = new Set([
  'article', 'video', 'tool', 'player', 'community',
]);
const FOCUSED_SESSION_FORMATS = new Set([
  'course', 'book', 'specification', 'library', 'sdk', 'api-service',
  'platform', 'dataset',
]);

function resourceFormatForTimeFit(resource: Resource): string {
  const canonical = normalizeTypeKey(resource.resourceFormat || 'unknown');
  if (canonical !== 'unknown') return canonical;
  for (const option of LEARNING_FORMAT_OPTIONS) {
    if (getMatchingResourceTypes(resource, [option.value]).length > 0) {
      return normalizeTypeKey(option.value);
    }
  }
  return 'unknown';
}

export function calculateTimeCommitmentMatch(
  resource: Resource,
  timeCommitment: LearningTimeCommitment,
): number {
  if (timeCommitment === 'flexible') return 0.5;
  const format = resourceFormatForTimeFit(resource);
  if (format === 'unknown' || format === 'other') return 0.5;
  const matches = timeCommitment === 'daily'
    ? SHORT_SESSION_FORMATS.has(format)
    : FOCUSED_SESSION_FORMATS.has(format);
  return matches ? 1 : 0;
}

export function skillPhrase(skillLevel: string): string {
  switch (skillLevel) {
    case 'advanced': return 'for advanced practitioners';
    case 'intermediate': return 'for intermediate learners';
    default: return 'for getting started';
  }
}

export interface ReasonComponents {
  skillScore: number;
  goalsScore: number;
  typeScore: number;
  timeScore: number;
  popular?: boolean;
  journeyContext?: string;
  positiveFeedback?: string;
}

/**
 * Build the public explanation from named catalog/profile signals. Model prose
 * is never passed through to clients, which keeps explanations reproducible
 * and prevents unsupported claims.
 */
export function buildRecommendationExplanation(
  resource: Resource,
  profile: Pick<UserProfile, 'skillLevel' | 'preferredCategories' | 'learningGoals' | 'preferredResourceTypes' | 'timeCommitment'>,
  comps: ReasonComponents
): RecommendationExplanation {
  const parts: string[] = [];
  const signals: RecommendationExplanation['signals'] = [];
  const matchingGoals = getMatchingLearningGoals(resource, profile.learningGoals || []);
  const matchingTypes = getMatchingResourceTypes(resource, profile.preferredResourceTypes || []);
  if (matchingGoals.length > 0) {
    const evidence = learningGoalLabel(matchingGoals[0]);
    parts.push(`supports your goal: ${evidence}`);
    signals.push({ code: 'goal_match', label: 'Learning goal match', evidence });
  }
  if (matchingTypes.length > 0) {
    const evidence = learningFormatLabel(matchingTypes[0]);
    parts.push(`matches your preferred format: ${evidence}`);
    signals.push({ code: 'format_match', label: 'Preferred format match', evidence });
  }
  if (comps.timeScore === 1 && profile.timeCommitment === 'daily') {
    parts.push('fits shorter daily learning sessions');
    signals.push({ code: 'time_fit', label: 'Fits your schedule', evidence: 'Short daily sessions' });
  }
  if (comps.timeScore === 1 && profile.timeCommitment === 'weekly') {
    parts.push('fits a focused weekly learning session');
    signals.push({ code: 'time_fit', label: 'Fits your schedule', evidence: 'Focused weekly session' });
  }
  // Goal/format/time evidence is more specific than broad taxonomy context.
  // Keep category as a fallback rather than crowding out controlled choices.
  if (
    parts.length < 2 &&
    resource.category &&
    (profile.preferredCategories || []).includes(resource.category)
  ) {
    parts.push(`matches your interest in ${resource.category}`);
    signals.push({ code: 'topic_match', label: 'Topic match', evidence: resource.category });
  }
  if (comps.skillScore >= 0.7) {
    parts.push(`a good fit ${skillPhrase(profile.skillLevel)}`);
    signals.push({
      code: 'skill_match',
      label: 'Skill-level fit',
      evidence: profile.skillLevel,
    });
  }
  if (comps.journeyContext) {
    parts.push(`Related to your active learning journey in ${comps.journeyContext}`);
    signals.push({
      code: 'journey_context',
      label: 'Active journey context',
      evidence: comps.journeyContext,
    });
  }
  if (comps.positiveFeedback) {
    parts.push('similar to recommendations you marked helpful');
    signals.push({
      code: 'positive_feedback',
      label: 'Prior helpful feedback',
      evidence: comps.positiveFeedback,
    });
  }
  if (parts.length === 0) {
    const evidence = resource.category || 'Across the catalog';
    parts.push(comps.popular ? `popular in ${evidence}` : `relevant to ${evidence}`);
    signals.push({
      code: comps.popular ? 'popular' : 'topic_match',
      label: comps.popular ? 'Popular pick' : 'Catalog topic',
      evidence,
    });
  }
  const sentence = parts.slice(0, 3).join(' and ');
  return {
    summary: sentence.charAt(0).toUpperCase() + sentence.slice(1),
    signals: signals.slice(0, 4),
  };
}

/**
 * Backward-compatible summary for older clients. New clients render the
 * structured explanation returned alongside it.
 */
export function buildRecommendationReason(
  resource: Resource,
  profile: Pick<UserProfile, 'skillLevel' | 'preferredCategories' | 'learningGoals' | 'preferredResourceTypes' | 'timeCommitment'>,
  comps: ReasonComponents,
): string {
  return buildRecommendationExplanation(resource, profile, comps).summary;
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
    if (!isAnthropicConfigured()) {
      console.warn('Anthropic not configured, falling back to rule-based recommendations');
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
      .sort((a, b) => {
        const score = (resource: Resource) =>
          calculateGoalsMatch(resource, userProfile.learningGoals) * 0.4 +
          calculateTypeMatch(resource, userProfile.preferredResourceTypes) * 0.35 +
          calculateTimeCommitmentMatch(resource, userProfile.timeCommitment) * 0.25;
        return score(b) - score(a);
      })
      .slice(0, 100); // Limit for API efficiency

    const prompt = `You are an AI recommendation system for video development resources. Analyze this user profile and recommend the most relevant resources.

USER PROFILE:
- Skill Level: ${userProfile.skillLevel}
- Preferred Categories: ${userProfile.preferredCategories.join(', ')}
- Learning Goals: ${userProfile.learningGoals.map(learningGoalLabel).join(', ')}
- Time Commitment: ${userProfile.timeCommitment}
- Resources Types Preference: ${userProfile.preferredResourceTypes.join(', ')}
- Recently Rated Highly: ${Object.entries(userProfile.ratings).filter(([_, rating]) => rating >= 4).map(([url, _]) => url).slice(0, 5).join(', ')}

AVAILABLE RESOURCES (JSON format):
${JSON.stringify(relevantResources.slice(0, 15).map(r => ({
  url: r.url,
  title: r.title,
  description: r.description?.substring(0, 100) || '', // Truncate descriptions to save tokens
  category: r.category,
  resourceFormat: r.resourceFormat
})), null, 2)}

Please provide ${Math.min(limit, 8)} personalized recommendations. For each recommendation, provide:
1. resourceId (the URL, exactly as listed)
2. score (0-1, how well it matches the user)
3. reason (why you recommend this specific resource)
4. confidenceLevel (0-1, how confident you are in this match)`;

    const { data: result } = await createStructuredMessage(AIRecommendationSchema, {
      model: resolveFlowModel('recommendations'),
      system: "You are an expert at analyzing user preferences and recommending video development resources. Focus on matching user skill level, learning goals, and preferred categories. Provide thoughtful, personalized explanations for each recommendation.",
      user: prompt,
      maxTokens: 2500,
      // User-facing latency budget; the caller falls back to rule-based results on timeout.
      timeoutMs: 25_000,
    });

    const recommendations: AIRecommendationResult[] = result.recommendations?.map((rec: AIRecommendationResponse) => {
      const resource = availableResources.find(r => r.url === rec.resourceId);
      if (!resource) {
        const explanation: RecommendationExplanation = {
          summary: 'Resource is no longer available',
          signals: [],
        };
        return {
          resourceId: rec.resourceId,
          score: 0,
          reason: 'Resource is no longer available',
          category: 'Unknown',
          confidenceLevel: 0,
          aiGenerated: true,
          explanation,
        };
      }
      const skillScore = calculateSkillMatch(resource, userProfile.skillLevel);
      const goalsScore = calculateGoalsMatch(resource, userProfile.learningGoals);
      const typeScore = calculateTypeMatch(resource, userProfile.preferredResourceTypes);
      const timeScore = calculateTimeCommitmentMatch(resource, userProfile.timeCommitment);
      const preferenceScore =
        skillScore * 0.25 + goalsScore * 0.3 + typeScore * 0.25 + timeScore * 0.2;
      const score = Math.max(0, Math.min(1, (rec.score || 0.5) * 0.55 + preferenceScore * 0.45));
      const explanation = buildRecommendationExplanation(resource, userProfile, {
        skillScore,
        goalsScore,
        typeScore,
        timeScore,
      });
      return {
        resourceId: rec.resourceId,
        score,
        reason: explanation.summary,
        category: resource.category || 'Unknown',
        confidenceLevel: Math.max(0, Math.min(1, rec.confidenceLevel || 0.7)),
        aiGenerated: true,
        explanation,
      };
    }) || [];

    return recommendations;

  } catch (error: unknown) {
    if (error instanceof StructuredOutputError) {
      console.error(`AI recommendation structured output failed (${error.reason}): ${error.message}`);
    } else {
      console.error('AI recommendation generation failed:', error);
    }
    console.warn('Falling back to rule-based recommendations');
    return generateFallbackRecommendations(userProfile, availableResources, limit);
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

    // NB-007 (run18): score from ALL advertised inputs via the shared
    // helpers (previously goals used a naive joined-string match and
    // preferred resource types were ignored entirely).
    const skillScore = calculateSkillMatch(resource, userProfile.skillLevel);
    const goalsScore = calculateGoalsMatch(resource, userProfile.learningGoals);
    const typeScore = calculateTypeMatch(resource, userProfile.preferredResourceTypes);
    const timeScore = calculateTimeCommitmentMatch(resource, userProfile.timeCommitment);
    let score = 0;
    if (userProfile.preferredCategories.includes(resource.category || '')) {
      score += 0.3;
    }
    score +=
      skillScore * 0.2 + goalsScore * 0.2 + typeScore * 0.15 + timeScore * 0.15;

    if (score > 0.2) {
      const explanation = buildRecommendationExplanation(resource, userProfile, {
        skillScore,
        goalsScore,
        typeScore,
        timeScore,
      });
      recommendations.push({
        resourceId: resource.url,
        score,
        // NB-042 (run18): one deterministic reason per (resource, profile).
        reason: explanation.summary,
        category: resource.category || 'Unknown',
        // Confidence tracks the actual match strength instead of a flat 0.6.
        confidenceLevel: Math.min(0.9, Math.max(0.4, 0.35 + score * 0.55)),
        aiGenerated: false,
        explanation,
      });
    }
  });
  
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
