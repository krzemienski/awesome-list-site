/**
 * Integration tests for the default-off contact endpoints
 * (docs/CONTACT-VARIANTS.md "Backend"):
 *
 *   GET  /api/config                    – destinations derived from config only
 *   POST /api/contact                   – 404 by default; validated, same-origin,
 *                                         rate-limited, honeypot-guarded, persisted
 *   GET  /api/admin/contact-submissions – admin-only inbox listing
 *
 * The routes read `config.contact` at module load, so each mode boots its own
 * route graph via vi.resetModules() + dynamic import after setting the env.
 * Every persisted message carries the `__qa_test_` marker and the suite
 * deletes those rows itself (the global cleanup is defence in depth).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { eq, like } from "drizzle-orm";
import * as schema from "../../../shared/schema";
import {
  cleanupDatabase,
  closeTestDb,
  createTestAdmin,
  createTestUser,
  getTestDb,
} from "../../helpers/db-helper";

const QA_MARKER = "__qa_test_contact";
const TEST_IP_HASH_SECRET = "contact-integration-secret-0123456789";
const TEST_HOST = "contact.test";
const SAME_ORIGIN = { Host: TEST_HOST, Origin: `http://${TEST_HOST}` };
const CONTACT_ENV = ["CONTACT_ENABLED", "CONTACT_IP_HASH_SECRET", "CONTACT_EMAIL", "CONTACT_ISSUES_URL", "CONTACT_DISCUSSIONS_URL", "CONTACT_DISCUSSIONS_VERIFIED"] as const;

type ContactRoutesModule = typeof import("../../../server/routes/domains/contact");

function validSubmission(overrides: Record<string, unknown> = {}) {
  return {
    name: "QA Tester",
    replyTo: "qa@example.com",
    subject: "Integration probe",
    message: `${QA_MARKER} this message exists only while the contact suite runs`,
    ...overrides,
  };
}

async function qaRows() {
  return getTestDb()
    .select()
    .from(schema.contactSubmissions)
    .where(like(schema.contactSubmissions.message, `%${QA_MARKER}%`));
}

async function deleteQaRows() {
  await getTestDb()
    .delete(schema.contactSubmissions)
    .where(like(schema.contactSubmissions.message, `%${QA_MARKER}%`));
}

/**
 * Boot a fresh app with the given contact env. Requests may impersonate a
 * stored user through `x-test-user-id`, which mirrors what the Clerk context
 * middleware does in production: it attaches the persisted `users` row as
 * `req.dbUser` before any route runs.
 */
async function bootApp(env: Partial<Record<(typeof CONTACT_ENV)[number], string>>) {
  for (const key of CONTACT_ENV) delete process.env[key];
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  vi.resetModules();
  const [{ registerRoutes }, contactModule] = await Promise.all([
    import("../../../server/routes"),
    import("../../../server/routes/domains/contact"),
  ]);

  const app: Express = express();
  app.use(express.json({ limit: "256kb" }));
  app.use(async (req, _res, next) => {
    const id = req.get("x-test-user-id");
    if (id) {
      const [user] = await getTestDb().select().from(schema.users).where(eq(schema.users.id, id));
      req.dbUser = user;
    }
    next();
  });
  await registerRoutes(app);
  return { app, contactModule };
}

describe("Contact API", () => {
  const originalEnv: Partial<Record<string, string | undefined>> = {};

  beforeAll(() => {
    for (const key of CONTACT_ENV) originalEnv[key] = process.env[key];
  });

  afterAll(async () => {
    for (const key of CONTACT_ENV) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    await deleteQaRows();
    await closeTestDb();
  });

  describe("default configuration (nothing set)", () => {
    let app: Express;

    beforeAll(async () => {
      ({ app } = await bootApp({}));
    });

    it("GET /api/config reports every destination unavailable and the form disabled", async () => {
      const res = await request(app).get("/api/config");
      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toBe("public, max-age=300");
      expect(res.body.contact).toEqual({
        email: { available: false, unavailableReason: expect.any(String) },
        issues: { available: false, unavailableReason: expect.any(String) },
        discussions: { available: false, unavailableReason: expect.any(String) },
        form: { available: false, unavailableReason: "The contact form is disabled" },
      });
      // Nothing that looks like a secret or a raw URL leaks by default.
      expect(JSON.stringify(res.body.contact)).not.toMatch(/href/);
    });

    it("POST /api/contact is indistinguishable from a missing route (404) even for a valid body", async () => {
      const res = await request(app)
        .post("/api/contact")
        .set(SAME_ORIGIN)
        .send(validSubmission());
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ message: "Not found" });
      expect(await qaRows()).toHaveLength(0);
    });

    it("POST /api/contact answers 404 before validating or checking the origin", async () => {
      const res = await request(app).post("/api/contact").send({});
      expect(res.status).toBe(404);
    });
  });

  describe("enabled without CONTACT_IP_HASH_SECRET", () => {
    let app: Express;

    beforeAll(async () => {
      ({ app } = await bootApp({ CONTACT_ENABLED: "true" }));
    });

    it("keeps the form unavailable with an explicit reason", async () => {
      const res = await request(app).get("/api/config");
      expect(res.status).toBe(200);
      expect(res.body.contact.form).toEqual({
        available: false,
        unavailableReason: "The contact form is not fully configured",
      });
    });

    it("refuses submissions with 503 instead of storing an unhashed IP", async () => {
      const res = await request(app)
        .post("/api/contact")
        .set(SAME_ORIGIN)
        .send(validSubmission());
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ message: "Contact form is not fully configured" });
      expect(await qaRows()).toHaveLength(0);
    });
  });

  describe("enabled and configured", () => {
    let app: Express;
    let contact: ContactRoutesModule;

    beforeAll(async () => {
      ({ app, contactModule: contact } = await bootApp({
        CONTACT_ENABLED: "true",
        CONTACT_IP_HASH_SECRET: TEST_IP_HASH_SECRET,
        CONTACT_EMAIL: "mailto:hello@example.com",
        CONTACT_ISSUES_URL: "https://github.com/example/repo/issues",
        CONTACT_DISCUSSIONS_URL: "https://github.com/example/repo/discussions",
      }));
    });

    beforeEach(async () => {
      await cleanupDatabase();
    });

    afterEach(async () => {
      await deleteQaRows();
    });

    it("purges expired messages in bounded batches while preserving fresh messages", async () => {
      const { config } = await import("../../../server/config");
      const { purgeExpiredContactSubmissions } = await import("../../../server/repositories/ContactRepository");
      const oldDate = new Date(Date.now() - (config.contact.retention_days + 1) * 86_400_000);
      const inserted = await getTestDb().insert(schema.contactSubmissions).values(
        [oldDate, oldDate, new Date()].map((createdAt, index) => ({
          name: "QA retention",
          replyTo: "qa@example.com",
          subject: `Retention ${index}`,
          message: `${QA_MARKER}_retention`,
          ipHash: "0".repeat(64),
          createdAt,
        })),
      ).returning();
      try {
        expect(await purgeExpiredContactSubmissions(1)).toBe(1);
        expect(await qaRows()).toHaveLength(2);
        expect(await purgeExpiredContactSubmissions()).toBe(1);
        expect((await qaRows()).map(row => row.id)).toEqual([inserted[2].id]);
        expect(await purgeExpiredContactSubmissions()).toBe(0);
      } finally {
        await deleteQaRows();
      }
    });

    it("does not register retention timers during test runs", async () => {
      const { initializeContactRetentionScheduler } = await import("../../../server/jobs/contactRetentionScheduler");
      vi.useFakeTimers();
      try {
        const before = vi.getTimerCount();
        initializeContactRetentionScheduler();
        expect(vi.getTimerCount()).toBe(before);
      } finally {
        vi.useRealTimers();
      }
    });

    it("GET /api/config exposes configured destinations and keeps discussions gated on verification", async () => {
      const res = await request(app).get("/api/config");
      expect(res.status).toBe(200);
      expect(res.body.contact.email).toEqual({ available: true, href: "mailto:hello@example.com" });
      expect(res.body.contact.issues).toEqual({
        available: true,
        href: "https://github.com/example/repo/issues",
      });
      // URL alone is not enough: CONTACT_DISCUSSIONS_VERIFIED was not set.
      expect(res.body.contact.discussions).toEqual({
        available: false,
        unavailableReason: expect.any(String),
      });
      expect(res.body.contact.form).toEqual({ available: true, persistence: "database" });
      expect(JSON.stringify(res.body)).not.toContain(TEST_IP_HASH_SECRET);
    });

    it("persists a valid submission with a keyed IP hash and returns a receipt", async () => {
      const res = await request(app)
        .post("/api/contact")
        .set(SAME_ORIGIN)
        .send(validSubmission());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), status: "received" });

      const rows = await qaRows();
      expect(rows).toHaveLength(1);
      const [row] = rows;
      expect(row.id).toBe(res.body.id);
      expect(row.name).toBe("QA Tester");
      expect(row.replyTo).toBe("qa@example.com");
      expect(row.subject).toBe("Integration probe");
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(row.userId).toBeNull();
      // Keyed HMAC of the normalized loopback address; never the address itself.
      expect(row.ipHash).toMatch(/^[0-9a-f]{64}$/);
      expect([
        contact.hashContactIp("127.0.0.1", TEST_IP_HASH_SECRET),
        contact.hashContactIp("::1", TEST_IP_HASH_SECRET),
      ]).toContain(row.ipHash);
      expect(JSON.stringify(row)).not.toMatch(/127\.0\.0\.1|::1/);
    });

    it("records the signed-in user's id when a session is present", async () => {
      const user = await createTestUser({ email: `__qa_test_contact_${Date.now()}@example.com` });
      const res = await request(app)
        .post("/api/contact")
        .set(SAME_ORIGIN)
        .set("x-test-user-id", user.id)
        .send(validSubmission());
      expect(res.status).toBe(200);
      const [row] = await qaRows();
      expect(row.userId).toBe(user.id);
    });

    it("silently discards honeypot submissions with a receipt-shaped 200", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        const res = await request(app)
          .post("/api/contact")
          .set(SAME_ORIGIN)
          .send(validSubmission({ website: "https://spam.example" }));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), status: "received" });
        expect(await qaRows()).toHaveLength(0);
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining("honeypot"),
          expect.objectContaining({ ipHashPrefix: expect.stringMatching(/^[0-9a-f]{12}$/) }),
        );
        // The log carries no PII: no message, no email, no raw IP.
        expect(JSON.stringify(warn.mock.calls)).not.toMatch(/qa@example\.com|QA Tester|127\.0\.0\.1/);
      } finally {
        warn.mockRestore();
      }
    });

    it("rejects invalid payloads with the canonical 400 envelope", async () => {
      const res = await request(app)
        .post("/api/contact")
        .set(SAME_ORIGIN)
        .send({ name: "", replyTo: "not-an-email", subject: "x".repeat(201), message: "short" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_failed");
      expect(Object.keys(res.body.fieldErrors)).toEqual(
        expect.arrayContaining(["name", "replyTo", "subject", "message"]),
      );
      expect(await qaRows()).toHaveLength(0);
    });

    it("rejects unknown fields and an empty body", async () => {
      const unknown = await request(app)
        .post("/api/contact")
        .set(SAME_ORIGIN)
        .send(validSubmission({ extra: "field" }));
      expect(unknown.status).toBe(400);

      const empty = await request(app).post("/api/contact").set(SAME_ORIGIN).send({});
      expect(empty.status).toBe(400);
      expect(await qaRows()).toHaveLength(0);
    });

    it("rejects cross-origin and origin-less submissions with 403", async () => {
      const wrongOrigin = await request(app)
        .post("/api/contact")
        .set({ Host: TEST_HOST, Origin: "https://evil.example" })
        .send(validSubmission());
      expect(wrongOrigin.status).toBe(403);
      expect(wrongOrigin.body).toEqual({ message: "Cross-origin request rejected" });

      const noOrigin = await request(app)
        .post("/api/contact")
        .set("Host", TEST_HOST)
        .send(validSubmission());
      expect(noOrigin.status).toBe(403);
      expect(noOrigin.body).toEqual({ message: "A same-origin request is required" });

      const declaredCrossSite = await request(app)
        .post("/api/contact")
        .set({ ...SAME_ORIGIN, "sec-fetch-site": "cross-site" })
        .send(validSubmission());
      expect(declaredCrossSite.status).toBe(403);

      const schemeMismatch = await request(app)
        .post("/api/contact")
        .set({ Host: TEST_HOST, Origin: `https://${TEST_HOST}` })
        .send(validSubmission());
      expect(schemeMismatch.status).toBe(403);

      expect(await qaRows()).toHaveLength(0);
    });

    it("limits an IP to 5 submissions per hour through the shared store's own prefix", async () => {
      const statuses: number[] = [];
      let limited: request.Response | undefined;
      for (let i = 0; i < contact.CONTACT_RATE_LIMIT.limit + 1; i += 1) {
        const res = await request(app)
          .post("/api/contact")
          .set(SAME_ORIGIN)
          .send(validSubmission({ subject: `Probe ${i + 1}` }));
        statuses.push(res.status);
        if (res.status === 429) limited = res;
      }
      expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
      expect(limited).toBeDefined();
      expect(limited!.headers["ratelimit-limit"]).toBe(String(contact.CONTACT_RATE_LIMIT.limit));
      expect(limited!.headers["ratelimit-remaining"]).toBe("0");
      expect(limited!.headers["ratelimit-reset"]).toMatch(/^\d+$/);
      expect(limited!.headers["retry-after"]).toMatch(/^\d+$/);
      expect(limited!.headers["x-ratelimit-limit"]).toBeUndefined();
      // Shared negotiated 429 body: the JSON branch of negotiated429Handler.
      expect(limited!.body).toEqual({
        error: "Rate limit exceeded",
        message: expect.stringContaining("Too many contact requests"),
        retryAfter: contact.CONTACT_RATE_LIMIT.windowMs / 1000,
      });

      // Only the five accepted submissions were stored.
      expect(await qaRows()).toHaveLength(contact.CONTACT_RATE_LIMIT.limit);

      // The contact limiter keeps its own counter row in the shared table
      // (limiter = "contact"); the wide /api backstop counts the same requests
      // under its own name, so neither budget is charged twice.
      const hits = await getTestDb()
        .select({ limiter: schema.rateLimitHits.limiter, hits: schema.rateLimitHits.hits })
        .from(schema.rateLimitHits);
      const contactRows = hits.filter((row) => row.limiter === "contact");
      expect(contactRows).toEqual([{ limiter: "contact", hits: contact.CONTACT_RATE_LIMIT.limit + 1 }]);
      expect(new Set(hits.map((row) => row.limiter)).size).toBe(hits.length);

      await deleteQaRows();
      expect(await qaRows()).toHaveLength(0);
    });

    describe("GET /api/admin/contact-submissions", () => {
      it("requires an authenticated admin", async () => {
        const anonymous = await request(app).get("/api/admin/contact-submissions");
        expect(anonymous.status).toBe(401);

        const user = await createTestUser({ email: `__qa_test_contact_user_${Date.now()}@example.com` });
        const nonAdmin = await request(app)
          .get("/api/admin/contact-submissions")
          .set("x-test-user-id", user.id);
        expect(nonAdmin.status).toBe(403);
      });

      it("lists submissions newest first with pagination and the real total", async () => {
        const admin = await createTestAdmin({ email: `__qa_test_contact_admin_${Date.now()}@example.com` });
        for (let i = 1; i <= 3; i += 1) {
          const res = await request(app)
            .post("/api/contact")
            .set(SAME_ORIGIN)
            .send(validSubmission({ subject: `Inbox ${i}` }));
          expect(res.status).toBe(200);
        }

        const page = await request(app)
          .get("/api/admin/contact-submissions?limit=2&offset=0")
          .set("x-test-user-id", admin.id);
        expect(page.status).toBe(200);
        expect(page.headers["cache-control"]).toBe("no-store");
        expect(page.body.total).toBe(3);
        expect(page.body.limit).toBe(2);
        expect(page.body.offset).toBe(0);
        expect(page.body.submissions.map((s: { subject: string }) => s.subject)).toEqual(["Inbox 3", "Inbox 2"]);
        expect(page.body.submissions[0]).toEqual({
          id: expect.any(String),
          name: "QA Tester",
          replyTo: "qa@example.com",
          subject: "Inbox 3",
          message: expect.stringContaining(QA_MARKER),
          createdAt: expect.any(String),
          ipHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          userId: null,
        });

        const rest = await request(app)
          .get("/api/admin/contact-submissions?limit=2&offset=2")
          .set("x-test-user-id", admin.id);
        expect(rest.status).toBe(200);
        expect(rest.body.submissions.map((s: { subject: string }) => s.subject)).toEqual(["Inbox 1"]);

        const defaults = await request(app)
          .get("/api/admin/contact-submissions")
          .set("x-test-user-id", admin.id);
        expect(defaults.body).toMatchObject({ limit: 50, offset: 0, total: 3 });
      });

      it("rejects out-of-range pagination with 400", async () => {
        const admin = await createTestAdmin({ email: `__qa_test_contact_admin_${Date.now()}@example.com` });
        for (const query of ["limit=0", `limit=${contact.CONTACT_LIST_MAX_LIMIT + 1}`, "offset=-1", "limit=abc"]) {
          const res = await request(app)
            .get(`/api/admin/contact-submissions?${query}`)
            .set("x-test-user-id", admin.id);
          expect(res.status, query).toBe(400);
        }
      });
    });
  });
});
