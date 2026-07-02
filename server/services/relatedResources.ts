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
 * All fields are derived from real resource data; there is no external call.
 */

export interface RelatedItem {
  resource: Resource;
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

function tokenize(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );
}

interface Scored {
  resource: Resource;
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
 * @param pool - Candidate resources (typically approved, same category).
 * @param limit - Max items per bucket (default 5).
 */
export function buildRelatedResources(
  current: Resource,
  pool: Resource[],
  limit = 5,
): RelatedResourcesResult {
  const candidates = pool.filter((r) => r.id !== current.id);
  const currentTokens = tokenize(`${current.title} ${current.description}`);

  const scored: Scored[] = candidates.map((r) => {
    const reasons: string[] = [];
    let rawScore = 0;

    if (current.subSubcategory && r.subSubcategory === current.subSubcategory) {
      rawScore += 0.5;
      reasons.push(`Same topic: ${r.subSubcategory}`);
    }
    if (current.subcategory && r.subcategory === current.subcategory) {
      rawScore += 0.3;
      reasons.push(`Same subcategory: ${r.subcategory}`);
    }
    if (r.category === current.category) {
      rawScore += 0.15;
    }

    const rTokens = tokenize(`${r.title} ${r.description}`);
    let overlap = 0;
    for (const t of rTokens) if (currentTokens.has(t)) overlap++;
    if (overlap > 0) {
      rawScore += Math.min(0.35, overlap * 0.05);
      reasons.push(`${overlap} shared keyword${overlap > 1 ? "s" : ""}`);
    }

    if (reasons.length === 0) reasons.push(`Also in ${r.category}`);

    return { resource: r, rawScore, reasons };
  });

  const bySimilarity = [...scored].sort((a, b) => b.rawScore - a.rawScore);

  const similar = bySimilarity.slice(0, limit).map((s) => toItem(s, "similar"));
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
