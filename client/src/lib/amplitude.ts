// Amplitude Analytics + Session Replay — installed via the Amplitude wizard
// (prompt BA400.4). Per the user's explicit choice this initializes
// IMMEDIATELY at load, NOT behind the consent banner (unlike GA4 / Mixpanel /
// PostHog, which stay consent-gated).
//
// The Unified package statically imports Experiment and Engagement even though
// initAll initializes them only after Analytics and Session Replay. Keep that
// exact startup order, but make the two later products real feature boundaries
// so they do not block React's first render.
import * as amplitude from '@amplitude/analytics-browser';
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser';

let initialized = false;

export function initAmplitude(): void {
  if (initialized) return; // init exactly once per app lifecycle
  const key = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!key) {
    console.warn('Amplitude API key missing — analytics disabled');
    return;
  }
  initialized = true;

  void (async () => {
    // Analytics initialization still starts synchronously in the pre-React
    // bootstrap. There is no timer, idle callback, interaction gate, or
    // consent gate on any Amplitude product.
    await amplitude.init(key, {
      autocapture: true,
      // Audit 2 BUG-039: AMP_* / AMP_MKTG_* cookies previously shipped with
      // secure:false on an HTTPS-only site. SameSite is pinned to the Lax
      // the SDK already defaults to; Secure is set whenever the page is
      // https (prod + replit.dev preview) — plain-http localhost keeps
      // unflagged cookies so dev persistence still works. HttpOnly is
      // impossible by construction: these cookies are written and read by
      // JavaScript (document.cookie), which is also why the audit's
      // HttpOnly ask applies only to the platform's GAESA cookie.
      cookieOptions: {
        sameSite: 'Lax',
        secure: window.location.protocol === 'https:',
      },
    }).promise;

    await amplitude.add(
      sessionReplayPlugin({ sampleRate: 1 }),
    ).promise;

    // Unified's initAll performs these after Session Replay. Dynamic imports
    // preserve that behavior/order while keeping their SDKs out of the
    // render-blocking entry module.
    const [{ experimentPlugin }, { plugin: engagementPlugin }] =
      await Promise.all([
        import('@amplitude/plugin-experiment-browser'),
        import('@amplitude/engagement-browser'),
      ]);
    await amplitude.add(experimentPlugin()).promise;
    await amplitude.add(engagementPlugin()).promise;

    // First verification event — sent only after every Unified product is
    // ready, matching the previous initAll().then(...) behavior.
    amplitude.track('Viewed Home Page', { prompt_version: 'BA400.4' });
  })().catch((err) => {
    // Unlatch so a later call can retry after a transient setup failure.
    initialized = false;
    console.warn('Amplitude initialization failed', err);
  });
}
