import type { Resource } from "@shared/schema";

/**
 * Related Resources service
 *
 * Pure, dependency-free scoring used by GET /api/resources/:id/related.
 * Given the current resource and a candidate pool (approved resources in the
 * same category), it produces three buckets the UI renders as tabs:
 *
 * - similar:       closest matches by sub-subcategory / subcategory / keyword overlap
 * - prerequisites: introductory material in the same area (keyword heuristic)
 * - nextSteps:     advanced material in the same area (keyword heuristic)
 *
 * Ranked candidates need a real relevance signal (same sub-subcategory, same
 * subcategory, or enough rare shared terms). Shared terms are weighted by how
 * rare they are across the pool, so "hevc" counts and "guide" does not. When
 * fewer than `limit` candidates qualify, `similar` is padded with the
 * category's other resources; the other buckets may hold fewer than `limit`
 * items, or none.
 *
 * All fields are derived from real resource data; there is no external call.
 */

/** A resource row without the generated search column, which ranking never reads. */
export type RelatedCandidate = Omit<Resource, "searchTsv">;

export interface RelatedItem {
  resource: RelatedCandidate;
  /** 1-100 relevance score */
  score: number;
  /** 1-100 confidence (mirrors score) */
  confidence: number;
  /** Human-readable explanations shown in the UI */
  reasons: string[];
  relationshipType: "similar" | "prerequisite" | "next-step";
}

export interface RelatedResourcesResult {
  similar: RelatedItem[];
  prerequisites: RelatedItem[];
  nextSteps: RelatedItem[];
  totalFound: number;
}

const PREREQ_RE =
  /\b(intro|introduction|introductory|beginner|beginners|basic|basics|fundamental|fundamentals|getting[\s-]?started|primer|101|overview|tutorial|guide|learn|crash[\s-]?course)\b/i;

const NEXT_RE =
  /\b(advanced|deep[\s-]?dive|internals|expert|master|mastering|optimization|optimize|optimizing|performance|scaling|architecture|reference|in[\s-]?depth|production|professional)\b/i;

const STOP_WORDS = new Set([
  "this", "that", "with", "from", "your", "into", "using", "used", "uses",
  "the", "and", "for", "are", "you", "how", "all", "can", "will", "features",
  "feature", "support", "supports", "based", "video", "resource", "resources",
]);

/** A term present in more than this share of the pool carries no signal. */
const COMMON_TERM_SHARE = 0.1;
/** A term in both titles is a topic, not filler: its weight is multiplied. */
const SHARED_TITLE_BOOST = 2;
/**
 * Summed rarity weight of shared terms needed to count as related, and at
 * least one of them must come from the current title: two rare words that
 * only meet in descriptions ("other", "provide") are coincidence, not topic.
 */
const KEYWORD_FLOOR = 1.2;
/** Rarity weight a shared term adds to the score, capped. */
const KEYWORD_SCORE_PER_WEIGHT = 0.12;
const KEYWORD_SCORE_CAP = 0.35;
const MAX_TERM_REASONS = 3;
/** Score of a same-category filler: below every ranked match (which all score at least 0.15 + a signal). */
const CATEGORY_FILL_SCORE = 0.1;

function tokenize(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w)),
  );
}

/** 0 for terms common across the pool, up to 1 for a term only a few resources use. */
function rarityWeights(docs: Set<string>[]): (term: string) => number {
  const docFreq = new Map<string, number>();
  for (const doc of docs) for (const t of doc) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
  const total = docs.length;
  return (term) => {
    const df = docFreq.get(term) ?? 0;
    if (df === 0 || df / total > COMMON_TERM_SHARE) return 0;
    return Math.log((total + 1) / (df + 1)) / Math.log(total + 1);
  };
}

interface Scored {
  resource: RelatedCandidate;
  rawScore: number;
  reasons: string[];
}

function toItem(
  scored: Scored,
  relationshipType: RelatedItem["relationshipType"],
  extraReason?: string,
): RelatedItem {
  const score = Math.max(1, Math.min(100, Math.round(scored.rawScore * 100)));
  const reasons = extraReason
    ? [extraReason, ...scored.reasons].slice(0, 3)
    : scored.reasons.slice(0, 3);
  return {
    resource: scored.resource,
    score,
    confidence: score,
    reasons,
    relationshipType,
  };
}

/**
 * Build the three related-resource buckets for a resource.
 * @param current - The resource being viewed.
 * @param pool - Approved resources of the same category, most recently updated first.
 * @param limit - Max items per bucket (default 5).
 */
export function buildRelatedResources(
  current: RelatedCandidate,
  pool: RelatedCandidate[],
  limit = 5,
): RelatedResourcesResult {
  const candidates = pool.filter((r) => r.id !== current.id);
  const currentTokens = tokenize(`${current.title} ${current.description}`);
  const currentTitleTokens = tokenize(current.title);
  const candidateTokens = candidates.map((r) => tokenize(`${r.title} ${r.description}`));
  const weightOf = rarityWeights([currentTokens, ...candidateTokens]);

  const scored: Scored[] = [];
  candidates.forEach((r, i) => {
    const reasons: string[] = [];
    let rawScore = 0;
    let related = false;

    if (current.subSubcategory && r.subSubcategory === current.subSubcategory) {
      rawScore += 0.5;
      related = true;
      reasons.push(`Same topic: ${r.subSubcategory}`);
    }
    if (current.subcategory && r.subcategory === current.subcategory) {
      rawScore += 0.3;
      related = true;
      reasons.push(`Same subcategory: ${r.subcategory}`);
    }

    const titleTokens = tokenize(r.title);
    const shared = [...candidateTokens[i]]
      .filter((t) => currentTokens.has(t))
      .map((t) => ({
        term: t,
        weight: weightOf(t) * (currentTitleTokens.has(t) && titleTokens.has(t) ? SHARED_TITLE_BOOST : 1),
      }))
      .filter((t) => t.weight > 0)
      .sort((a, b) => b.weight - a.weight);
    const sharedWeight = shared.reduce((sum, t) => sum + t.weight, 0);
    if (sharedWeight >= KEYWORD_FLOOR && shared.some((t) => currentTitleTokens.has(t.term))) {
      related = true;
      rawScore += Math.min(KEYWORD_SCORE_CAP, sharedWeight * KEYWORD_SCORE_PER_WEIGHT);
      const terms = shared.slice(0, MAX_TERM_REASONS).map((t) => t.term);
      reasons.push(`Shared topic terms: ${terms.join(", ")}`);
    }

    if (!related) return;
    if (r.category === current.category) rawScore += 0.15;
    scored.push({ resource: r, rawScore, reasons });
  });

  const bySimilarity = [...scored].sort((a, b) => b.rawScore - a.rawScore);

  const similar = bySimilarity.slice(0, limit).map((s) => toItem(s, "similar"));
  if (similar.length < limit) {
    // Never leave a resource without neighbours while its category has others:
    // pad with the category's most recently updated resources.
    const chosen = new Set(similar.map((s) => s.resource.id));
    for (const r of candidates) {
      if (similar.length >= limit) break;
      if (chosen.has(r.id)) continue;
      similar.push(toItem({ resource: r, rawScore: CATEGORY_FILL_SCORE, reasons: [`Same category: ${r.category}`] }, "similar"));
    }
  }
  const similarIds = new Set(similar.map((s) => s.resource.id));

  const rest = bySimilarity.filter((s) => !similarIds.has(s.resource.id));

  const prerequisites = rest
    .filter((s) => PREREQ_RE.test(`${s.resource.title} ${s.resource.description}`))
    .slice(0, limit)
    .map((s) =>
      toItem(
        s,
        "prerequisite",
        `Introductory material in ${s.resource.subcategory || s.resource.category}`,
      ),
    );
  const prereqIds = new Set(prerequisites.map((s) => s.resource.id));

  const nextSteps = rest
    .filter(
      (s) =>
        !prereqIds.has(s.resource.id) &&
        NEXT_RE.test(`${s.resource.title} ${s.resource.description}`),
    )
    .slice(0, limit)
    .map((s) =>
      toItem(
        s,
        "next-step",
        `Advanced material in ${s.resource.subcategory || s.resource.category}`,
      ),
    );

  return {
    similar,
    prerequisites,
    nextSteps,
    totalFound: similar.length + prerequisites.length + nextSteps.length,
  };
}
