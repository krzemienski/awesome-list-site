import { getAnalyticsConsent } from "./analytics";
import type { AmplitudeProductSlots, ManagedPlugin } from "./analytics-sdk-options";

let initialized = false;
let initStarted = false;
let disabled = false;
let coreInitialized = false;
let amplitudeClient: typeof import("@amplitude/analytics-browser") | null = null;
let urlScrubAdded = false;
// Post-consent options chunk, loaded together with the SDK.
let sdkOptions: typeof import("./analytics-sdk-options") | null = null;

// Session Replay / Experiment / Guides & Surveys plugin slots. Setup lives in
// the post-consent options chunk (addAmplitudeProducts); teardown stays here.
const emptySlot = () => ({ added: false, instance: null, controller: null });
const products: AmplitudeProductSlots = {
  replay: emptySlot(),
  experiment: emptySlot(),
  engagement: emptySlot(),
};

let teardownPromise: Promise<void> = Promise.resolve();
let lifecycleVersion = 0;

// Custom events accepted while the consented setup is still loading. Never
// filled pre-consent (ampTrack drops unless init is under way) and cleared on
// every revoke, mirroring the Mixpanel/PostHog wrappers.
const MAX_PENDING_EVENTS = 100;
let pendingEvents: { name: string; props: Record<string, unknown> }[] = [];

function clearAmplitudeStorage(): void {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && /^(AMP_|AMP_MKTG_|amplitude[._-])/i.test(key)) {
          storage.removeItem(key);
        }
      }
    } catch {
      // Storage may be unavailable in hardened/private browsing contexts.
    }
  }
  try {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=", 1)[0]?.trim();
      if (name && /^(AMP_|AMP_MKTG_|amplitude[._-])/i.test(name)) {
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${window.location.hostname}; SameSite=Lax${secure}`;
      }
    }
  } catch {
    // Cookie access can be disabled independently of local storage.
  }
}

function teardownAmplitudePlugins(): Promise<void> {
  const slots = [products.replay, products.experiment, products.engagement];
  for (const slot of slots) {
    slot.controller?.abort();
    slot.controller = null;
  }
  const engagement = (
    window as typeof window & {
      engagement?: { disable?: () => void; shutdown?: () => void };
    }
  ).engagement;
  try {
    engagement?.disable?.();
    engagement?.shutdown?.();
  } catch {
    // Analytics teardown must never interrupt the application.
  }
  const plugins: (ManagedPlugin | null)[] = [];
  for (const slot of slots) {
    plugins.push(slot.instance);
    slot.instance = null;
    slot.added = false;
  }
  initialized = false;
  clearAmplitudeStorage();
  const remove = async () => {
    // Non-null plugins imply the options chunk was loaded (it adds them).
    if (sdkOptions) await sdkOptions.removeAmplitudePlugins(amplitudeClient, plugins);
    // A plugin setup that was already resolving can write state while its
    // removal runs. Sweep once more after every teardown has settled.
    clearAmplitudeStorage();
  };
  teardownPromise = teardownPromise.then(remove, remove);
  const cleanupVersion = lifecycleVersion;
  window.setTimeout(() => {
    if (
      cleanupVersion === lifecycleVersion &&
      (disabled || getAnalyticsConsent() !== "granted")
    ) {
      clearAmplitudeStorage();
    }
  }, 2_000);
  return teardownPromise;
}

async function consentWasRevoked(runVersion: number): Promise<boolean> {
  if (
    runVersion === lifecycleVersion &&
    !disabled &&
    getAnalyticsConsent() === "granted"
  ) {
    return false;
  }
  pendingEvents = [];
  if (coreInitialized) amplitudeClient?.setOptOut(true);
  await teardownAmplitudePlugins();
  initStarted = false;
  // A quick revoke→regrant can happen while teardown awaits an in-flight
  // plugin. Resume once removal is complete rather than leaving init latched.
  if (!disabled && getAnalyticsConsent() === "granted") {
    queueMicrotask(initAmplitude);
  }
  return true;
}

export function initAmplitude(): void {
  if (getAnalyticsConsent() !== "granted") return;
  disabled = false;
  if (initialized) {
    amplitudeClient?.setOptOut(false);
    return;
  }
  if (initStarted) return;
  const key = import.meta.env.VITE_AMPLITUDE_API_KEY;
  if (!key) {
    if (import.meta.env.DEV) console.warn('Missing VITE_AMPLITUDE_API_KEY — Amplitude disabled');
    return;
  }
  initStarted = true;
  const runVersion = lifecycleVersion;

  void (async () => {
    // Import and initialize each stage separately so a revoke while a chunk is
    // in flight cannot initialize the SDK or add a recorder/plugin afterward.
    const [amplitude, options] = await Promise.all([
      import("@amplitude/analytics-browser"),
      // Post-consent plugin/transport config, kept out of the entry bundle.
      import("./analytics-sdk-options"),
    ]);
    const isBlocked = () => disabled || getAnalyticsConsent() !== "granted";
    amplitudeClient = amplitude;
    sdkOptions = options;
    await teardownPromise;
    if (await consentWasRevoked(runVersion)) return;
    if (coreInitialized) amplitude.setOptOut(false);
    if (!coreInitialized) {
      await amplitude.init(key, options.amplitudeInitOptions()).promise;
      coreInitialized = true;
    }
    // URL scrubber: registered after init so it runs after the SDK's own
    // enrichment plugins (see amplitudeUrlScrubPlugin).
    if (!urlScrubAdded) {
      await amplitude.add(options.amplitudeUrlScrubPlugin).promise;
      urlScrubAdded = true;
    }
    if (await consentWasRevoked(runVersion)) return;

    if (
      !(await options.addAmplitudeProducts(amplitude, products, isBlocked, () =>
        consentWasRevoked(runVersion),
      ))
    ) {
      return;
    }
    initialized = true;
    initStarted = false;

    // First verification event — sent only after every Unified product is
    // ready, matching the previous initAll().then(...) behavior.
    if (!disabled) {
      amplitude.track('Viewed Home Page', { prompt_version: 'BA400.4' });
    }
    const flush = pendingEvents;
    pendingEvents = [];
    flush.forEach(({ name, props }) => ampTrack(name, props));
  })().catch((err) => {
    // Unlatch so a later call can retry after a transient setup failure.
    initStarted = false;
    initialized = false;
    console.warn('Amplitude initialization failed', err);
  });
}

// Amplitude half of the shared dispatcher (analytics-dispatch.ts is the only
// caller; props arrive already cleaned). Same auto props as mpTrack/phCapture
// so the three product tools see identical event shapes.
export function ampTrack(name: string, props: Record<string, unknown> = {}): void {
  if (disabled || getAnalyticsConsent() !== "granted") return;
  if (!initialized || !amplitudeClient) {
    // Buffer only while a consented init is under way; otherwise drop.
    if (initStarted && pendingEvents.length < MAX_PENDING_EVENTS) {
      pendingEvents.push({ name, props });
    }
    return;
  }
  const merged: Record<string, unknown> = {
    platform: "web",
    page_path: window.location.pathname,
    ...props,
  };
  try {
    amplitudeClient.track(name, merged);
  } catch {
    // Analytics must never break the app.
  }
}

export function optOutAmplitude(): void {
  lifecycleVersion += 1;
  disabled = true;
  pendingEvents = [];
  amplitudeClient?.setOptOut(true);
  void teardownAmplitudePlugins();
}
