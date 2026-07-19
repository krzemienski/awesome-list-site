/**
 * ============================================================================
 * ENSURE SUB-SUBCATEGORY HELPER
 * ============================================================================
 *
 * Auto-create the `sub_subcategories` row implied by a resource write so that
 * a free-form `subSubcategory` tag on a resource can never again drift out of
 * sync with the hierarchy table. This is the write-time guard for the gap that
 * task #55 backfilled and task #57 is meant to prevent from re-occurring.
 *
 * Behavior (return value added for Run21 R4-037):
 * - Returns `true` when the resource's subSubcategory label will resolve to a
 *   real node under its own category > subcategory chain (existing row, slug
 *   match, or a row we just created) — or when there is no subSubcategory to
 *   contain at all.
 * - Returns `false` when the label CANNOT be contained: missing/unknown
 *   category or subcategory, or the global-duplicate guard blocks creating a
 *   copy here. Callers must then store `subSubcategory = null` instead of
 *   persisting an orphan label that only the tree builder's fold hides.
 * - If the parent `subcategoryName` is missing or doesn't match a row under
 *   `categoryName` → no auto-create (level-1/level-2 creation stays
 *   admin-driven).
 * - Idempotent against the unique (slug, subcategory_id) constraint.
 * ============================================================================
 */

import { CategoryRepository } from './CategoryRepository';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

export async function ensureSubSubcategoryExists(
  categoryRepo: CategoryRepository,
  categoryName: string | null | undefined,
  subcategoryName: string | null | undefined,
  subSubcategoryName: string | null | undefined,
): Promise<boolean> {
  if (!subSubcategoryName || !subSubcategoryName.trim()) return true;
  // A subSubcategory label without a full parent chain can never be contained.
  if (!categoryName || !subcategoryName) return false;

  const trimmedSubSub = subSubcategoryName.trim();

  const category = await categoryRepo.getCategoryByName(categoryName);
  if (!category) return false;

  const subcategory = await categoryRepo.getSubcategoryByName(subcategoryName, category.id);
  if (!subcategory) return false;

  const existing = await categoryRepo.getSubSubcategoryByName(trimmedSubSub, subcategory.id);
  if (existing) return true;

  const slug = generateSlug(trimmedSubSub);

  // A row with a different display name can still occupy the same slug
  // (e.g. resource text "iOStvOS" vs hierarchy row "iOS/tvOS" both slugify to
  // "iostvos"). The unique constraint is on (slug, subcategory_id), so treat a
  // slug match as "already exists" rather than attempting a doomed insert.
  const existingBySlug = await categoryRepo.getSubSubcategoryBySlug(slug, subcategory.id);
  if (existingBySlug) return true;

  // BUG-003 (run19) recurrence guard: if a same-named (case-insensitive) or
  // same-slug row exists ANYWHERE in the taxonomy, do NOT create another copy
  // under this subcategory — that is exactly how the per-import duplicate
  // groups (HLS x11, FFmpeg x10) were born. Run21 R4-037: callers now null
  // the label out instead of storing an orphan the tree builder must fold.
  const globalDup = await categoryRepo.findSubSubcategoryDuplicateGlobal(trimmedSubSub, slug);
  if (globalDup) return false;

  try {
    await categoryRepo.createSubSubcategory({
      name: trimmedSubSub,
      slug,
      subcategoryId: subcategory.id,
    });
    return true;
  } catch (err) {
    // Race / unique-constraint: another writer just created it. Verify by slug
    // (name may differ for the same slug) and swallow if the row is present.
    const after = await categoryRepo.getSubSubcategoryBySlug(slug, subcategory.id);
    if (!after) throw err;
    return true;
  }
}
