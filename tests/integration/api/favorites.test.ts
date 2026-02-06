/**
 * Integration Tests for Favorites and Bookmarks API Endpoints
 *
 * Tests the user favorites and bookmarks endpoints including:
 * - POST /api/favorites/:resourceId - Add favorite
 * - DELETE /api/favorites/:resourceId - Remove favorite
 * - GET /api/favorites - Get user's favorites
 * - POST /api/bookmarks/:resourceId - Add bookmark
 * - DELETE /api/bookmarks/:resourceId - Remove bookmark
 * - GET /api/bookmarks - Get user's bookmarks
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { registerRoutes } from '../../../server/routes';
import {
  cleanupDatabase,
  createTestUser,
  createTestResource,
  closeTestDb,
} from '../../helpers/db-helper';
import { hashPassword } from '../../../server/passwordUtils';

describe('Favorites and Bookmarks API Integration Tests', () => {
  let app: Express;
  let user1Email: string;
  let user1Password: string;
  let user1Id: string;
  let user2Email: string;
  let user2Password: string;
  let user2Id: string;

  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();

    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);

    // Create first user
    user1Email = `user1-${Date.now()}@example.com`;
    user1Password = 'User1Password123';
    const user1HashedPassword = await hashPassword(user1Password);

    const user1 = await createTestUser({
      email: user1Email,
      password: user1HashedPassword,
      firstName: 'User',
      lastName: 'One',
      role: 'user',
    });
    user1Id = user1.id;

    // Create second user
    user2Email = `user2-${Date.now()}@example.com`;
    user2Password = 'User2Password123';
    const user2HashedPassword = await hashPassword(user2Password);

    const user2 = await createTestUser({
      email: user2Email,
      password: user2HashedPassword,
      firstName: 'User',
      lastName: 'Two',
      role: 'user',
    });
    user2Id = user2.id;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  // ============= FAVORITES TESTS =============

  describe('POST /api/favorites/:resourceId', () => {
    it('should add favorite when authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const response = await agent
        .post(`/api/favorites/${resource.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Favorite added successfully');

      // Verify favorite was added
      const favoritesResponse = await agent
        .get('/api/favorites')
        .expect(200);

      expect(favoritesResponse.body.length).toBe(1);
      expect(favoritesResponse.body[0].resourceId).toBe(resource.id);
    });

    it('should return 401 when not authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const response = await request(app)
        .post(`/api/favorites/${resource.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid resource id', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const response = await agent
        .post('/api/favorites/invalid')
        .expect(500);

      expect(response.body).toHaveProperty('message');
    });

    it('should allow multiple users to favorite same resource', async () => {
      const resource = await createTestResource({
        title: 'Popular Resource',
        url: 'https://example.com/popular',
        status: 'approved',
      });

      // User 1 favorites
      const agent1 = request.agent(app);
      await agent1
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      await agent1
        .post(`/api/favorites/${resource.id}`)
        .expect(200);

      // User 2 favorites
      const agent2 = request.agent(app);
      await agent2
        .post('/api/auth/local/login')
        .send({
          email: user2Email,
          password: user2Password,
        })
        .expect(200);

      await agent2
        .post(`/api/favorites/${resource.id}`)
        .expect(200);

      // Verify both users have the favorite
      const user1Favorites = await agent1.get('/api/favorites').expect(200);
      const user2Favorites = await agent2.get('/api/favorites').expect(200);

      expect(user1Favorites.body.length).toBe(1);
      expect(user2Favorites.body.length).toBe(1);
    });

    it('should handle duplicate favorite gracefully', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Add favorite first time
      await agent
        .post(`/api/favorites/${resource.id}`)
        .expect(200);

      // Add favorite second time - should not error
      const response = await agent
        .post(`/api/favorites/${resource.id}`);

      // Should return success (idempotent) or handle gracefully
      expect([200, 400, 409]).toContain(response.status);
    });
  });

  describe('DELETE /api/favorites/:resourceId', () => {
    it('should remove favorite when authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Add favorite first
      await agent
        .post(`/api/favorites/${resource.id}`)
        .expect(200);

      // Remove favorite
      const response = await agent
        .delete(`/api/favorites/${resource.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Favorite removed successfully');

      // Verify favorite was removed
      const favoritesResponse = await agent
        .get('/api/favorites')
        .expect(200);

      expect(favoritesResponse.body.length).toBe(0);
    });

    it('should return 401 when not authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const response = await request(app)
        .delete(`/api/favorites/${resource.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle removing non-existent favorite gracefully', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Remove favorite that was never added
      const response = await agent
        .delete(`/api/favorites/${resource.id}`);

      // Should handle gracefully
      expect([200, 404]).toContain(response.status);
    });

    it('should only remove favorite for authenticated user', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      // User 1 adds favorite
      const agent1 = request.agent(app);
      await agent1
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      await agent1
        .post(`/api/favorites/${resource.id}`)
        .expect(200);

      // User 2 removes (should not affect user 1)
      const agent2 = request.agent(app);
      await agent2
        .post('/api/auth/local/login')
        .send({
          email: user2Email,
          password: user2Password,
        })
        .expect(200);

      await agent2
        .delete(`/api/favorites/${resource.id}`);

      // Verify user 1 still has favorite
      const user1Favorites = await agent1.get('/api/favorites').expect(200);
      expect(user1Favorites.body.length).toBe(1);
    });
  });

  describe('GET /api/favorites', () => {
    it('should return user\'s favorites when authenticated', async () => {
      const resource1 = await createTestResource({
        title: 'Resource 1',
        url: 'https://example.com/resource1',
        status: 'approved',
      });

      const resource2 = await createTestResource({
        title: 'Resource 2',
        url: 'https://example.com/resource2',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Add favorites
      await agent.post(`/api/favorites/${resource1.id}`).expect(200);
      await agent.post(`/api/favorites/${resource2.id}`).expect(200);

      // Get favorites
      const response = await agent
        .get('/api/favorites')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body.some((f: any) => f.resourceId === resource1.id)).toBe(true);
      expect(response.body.some((f: any) => f.resourceId === resource2.id)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/favorites')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return empty array when user has no favorites', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const response = await agent
        .get('/api/favorites')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return only authenticated user\'s favorites', async () => {
      const resource1 = await createTestResource({
        title: 'Resource 1',
        url: 'https://example.com/resource1',
        status: 'approved',
      });

      const resource2 = await createTestResource({
        title: 'Resource 2',
        url: 'https://example.com/resource2',
        status: 'approved',
      });

      // User 1 favorites resource 1
      const agent1 = request.agent(app);
      await agent1
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      await agent1.post(`/api/favorites/${resource1.id}`).expect(200);

      // User 2 favorites resource 2
      const agent2 = request.agent(app);
      await agent2
        .post('/api/auth/local/login')
        .send({
          email: user2Email,
          password: user2Password,
        })
        .expect(200);

      await agent2.post(`/api/favorites/${resource2.id}`).expect(200);

      // Verify each user sees only their favorites
      const user1Favorites = await agent1.get('/api/favorites').expect(200);
      const user2Favorites = await agent2.get('/api/favorites').expect(200);

      expect(user1Favorites.body.length).toBe(1);
      expect(user1Favorites.body[0].resourceId).toBe(resource1.id);

      expect(user2Favorites.body.length).toBe(1);
      expect(user2Favorites.body[0].resourceId).toBe(resource2.id);
    });
  });

  // ============= BOOKMARKS TESTS =============

  describe('POST /api/bookmarks/:resourceId', () => {
    it('should add bookmark when authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const response = await agent
        .post(`/api/bookmarks/${resource.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Bookmark added successfully');

      // Verify bookmark was added
      const bookmarksResponse = await agent
        .get('/api/bookmarks')
        .expect(200);

      expect(bookmarksResponse.body.length).toBe(1);
      expect(bookmarksResponse.body[0].resourceId).toBe(resource.id);
    });

    it('should add bookmark with notes', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const bookmarkNotes = 'Remember to watch this later for the Redux section';

      await agent
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: bookmarkNotes })
        .expect(200);

      // Verify bookmark has notes
      const bookmarksResponse = await agent
        .get('/api/bookmarks')
        .expect(200);

      expect(bookmarksResponse.body.length).toBe(1);
      expect(bookmarksResponse.body[0].notes).toBe(bookmarkNotes);
    });

    it('should add bookmark without notes', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      await agent
        .post(`/api/bookmarks/${resource.id}`)
        .expect(200);

      // Verify bookmark was added without notes
      const bookmarksResponse = await agent
        .get('/api/bookmarks')
        .expect(200);

      expect(bookmarksResponse.body.length).toBe(1);
    });

    it('should return 401 when not authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const response = await request(app)
        .post(`/api/bookmarks/${resource.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should allow multiple users to bookmark same resource', async () => {
      const resource = await createTestResource({
        title: 'Popular Resource',
        url: 'https://example.com/popular',
        status: 'approved',
      });

      // User 1 bookmarks
      const agent1 = request.agent(app);
      await agent1
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      await agent1
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: 'User 1 notes' })
        .expect(200);

      // User 2 bookmarks
      const agent2 = request.agent(app);
      await agent2
        .post('/api/auth/local/login')
        .send({
          email: user2Email,
          password: user2Password,
        })
        .expect(200);

      await agent2
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: 'User 2 notes' })
        .expect(200);

      // Verify both users have the bookmark
      const user1Bookmarks = await agent1.get('/api/bookmarks').expect(200);
      const user2Bookmarks = await agent2.get('/api/bookmarks').expect(200);

      expect(user1Bookmarks.body.length).toBe(1);
      expect(user1Bookmarks.body[0].notes).toBe('User 1 notes');

      expect(user2Bookmarks.body.length).toBe(1);
      expect(user2Bookmarks.body[0].notes).toBe('User 2 notes');
    });

    it('should handle duplicate bookmark gracefully', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Add bookmark first time
      await agent
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: 'First notes' })
        .expect(200);

      // Add bookmark second time
      const response = await agent
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: 'Second notes' });

      // Should handle gracefully (update or error)
      expect([200, 400, 409]).toContain(response.status);
    });
  });

  describe('DELETE /api/bookmarks/:resourceId', () => {
    it('should remove bookmark when authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Add bookmark first
      await agent
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: 'Test notes' })
        .expect(200);

      // Remove bookmark
      const response = await agent
        .delete(`/api/bookmarks/${resource.id}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Bookmark removed successfully');

      // Verify bookmark was removed
      const bookmarksResponse = await agent
        .get('/api/bookmarks')
        .expect(200);

      expect(bookmarksResponse.body.length).toBe(0);
    });

    it('should return 401 when not authenticated', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const response = await request(app)
        .delete(`/api/bookmarks/${resource.id}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle removing non-existent bookmark gracefully', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Remove bookmark that was never added
      const response = await agent
        .delete(`/api/bookmarks/${resource.id}`);

      // Should handle gracefully
      expect([200, 404]).toContain(response.status);
    });

    it('should only remove bookmark for authenticated user', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      // User 1 adds bookmark
      const agent1 = request.agent(app);
      await agent1
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      await agent1
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: 'User 1 notes' })
        .expect(200);

      // User 2 removes (should not affect user 1)
      const agent2 = request.agent(app);
      await agent2
        .post('/api/auth/local/login')
        .send({
          email: user2Email,
          password: user2Password,
        })
        .expect(200);

      await agent2
        .delete(`/api/bookmarks/${resource.id}`);

      // Verify user 1 still has bookmark
      const user1Bookmarks = await agent1.get('/api/bookmarks').expect(200);
      expect(user1Bookmarks.body.length).toBe(1);
    });
  });

  describe('GET /api/bookmarks', () => {
    it('should return user\'s bookmarks when authenticated', async () => {
      const resource1 = await createTestResource({
        title: 'Resource 1',
        url: 'https://example.com/resource1',
        status: 'approved',
      });

      const resource2 = await createTestResource({
        title: 'Resource 2',
        url: 'https://example.com/resource2',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Add bookmarks
      await agent
        .post(`/api/bookmarks/${resource1.id}`)
        .send({ notes: 'Notes for resource 1' })
        .expect(200);

      await agent
        .post(`/api/bookmarks/${resource2.id}`)
        .send({ notes: 'Notes for resource 2' })
        .expect(200);

      // Get bookmarks
      const response = await agent
        .get('/api/bookmarks')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body.some((b: any) => b.resourceId === resource1.id)).toBe(true);
      expect(response.body.some((b: any) => b.resourceId === resource2.id)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/bookmarks')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return empty array when user has no bookmarks', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const response = await agent
        .get('/api/bookmarks')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return only authenticated user\'s bookmarks', async () => {
      const resource1 = await createTestResource({
        title: 'Resource 1',
        url: 'https://example.com/resource1',
        status: 'approved',
      });

      const resource2 = await createTestResource({
        title: 'Resource 2',
        url: 'https://example.com/resource2',
        status: 'approved',
      });

      // User 1 bookmarks resource 1
      const agent1 = request.agent(app);
      await agent1
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      await agent1
        .post(`/api/bookmarks/${resource1.id}`)
        .send({ notes: 'User 1 bookmark' })
        .expect(200);

      // User 2 bookmarks resource 2
      const agent2 = request.agent(app);
      await agent2
        .post('/api/auth/local/login')
        .send({
          email: user2Email,
          password: user2Password,
        })
        .expect(200);

      await agent2
        .post(`/api/bookmarks/${resource2.id}`)
        .send({ notes: 'User 2 bookmark' })
        .expect(200);

      // Verify each user sees only their bookmarks
      const user1Bookmarks = await agent1.get('/api/bookmarks').expect(200);
      const user2Bookmarks = await agent2.get('/api/bookmarks').expect(200);

      expect(user1Bookmarks.body.length).toBe(1);
      expect(user1Bookmarks.body[0].resourceId).toBe(resource1.id);
      expect(user1Bookmarks.body[0].notes).toBe('User 1 bookmark');

      expect(user2Bookmarks.body.length).toBe(1);
      expect(user2Bookmarks.body[0].resourceId).toBe(resource2.id);
      expect(user2Bookmarks.body[0].notes).toBe('User 2 bookmark');
    });
  });

  // ============= INTEGRATION FLOWS =============

  describe('Favorites and Bookmarks - Integration Flows', () => {
    it('should handle user favoriting and bookmarking same resource', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Add favorite
      await agent
        .post(`/api/favorites/${resource.id}`)
        .expect(200);

      // Add bookmark
      await agent
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: 'Important resource' })
        .expect(200);

      // Verify both exist
      const favorites = await agent.get('/api/favorites').expect(200);
      const bookmarks = await agent.get('/api/bookmarks').expect(200);

      expect(favorites.body.length).toBe(1);
      expect(bookmarks.body.length).toBe(1);
      expect(favorites.body[0].resourceId).toBe(resource.id);
      expect(bookmarks.body[0].resourceId).toBe(resource.id);
    });

    it('should maintain user favorites/bookmarks across multiple resources', async () => {
      const resources = await Promise.all([
        createTestResource({
          title: 'Resource 1',
          url: 'https://example.com/1',
          status: 'approved',
        }),
        createTestResource({
          title: 'Resource 2',
          url: 'https://example.com/2',
          status: 'approved',
        }),
        createTestResource({
          title: 'Resource 3',
          url: 'https://example.com/3',
          status: 'approved',
        }),
      ]);

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Favorite resources 1 and 2
      await agent.post(`/api/favorites/${resources[0].id}`).expect(200);
      await agent.post(`/api/favorites/${resources[1].id}`).expect(200);

      // Bookmark resources 2 and 3
      await agent.post(`/api/bookmarks/${resources[1].id}`).send({ notes: 'Note 2' }).expect(200);
      await agent.post(`/api/bookmarks/${resources[2].id}`).send({ notes: 'Note 3' }).expect(200);

      // Verify counts
      const favorites = await agent.get('/api/favorites').expect(200);
      const bookmarks = await agent.get('/api/bookmarks').expect(200);

      expect(favorites.body.length).toBe(2);
      expect(bookmarks.body.length).toBe(2);

      // Remove a favorite
      await agent.delete(`/api/favorites/${resources[0].id}`).expect(200);

      // Verify updated count
      const updatedFavorites = await agent.get('/api/favorites').expect(200);
      expect(updatedFavorites.body.length).toBe(1);
      expect(updatedFavorites.body[0].resourceId).toBe(resources[1].id);
    });

    it('should keep favorites and bookmarks separate when removing one', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Add both favorite and bookmark
      await agent.post(`/api/favorites/${resource.id}`).expect(200);
      await agent.post(`/api/bookmarks/${resource.id}`).send({ notes: 'Notes' }).expect(200);

      // Remove favorite only
      await agent.delete(`/api/favorites/${resource.id}`).expect(200);

      // Verify bookmark still exists
      const favorites = await agent.get('/api/favorites').expect(200);
      const bookmarks = await agent.get('/api/bookmarks').expect(200);

      expect(favorites.body.length).toBe(0);
      expect(bookmarks.body.length).toBe(1);
      expect(bookmarks.body[0].resourceId).toBe(resource.id);
    });
  });

  // ============= EDGE CASES =============

  describe('Favorites and Bookmarks - Edge Cases', () => {
    it('should handle non-existent resource id gracefully', async () => {
      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const favResponse = await agent
        .post('/api/favorites/99999');

      const bookmarkResponse = await agent
        .post('/api/bookmarks/99999');

      // Should handle gracefully (either error or success with constraint)
      expect([200, 400, 404, 500]).toContain(favResponse.status);
      expect([200, 400, 404, 500]).toContain(bookmarkResponse.status);
    });

    it('should handle very long bookmark notes', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const longNotes = 'A'.repeat(5000);

      const response = await agent
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: longNotes });

      // Should either accept or reject based on schema
      expect([200, 400]).toContain(response.status);
    });

    it('should handle unicode in bookmark notes', async () => {
      const resource = await createTestResource({
        title: 'Test Resource',
        url: 'https://example.com/test',
        status: 'approved',
      });

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      const unicodeNotes = 'Important! 🚀 中文 العربية Remember for later 💻';

      await agent
        .post(`/api/bookmarks/${resource.id}`)
        .send({ notes: unicodeNotes })
        .expect(200);

      const bookmarks = await agent.get('/api/bookmarks').expect(200);

      expect(bookmarks.body.length).toBe(1);
      expect(bookmarks.body[0].notes).toBe(unicodeNotes);
    });

    it('should handle concurrent favorites/bookmarks operations', async () => {
      const resources = await Promise.all([
        createTestResource({
          title: 'Resource 1',
          url: 'https://example.com/1',
          status: 'approved',
        }),
        createTestResource({
          title: 'Resource 2',
          url: 'https://example.com/2',
          status: 'approved',
        }),
        createTestResource({
          title: 'Resource 3',
          url: 'https://example.com/3',
          status: 'approved',
        }),
      ]);

      const agent = request.agent(app);
      await agent
        .post('/api/auth/local/login')
        .send({
          email: user1Email,
          password: user1Password,
        })
        .expect(200);

      // Concurrent operations
      const operations = [
        agent.post(`/api/favorites/${resources[0].id}`),
        agent.post(`/api/favorites/${resources[1].id}`),
        agent.post(`/api/bookmarks/${resources[1].id}`).send({ notes: 'Note 1' }),
        agent.post(`/api/bookmarks/${resources[2].id}`).send({ notes: 'Note 2' }),
      ];

      const responses = await Promise.all(operations);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify final state
      const favorites = await agent.get('/api/favorites').expect(200);
      const bookmarks = await agent.get('/api/bookmarks').expect(200);

      expect(favorites.body.length).toBe(2);
      expect(bookmarks.body.length).toBe(2);
    });
  });
});
