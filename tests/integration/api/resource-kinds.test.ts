/**
 * Integration tests — resource kinds API (design parity, W1).
 *
 *   GET   /api/resources/kinds/counts            full-set counts per resolved kind
 *   GET   /api/resources?kind=<kind>             filter by RESOLVED kind
 *   PATCH /api/admin/resources/:id/kind          set / clear the stored kind
 *   PATCH /api/admin/resources/:id/featured      metadata.featured toggle
 *   + the walk over every public send site that must carry `kind` /
 *     `resolvedKind` (list, detail, related, search, tag landing, the
 *     awesome-list tree + listing, /api/public/*, journey steps,
 *     recommendations, published bookmark collections).
 *
 * The app under test is the real registerRoutes() app. Identity is the only
 * substituted piece: a test-only middleware sets `req.dbUser` from a real
 * users row named by the `x-test-user-id` header (exactly what
 * clerkUserContext does after a Clerk session resolves), so requireAuth /
 * isAdmin, Zod validation, repositories and audit logging all run for real.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { registerRoutes } from '../../../server/routes';
import { invalidatePublicCache } from '../../../server/cache/publicCache';
import { resolveResourceKind } from '../../../server/lib/resourceKinds';
import { RESOURCE_KIND_VALUES, type ResourceKind } from '../../../shared/resourceKinds';
import {
  journeySteps,
  learningJourneys,
  resourceAuditLog,
  resources,
  users,
  type Resource,
} from '../../../shared/schema';
import {
  cleanupDatabase,
  closeTestDb,
  createTestAdmin,
  createTestCategory,
  createTestResource,
  createTestUser,
  getTestDb,
} from '../../helpers/db-helper';

const CATEGORY = 'Test Category';
const CATEGORY_SLUG = 'test-category';
const KIND_KEYS = [...RESOURCE_KIND_VALUES, 'total'] as const;

type Seed = { title: string; kind?: ResourceKind | null; tags?: string[]; status?: string };

/**
 * A deliberately mixed corpus: stored kinds (including a stored "other" that
 * must suppress inference), inferable tags in every case/plural variant,
 * multi-kind tags (enum order decides), noise tags, malformed metadata and a
 * non-approved row that must never be counted.
 */
const CORPUS: Seed[] = [
  { title: 'Stored tools', kind: 'tools', tags: ['library'] },
  { title: 'Stored libraries', kind: 'libraries' },
  { title: 'Stored other beats tags', kind: 'other', tags: ['conference'] },
  { title: 'Inferred tool', tags: ['Tool', 'ffmpeg'] },
  { title: 'Inferred utilities', tags: ['UTILITIES'] },
  { title: 'Inferred library', tags: ['sdk'] },
  { title: 'Inferred frameworks', tags: [' Frameworks '] },
  { title: 'Inferred standard', tags: ['Specification'] },
  { title: 'Inferred event', tags: ['meetups'] },
  { title: 'Inferred protocol', tags: ['transport'] },
  { title: 'Tie: protocol + library → libraries', tags: ['protocol', 'library'] },
  { title: 'Tie: event + tool → tools', tags: ['event', 'tool'] },
  { title: 'Underscore separator', tags: ['video_tools'] },
  { title: 'Noise tags only', tags: ['hls', 'dash', 'video'] },
  { title: 'No metadata at all' },
  { title: 'Pending row is never counted', tags: ['tool'], status: 'pending' },
];

function expectKindFields(item: unknown, label: string) {
  expect(item, label).toBeTypeOf('object');
  const record = item as Record<string, unknown>;
  expect(record, `${label}: kind key`).toHaveProperty('kind');
  expect(record, `${label}: resolvedKind key`).toHaveProperty('resolvedKind');
  expect(record.kind === null || RESOURCE_KIND_VALUES.includes(record.kind as ResourceKind), `${label}: kind value`).toBe(
    true,
  );
  expect(RESOURCE_KIND_VALUES, `${label}: resolvedKind value`).toContain(record.resolvedKind);
  expect(record, `${label}: searchTsv must stay stripped`).not.toHaveProperty('searchTsv');
}

describe('Resource kinds API', () => {
  let app: Express;
  let adminId: string;
  let userId: string;
  let seeded: Resource[];

  const asAdmin = () => ({ 'x-test-user-id': adminId });
  const asUser = () => ({ 'x-test-user-id': userId });

  beforeEach(async () => {
    await cleanupDatabase();
    // Test rows are inserted directly (not through the repositories), so the
    // in-process public cache must not carry a previous test's tree/counts.
    invalidatePublicCache('manual');

    app = express();
    app.use(express.json());
    app.use(async (req, _res, next) => {
      const testUserId = req.get('x-test-user-id');
      if (testUserId) {
        const [row] = await getTestDb().select().from(users).where(eq(users.id, testUserId)).limit(1);
        (req as any).dbUser = row;
      }
      next();
    });
    await registerRoutes(app);

    adminId = (await createTestAdmin({ email: `kind-admin-${Date.now()}@example.com` })).id;
    userId = (await createTestUser({ email: `kind-user-${Date.now()}@example.com` })).id;
    await createTestCategory({ name: CATEGORY, slug: CATEGORY_SLUG });

    seeded = [];
    for (const [index, seed] of CORPUS.entries()) {
      seeded.push(
        await createTestResource({
          title: seed.title,
          url: `https://example.com/kinds/${index}`,
          category: CATEGORY,
          status: seed.status ?? 'approved',
          kind: seed.kind ?? null,
          metadata: seed.tags ? { tags: seed.tags } : {},
        }),
      );
    }
  });

  afterAll(async () => {
    await closeTestDb();
  });

  /** Brute-force expectation computed by the TypeScript resolver over the DB rows. */
  function expectedCounts(filter: (r: Resource) => boolean = () => true) {
    const counts: Record<string, number> = Object.fromEntries(KIND_KEYS.map((k) => [k, 0]));
    for (const row of seeded) {
      if (row.status !== 'approved' || !filter(row)) continue;
      counts[resolveResourceKind(row).kind] += 1;
      counts.total += 1;
    }
    return counts;
  }

  describe('GET /api/resources/kinds/counts', () => {
    it('returns full-set counts over approved resources that match the resolver row by row', async () => {
      const res = await request(app).get('/api/resources/kinds/counts');
      expect(res.status).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual([...KIND_KEYS].sort());
      expect(res.body).toEqual(expectedCounts());

      // Sanity on the corpus itself: every non-"other" kind is exercised and
      // the pending row is excluded.
      expect(res.body.total).toBe(CORPUS.filter((s) => (s.status ?? 'approved') === 'approved').length);
      for (const kind of RESOURCE_KIND_VALUES) expect(res.body[kind], kind).toBeGreaterThan(0);

      const db = getTestDb();
      const [{ count }] = await db
        .select({ count: resources.id })
        .from(resources)
        .where(eq(resources.status, 'approved'))
        .then((rows) => [{ count: rows.length }]);
      expect(res.body.total).toBe(count);
    });

    it('sends the catalog Cache-Control contract', async () => {
      const res = await request(app).get('/api/resources/kinds/counts');
      expect(res.headers['cache-control']).toBe('public, max-age=60, must-revalidate');
    });

    it('scopes to a category by slug or exact name', async () => {
      await createTestResource({
        title: 'Other category tool',
        url: 'https://example.com/kinds/elsewhere',
        category: 'Elsewhere',
        metadata: { tags: ['tool'] },
      });
      const all = await request(app).get('/api/resources/kinds/counts');
      const bySlug = await request(app).get(`/api/resources/kinds/counts?category=${CATEGORY_SLUG}`);
      const byName = await request(app).get(`/api/resources/kinds/counts?category=${encodeURIComponent(CATEGORY)}`);
      expect(bySlug.status).toBe(200);
      expect(bySlug.body).toEqual(expectedCounts());
      expect(byName.body).toEqual(bySlug.body);
      expect(all.body.total).toBe(bySlug.body.total + 1);
      expect(all.body.tools).toBe(bySlug.body.tools + 1);
      expect(bySlug.headers['cache-control']).toBe('public, max-age=60, must-revalidate');
    });

    it('answers an unknown category with zeros and does not cache it', async () => {
      const res = await request(app).get('/api/resources/kinds/counts?category=does-not-exist');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(Object.fromEntries(KIND_KEYS.map((k) => [k, 0])));
      expect(res.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    });

    it('rejects an empty or repeated category parameter', async () => {
      expect((await request(app).get('/api/resources/kinds/counts?category=')).status).toBe(400);
      expect((await request(app).get('/api/resources/kinds/counts?category[a]=b')).status).toBe(400);
    });
  });

  describe('GET /api/resources?kind=', () => {
    it('filters by resolved kind and reports totals consistent with the counts endpoint', async () => {
      const counts = (await request(app).get('/api/resources/kinds/counts')).body;
      let seen = 0;
      for (const kind of RESOURCE_KIND_VALUES) {
        const res = await request(app).get(`/api/resources?kind=${kind}&limit=100`);
        expect(res.status, kind).toBe(200);
        expect(res.body.total, kind).toBe(counts[kind]);
        expect(res.headers['x-total-count'], kind).toBe(String(counts[kind]));
        expect(res.body.pagination.total, kind).toBe(counts[kind]);
        expect(res.body.resources.length, kind).toBe(counts[kind]);
        for (const item of res.body.resources) {
          expect(item.resolvedKind, `${kind}: ${item.title}`).toBe(kind);
          expectKindFields(item, item.title);
        }
        seen += res.body.resources.length;
      }
      expect(seen).toBe(counts.total);
    });

    it('is case-insensitive, keeps pagination/sort, and composes with other filters', async () => {
      const upper = await request(app).get('/api/resources?kind=TOOLS&limit=2&sort=name-asc');
      expect(upper.status).toBe(200);
      expect(upper.body.resources).toHaveLength(2);
      const titles = upper.body.resources.map((r: any) => r.title.toLowerCase());
      expect(titles).toEqual([...titles].sort());
      expect(upper.body.nextOffset).toBe(2);

      const page2 = await request(app).get('/api/resources?kind=tools&limit=2&offset=2&sort=name-asc');
      expect(page2.status).toBe(200);
      expect(page2.body.resources.map((r: any) => r.id)).not.toEqual(upper.body.resources.map((r: any) => r.id));

      const withTag = await request(app).get('/api/resources?kind=tools&tags=ffmpeg');
      expect(withTag.status).toBe(200);
      expect(withTag.body.resources.map((r: any) => r.title)).toEqual(['Inferred tool']);

      const stored = await request(app).get('/api/resources?kind=libraries&q=Stored');
      expect(stored.status).toBe(200);
      expect(stored.body.resources.map((r: any) => r.title)).toEqual(['Stored libraries']);
    });

    it('rejects unknown kinds with the controlled-facet 400 envelope', async () => {
      const res = await request(app).get('/api/resources?kind=gadgets');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_kind');
      expect(res.body.allowed).toEqual([...RESOURCE_KIND_VALUES]);
    });

    it('still sends X-Total-Count without a kind filter', async () => {
      const res = await request(app).get('/api/resources?limit=1');
      expect(res.status).toBe(200);
      expect(res.headers['x-total-count']).toBe(String(res.body.total));
    });
  });

  describe('public send sites carry kind + resolvedKind', () => {
    it('list, tag landing, detail, related and search', async () => {
      const list = await request(app).get('/api/resources?limit=100');
      expect(list.status).toBe(200);
      expect(list.body.resources.length).toBeGreaterThan(0);
      for (const item of list.body.resources) expectKindFields(item, `list ${item.title}`);
      const byTitle = Object.fromEntries(list.body.resources.map((r: any) => [r.title, r]));
      expect(byTitle['Stored tools']).toMatchObject({ kind: 'tools', resolvedKind: 'tools' });
      expect(byTitle['Stored other beats tags']).toMatchObject({ kind: 'other', resolvedKind: 'other' });
      expect(byTitle['Inferred event']).toMatchObject({ kind: null, resolvedKind: 'events' });
      expect(byTitle['Noise tags only']).toMatchObject({ kind: null, resolvedKind: 'other' });

      const tagLanding = await request(app).get('/api/resources?tags=ffmpeg');
      expect(tagLanding.status).toBe(200);
      expect(tagLanding.body.resources).toHaveLength(1);
      expectKindFields(tagLanding.body.resources[0], 'tag landing');

      const toolId = byTitle['Inferred tool'].id;
      const detail = await request(app).get(`/api/resources/${toolId}`);
      expect(detail.status).toBe(200);
      expectKindFields(detail.body, 'detail');
      expect(detail.body).toMatchObject({ kind: null, resolvedKind: 'tools' });

      const related = await request(app).get(`/api/resources/${toolId}/related`);
      expect(related.status).toBe(200);
      const relatedItems = [...related.body.similar, ...related.body.prerequisites, ...related.body.nextSteps];
      expect(relatedItems.length).toBeGreaterThan(0);
      for (const item of relatedItems) expectKindFields(item.resource, `related ${item.resource?.title}`);

      const search = await request(app).get('/api/search?q=Inferred');
      expect(search.status).toBe(200);
      expect(search.body.results.length).toBeGreaterThan(0);
      for (const item of search.body.results) expectKindFields(item, `search ${item.title}`);
    });

    it('awesome-list tree, taxonomy listing and the /api/public surface', async () => {
      const tree = await request(app).get('/api/awesome-list');
      expect(tree.status).toBe(200);
      const category = tree.body.categories.find((c: any) => c.name === CATEGORY);
      expect(category, 'seeded category present in tree').toBeTruthy();
      const treeResources: any[] = [
        ...(category.resources ?? []),
        ...(category.subcategories ?? []).flatMap((s: any) => [
          ...(s.resources ?? []),
          ...(s.subSubcategories ?? []).flatMap((ss: any) => ss.resources ?? []),
        ]),
      ];
      expect(treeResources.length).toBe(expectedCounts().total);
      for (const item of treeResources) expectKindFields(item, `tree ${item.title}`);

      const listing = await request(app).get(`/api/awesome-list/listing?level=category&slug=${CATEGORY_SLUG}`);
      expect(listing.status).toBe(200);
      expect(listing.body.resources.length).toBeGreaterThan(0);
      for (const item of listing.body.resources) expectKindFields(item, `listing ${item.title}`);

      const publicList = await request(app).get('/api/public/resources?limit=50');
      expect(publicList.status).toBe(200);
      expect(publicList.body.resources.length).toBeGreaterThan(0);
      for (const item of publicList.body.resources) expectKindFields(item, `public list ${item.title}`);

      const publicDetail = await request(app).get(`/api/public/resources/${publicList.body.resources[0].id}`);
      expect(publicDetail.status).toBe(200);
      expectKindFields(publicDetail.body, 'public detail');
    });

    it('journey step resources and anonymous recommendations', async () => {
      const db = getTestDb();
      const [journey] = await db
        .insert(learningJourneys)
        .values({ title: 'Kinds journey', description: 'Steps embed resources', category: CATEGORY, status: 'published' })
        .returning();
      const stepResources = seeded.filter((r) => r.status === 'approved').slice(0, 3);
      await db.insert(journeySteps).values(
        stepResources.map((r, index) => ({
          journeyId: journey.id,
          resourceId: r.id,
          stepNumber: index + 1,
          title: `Step ${index + 1}`,
        })),
      );

      const detail = await request(app).get(`/api/journeys/${journey.id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.steps).toHaveLength(3);
      for (const step of detail.body.steps) {
        expectKindFields(step.resource, `journey step ${step.title}`);
        const row = stepResources.find((r) => r.id === step.resource.id)!;
        expect(Object.keys(step.resource).sort()).toEqual(['description', 'id', 'kind', 'resolvedKind', 'title', 'url']);
        expect(step.resource.kind).toBe(row.kind ?? null);
        expect(step.resource.resolvedKind).toBe(resolveResourceKind(row).kind);
      }

      const recs = await request(app).get('/api/recommendations?limit=5');
      expect(recs.status).toBe(200);
      expect(Array.isArray(recs.body)).toBe(true);
      expect(recs.body.length).toBeGreaterThan(0);
      for (const item of recs.body) expectKindFields(item.resource, `recommendation ${item.resource?.title}`);
    });

    it('published bookmark collections (hand-picked projection, never metadata)', async () => {
      // A stored kind, a stored "other" that must beat its tag, an inferred
      // kind and a row with no signals at all — the same rows the resolver
      // classifies on every other surface.
      const picked = ['Stored tools', 'Stored other beats tags', 'Inferred library', 'No metadata at all'].map(
        (title) => seeded.find((r) => r.title === title)!,
      );
      for (const row of picked) {
        const bookmarked = await request(app).post(`/api/bookmarks/${row.id}`).set(asUser()).send({});
        expect([200, 201]).toContain(bookmarked.status);
      }
      const created = await request(app).post('/api/collections').set(asUser()).send({ name: 'Kinds shelf' });
      expect(created.status).toBe(201);
      for (const row of picked) {
        await request(app).post(`/api/collections/${created.body.id}/items/${row.id}`).set(asUser()).expect(201);
      }
      const published = await request(app).post(`/api/collections/${created.body.id}/publish`).set(asUser());
      expect(published.status).toBe(200);
      expect(published.body.shareId).toBeTypeOf('string');

      // The runtime contract observer (installed by registerRoutes) validates
      // every 200 against the named PublicCollectionResponse schema and
      // reports drift through console.warn — capture it so a projection that
      // drops a kind field, or leaks metadata, fails here and not in prod.
      // (Collect the lines inside the implementation: mockRestore() also
      // resets mock.calls, so reading them after the restore sees nothing.)
      const warnings: string[] = [];
      const warn = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
        warnings.push(args.map(String).join(' '));
      });
      let shared: request.Response;
      try {
        shared = await request(app).get(`/api/public/collections/${published.body.shareId}`);
      } finally {
        warn.mockRestore();
      }
      const mismatches = warnings.filter(
        (line) => line.includes('[contract] response mismatch') && line.includes('/api/public/collections'),
      );
      expect(mismatches, 'PublicCollectionResponse contract must match the real payload').toEqual([]);

      expect(shared.status).toBe(200);
      expect(shared.body.resources.map((r: { id: number }) => r.id)).toEqual(picked.map((r) => r.id));
      for (const item of shared.body.resources) {
        const row = picked.find((r) => r.id === item.id)!;
        expectKindFields(item, `collection item ${row.title}`);
        expect(Object.keys(item).sort()).toEqual(
          [
            'category',
            'description',
            'id',
            'kind',
            'provider',
            'resolvedKind',
            'resourceFormat',
            'skillLevel',
            'subSubcategory',
            'subcategory',
            'title',
            'url',
          ].sort(),
        );
        expect(item).not.toHaveProperty('metadata');
        expect(item.kind).toBe(row.kind ?? null);
        expect(item.resolvedKind).toBe(resolveResourceKind(row).kind);
      }
      // Stored beats inferred on this surface exactly as on /api/resources/:id.
      const byTitle = (title: string) => shared.body.resources.find((r: { id: number }) => r.id === picked.find((p) => p.title === title)!.id);
      expect(byTitle('Stored tools')).toMatchObject({ kind: 'tools', resolvedKind: 'tools' });
      expect(byTitle('Stored other beats tags')).toMatchObject({ kind: 'other', resolvedKind: 'other' });
      expect(byTitle('Inferred library')).toMatchObject({ kind: null, resolvedKind: 'libraries' });
      expect(byTitle('No metadata at all')).toMatchObject({ kind: null, resolvedKind: 'other' });
      for (const row of picked) {
        const detail = await request(app).get(`/api/resources/${row.id}`).expect(200);
        expect(byTitle(row.title).resolvedKind).toBe(detail.body.resolvedKind);
      }
    });
  });

  describe('PATCH /api/admin/resources/:id/kind', () => {
    it('sets and clears the stored kind, audit-logs each change and updates every read path', async () => {
      const target = seeded.find((r) => r.title === 'Inferred library')!;
      const set = await request(app).patch(`/api/admin/resources/${target.id}/kind`).set(asAdmin()).send({ kind: 'events' });
      expect(set.status).toBe(200);
      expect(set.body.id).toBe(target.id);
      expect(set.body.kind).toBe('events');

      const afterSet = await request(app).get(`/api/resources/${target.id}`);
      expect(afterSet.body).toMatchObject({ kind: 'events', resolvedKind: 'events' });
      const countsAfterSet = (await request(app).get('/api/resources/kinds/counts')).body;
      const baseline = expectedCounts();
      expect(countsAfterSet.events).toBe(baseline.events + 1);
      expect(countsAfterSet.libraries).toBe(baseline.libraries - 1);
      expect(countsAfterSet.total).toBe(baseline.total);

      const clear = await request(app).patch(`/api/admin/resources/${target.id}/kind`).set(asAdmin()).send({ kind: null });
      expect(clear.status).toBe(200);
      expect(clear.body.kind).toBeNull();
      const afterClear = await request(app).get(`/api/resources/${target.id}`);
      expect(afterClear.body).toMatchObject({ kind: null, resolvedKind: 'libraries' });
      expect((await request(app).get('/api/resources/kinds/counts')).body).toEqual(baseline);

      const audit = await getTestDb()
        .select()
        .from(resourceAuditLog)
        .where(eq(resourceAuditLog.resourceId, target.id))
        .orderBy(resourceAuditLog.id);
      expect(audit).toHaveLength(2);
      expect(audit[0]).toMatchObject({
        action: 'updated',
        performedBy: adminId,
        changes: { kind: 'events', previousKind: null },
        notes: 'Resource kind set by admin',
      });
      expect(audit[1]).toMatchObject({
        action: 'updated',
        performedBy: adminId,
        changes: { kind: null, previousKind: 'events' },
        notes: 'Resource kind cleared by admin',
      });
    });

    it('validates the body (400)', async () => {
      const target = seeded[0];
      for (const body of [{ kind: 'gadgets' }, {}, { kind: 'tools', extra: true }, { kind: 1 }]) {
        const res = await request(app).patch(`/api/admin/resources/${target.id}/kind`).set(asAdmin()).send(body);
        expect(res.status, JSON.stringify(body)).toBe(400);
        expect(res.body.error).toBe('validation_failed');
      }
      const [row] = await getTestDb().select().from(resources).where(eq(resources.id, target.id));
      expect(row.kind).toBe(target.kind);
    });

    it('requires an admin (401 anonymous, 403 signed-in user) and 404s unknown ids', async () => {
      const target = seeded[0];
      const anon = await request(app).patch(`/api/admin/resources/${target.id}/kind`).send({ kind: 'tools' });
      expect(anon.status).toBe(401);
      expect(anon.body).toEqual({ message: 'Unauthorized' });

      const user = await request(app).patch(`/api/admin/resources/${target.id}/kind`).set(asUser()).send({ kind: 'tools' });
      expect(user.status).toBe(403);
      expect(user.body).toEqual({ message: 'Forbidden: Admin access required' });

      const missing = await request(app).patch('/api/admin/resources/2147483000/kind').set(asAdmin()).send({ kind: 'tools' });
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ message: 'Resource not found' });

      const notNumeric = await request(app).patch('/api/admin/resources/abc/kind').set(asAdmin()).send({ kind: 'tools' });
      expect(notNumeric.status).toBe(404);

      const audit = await getTestDb().select().from(resourceAuditLog);
      expect(audit).toHaveLength(0);
    });
  });

  describe('PATCH /api/admin/resources/:id/featured', () => {
    it('toggles metadata.featured without disturbing other metadata and audit-logs it', async () => {
      const target = seeded.find((r) => r.title === 'Inferred tool')!;
      const on = await request(app).patch(`/api/admin/resources/${target.id}/featured`).set(asAdmin()).send({ featured: true });
      expect(on.status).toBe(200);
      expect(on.body.metadata).toEqual({ tags: ['Tool', 'ffmpeg'], featured: true });

      const off = await request(app).patch(`/api/admin/resources/${target.id}/featured`).set(asAdmin()).send({ featured: false });
      expect(off.status).toBe(200);
      expect(off.body.metadata).toEqual({ tags: ['Tool', 'ffmpeg'], featured: false });

      // Still resolves as before — featured never influences the kind.
      const detail = await request(app).get(`/api/resources/${target.id}`);
      expect(detail.body).toMatchObject({ kind: null, resolvedKind: 'tools' });

      const audit = await getTestDb()
        .select()
        .from(resourceAuditLog)
        .where(eq(resourceAuditLog.resourceId, target.id))
        .orderBy(resourceAuditLog.id);
      expect(audit.map((a) => [a.notes, a.changes, a.performedBy])).toEqual([
        ['Resource featured by admin', { featured: true, previousFeatured: false }, adminId],
        ['Resource unfeatured by admin', { featured: false, previousFeatured: true }, adminId],
      ]);
    });

    it('works on a resource with NULL metadata', async () => {
      const [bare] = await getTestDb()
        .insert(resources)
        .values({ title: 'Null metadata', url: 'https://example.com/kinds/null-metadata', description: 'x', category: CATEGORY, metadata: null })
        .returning();
      const res = await request(app).patch(`/api/admin/resources/${bare.id}/featured`).set(asAdmin()).send({ featured: true });
      expect(res.status).toBe(200);
      expect(res.body.metadata).toEqual({ featured: true });
    });

    it('validates the body and enforces admin access', async () => {
      const target = seeded[0];
      for (const body of [{ featured: 'yes' }, {}, { featured: true, kind: 'tools' }]) {
        const res = await request(app).patch(`/api/admin/resources/${target.id}/featured`).set(asAdmin()).send(body);
        expect(res.status, JSON.stringify(body)).toBe(400);
      }
      expect((await request(app).patch(`/api/admin/resources/${target.id}/featured`).send({ featured: true })).status).toBe(401);
      expect((await request(app).patch(`/api/admin/resources/${target.id}/featured`).set(asUser()).send({ featured: true })).status).toBe(403);
      expect((await request(app).patch('/api/admin/resources/2147483000/featured').set(asAdmin()).send({ featured: true })).status).toBe(404);
    });
  });

  describe('stored kind is admin-owned', () => {
    const submission = (suffix: string) => ({
      url: `https://example.com/kinds/contributor-${suffix}`,
      title: `Contributor submission ${suffix}`,
      description: 'A perfectly ordinary contributor submission with enough words.',
      category: CATEGORY,
      metadata: { tags: ['sdk'] },
    });

    it('never persists a kind (or status) sent by a contributor on POST /api/resources or /api/submit', async () => {
      for (const path of ['/api/resources', '/api/submit']) {
        const res = await request(app)
          .post(path)
          .set(asUser())
          .send({ ...submission(path.replace(/\W/g, '')), kind: 'events', status: 'approved' });
        expect(res.status, path).toBe(201);
        expect(res.body.kind, path).toBeNull();
        expect(res.body.status, path).toBe('pending');

        const [row] = await getTestDb().select().from(resources).where(eq(resources.id, res.body.id)).limit(1);
        expect(row.kind, path).toBeNull();
        expect(row.status, path).toBe('pending');
        // Once approved it classifies by inference (tag mapping), not by the
        // value the contributor tried to pin.
        expect(resolveResourceKind(row)).toEqual({ kind: 'libraries', source: 'inferred' });
      }
      // Nothing a contributor did moved the approved counts.
      expect((await request(app).get('/api/resources/kinds/counts')).body).toEqual(expectedCounts());
    });

    it('lets an admin set the kind on create and set/clear it on update, and 403s a signed-in user', async () => {
      const created = await request(app)
        .post('/api/admin/resources')
        .set(asAdmin())
        .send({ ...submission('admin'), kind: 'events' });
      expect(created.status).toBe(201);
      expect(created.body.kind).toBe('events');
      expect((await request(app).get(`/api/resources/${created.body.id}`)).body).toMatchObject({ kind: 'events', resolvedKind: 'events' });

      // Update path on a seeded row whose tags infer "libraries": set beats
      // inference, clearing hands classification back to inference.
      const target = seeded.find((r) => r.title === 'Inferred library')!;
      const set = await request(app).put(`/api/admin/resources/${target.id}`).set(asAdmin()).send({ kind: 'standards' });
      expect(set.status).toBe(200);
      expect(set.body.kind).toBe('standards');
      expect((await request(app).get(`/api/resources/${target.id}`)).body).toMatchObject({ kind: 'standards', resolvedKind: 'standards' });

      const cleared = await request(app).put(`/api/admin/resources/${target.id}`).set(asAdmin()).send({ kind: null });
      expect(cleared.status).toBe(200);
      expect(cleared.body.kind).toBeNull();
      expect((await request(app).get(`/api/resources/${target.id}`)).body).toMatchObject({ kind: null, resolvedKind: 'libraries' });

      const forbidden = await request(app).put(`/api/admin/resources/${target.id}`).set(asUser()).send({ kind: 'tools' });
      expect(forbidden.status).toBe(403);
      const [row] = await getTestDb().select().from(resources).where(eq(resources.id, target.id)).limit(1);
      expect(row.kind).toBeNull();
    });
  });
});
