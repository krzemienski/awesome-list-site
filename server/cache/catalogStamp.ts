/**
 * Cross-instance freshness for the process-local public cache.
 *
 * invalidatePublicCache() clears only the process that handled the write, so on
 * Autoscale another instance would keep serving an edited or withdrawn page
 * until its TTL (route-meta: 6 h). A serving instance therefore reads one
 * fingerprint of the catalog tables, at most once per interval, and clears its
 * own cache when the fingerprint differs from the last one it saw.
 *
 * There is no timer: the read starts from a cache read that finds the last
 * check older than the interval, so an instance that serves nothing makes no
 * query (Neon can scale to zero). The read never delays the request that
 * started it; that request is served from cache as before, and the clear lands
 * when the read resolves.
 */
import { pool } from "../db";
import { createLogger } from "../lib/logger";

const logger = createLogger("public-cache-stamp");

export const CATALOG_STAMP_INTERVAL_MS = 30_000;

// One round trip. Small tables are hashed whole, so a rename or reorder moves
// the stamp whether or not the writer bumped updated_at. resources is the large
// table: its aggregate covers every edit (all of them set updated_at), every
// create and delete (count), publication (approved count) and the boot-time
// kind backfill (count of stored kinds), which leaves updated_at alone.
// resource_tags has no row-level stamp; count plus an id sum moves on any
// assignment, removal or swap.
const CATALOG_STAMP_SQL = `
  SELECT concat_ws('|',
    (SELECT concat_ws(':', count(*), count(kind),
        count(*) FILTER (WHERE status = 'approved'), max(updated_at)) FROM resources),
    (SELECT md5(coalesce(string_agg(c::text, ',' ORDER BY c.id), '')) FROM categories c),
    (SELECT md5(coalesce(string_agg(s::text, ',' ORDER BY s.id), '')) FROM subcategories s),
    (SELECT md5(coalesce(string_agg(s::text, ',' ORDER BY s.id), '')) FROM sub_subcategories s),
    (SELECT md5(coalesce(string_agg(t::text, ',' ORDER BY t.id), '')) FROM tags t),
    (SELECT concat_ws(':', count(*), coalesce(sum(resource_id::bigint * 1000003 + tag_id), 0))
       FROM resource_tags),
    (SELECT md5(coalesce(string_agg(j::text, ',' ORDER BY j.id), '')) FROM learning_journeys j),
    (SELECT md5(coalesce(string_agg(s::text, ',' ORDER BY s.id), '')) FROM journey_steps s)
  ) AS stamp
`;

let lastCheckStartedAt = 0;
let checking = false;
let lastStamp: string | undefined;

async function checkCatalogStamp(onChange: () => void): Promise<void> {
  try {
    const result = await pool.query<{ stamp: string }>(CATALOG_STAMP_SQL);
    const stamp = result.rows[0].stamp;
    // The first reading has no earlier one to compare with. Entries cached
    // before it resolved may predate a write it already contains, so clear once.
    if (stamp !== lastStamp) onChange();
    lastStamp = stamp;
  } catch (error) {
    // A failed read changes nothing: the next due cache read tries again, and
    // the cache never serves invented data because the check could not run.
    logger.warn("Catalog stamp check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    checking = false;
  }
}

/**
 * Start one background stamp read when this process has not checked for
 * CATALOG_STAMP_INTERVAL_MS. Synchronous and non-blocking: callers do not wait
 * for it. At most one read is in flight, and a failed read also waits out the
 * interval, so a down database is not probed on every request.
 */
export function refreshCatalogStampIfDue(onChange: () => void): void {
  const now = Date.now();
  if (checking || now - lastCheckStartedAt < CATALOG_STAMP_INTERVAL_MS) return;
  checking = true;
  lastCheckStartedAt = now;
  void checkCatalogStamp(onChange);
}
