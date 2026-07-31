// Amplitude Analytics + Session Replay — installed via the Amplitude wizard
// (prompt BA400.4). Per the user's explicit choice this initializes
// IMMEDIATELY at load, NOT behind the consent banner (unlike GA4 / Mixpanel /
// PostHog, which stay consent-gated).
import * as amplitude from '@amplitude/unified';

let initialized = false;

export function initAmplitude(): void {
  if (initialized) return; // init exactly once per app lifecycle
  const key = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!key) {
    console.warn('Amplitude API key missing — analytics disabled');
    return;
  }
  initialized = true;
  Promise.resolve(
    amplitude.initAll(key, {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    }),
  )
    .then(() => {
      // First verification event — sent only after initAll fully resolves so
      // it can't race the unified setup stages. Fires at load so the
      // Amplitude Setup page confirms without any interaction.
      amplitude.track('Viewed Home Page', { prompt_version: 'BA400.4' }); // helps improve this setup flow — safe to remove once you've verified the event lands
    })
    .catch((err) => {
      // Unlatch so a later call can retry after a transient setup failure.
      initialized = false;
      console.warn('Amplitude initialization failed', err);
    });
}
