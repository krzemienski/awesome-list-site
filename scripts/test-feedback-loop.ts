/**
 * Regression test: feedback (like / dislike) must keep shaping recommendations.
 *
 * WHY THIS EXISTS
 * ---------------
 * A user's like/dislike only moves future recommendations because the engine
 * reads persisted interactions back via `storage.getUserInteractions`. That read
 * method was missing at one point and the engine silently fell back to an empty
 * list (guarded by `typeof ... === 'function'`), so ratings were written but never
 * used — the whole "learning" loop was dead with no error surfaced. This test
 * fails loudly if that ever regresses (a rename, refactor, or removed method).
 *
 * WHAT IT PROVES
 * --------------
 *  1. `storage.getUserInteractions(userId)` returns the persisted 'rate' rows
 *     produced by `recommendationEngine.recordDetailedFeedback`.
 *  2. Repeated dislikes on one category demote *non-rated* resources in that same
 *     category relative to an identical control category the user did not dislike.
 *
 * SAFETY
 * ------
 * This runs against the live/dev database. It ONLY creates and removes rows whose
 * ids/emails/urls/categories are prefixed with `__qa_test_` and self-cleans those
 * (including any residue from earlier aborted runs) before and after the run.
 * Nothing belonging to real users or resources is touched.
 *
 * Run: `tsx scripts/test-feedback-loop.ts`
 * Exits 0 on success, 1 on any assertion failure.
 */

import { sql } from 'drizzle-orm';
import { db, pool } from '../server/db';
import { storage } from '../server/storage';
import { recommendationEngine, UserProfile } from '../server/ai/recommendationEngine';
import { claudeService } from '../server/ai/claudeService';

const QA_PREFIX = '__qa_test_';
const RUN_ID = `${QA_PREFIX}feedback_${Date.now()}`;

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
  } else {
    console.error(`  ❌ ${message}`);
    failures += 1;
  }
}

/**
 * Remove every `__qa_test_` row in FK-safe order. Audit rows first because their
 * FKs are ON DELETE SET NULL (deleting the user/resource would orphan them and
 * make them un-findable by the prefix afterwards).
 */
async function purgeQaRows() {
  await db.execute(
    sql`DELETE FROM resource_audit_log WHERE performed_by LIKE ${QA_PREFIX + '%'}`
  );
  await db.execute(
    sql`DELETE FROM user_interactions WHERE user_id LIKE ${QA_PREFIX + '%'}`
  );
  await db.execute(
    sql`DELETE FROM resources WHERE url LIKE ${'https://example.com/' + QA_PREFIX + '%'} OR category LIKE ${QA_PREFIX + '%'}`
  );
  await db.execute(
    sql`DELETE FROM users WHERE id LIKE ${QA_PREFIX + '%'} OR email LIKE ${QA_PREFIX + '%'}`
  );
}

async function main() {
  console.log(`\n🧪 Feedback-loop regression test (run ${RUN_ID})\n`);

  // Force the deterministic rule-based path. With a live ANTHROPIC_API_KEY the
  // engine would fetch AI recommendations first, making the demotion assertion
  // non-deterministic. Ratings still flow into the AI path via enrichedProfile,
  // but this test targets the scoring layer we can assert on precisely.
  (claudeService as any).isAvailable = () => false;

  // Clean any residue from earlier runs before we start.
  await purgeQaRows();

  // --- Arrange: throwaway user + two identical categories of resources --------
  const catDisliked = `${QA_PREFIX}cat_disliked_${Date.now()}`;
  const catControl = `${QA_PREFIX}cat_control_${Date.now()}`;

  const [user] = await db
    .insert((await import('../shared/schema')).users)
    .values({
      id: RUN_ID,
      email: `${RUN_ID}@example.com`,
      firstName: 'QA',
      lastName: 'Feedback',
      role: 'user',
    })
    .returning();

  // Identical descriptions across both categories so baseline scoring is equal;
  // the ONLY difference between the two probe resources will be the category the
  // user disliked.
  const desc =
    'An intermediate practical guide and hands-on workshop for building things.';

  async function makeResource(category: string, slug: string, title: string) {
    return storage.createResource({
      title,
      url: `https://example.com/${RUN_ID}_${slug}`,
      description: desc,
      category,
      status: 'approved',
    } as any);
  }

  // Three resources in the disliked category that will receive dislikes...
  const disliked1 = await makeResource(catDisliked, 'd1', `${QA_PREFIX} disliked one`);
  const disliked2 = await makeResource(catDisliked, 'd2', `${QA_PREFIX} disliked two`);
  const disliked3 = await makeResource(catDisliked, 'd3', `${QA_PREFIX} disliked three`);
  // ...and one NON-rated probe in the same category whose score we watch.
  const probeDisliked = await makeResource(catDisliked, 'dp', `${QA_PREFIX} disliked probe`);
  // A NON-rated control probe in an identical, un-disliked category.
  const probeControl = await makeResource(catControl, 'cp', `${QA_PREFIX} control probe`);

  const profile: UserProfile = {
    userId: user.id,
    // Both categories preferred so both probes clear the rule-based threshold and
    // start from an identical baseline score.
    preferredCategories: [catDisliked, catControl],
    skillLevel: 'intermediate',
    learningGoals: [],
    preferredResourceTypes: [],
    timeCommitment: 'flexible',
    viewHistory: [],
    bookmarks: [],
    completedResources: [],
    ratings: {},
    completedJourneys: [],
    journeyProgress: [],
  };

  // --- Act: record repeated dislikes on the disliked category -----------------
  for (const r of [disliked1, disliked2, disliked3]) {
    await recommendationEngine.recordDetailedFeedback(user.id, r.id, 'not_helpful', {
      recommendationType: 'rule_based',
      position: 0,
    });
  }

  // --- Assert 1: interactions were persisted and are readable -----------------
  const interactions = await storage.getUserInteractions(user.id);
  const rateRows = interactions.filter(
    (i) => i.interactionType === 'rate' && i.interactionValue !== null
  );
  assert(
    rateRows.length === 3,
    `storage.getUserInteractions returns the 3 persisted 'rate' rows (got ${rateRows.length})`
  );
  assert(
    rateRows.every((r) => r.interactionValue === 1),
    `each dislike persisted as a negative rating (value 1)`
  );
  const ratedResourceIds = new Set(rateRows.map((r) => r.resourceId));
  assert(
    [disliked1, disliked2, disliked3].every((r) => ratedResourceIds.has(r.id)),
    `the 'rate' rows point at the three disliked resources`
  );

  // --- Assert 2: dislikes demote the non-rated probe in that category ---------
  const { recommendations } = await recommendationEngine.generateRecommendations(
    profile,
    100,
    true // force refresh — bypass the 5-minute cache
  );

  const recByUrl = new Map(recommendations.map((r) => [r.resource.url, r]));
  const dislikedRec = recByUrl.get(probeDisliked.url);
  const controlRec = recByUrl.get(probeControl.url);

  assert(!!dislikedRec, `non-rated probe in the disliked category is still recommended`);
  assert(!!controlRec, `non-rated probe in the control category is recommended`);

  if (dislikedRec && controlRec) {
    console.log(
      `     disliked-category probe confidence = ${dislikedRec.confidence}, ` +
        `control-category probe confidence = ${controlRec.confidence}`
    );
    assert(
      dislikedRec.confidence < controlRec.confidence,
      `disliked category's non-rated resource scores LOWER than the identical control resource`
    );
  }

  // --- Cleanup ---------------------------------------------------------------
  await purgeQaRows();

  // Verify cleanup actually removed everything we created.
  const leftover = await db.execute(
    sql`SELECT
          (SELECT count(*) FROM users WHERE id LIKE ${QA_PREFIX + '%'}) AS users,
          (SELECT count(*) FROM resources WHERE url LIKE ${'https://example.com/' + QA_PREFIX + '%'}) AS resources,
          (SELECT count(*) FROM user_interactions WHERE user_id LIKE ${QA_PREFIX + '%'}) AS interactions,
          (SELECT count(*) FROM resource_audit_log WHERE performed_by LIKE ${QA_PREFIX + '%'}) AS audit`
  );
  const counts = (leftover.rows?.[0] ?? {}) as Record<string, any>;
  const totalLeft =
    Number(counts.users || 0) +
    Number(counts.resources || 0) +
    Number(counts.interactions || 0) +
    Number(counts.audit || 0);
  assert(totalLeft === 0, `all __qa_test_ rows cleaned up (leftover=${totalLeft})`);

  console.log(
    failures === 0
      ? `\n✅ PASS — feedback keeps shaping recommendations.\n`
      : `\n❌ FAIL — ${failures} assertion(s) failed.\n`
  );
}

main()
  .catch(async (err) => {
    console.error('\n💥 Test crashed:', err);
    failures += 1;
    try {
      await purgeQaRows();
    } catch (cleanupErr) {
      console.error('Cleanup after crash failed:', cleanupErr);
    }
  })
  .finally(async () => {
    await pool.end();
    process.exit(failures === 0 ? 0 : 1);
  });
