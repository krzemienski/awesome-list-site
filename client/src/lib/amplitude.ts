import { getAnalyticsConsent, vendorSdksAllowed } from "./analytics";
import { isAnalyticsSuppressed } from "./analytics-suppression";
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

// Custom events accepted before setup finishes: init under way, or consent
// already granted and the post-paint init not started yet. Never filled
// pre-consent, after Decline or while suppressed, and cleared on every revoke,
// mirroring the Mixpanel/PostHog wrappers.
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
  engagementState = "idle";
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

// Engagement setup never owns init: a run that a revoke has already outdated
// only drops its own work. Reset the init latches or tearing down the slots here
// would remove the plugins a newer grant installed in the meantime.
async function engagementRevoked(runVersion: number): Promise<boolean> {
  if (runVersion === lifecycleVersion) return consentWasRevoked(runVersion);
  return true;
}

// Guides & Surveys is a ~500 ms task on a throttled phone and nothing tracked
// depends on it, so it starts in an idle period after the page's first seconds
// instead of landing on a visitor's first taps.
const ENGAGEMENT_DEFER_MS = 3_000;
const ENGAGEMENT_IDLE_TIMEOUT_MS = 2_000;
const INPUT_QUIET_MS = 300;

let lastInputAt = 0;
let inputListening = false;

function listenForInput(): void {
  if (inputListening) return;
  inputListening = true;
  for (const type of ["pointerdown", "keydown", "touchstart", "wheel"]) {
    window.addEventListener(type, () => (lastInputAt = performance.now()), { capture: true, passive: true });
  }
}

function yieldToMain(): Promise<void> {
  const scheduler = (window as typeof window & { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

// Without requestIdleCallback (Safari), wait for a quiet gap after the visitor's
// last input, then yield once more, so the setup task never lands on a tap.
function whenIdle(callback: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout: ENGAGEMENT_IDLE_TIMEOUT_MS });
    return;
  }
  listenForInput();
  const giveUpAt = performance.now() + ENGAGEMENT_IDLE_TIMEOUT_MS;
  const attempt = () => {
    const now = performance.now();
    if (now - lastInputAt < INPUT_QUIET_MS && now < giveUpAt) {
      window.setTimeout(attempt, INPUT_QUIET_MS);
      return;
    }
    void yieldToMain().then(callback);
  };
  attempt();
}

function afterStartup(callback: () => void): void {
  window.setTimeout(() => whenIdle(callback), ENGAGEMENT_DEFER_MS);
}

// "idle": not set up and nothing queued (first run, after a failure, after a
// revoke); "pending": queued or running; "done": plugin added.
let engagementState: "idle" | "pending" | "done" = "idle";

function scheduleEngagement(): void {
  const amplitude = amplitudeClient;
  const options = sdkOptions;
  if (engagementState !== "idle" || !amplitude || !options) return;
  engagementState = "pending";
  const runVersion = lifecycleVersion;
  const isBlocked = () => disabled || getAnalyticsConsent() !== "granted" || isAnalyticsSuppressed();
  const settle = (state: "idle" | "done") => {
    // A revoke bumped the version and already reset the state; whatever the
    // newer lifecycle is doing is not this run's to overwrite.
    if (runVersion === lifecycleVersion) engagementState = state;
  };
  afterStartup(() => {
    // A revoke bumped the version and already tore everything down; a later
    // grant runs its own init and schedules its own Guides & Surveys.
    if (runVersion !== lifecycleVersion) return;
    options
      .addAmplitudeEngagement(amplitude, products, isBlocked, () => engagementRevoked(runVersion))
      .then((added) => settle(added ? "done" : "idle"))
      .catch((err) => {
        // Let the next initAmplitude() call retry instead of leaving it unavailable.
        settle("idle");
        console.warn("Amplitude Guides & Surveys setup failed", err);
      });
  });
}

export function initAmplitude(): void {
  if (!vendorSdksAllowed()) return;
  disabled = false;
  if (initialized) {
    amplitudeClient?.setOptOut(false);
    scheduleEngagement();
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
    // Replay and Guides & Surveys uploads also stop on QA paths and once any
    // tab marks the device as an admin session.
    const isBlocked = () => disabled || getAnalyticsConsent() !== "granted" || isAnalyticsSuppressed();
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

    // Guides & Surveys is a ~500 ms task on a throttled phone. It is not
    // needed for tracking, so it waits until the first seconds of taps are over.
    scheduleEngagement();
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
  // Page context is read now, so a buffered event keeps the page it fired on.
  const merged: Record<string, unknown> = {
    platform: "web",
    page_path: window.location.pathname,
    ...props,
  };
  if (!initialized || !amplitudeClient) {
    if (vendorSdksAllowed() && pendingEvents.length < MAX_PENDING_EVENTS) {
      pendingEvents.push({ name, props: merged });
    }
    return;
  }
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
