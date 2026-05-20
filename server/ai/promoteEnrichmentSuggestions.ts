/**
 * ============================================================================
 * PROMOTE AI ENRICHMENT SUGGESTIONS ONTO RESOURCE HIERARCHY
 * ============================================================================
 *
 * The batch enrichment pipeline always stashes Claude's category /
 * subcategory / sub-subcategory guesses inside `metadata` (so they're
 * available for later review). On top of that, we promote those guesses onto
 * the resource's real hierarchy columns whenever those columns are empty,
 * so the resource becomes browsable through category drilldowns instead of
 * being stranded with only metadata hints.
 *
 * Any promotion path that would land a new sub-subcategory on a resource
 * routes through `ensureSubSubcategoryExists` (the same guard used by the
 * admin POST/PUT resource routes) so the matching `sub_subcategories` row is
 * auto-created. Without that, a promoted sub-subcategory would silently
 * drift from the hierarchy table and never appear in category browsing.
 *
 * Notes:
 * - `resource.category` is NOT NULL in the schema, so we only fall back to
 *   the AI suggestion when the existing value is blank/whitespace.
 * - We never overwrite a non-empty hierarchy column — user / admin curation
 *   always wins over an AI guess.
 * - When nothing can be promoted (no useful suggestions, or all columns are
 *   already filled), we still pass the resolved (category, subcategory,
 *   subSubcategory) triple to the guard so a legacy-but-now-resolvable
 *   sub-subcategory row gets backfilled too. The guard is a no-op in the
 *   common case.
 * ============================================================================
 */

import type { CategoryRepository } from '../repositories/CategoryRepository';
import { ensureSubSubcategoryExists } from '../repositories/ensureSubSubcategory';

export interface PromotableResource {
  category: string | null | undefined;
  subcategory: string | null | undefined;
  subSubcategory: string | null | undefined;
}

export interface PromotableSuggestions {
  category?: string | null;
  subcategory?: string | null;
  subSubcategory?: string | null;
}

export interface PromotionResult {
  category?: string;
  subcategory?: string;
  subSubcategory?: string;
}

function nonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Compute the hierarchy-column updates implied by promoting AI suggestions
 * onto `resource`, and ensure the matching `sub_subcategories` row exists.
 *
 * Returns only the columns that should actually be written. Callers should
 * merge the returned partial onto their existing `updates` payload before
 * calling `ResourceRepository.updateResource`.
 */
export async function promoteEnrichmentSuggestions(
  categoryRepo: CategoryRepository,
  resource: PromotableResource,
  suggestions: PromotableSuggestions,
): Promise<PromotionResult> {
  const updates: PromotionResult = {};

  const existingCategory = nonEmpty(resource.category);
  const existingSubcategory = nonEmpty(resource.subcategory);
  const existingSubSubcategory = nonEmpty(resource.subSubcategory);

  const suggestedCategory = nonEmpty(suggestions.category);
  const suggestedSubcategory = nonEmpty(suggestions.subcategory);
  const suggestedSubSubcategory = nonEmpty(suggestions.subSubcategory);

  const finalCategory = existingCategory ?? suggestedCategory;
  if (!existingCategory && suggestedCategory) {
    updates.category = suggestedCategory;
  }

  const finalSubcategory = existingSubcategory ?? suggestedSubcategory;
  if (!existingSubcategory && suggestedSubcategory) {
    updates.subcategory = suggestedSubcategory;
  }

  const finalSubSubcategory = existingSubSubcategory ?? suggestedSubSubcategory;
  if (!existingSubSubcategory && suggestedSubSubcategory) {
    updates.subSubcategory = suggestedSubSubcategory;
  }

  await ensureSubSubcategoryExists(
    categoryRepo,
    finalCategory,
    finalSubcategory,
    finalSubSubcategory,
  );

  return updates;
}
