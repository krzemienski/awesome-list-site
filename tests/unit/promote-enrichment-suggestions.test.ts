/**
 * Unit tests for promoteEnrichmentSuggestions (task #59).
 *
 * Exercises the AI-enrichment promotion path that fills blank hierarchy
 * columns on a resource from Claude's suggestions and routes any new
 * sub-subcategory through `ensureSubSubcategoryExists`, so the resource
 * becomes reachable via category browsing instead of being stranded with
 * only a metadata hint.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { promoteEnrichmentSuggestions } from '../../server/ai/promoteEnrichmentSuggestions';

interface FakeCategory { id: number; name: string }
interface FakeSubcategory { id: number; name: string; categoryId: number }
interface FakeSubSubcategory { id: number; name: string; slug: string; subcategoryId: number }

class FakeCategoryRepo {
  categories: FakeCategory[] = [];
  subcategories: FakeSubcategory[] = [];
  subSubcategories: FakeSubSubcategory[] = [];
  createCalls: Array<{ name: string; slug: string; subcategoryId: number }> = [];

  async getCategoryByName(name: string): Promise<FakeCategory | undefined> {
    return this.categories.find(c => c.name === name);
  }
  async getSubcategoryByName(name: string, categoryId: number): Promise<FakeSubcategory | undefined> {
    return this.subcategories.find(s => s.name === name && s.categoryId === categoryId);
  }
  async getSubSubcategoryByName(name: string, subcategoryId: number): Promise<FakeSubSubcategory | undefined> {
    return this.subSubcategories.find(ss => ss.name === name && ss.subcategoryId === subcategoryId);
  }
  async getSubSubcategoryBySlug(slug: string, subcategoryId: number): Promise<FakeSubSubcategory | undefined> {
    return this.subSubcategories.find(ss => ss.slug === slug && ss.subcategoryId === subcategoryId);
  }
  async createSubSubcategory(input: { name: string; slug: string; subcategoryId: number }): Promise<FakeSubSubcategory> {
    this.createCalls.push(input);
    const row: FakeSubSubcategory = { id: this.subSubcategories.length + 1, ...input };
    this.subSubcategories.push(row);
    return row;
  }
}

describe('promoteEnrichmentSuggestions', () => {
  let repo: FakeCategoryRepo;

  beforeEach(() => {
    repo = new FakeCategoryRepo();
    repo.categories.push({ id: 1, name: 'Streaming' });
    repo.subcategories.push({ id: 10, name: 'Live Streaming', categoryId: 1 });
  });

  it('fills blank hierarchy columns and creates the implied sub-subcategory row', async () => {
    const updates = await promoteEnrichmentSuggestions(
      repo as any,
      { category: 'Streaming', subcategory: null, subSubcategory: null },
      {
        category: 'Streaming',
        subcategory: 'Live Streaming',
        subSubcategory: 'WebRTC Servers',
      },
    );

    expect(updates).toEqual({
      subcategory: 'Live Streaming',
      subSubcategory: 'WebRTC Servers',
    });

    // The sub_subcategories row must now exist so the resource is reachable
    // through `/category/streaming` → `Live Streaming` → `WebRTC Servers`.
    const created = await repo.getSubSubcategoryByName('WebRTC Servers', 10);
    expect(created).toBeDefined();
    expect(created?.slug).toBe('webrtc-servers');
    expect(repo.createCalls).toHaveLength(1);
  });

  it('never overwrites curated hierarchy values', async () => {
    // The curated sub-subcategory row already exists in the hierarchy —
    // otherwise the always-on backfill guard would (correctly) create it.
    repo.subSubcategories.push({ id: 100, name: 'WebRTC Servers', slug: 'webrtc-servers', subcategoryId: 10 });

    const updates = await promoteEnrichmentSuggestions(
      repo as any,
      {
        category: 'Streaming',
        subcategory: 'Live Streaming',
        subSubcategory: 'WebRTC Servers',
      },
      {
        category: 'Editing',
        subcategory: 'Non-Linear',
        subSubcategory: 'Timeline Tools',
      },
    );

    expect(updates).toEqual({});
    // No new sub-subcategory because the curated value already exists.
    expect(repo.createCalls).toHaveLength(0);
  });

  it('skips sub-subcategory creation when the suggested parent subcategory is unknown', async () => {
    const updates = await promoteEnrichmentSuggestions(
      repo as any,
      { category: 'Streaming', subcategory: null, subSubcategory: null },
      {
        category: 'Streaming',
        subcategory: 'Unknown Subcategory',
        subSubcategory: 'WebRTC Servers',
      },
    );

    // Subcategory is still promoted onto the resource as a hint, but the
    // guard intentionally won't create a level-3 row under an unknown
    // level-2 parent — level-1/2 creation stays admin-driven.
    expect(updates.subcategory).toBe('Unknown Subcategory');
    expect(updates.subSubcategory).toBe('WebRTC Servers');
    expect(repo.createCalls).toHaveLength(0);
  });

  it('returns no updates and creates nothing when there are no suggestions', async () => {
    const updates = await promoteEnrichmentSuggestions(
      repo as any,
      { category: 'Streaming', subcategory: null, subSubcategory: null },
      { category: null, subcategory: null, subSubcategory: null },
    );

    expect(updates).toEqual({});
    expect(repo.createCalls).toHaveLength(0);
  });

  it('treats whitespace-only existing values as blank and promotes the suggestion', async () => {
    const updates = await promoteEnrichmentSuggestions(
      repo as any,
      { category: 'Streaming', subcategory: '   ', subSubcategory: '' },
      {
        category: 'Streaming',
        subcategory: 'Live Streaming',
        subSubcategory: 'WebRTC Servers',
      },
    );

    expect(updates.subcategory).toBe('Live Streaming');
    expect(updates.subSubcategory).toBe('WebRTC Servers');
    expect(repo.createCalls).toHaveLength(1);
  });
});
