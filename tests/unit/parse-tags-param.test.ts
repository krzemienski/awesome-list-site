/**
 * Unit tests for the shared tag URL-param parser (BUG-064, task #246).
 *
 * Every catalog page (Home, Category, Subcategory, SubSubcategory) must parse
 * tag filters from the URL identically: canonical ?tags=, the ?tag= alias,
 * repeated params, comma lists, whitespace chunks, and canonical-form dedupe.
 */

import { describe, it, expect } from 'vitest';
import { parseTagsParam } from '../../client/src/lib/tags';
import {
  normalizeTagPathSegment,
  tagLandingPath,
} from '../../shared/tagNormalize';

const p = (qs: string) => parseTagsParam(new URLSearchParams(qs));

describe('parseTagsParam', () => {
  it('parses a comma-separated ?tags= list', () => {
    expect(p('tags=RTMP,HLS')).toEqual(['RTMP', 'HLS']);
  });

  it('collects EVERY repeated ?tags= occurrence, not just the first', () => {
    // BUG-064: Home used to read only the first value, silently applying
    // just RTMP for ?tags=RTMP&tags=HLS.
    expect(p('tags=RTMP&tags=HLS')).toEqual(['RTMP', 'HLS']);
  });

  it('honors the ?tag= singular alias and mixes it with ?tags=', () => {
    expect(p('tag=hls')).toEqual(['hls']);
    expect(p('tags=RTMP&tag=HLS')).toEqual(['RTMP', 'HLS']);
  });

  it('drops whitespace-only and empty chunks instead of keeping them as filters', () => {
    // ?tags=+++ used to survive as a " " chunk on Subcategory and filter
    // every resource out (false empty state).
    expect(p('tags=%20%20%20')).toEqual([]);
    expect(p('tags=')).toEqual([]);
    expect(p('tags=,,')).toEqual([]);
    expect(p('tags=%20,HLS,%20')).toEqual(['HLS']);
  });

  it('trims surrounding whitespace from each tag', () => {
    expect(p('tags=%20RTMP%20,%20HLS')).toEqual(['RTMP', 'HLS']);
  });

  it('dedupes on the canonical tag form, first spelling wins', () => {
    // normalizeTag folds case/space/underscore and conservative plurals.
    expect(p('tags=HLS,hls')).toEqual(['HLS']);
    expect(p('tags=open-source&tag=open%20source')).toEqual(['open-source']);
    expect(p('tags=codecs,codec')).toEqual(['codecs']);
  });

  it('returns [] when no tag params are present', () => {
    expect(p('')).toEqual([]);
    expect(p('sort=name-asc&page=2')).toEqual([]);
  });
});

describe('tag landing paths', () => {
  it('round-trips reserved characters through one canonical URL segment', () => {
    for (const tag of ['C++', 'H.264', 'Node.js', '100%', 'video/tools']) {
      const path = tagLandingPath(tag);
      const segment = path.slice('/tag/'.length);
      expect(segment).not.toContain('/');
      expect(normalizeTagPathSegment(segment)).toBe(normalizeTagPathSegment(encodeURIComponent(tag)));
    }
  });

  it('returns an empty identity for malformed percent encoding', () => {
    expect(normalizeTagPathSegment('broken%')).toBe('');
  });
});
