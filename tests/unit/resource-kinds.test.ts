/**
 * Resource kind resolver (design parity, kind strip + admin catalog).
 *
 * Precedence under test (docs/parity/assumptions/kind-api.md):
 *   stored value (any enum member, including "other")
 *     > tag mapping (config.resource_kinds.tag_mappings + generic words,
 *       enum order breaks ties)
 *     > category mapping (config.resource_kinds.category_mappings over
 *       category / subcategory / subSubcategory, enum order breaks ties)
 *     > "other" (source "default")
 * plus the normalisation both sides of a match go through
 * (normalizeResourceKindTag: NFKC, case, whitespace/underscore → hyphen).
 */

import { describe, it, expect } from 'vitest';
import {
  RESOURCE_KIND_VALUES,
  buildResourceKindCategoryMappings,
  buildResourceKindTagMappings,
  normalizeResourceKindTag,
  resolveResourceKindFrom,
  type ResourceKindMappings,
} from '@shared/resourceKinds';
import {
  emptyResourceKindCounts,
  resolveResourceKind,
  withResourceKindFields,
} from '../../server/lib/resourceKinds';
import { config } from '../../server/config';

const NO_MAPPINGS: ResourceKindMappings = {};

describe('normalizeResourceKindTag', () => {
  it('lowercases and trims', () => {
    expect(normalizeResourceKindTag('  TOOLS ')).toBe('tools');
  });

  it('collapses whitespace and underscore runs to one hyphen', () => {
    expect(normalizeResourceKindTag('Video_Tools')).toBe('video-tools');
    expect(normalizeResourceKindTag('video   tools')).toBe('video-tools');
    expect(normalizeResourceKindTag('video _ tools')).toBe('video-tools');
    expect(normalizeResourceKindTag('_tools_')).toBe('tools');
  });

  it('applies NFKC compatibility folding (fullwidth, ligatures)', () => {
    expect(normalizeResourceKindTag('\uFF54\uFF4F\uFF4F\uFF4C')).toBe('tool');
    expect(normalizeResourceKindTag('speci\uFB01cation')).toBe('specification');
  });

  it('is idempotent', () => {
    for (const raw of ['Video_Tools', ' Open Source ', 'ＳＤＫ']) {
      const once = normalizeResourceKindTag(raw);
      expect(normalizeResourceKindTag(once)).toBe(once);
    }
  });
});

describe('resolveResourceKindFrom precedence', () => {
  it('stored value wins over any inferable signal', () => {
    expect(
      resolveResourceKindFrom(
        { storedKind: 'events', tags: ['library', 'sdk'], taxonomy: ['Tools'] },
        { category_mappings: { tools: ['Tools'] } },
      ),
    ).toEqual({ kind: 'events', source: 'stored' });
  });

  it('a stored "other" is honoured as stored (it suppresses inference)', () => {
    expect(resolveResourceKindFrom({ storedKind: 'other', tags: ['library'] }, NO_MAPPINGS)).toEqual({
      kind: 'other',
      source: 'stored',
    });
  });

  it('a stored value outside the enum is treated as not stored', () => {
    expect(resolveResourceKindFrom({ storedKind: 'gadget', tags: ['library'] }, NO_MAPPINGS)).toEqual({
      kind: 'libraries',
      source: 'inferred',
    });
    expect(resolveResourceKindFrom({ storedKind: 42 }, NO_MAPPINGS)).toEqual({ kind: 'other', source: 'default' });
  });

  it('infers from the generic tag words when nothing is stored', () => {
    expect(resolveResourceKindFrom({ storedKind: null, tags: ['conference'] }, NO_MAPPINGS)).toEqual({
      kind: 'events',
      source: 'inferred',
    });
    expect(resolveResourceKindFrom({ storedKind: null, tags: ['Transport'] }, NO_MAPPINGS)).toEqual({
      kind: 'protocols',
      source: 'inferred',
    });
  });

  it('honours configured tag_mappings alongside the generic words', () => {
    const mappings: ResourceKindMappings = { tag_mappings: { standards: ['rfc'] } };
    expect(resolveResourceKindFrom({ storedKind: null, tags: ['RFC'] }, mappings)).toEqual({
      kind: 'standards',
      source: 'inferred',
    });
    // Generic words keep working when a config block is present.
    expect(resolveResourceKindFrom({ storedKind: null, tags: ['sdk'] }, mappings)).toEqual({
      kind: 'libraries',
      source: 'inferred',
    });
  });

  it('breaks tag ties in enum order (tools < libraries < standards < events < protocols)', () => {
    expect(resolveResourceKindFrom({ storedKind: null, tags: ['protocol', 'library'] }, NO_MAPPINGS).kind).toBe(
      'libraries',
    );
    expect(resolveResourceKindFrom({ storedKind: null, tags: ['event', 'tool'] }, NO_MAPPINGS).kind).toBe('tools');
  });

  it('a tag mapping beats a category mapping', () => {
    const mappings: ResourceKindMappings = { category_mappings: { events: ['Community & Events'] } };
    expect(
      resolveResourceKindFrom(
        { storedKind: null, tags: ['library'], taxonomy: ['Community & Events'] },
        mappings,
      ),
    ).toEqual({ kind: 'libraries', source: 'inferred' });
  });

  it('infers from configured category mappings over every taxonomy level', () => {
    const mappings: ResourceKindMappings = {
      category_mappings: { events: ['Community & Events'], protocols: ['Transport Protocols'], standards: ['AV1'] },
    };
    expect(resolveResourceKindFrom({ storedKind: null, taxonomy: ['Community & Events', null, null] }, mappings)).toEqual({
      kind: 'events',
      source: 'inferred',
    });
    expect(
      resolveResourceKindFrom({ storedKind: null, taxonomy: ['Protocols & Transport', 'Transport Protocols', null] }, mappings),
    ).toEqual({ kind: 'protocols', source: 'inferred' });
    expect(resolveResourceKindFrom({ storedKind: null, taxonomy: ['Encoding & Codecs', 'Codecs', 'AV1'] }, mappings)).toEqual({
      kind: 'standards',
      source: 'inferred',
    });
  });

  it('category mappings have NO generic defaults — an unmapped category never implies a kind', () => {
    expect(resolveResourceKindFrom({ storedKind: null, taxonomy: ['Tools', 'Libraries'] }, NO_MAPPINGS)).toEqual({
      kind: 'other',
      source: 'default',
    });
    expect(buildResourceKindCategoryMappings({})).toEqual({
      tools: [],
      libraries: [],
      standards: [],
      events: [],
      protocols: [],
      other: [],
    });
  });

  it('falls back to "other" with source "default" when nothing matches', () => {
    expect(resolveResourceKindFrom({ storedKind: null }, NO_MAPPINGS)).toEqual({ kind: 'other', source: 'default' });
    expect(resolveResourceKindFrom({ storedKind: undefined, tags: ['ffmpeg', 'video'] }, NO_MAPPINGS)).toEqual({
      kind: 'other',
      source: 'default',
    });
  });

  it('matches tags case-insensitively, across singular/plural words and separator variants', () => {
    for (const tag of ['Library', 'LIBRARIES', ' libraries ', 'Frameworks', 'SDKs']) {
      expect(resolveResourceKindFrom({ storedKind: null, tags: [tag] }, NO_MAPPINGS).kind).toBe('libraries');
    }
    const mappings: ResourceKindMappings = { tag_mappings: { tools: ['video tools'] } };
    for (const tag of ['Video_Tools', 'video  tools', 'VIDEO-TOOLS', '\uFF56ideo tools']) {
      expect(resolveResourceKindFrom({ storedKind: null, tags: [tag] }, mappings).kind).toBe('tools');
    }
  });

  it('ignores non-string tag entries and malformed tag containers', () => {
    expect(resolveResourceKindFrom({ storedKind: null, tags: [42, null, { tag: 'library' }] }, NO_MAPPINGS).kind).toBe(
      'other',
    );
    expect(resolveResourceKindFrom({ storedKind: null, tags: null }, NO_MAPPINGS).kind).toBe('other');
  });
});

describe('mapping compilation', () => {
  it('normalises and dedupes configured + generic words', () => {
    const built = buildResourceKindTagMappings({ tools: ['Tool', 'CLI_Tools', ' cli tools '] });
    expect(built.tools.filter((w) => w === 'tool')).toHaveLength(1);
    expect(built.tools.filter((w) => w === 'cli-tools')).toHaveLength(1);
    expect(built.other).toEqual([]);
  });
});

describe('server resolveResourceKind / withResourceKindFields', () => {
  it('reads kind, metadata.tags and the taxonomy columns off a row', () => {
    expect(resolveResourceKind({ kind: null, metadata: { tags: ['Conference'] } }, NO_MAPPINGS)).toEqual({
      kind: 'events',
      source: 'inferred',
    });
    expect(
      resolveResourceKind(
        { kind: null, metadata: {}, category: 'Community & Events' },
        { category_mappings: { events: ['community & events'] } },
      ),
    ).toEqual({ kind: 'events', source: 'inferred' });
  });

  it('defaults to the loaded config mappings', () => {
    const row = { kind: null, metadata: { tags: ['protocol'] } };
    expect(resolveResourceKind(row)).toEqual(resolveResourceKind(row, config.resource_kinds));
    expect(resolveResourceKind(row).kind).toBe('protocols');
  });

  it('tolerates metadata that is not an object', () => {
    expect(resolveResourceKind({ kind: null, metadata: 'tags: library' }, NO_MAPPINGS).kind).toBe('other');
    expect(resolveResourceKind({ kind: null, metadata: ['library'] }, NO_MAPPINGS).kind).toBe('other');
    expect(resolveResourceKind({ kind: null, metadata: { tags: 'library' } }, NO_MAPPINGS).kind).toBe('other');
  });

  it('adds kind (stored or null) and resolvedKind without touching other fields', () => {
    const row = { id: 1, title: 'x', kind: 'tools', metadata: { tags: ['library'] }, extra: true };
    const out = withResourceKindFields(row, NO_MAPPINGS);
    expect(out).toEqual({ ...row, kind: 'tools', resolvedKind: 'tools' });

    const unset = withResourceKindFields({ id: 2, metadata: { tags: ['library'] } }, NO_MAPPINGS);
    expect(unset.kind).toBeNull();
    expect(unset.resolvedKind).toBe('libraries');

    const bogus = withResourceKindFields({ id: 3, kind: 'gadget' }, NO_MAPPINGS);
    expect(bogus.kind).toBeNull();
    expect(bogus.resolvedKind).toBe('other');
  });

  it('emptyResourceKindCounts has every enum key plus total, all zero', () => {
    const counts = emptyResourceKindCounts();
    expect(Object.keys(counts).sort()).toEqual([...RESOURCE_KIND_VALUES, 'total'].sort());
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });
});
