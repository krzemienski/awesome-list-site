/**
 * Unit tests for the OIDC analytics-consent hand-off (Task #235).
 *
 * The Replit OIDC redirect can't carry the x-analytics-consent header, so the
 * client POSTs consent pre-redirect (setOidcAnalyticsConsent) and the verify
 * callback consumes it one-shot with a TTL (consumeOidcAnalyticsConsent).
 * These tests pin the privacy-critical contract points:
 *  - no consent header → flags cleared, nothing consumable (revocation replay)
 *  - granted consent is consumable exactly once
 *  - stale grants (past TTL) are ignored AND cleared
 *  - oversized distinct ids are rejected
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  setOidcAnalyticsConsent,
  consumeOidcAnalyticsConsent,
  OIDC_CONSENT_TTL_MS,
} from '../../server/replitAuth';

const makeReq = (headers: Record<string, string>) => ({
  get: (name: string) => headers[name.toLowerCase()],
});

afterEach(() => {
  vi.useRealTimers();
});

describe('setOidcAnalyticsConsent', () => {
  it('stores grant + distinct id when the consent header is granted', () => {
    const session: any = {};
    setOidcAnalyticsConsent(
      session,
      makeReq({ 'x-analytics-consent': 'granted', 'x-mixpanel-distinct-id': 'dev-123' }),
    );
    expect(session.analyticsConsent).toBe('granted');
    expect(session.mixpanelDistinctId).toBe('dev-123');
    expect(typeof session.analyticsConsentAt).toBe('number');
  });

  it('CLEARS previously stored flags when called without consent (revocation)', () => {
    const session: any = {
      analyticsConsent: 'granted',
      analyticsConsentAt: Date.now(),
      mixpanelDistinctId: 'dev-123',
    };
    setOidcAnalyticsConsent(session, makeReq({}));
    expect(session.analyticsConsent).toBeUndefined();
    expect(session.analyticsConsentAt).toBeUndefined();
    expect(session.mixpanelDistinctId).toBeUndefined();
  });

  it('ignores non-granted consent values and oversized distinct ids', () => {
    const session: any = {};
    setOidcAnalyticsConsent(session, makeReq({ 'x-analytics-consent': 'denied' }));
    expect(session.analyticsConsent).toBeUndefined();

    setOidcAnalyticsConsent(
      session,
      makeReq({ 'x-analytics-consent': 'granted', 'x-mixpanel-distinct-id': 'x'.repeat(256) }),
    );
    expect(session.analyticsConsent).toBe('granted');
    expect(session.mixpanelDistinctId).toBeUndefined();
  });
});

describe('consumeOidcAnalyticsConsent', () => {
  it('returns the fresh grant exactly once (one-shot clear)', () => {
    const session: any = {};
    setOidcAnalyticsConsent(
      session,
      makeReq({ 'x-analytics-consent': 'granted', 'x-mixpanel-distinct-id': 'dev-9' }),
    );
    const first = consumeOidcAnalyticsConsent(session);
    expect(first).toEqual({ consented: true, mixpanelDistinctId: 'dev-9' });
    // Second consume (duplicate/retried callback) must NOT report consent.
    const second = consumeOidcAnalyticsConsent(session);
    expect(second.consented).toBe(false);
    expect(session.analyticsConsent).toBeUndefined();
  });

  it('ignores and clears stale grants past the TTL', () => {
    vi.useFakeTimers();
    const session: any = {};
    setOidcAnalyticsConsent(session, makeReq({ 'x-analytics-consent': 'granted' }));
    vi.advanceTimersByTime(OIDC_CONSENT_TTL_MS + 1);
    const result = consumeOidcAnalyticsConsent(session);
    expect(result.consented).toBe(false);
    expect(session.analyticsConsent).toBeUndefined();
  });

  it('reports no consent for an empty or missing session', () => {
    expect(consumeOidcAnalyticsConsent({}).consented).toBe(false);
    expect(consumeOidcAnalyticsConsent(undefined).consented).toBe(false);
  });

  it('never honors flags injected without a timestamp (e.g. forged session data)', () => {
    const session: any = { analyticsConsent: 'granted' };
    expect(consumeOidcAnalyticsConsent(session).consented).toBe(false);
  });
});
