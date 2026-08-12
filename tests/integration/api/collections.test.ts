import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { registerRoutes } from "../../../server/routes";
import {
  cleanupDatabase,
  closeTestDb,
  createTestResource,
  createTestUser,
} from "../../helpers/db-helper";
import { hashPassword } from "../../../server/passwordUtils";

describe("Collections and learning queue API", () => {
  let app: Express;
  let owner: ReturnType<typeof request.agent>;
  let other: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    await cleanupDatabase();
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);

    const ownerPassword = "CollectionOwner123";
    const otherPassword = "CollectionOther123";
    const [ownerUser, otherUser] = await Promise.all([
      createTestUser({
        email: "collection-owner@example.com",
        password: await hashPassword(ownerPassword),
      }),
      createTestUser({
        email: "collection-other@example.com",
        password: await hashPassword(otherPassword),
      }),
    ]);
    expect(ownerUser.id).not.toBe(otherUser.id);

    owner = request.agent(app);
    other = request.agent(app);
    await owner
      .post("/api/auth/local/login")
      .send({ email: ownerUser.email, password: ownerPassword })
      .expect(200);
    await other
      .post("/api/auth/local/login")
      .send({ email: otherUser.email, password: otherPassword })
      .expect(200);
  });

  afterAll(async () => {
    await cleanupDatabase();
    await closeTestDb();
  });

  it("preserves bookmarks while enforcing ownership, partial bulk, and private sharing", async () => {
    const [approvedOne, approvedTwo, pending, otherResource] = await Promise.all([
      createTestResource({
        title: "Approved One",
        url: "https://example.com/collection-approved-one",
        status: "approved",
      }),
      createTestResource({
        title: "Approved Two",
        url: "https://example.com/collection-approved-two",
        status: "approved",
      }),
      createTestResource({
        title: "Pending Private Resource",
        url: "https://example.com/collection-pending",
        status: "pending",
      }),
      createTestResource({
        title: "Other Owner Resource",
        url: "https://example.com/collection-other",
        status: "approved",
      }),
    ]);

    await owner
      .post(`/api/bookmarks/${approvedOne.id}`)
      .send({ notes: "Keep this private note" })
      .expect(200);
    await owner.post(`/api/bookmarks/${approvedTwo.id}`).expect(200);
    await owner.post(`/api/bookmarks/${pending.id}`).expect(200);
    await other.post(`/api/bookmarks/${otherResource.id}`).expect(200);

    const legacyList = await owner.get("/api/bookmarks").expect(200);
    const legacyOne = legacyList.body.find((item: any) => item.id === approvedOne.id);
    expect(legacyOne).toMatchObject({
      id: approvedOne.id,
      resourceId: approvedOne.id,
      notes: "Keep this private note",
      queueStatus: "saved",
      archivedAt: null,
      personalTags: [],
      collectionIds: [],
    });

    const inbox = await owner
      .post("/api/collections")
      .send({ name: "Watch this week" })
      .expect(201);
    const course = await owner
      .post("/api/collections")
      .send({ name: "Build a player" })
      .expect(201);
    const otherCollection = await other
      .post("/api/collections")
      .send({ name: "Other person's list" })
      .expect(201);

    await owner
      .patch(`/api/collections/${otherCollection.body.id}`)
      .send({ name: "Taken over" })
      .expect(404);
    await owner
      .post(`/api/collections/${otherCollection.body.id}/items/${approvedOne.id}`)
      .expect(404);

    for (const resourceId of [approvedOne.id, approvedTwo.id, pending.id]) {
      await owner
        .post(`/api/collections/${inbox.body.id}/items/${resourceId}`)
        .expect(201);
    }
    await owner
      .post(`/api/collections/${inbox.body.id}/items/${otherResource.id}`)
      .expect(409);

    await owner
      .patch(`/api/bookmarks/${approvedOne.id}/state`)
      .send({
        queueStatus: "in-progress",
        personalTags: ["Codec", "codec", "Deep dive"],
      })
      .expect(200);

    const mixed = await owner
      .post("/api/bookmarks/bulk")
      .send({
        resourceIds: [approvedOne.id, 2_147_483_647],
        action: { type: "status", status: "watch-next" },
      })
      .expect(207);
    expect(mixed.body.succeeded).toEqual([approvedOne.id]);
    expect(mixed.body.failed).toEqual([
      expect.objectContaining({
        resourceId: 2_147_483_647,
        code: "not_bookmarked",
      }),
    ]);

    await owner
      .post("/api/bookmarks/bulk")
      .send({
        resourceIds: [2_147_483_647],
        action: { type: "archive", archived: true },
      })
      .expect(400);

    // All Saved source: add destination without removing existing membership.
    await owner
      .post("/api/bookmarks/bulk")
      .send({
        resourceIds: [approvedOne.id],
        action: {
          type: "move",
          destinationCollectionId: course.body.id,
          sourceCollectionId: null,
        },
      })
      .expect(200);

    // Concrete collection source: add destination and remove only that source.
    await owner
      .post("/api/bookmarks/bulk")
      .send({
        resourceIds: [approvedTwo.id],
        action: {
          type: "move",
          destinationCollectionId: course.body.id,
          sourceCollectionId: inbox.body.id,
        },
      })
      .expect(200);

    const afterMove = await owner.get("/api/bookmarks").expect(200);
    expect(
      afterMove.body.find((item: any) => item.id === approvedOne.id).collectionIds.sort(),
    ).toEqual([inbox.body.id, course.body.id].sort());
    expect(
      afterMove.body.find((item: any) => item.id === approvedTwo.id).collectionIds,
    ).toEqual([course.body.id]);

    const firstPublish = await owner
      .post(`/api/collections/${inbox.body.id}/publish`)
      .expect(200);
    expect(firstPublish.body.shareId).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(firstPublish.body.publicUrl).toContain(
      `/collection/${firstPublish.body.shareId}`,
    );

    const publicResult = await request(app)
      .get(`/api/public/collections/${firstPublish.body.shareId}`)
      .expect(200);
    expect(publicResult.body).toMatchObject({
      shareId: firstPublish.body.shareId,
      name: "Watch this week",
    });
    expect(publicResult.body.resources.map((item: any) => item.id)).toEqual([
      approvedOne.id,
    ]);
    expect(JSON.stringify(publicResult.body)).not.toContain("Keep this private note");
    expect(JSON.stringify(publicResult.body)).not.toContain("queueStatus");
    expect(JSON.stringify(publicResult.body)).not.toContain("personalTags");

    await owner
      .delete(`/api/collections/${inbox.body.id}/publish`)
      .expect(200);
    await request(app)
      .get(`/api/public/collections/${firstPublish.body.shareId}`)
      .expect(404);
    await request(app).get("/api/public/collections/not-a-share-id").expect(404);

    const republished = await owner
      .post(`/api/collections/${inbox.body.id}/publish`)
      .expect(200);
    expect(republished.body.shareId).toBe(firstPublish.body.shareId);

    await owner.delete(`/api/collections/${course.body.id}`).expect(200);
    const afterDelete = await owner.get("/api/bookmarks").expect(200);
    const preserved = afterDelete.body.find((item: any) => item.id === approvedOne.id);
    expect(preserved.notes).toBe("Keep this private note");
    expect(preserved.queueStatus).toBe("watch-next");
    expect(preserved.personalTags).toEqual(["Codec", "Deep dive"]);
    expect(preserved.collectionIds).toEqual([inbox.body.id]);

    await owner
      .patch(`/api/collections/${inbox.body.id}`)
      .send({ archived: true })
      .expect(200);
    await request(app)
      .get(`/api/public/collections/${firstPublish.body.shareId}`)
      .expect(404);
  });
});
