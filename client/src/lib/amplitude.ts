import { getAnalyticsConsent } from "./analytics";
import type { TransportHttpRequest } from "@amplitude/engagement-browser";

type ManagedPlugin = {
  name?: string;
  teardown?: () => Promise<void>;
};

let initialized = false;
let initStarted = false;
let disabled = false;
let coreInitialized = false;
let sessionReplayAdded = false;
let experimentAdded = false;
let engagementAdded = false;
let amplitudeClient: typeof import("@amplitude/analytics-browser") | null = null;
let sessionReplayInstance: ManagedPlugin | null = null;
let experimentInstance: ManagedPlugin | null = null;
let engagementInstance: ManagedPlugin | null = null;
let sessionReplayAbortController: AbortController | null = null;
let engagementAbortController: AbortController | null = null;
let teardownPromise: Promise<void> = Promise.resolve();
let lifecycleVersion = 0;

function mergeAbortSignals(
  first: AbortSignal | undefined,
  second: AbortSignal,
): AbortSignal {
  if (!first) return second;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([first, second]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (first.aborted || second.aborted) abort();
  else {
    first.addEventListener("abort", abort, { once: true });
    second.addEventListener("abort", abort, { once: true });
  }
  return controller.signal;
}

async function removePlugin(plugin: ManagedPlugin | null): Promise<void> {
  if (!plugin) return;
  if (plugin.name && amplitudeClient) {
    try {
      await amplitudeClient.remove(plugin.name).promise;
      return;
    } catch {
      // Fall through to direct teardown if the host removal raced setup.
    }
  }
  await plugin.teardown?.().catch(() => {});
}

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
  sessionReplayAbortController?.abort();
  sessionReplayAbortController = null;
  engagementAbortController?.abort();
  engagementAbortController = null;
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
  const plugins = [
    sessionReplayInstance,
    experimentInstance,
    engagementInstance,
  ];
  sessionReplayInstance = null;
  experimentInstance = null;
  engagementInstance = null;
  sessionReplayAdded = false;
  experimentAdded = false;
  engagementAdded = false;
  initialized = false;
  clearAmplitudeStorage();
  const remove = async () => {
    await Promise.all(plugins.map(removePlugin));
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
    console.warn('Amplitude API key missing — analytics disabled');
    return;
  }
  initStarted = true;
  const runVersion = lifecycleVersion;

  void (async () => {
    // Import and initialize each stage separately so a revoke while a chunk is
    // in flight cannot initialize the SDK or add a recorder/plugin afterward.
    const amplitude = await import("@amplitude/analytics-browser");
    amplitudeClient = amplitude;
    await teardownPromise;
    if (await consentWasRevoked(runVersion)) return;
    if (coreInitialized) amplitude.setOptOut(false);
    if (!coreInitialized) {
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
      coreInitialized = true;
    }
    if (await consentWasRevoked(runVersion)) return;

    if (!sessionReplayAdded) {
      const { sessionReplayPlugin } =
        await import("@amplitude/plugin-session-replay-browser");
      if (await consentWasRevoked(runVersion)) return;
      sessionReplayAbortController = new AbortController();
      const controller = sessionReplayAbortController;
      const plugin = sessionReplayPlugin({
        sampleRate: 1,
        handleSendEvents: (request) => {
          if (disabled || getAnalyticsConsent() !== "granted") {
            return Promise.reject(new DOMException("Analytics consent revoked", "AbortError"));
          }
          return fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body as BodyInit,
            signal: controller.signal,
            keepalive: request.keepalive,
          });
        },
        handleFetchConfig: (request) => {
          if (disabled || getAnalyticsConsent() !== "granted") {
            return Promise.reject(new DOMException("Analytics consent revoked", "AbortError"));
          }
          return fetch(request.url, {
            method: request.method,
            headers: request.headers,
            signal: mergeAbortSignals(request.signal, controller.signal),
          });
        },
      });
      sessionReplayInstance = plugin;
      await amplitude.add(plugin).promise;
      sessionReplayInstance = plugin;
      sessionReplayAdded = true;
    }
    if (await consentWasRevoked(runVersion)) return;

    // Unified's initAll performs these after Session Replay. Dynamic imports
    // preserve that behavior/order while keeping their SDKs out of the
    // render-blocking entry module.
    if (!experimentAdded) {
      const { experimentPlugin } =
        await import('@amplitude/plugin-experiment-browser');
      if (await consentWasRevoked(runVersion)) return;
      const plugin = experimentPlugin();
      experimentInstance = plugin;
      await amplitude.add(plugin).promise;
      experimentInstance = plugin;
      experimentAdded = true;
    }
    if (await consentWasRevoked(runVersion)) return;
    if (!engagementAdded) {
      const { plugin: engagementPlugin } =
        await import('@amplitude/engagement-browser');
      if (await consentWasRevoked(runVersion)) return;
      engagementAbortController = new AbortController();
      const controller = engagementAbortController;
      const plugin = engagementPlugin({
        options: {
          // Keep the SDK in the consent-controlled local chunk instead of
          // starting uncancellable remote split-script downloads.
          splitting: false,
        },
        transport: {
          handleHttpRequest: (request: TransportHttpRequest) => {
            if (disabled || getAnalyticsConsent() !== "granted") {
              return Promise.reject(new DOMException("Analytics consent revoked", "AbortError"));
            }
            return fetch(request.url, {
              method: request.method,
              headers: request.headers,
              body: request.body,
              signal: mergeAbortSignals(request.signal, controller.signal),
              keepalive: request.keepalive,
            });
          },
        },
      });
      engagementInstance = plugin;
      await amplitude.add(plugin).promise;
      // Teardown may have cleared the global ref while setup was in flight.
      // Restore it so a post-await revoke check can remove this exact plugin.
      engagementInstance = plugin;
      engagementAdded = true;
    }
    if (await consentWasRevoked(runVersion)) return;
    initialized = true;
    initStarted = false;

    // First verification event — sent only after every Unified product is
    // ready, matching the previous initAll().then(...) behavior.
    if (!disabled) {
      amplitude.track('Viewed Home Page', { prompt_version: 'BA400.4' });
    }
  })().catch((err) => {
    // Unlatch so a later call can retry after a transient setup failure.
    initStarted = false;
    initialized = false;
    console.warn('Amplitude initialization failed', err);
  });
}

export function optOutAmplitude(): void {
  lifecycleVersion += 1;
  disabled = true;
  amplitudeClient?.setOptOut(true);
  void teardownAmplitudePlugins();
}
