/**
 * Unit tests for server-side Mixpanel conversion tracking (Task #233).
 *
 * Verifies the two contract points the completion review flagged:
 *  - a consented request posts to Mixpanel's /track with `time` in Unix
 *    SECONDS (the HTTP API rejects/misplaces millisecond timestamps)
 *  - a request without the consent header makes NO network call at all
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request } from 'express';
import { trackServerEvent, hasAnalyticsConsent } from '../../server/lib/mixpanelServer';

const makeReq = (headers: Record<string, string>): Request =>
  ({ get: (name: string) => headers[name.toLowerCase()] } as unknown as Request);

describe('trackServerEvent', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.MIXPANEL_TOKEN = 'test-token';
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ error: null, status: 1 }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MIXPANEL_TOKEN;
  });

  it('posts a consented conversion with time in Unix SECONDS', () => {
    const before = Math.floor(Date.now() / 1000);
    trackServerEvent(
      makeReq({ 'x-analytics-consent': 'granted', 'x-mixpanel-distinct-id': 'dev-123' }),
      'sign_up_completed',
      'user-1',
      { sign_up_method: 'password' },
    );
    const after = Math.floor(Date.now() / 1000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('api.mixpanel.com/track');
    const [payload] = JSON.parse((init as RequestInit).body as string);
    expect(payload.event).toBe('sign_up_completed');
    expect(payload.properties.distinct_id).toBe('dev-123'); // header wins over fallback
    expect(payload.properties.sign_up_method).toBe('password');
    expect(payload.properties.$insert_id).toBeTruthy();
    // The critical unit check: seconds, not milliseconds.
    expect(payload.properties.time).toBeGreaterThanOrEqual(before);
    expect(payload.properties.time).toBeLessThanOrEqual(after);
  });

  it('falls back to the DB user id when no distinct-id header is sent', () => {
    trackServerEvent(
      makeReq({ 'x-analytics-consent': 'granted' }),
      'resource_submitted',
      'user-42',
      { content_type: 'resource_submission', category: 'Intro & Learning' },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [payload] = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(payload.event).toBe('resource_submitted');
    expect(payload.properties.distinct_id).toBe('user-42');
    expect(payload.properties.category).toBe('Intro & Learning');
  });

  it('makes NO network call without the consent header', () => {
    trackServerEvent(makeReq({}), 'sign_up_completed', 'user-1', {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes NO network call when consent header is not exactly "granted"', () => {
    trackServerEvent(makeReq({ 'x-analytics-consent': 'denied' }), 'sign_up_completed', 'user-1', {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes NO network call when no token is configured', () => {
    delete process.env.MIXPANEL_TOKEN;
    const prevVite = process.env.VITE_MIXPANEL_TOKEN;
    delete process.env.VITE_MIXPANEL_TOKEN;
    trackServerEvent(makeReq({ 'x-analytics-consent': 'granted' }), 'sign_up_completed', 'user-1', {});
    expect(fetchMock).not.toHaveBeenCalled();
    if (prevVite !== undefined) process.env.VITE_MIXPANEL_TOKEN = prevVite;
  });
});

describe('hasAnalyticsConsent', () => {
  it('is true only for the exact literal "granted"', () => {
    expect(hasAnalyticsConsent(makeReq({ 'x-analytics-consent': 'granted' }))).toBe(true);
    expect(hasAnalyticsConsent(makeReq({ 'x-analytics-consent': 'GRANTED' }))).toBe(false);
    expect(hasAnalyticsConsent(makeReq({}))).toBe(false);
  });
});
