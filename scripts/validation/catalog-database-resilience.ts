/**
 * Real-system validation for Task 302.
 *
 * Uses the development database and running app (no mocks):
 * 1. proves 20 concurrent catalog misses coalesce into one rebuild;
 * 2. proves a repository taxonomy mutation is visible immediately and cleanup
 *    is visible immediately;
 * 3. holds ACCESS EXCLUSIVE on resources and proves readiness and an
 *    interactive catalog query fail with bounded 503 responses, including
 *    cache admission pressure across distinct SSR routes;
 * 4. proves a blocked repository write is server-cancelled and never appears
 *    later, then proves readiness recovers after releasing the lock.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import { categories, resources } from "@shared/schema";
import { db, pool } from "../../server/db";
import {
  getPublicCacheSnapshot,
  getPublicCacheValue,
  invalidatePublicCache,
} from "../../server/cache/publicCache";
import { CategoryRepository } from "../../server/repositories/CategoryRepository";
import { LegacyRepository } from "../../server/repositories/LegacyRepository";
import { ResourceRepository } from "../../server/repositories/ResourceRepository";
import { isDatabaseUnavailableError } from "../../server/db/errors";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5000";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function fetchTimed(path: string) {
  const startedAt = Date.now();
  const response = await fetch(`${BASE_URL}${path}`);
  return { response, durationMs: Date.now() - startedAt };
}

async function main() {
  assert(process.env.DATABASE_URL, "DATABASE_URL is required");
  assert(process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD is required");
  const legacyRepo = new LegacyRepository();
  const categoryRepo = new CategoryRepository();
  const resourceRepo = new ResourceRepository();

  const token = randomUUID().replace(/-/g, "").slice(0, 14);
  const categoryName = `__resilience_probe_${token}`;
  const categorySlug = `resilience-probe-${token}`;
  const resourceUrl = `https://resilience-probe.invalid/${token}`;
  let createdCategoryId: number | undefined;

  try {
    const login = await fetch(`${BASE_URL}/api/auth/local/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        email: "admin@example.com",
        password: process.env.ADMIN_PASSWORD,
      }),
    });
    assert(login.status === 200, `admin login failed (${login.status})`);
    const adminCookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
    assert(adminCookie, "admin login returned no session cookie");

    invalidatePublicCache("manual");
    const before = getPublicCacheSnapshot();
    const beforeTree = (before.namespaces["catalog-tree"] ?? {
      rebuilds: 0,
      coalesced: 0,
    }) as { rebuilds: number; coalesced: number };

    const concurrentTrees = await Promise.all(
      Array.from({ length: 20 }, () => legacyRepo.getAwesomeListFromDatabase()),
    );
    assert(
      concurrentTrees.every((tree) => tree === concurrentTrees[0]),
      "coalesced readers did not receive the same committed tree object",
    );
    const after = getPublicCacheSnapshot();
    const afterTree = after.namespaces["catalog-tree"] as {
      rebuilds: number;
      coalesced: number;
    };
    assert(
      afterTree.rebuilds - beforeTree.rebuilds === 1,
      `expected one tree rebuild, got ${afterTree.rebuilds - beforeTree.rebuilds}`,
    );
    assert(
      afterTree.coalesced - beforeTree.coalesced === 19,
      `expected 19 coalesced readers, got ${afterTree.coalesced - beforeTree.coalesced}`,
    );
    console.log("PASS cache coalescing: 20 readers, 1 rebuild, 19 coalesced");
    const relatedProbeId = concurrentTrees[0]?.resources?.[0]?.id;
    assert(relatedProbeId, "catalog has no resource for related-route lock probe");

    // Deterministically pause two derived cache loaders after both captured the
    // old tree. A real repository mutation then invalidates the generation.
    // Neither body nor nav may publish that old tree as a fresh entry.
    invalidatePublicCache("manual");
    let capturedCount = 0;
    let releaseCaptured!: () => void;
    let allCaptured!: () => void;
    const releasePromise = new Promise<void>((resolve) => {
      releaseCaptured = resolve;
    });
    const allCapturedPromise = new Promise<void>((resolve) => {
      allCaptured = resolve;
    });
    const loadDerived = async () => {
      const tree = await legacyRepo.getAwesomeListFromDatabase();
      if (capturedCount < 2) {
        capturedCount++;
        if (capturedCount === 2) allCaptured();
        await releasePromise;
      }
      return {
        hasProbe: tree.categories.some(
          (category) => category.slug === categorySlug,
        ),
      };
    };
    const derivedBody = getPublicCacheValue({
      namespace: "catalog-body",
      key: `mutation-race-${token}`,
      ttlMs: 60_000,
      load: loadDerived,
    });
    const derivedNav = getPublicCacheValue({
      namespace: "catalog-nav",
      key: `mutation-race-${token}`,
      ttlMs: 60_000,
      load: loadDerived,
    });
    await allCapturedPromise;
    try {
      const created = await categoryRepo.createCategory({
        name: categoryName,
        slug: categorySlug,
      });
      createdCategoryId = created.id;
    } finally {
      releaseCaptured();
    }
    const [bodyAfterCreate, navAfterCreate] = await Promise.all([
      derivedBody,
      derivedNav,
    ]);
    assert(
      bodyAfterCreate.hasProbe && navAfterCreate.hasProbe,
      "a derived cache published its pre-mutation tree after invalidation",
    );

    await categoryRepo.deleteCategory(createdCategoryId);
    createdCategoryId = undefined;
    const treeAfterDelete = await legacyRepo.getAwesomeListFromDatabase();
    assert(
      !treeAfterDelete.categories.some((category) => category.slug === categorySlug),
      "deleted taxonomy node remained visible after mutation",
    );
    console.log(
      "PASS mutation invalidation: racing body/nav rebuilds retried; create and delete visible immediately",
    );

    const lockerPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      application_name: "catalog-resilience-lock-holder",
    });
    const locker = await lockerPool.connect();
    try {
      await locker.query("BEGIN");
      await locker.query("LOCK TABLE resources IN ACCESS EXCLUSIVE MODE");
      // Avoid accepting a readiness result cached just before the lock.
      await new Promise((resolve) => setTimeout(resolve, 350));
      invalidatePublicCache("manual");

      const blockedWrite = resourceRepo
        .createResource({
          title: `Resilience write probe ${token}`,
          url: resourceUrl,
          description:
            "This validation row must never commit after its lock timeout.",
          category: "Uncategorized",
          status: "approved",
        })
        .then(
          () => ({ ok: true as const }),
          (error) => ({ ok: false as const, error }),
        );
      const blockedTree = legacyRepo.getAwesomeListFromDatabase().then(
        () => ({ ok: true as const }),
        (error) => ({ ok: false as const, error }),
      );
      const capacityLoads = Array.from({ length: 80 }, (_, index) =>
        getPublicCacheValue({
          namespace: "route-meta",
          key: `real-lock-capacity-${token}-${index}`,
          ttlMs: 60_000,
          load: async () => {
            const row = await db
              .select({ id: resources.id })
              .from(resources)
              .limit(1);
            return row[0]?.id ?? null;
          },
        }).then(
          () => ({ ok: true as const }),
          (error) => ({ ok: false as const, error }),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      const capacitySnapshot = getPublicCacheSnapshot();
      assert(
        capacitySnapshot.inFlight <= capacitySnapshot.policy.maxInFlight,
        `in-flight cache exceeded bound (${capacitySnapshot.inFlight})`,
      );
      assert(
        (capacitySnapshot.namespaces["route-meta"]?.rejectedRebuilds ?? 0) > 0,
        "distinct blocked cache loads were not admission-limited",
      );

      const [
        readyBlocked,
        interactiveBlocked,
        relatedBlocked,
        ogImageBlocked,
        adminBlocked,
        writeResult,
        treeResult,
      ] = await Promise.all([
        fetchTimed("/api/health/ready"),
        fetchTimed(
          `/api/resources?limit=1&search=${encodeURIComponent(`lock-probe-${token}`)}`,
        ),
        fetchTimed(`/api/resources/${relatedProbeId}/related`),
        fetchTimed(`/og-image.svg?path=${encodeURIComponent(`/resource/${relatedProbeId}`)}`),
        (async () => {
          const startedAt = Date.now();
          const response = await fetch(`${BASE_URL}/api/resources/pending`, {
            headers: { Cookie: adminCookie },
          });
          return { response, durationMs: Date.now() - startedAt };
        })(),
        blockedWrite,
        blockedTree,
      ]);

      assert(
        readyBlocked.response.status === 503,
        `expected readiness 503 under lock, got ${readyBlocked.response.status}`,
      );
      assert(
        readyBlocked.durationMs < 2_000,
        `readiness exceeded bound (${readyBlocked.durationMs}ms)`,
      );
      assert(
        interactiveBlocked.response.status === 503,
        `expected interactive 503 under lock, got ${interactiveBlocked.response.status}`,
      );
      assert(
        interactiveBlocked.durationMs < 4_500,
        `interactive failure exceeded bound (${interactiveBlocked.durationMs}ms)`,
      );
      for (const [name, result] of [
        ["related resources", relatedBlocked],
        ["OG image", ogImageBlocked],
      ] as const) {
        assert(
          result.response.status === 503,
          `expected ${name} 503 under lock, got ${result.response.status}`,
        );
        assert(
          result.durationMs < 4_500,
          `${name} failure exceeded bound (${result.durationMs}ms)`,
        );
        assert(
          result.response.headers.get("retry-after") === "1",
          `${name} 503 omitted Retry-After`,
        );
        const body = await result.response.json();
        assert(
          body.message === "Service is temporarily unavailable",
          `${name} 503 was not generic`,
        );
      }
      assert(
        adminBlocked.response.status === 503,
        `expected authenticated admin 503 under lock, got ${adminBlocked.response.status}`,
      );
      assert(
        // Authentication/session lookup and the catalog read are sequential
        // database round trips. Under the parallel validation load they may
        // consume one acquisition window plus one statement/lock window, but
        // must still stay below the configured combined five-second budget
        // (with a small scheduler allowance).
        adminBlocked.durationMs < 5_500,
        `admin failure exceeded bound (${adminBlocked.durationMs}ms)`,
      );
      assert(
        !writeResult.ok && isDatabaseUnavailableError(writeResult.error),
        "blocked write did not fail with a database-unavailable timeout",
      );
      assert(
        !treeResult.ok && isDatabaseUnavailableError(treeResult.error),
        "blocked catalog rebuild returned stale data instead of failing",
      );
      assert(
        getPublicCacheSnapshot().entries === 0,
        "failed catalog rebuild populated a public cache entry",
      );
      console.log(
        `PASS real lock: readiness ${readyBlocked.durationMs}ms; catalog ${interactiveBlocked.durationMs}ms; related ${relatedBlocked.durationMs}ms; OG ${ogImageBlocked.durationMs}ms; admin ${adminBlocked.durationMs}ms`,
      );

      const saturatedPages = await Promise.all(
        Array.from({ length: 80 }, async (_, index) => {
          const startedAt = Date.now();
          const response = await fetch(
            `${BASE_URL}/resource/${900_000_000 + index}?probe=${token}`,
            { headers: { Accept: "text/html" } },
          );
          return { response, durationMs: Date.now() - startedAt };
        }),
      );
      assert(
        saturatedPages.every(({ response }) => response.status === 503),
        `expected all saturated SSR routes to return 503, got ${saturatedPages
          .map(({ response }) => response.status)
          .filter((status) => status !== 503)
          .join(",")}`,
      );
      const admissionRejection = saturatedPages.reduce((fastest, current) =>
        current.durationMs < fastest.durationMs ? current : fastest,
      );
      assert(
        admissionRejection.durationMs < 1_000,
        `no immediate HTTP cache-admission rejection observed (${admissionRejection.durationMs}ms)`,
      );
      assert(
        admissionRejection.response.headers.get("retry-after") === "1",
        "SSR cache-admission 503 omitted Retry-After",
      );
      assert(
        (await admissionRejection.response.json()).message ===
          "Service is temporarily unavailable",
        "SSR cache-admission 503 was not generic",
      );
      console.log(
        `PASS HTTP cache admission: 80/80 SSR routes returned 503; fastest bounded rejection ${admissionRejection.durationMs}ms`,
      );

      await locker.query("ROLLBACK");
      await Promise.all(capacityLoads);
      console.log(
        `PASS cache admission: in-flight stayed <= ${capacitySnapshot.policy.maxInFlight}; excess real DB rebuilds rejected`,
      );
    } finally {
      locker.release();
      await lockerPool.end();
    }

    const recovered = await fetchTimed("/api/health/ready");
    assert(
      recovered.response.status === 200,
      `readiness did not recover (status ${recovered.response.status})`,
    );
    await legacyRepo.getAwesomeListFromDatabase();

    const immediateCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.url, resourceUrl));
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    const lateCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.url, resourceUrl));
    assert(
      immediateCount[0]?.count === 0 && lateCount[0]?.count === 0,
      "timed-out write appeared after the lock was released",
    );
    console.log(
      `PASS recovery/no-late-write: readiness 200 in ${recovered.durationMs}ms; row count stayed 0`,
    );

    const heldClients = await Promise.all([
      pool.connect(),
      pool.connect(),
      pool.connect(),
    ]);
    try {
      const startedAt = Date.now();
      const exhaustedResult = await resourceRepo
        .listResources({ limit: 1 })
        .then(
          () => ({ ok: true as const, durationMs: Date.now() - startedAt }),
          (error) => ({
            ok: false as const,
            error,
            durationMs: Date.now() - startedAt,
          }),
        );
      assert(
        !exhaustedResult.ok &&
          isDatabaseUnavailableError(exhaustedResult.error),
        "exhausted pool did not produce a database-unavailable failure",
      );
      assert(
        exhaustedResult.durationMs < 4_000,
        `pool acquisition exceeded bound (${exhaustedResult.durationMs}ms)`,
      );
      console.log(
        `PASS pool exhaustion: acquisition failed in ${exhaustedResult.durationMs}ms`,
      );
    } finally {
      heldClients.forEach((client) => client.release());
    }
  } finally {
    if (createdCategoryId !== undefined) {
      await db.delete(categories).where(eq(categories.id, createdCategoryId));
      invalidatePublicCache("manual");
    }
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FAIL catalog/database resilience validation:", error);
  process.exitCode = 1;
});