import Anthropic from '@anthropic-ai/sdk';

/**
 * Shared Anthropic client factory.
 *
 * The app may talk either to the public Anthropic API (x-api-key auth) or to a
 * self-hosted gateway/router that authenticates with a Bearer token and a custom
 * base URL. The SDK can read ANTHROPIC_BASE_URL / ANTHROPIC_API_KEY /
 * ANTHROPIC_AUTH_TOKEN from the environment, but it will send x-api-key whenever
 * an apiKey is present — even alongside an authToken — which a Bearer-only router
 * rejects. So we resolve a SINGLE auth method here and pass exactly that.
 *
 * Precedence: an explicit auth token wins (Bearer routers), otherwise an API key.
 * AI_INTEGRATIONS_* names are accepted as aliases for deployments that use them.
 */

function resolveBaseUrl(): string | undefined {
  return (
    process.env.ANTHROPIC_BASE_URL ||
    process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL ||
    undefined
  );
}

function resolveAuthToken(): string | undefined {
  return (
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.AI_INTEGRATIONS_ANTHROPIC_AUTH_TOKEN ||
    undefined
  );
}

function resolveApiKey(): string | undefined {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
    undefined
  );
}

/**
 * True when at least one usable auth method is configured. Callers should gate
 * AI features on this rather than checking ANTHROPIC_API_KEY directly, so a
 * Bearer-token-only router is recognised as configured.
 */
export function isAnthropicConfigured(): boolean {
  return Boolean(resolveAuthToken() || resolveApiKey());
}

/**
 * Construct an Anthropic client with a single, unambiguous auth method plus an
 * optional custom base URL. Returns null when nothing is configured so callers
 * can fall back cleanly instead of constructing a client that throws on first use.
 */
export function createAnthropicClient(): Anthropic | null {
  const baseURL = resolveBaseUrl();
  const authToken = resolveAuthToken();
  const apiKey = resolveApiKey();

  if (authToken) {
    // @anthropic-ai/sdk 0.37.0 builds an "Authorization" header for authToken
    // but validateHeaders() looks up the lowercase "authorization" key, so an
    // authToken-only client throws "Could not resolve authentication method"
    // before the request is sent. Supplying the lowercase header explicitly via
    // defaultHeaders satisfies that check and sends the Bearer token correctly.
    return new Anthropic({
      authToken,
      defaultHeaders: { authorization: `Bearer ${authToken}` },
      ...(baseURL && { baseURL }),
    });
  }
  if (apiKey) {
    return new Anthropic({ apiKey, ...(baseURL && { baseURL }) });
  }
  return null;
}
