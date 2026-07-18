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
 * Behavior:
 * - If `subSubcategoryName` is null/empty/whitespace → no-op.
 * - If the parent `subcategoryName` is missing or doesn't match a row under
 *   `categoryName` → no-op (we only auto-create level-3 rows under an existing
 *   level-2 row; level-1/level-2 creation stays admin-driven).
 * - If a matching `sub_subcategories` row already exists → no-op.
 * - Otherwise insert a row with a slugified name under the resolved subcategory.
 *   Idempotent against the unique (slug, subcategory_id) constraint.
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
): Promise<void> {
  if (!categoryName || !subcategoryName) return;
  if (!subSubcategoryName || !subSubcategoryName.trim()) return;

  const trimmedSubSub = subSubcategoryName.trim();

  const category = await categoryRepo.getCategoryByName(categoryName);
  if (!category) return;

  const subcategory = await categoryRepo.getSubcategoryByName(subcategoryName, category.id);
  if (!subcategory) return;

  const existing = await categoryRepo.getSubSubcategoryByName(trimmedSubSub, subcategory.id);
  if (existing) return;

  const slug = generateSlug(trimmedSubSub);

  // A row with a different display name can still occupy the same slug
  // (e.g. resource text "iOStvOS" vs hierarchy row "iOS/tvOS" both slugify to
  // "iostvos"). The unique constraint is on (slug, subcategory_id), so treat a
  // slug match as "already exists" rather than attempting a doomed insert.
  const existingBySlug = await categoryRepo.getSubSubcategoryBySlug(slug, subcategory.id);
  if (existingBySlug) return;

  // BUG-003 (run19) recurrence guard: if a same-named (case-insensitive) or
  // same-slug row exists ANYWHERE in the taxonomy, do NOT create another copy
  // under this subcategory — that is exactly how the per-import duplicate
  // groups (HLS x11, FFmpeg x10) were born. The tree builder folds a resource
  // whose subSubcategory string has no node under its own subcategory into
  // that subcategory node, so the resource stays visible and counted.
  const globalDup = await categoryRepo.findSubSubcategoryDuplicateGlobal(trimmedSubSub, slug);
  if (globalDup) return;

  try {
    await categoryRepo.createSubSubcategory({
      name: trimmedSubSub,
      slug,
      subcategoryId: subcategory.id,
    });
  } catch (err) {
    // Race / unique-constraint: another writer just created it. Verify by slug
    // (name may differ for the same slug) and swallow if the row is present.
    const after = await categoryRepo.getSubSubcategoryBySlug(slug, subcategory.id);
    if (!after) throw err;
  }
}
