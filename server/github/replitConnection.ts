import { Octokit } from '@octokit/rest';
// Replit GitHub integration (connection:conn_github_01K5WB2HVYFJ5B6FMXSNF7VY4V)
// Uses @replit/connectors-sdk proxy fetch — the SDK handles identity, token
// refresh, and auth headers automatically. Do NOT revert to the legacy
// /api/v2/connection token-fetch endpoint; it no longer serves this connection.
import { ReplitConnectors } from '@replit/connectors-sdk';

/**
 * Replit GitHub Connection Helper
 * Connector-first via the Replit connectors proxy, with a personal access
 * token fallback stored in secrets.
 */

// Octokit throttle options type
interface ThrottleOptions {
  method: string;
  url: string;
  request: {
    retryCount: number;
  };
}

const OCTOKIT_BASE_OPTIONS = {
  userAgent: 'awesome-list-sync v1.0.0',
  throttle: {
    onRateLimit: (retryAfter: number, options: ThrottleOptions) => {
      console.warn(`GitHub rate limit reached for ${options.method} ${options.url}`);
      if (options.request.retryCount === 0) {
        console.log(`Retrying after ${retryAfter} seconds`);
        return true;
      }
    },
    onSecondaryRateLimit: (_retryAfter: number, options: ThrottleOptions) => {
      console.warn(`GitHub secondary rate limit for ${options.method} ${options.url}`);
    },
  },
};

/**
 * Fallback: personal access token stored as a secret.
 * GITHUB_PERSONAL_ACCESS_TOKEN is the current PAT (repo + workflow scopes);
 * GITHUB_PUSH_TOKEN and GITHUB_TOKEN are older names kept for compatibility.
 */
export function getFallbackToken(): string | undefined {
  return (
    process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
    process.env.GITHUB_PUSH_TOKEN ||
    process.env.GITHUB_TOKEN
  );
}

/**
 * Build an Octokit that routes every request through the Replit connectors
 * proxy. Never cache the returned client — the SDK mints fresh auth per call.
 */
function buildConnectorOctokit(): Octokit {
  const connectors = new ReplitConnectors();
  const proxyFetch = connectors.createProxyFetch('github');
  return new Octokit({
    ...OCTOKIT_BASE_OPTIONS,
    request: { fetch: proxyFetch },
  });
}

// Cache health verdicts briefly so we don't hit /user on every call.
const VALIDATION_TTL_MS = 5 * 60 * 1000;
let connectorVerdict: { ok: boolean; checkedAt: number } | undefined;
let validatedToken: { token: string; validatedAt: number } | undefined;

/** True when the Replit GitHub connector answers an authenticated request. */
async function connectorWorks(): Promise<boolean> {
  if (connectorVerdict && Date.now() - connectorVerdict.checkedAt < VALIDATION_TTL_MS) {
    return connectorVerdict.ok;
  }
  try {
    const octokit = buildConnectorOctokit();
    await octokit.rest.users.getAuthenticated();
    connectorVerdict = { ok: true, checkedAt: Date.now() };
  } catch (err) {
    console.warn(
      'Replit GitHub connector unavailable:',
      err instanceof Error ? err.message : err
    );
    connectorVerdict = { ok: false, checkedAt: Date.now() };
  }
  return connectorVerdict.ok;
}

/**
 * Validate a GitHub token with a lightweight authenticated request.
 * Returns true when GitHub accepts the token.
 */
async function isTokenValid(token: string): Promise<boolean> {
  if (validatedToken?.token === token && Date.now() - validatedToken.validatedAt < VALIDATION_TTL_MS) {
    return true;
  }
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'awesome-list-sync v1.0.0'
      }
    });
    if (res.status !== 401 && res.status !== 403) {
      validatedToken = { token, validatedAt: Date.now() };
      return true;
    }
    return false;
  } catch {
    // Network error — assume the token itself may still be fine.
    return true;
  }
}

/**
 * Get a fresh GitHub client. Prefers the Replit GitHub connection; falls back
 * to the personal access token secret when the connector is unavailable.
 * WARNING: Never cache this client. Always call this function fresh.
 */
export async function getGitHubClient(): Promise<Octokit> {
  if (await connectorWorks()) {
    return buildConnectorOctokit();
  }

  const fallback = getFallbackToken();
  if (fallback && await isTokenValid(fallback)) {
    console.log('GitHub connector unavailable; using personal access token fallback.');
    return new Octokit({
      ...OCTOKIT_BASE_OPTIONS,
      auth: fallback,
    });
  }
  if (fallback) {
    console.warn('GitHub personal access token was rejected by GitHub (bad credentials).');
  }

  throw new Error(
    'No working GitHub credentials. Re-authorize the Replit GitHub connection or refresh the GITHUB_PERSONAL_ACCESS_TOKEN secret.'
  );
}

/**
 * Check if GitHub connection is available (connector or fallback token).
 */
export async function isGitHubConnected(): Promise<boolean> {
  if (await connectorWorks()) {
    return true;
  }
  const fallback = getFallbackToken();
  return !!fallback && await isTokenValid(fallback);
}
