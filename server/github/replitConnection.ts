import { Octokit } from '@octokit/rest';

/**
 * Replit GitHub Connection Helper
 * Manages OAuth token retrieval from Replit's connection service
 */

// Octokit throttle options type
interface ThrottleOptions {
  method: string;
  url: string;
  request: {
    retryCount: number;
  };
}

// Replit connection settings types
interface ReplitConnectionSettings {
  settings: {
    expires_at?: string;
    access_token?: string;
    oauth?: {
      credentials?: {
        access_token?: string;
      };
    };
  };
}

let connectionSettings: ReplitConnectionSettings | undefined;

/**
 * Fallback: personal access token stored as a secret.
 * GITHUB_PUSH_TOKEN is a classic PAT with repo + workflow scopes.
 */
function getFallbackToken(): string | undefined {
  return process.env.GITHUB_PUSH_TOKEN;
}

/** Unified token extraction from connection settings (flat or nested under oauth.credentials). */
function extractConnectionToken(settings?: ReplitConnectionSettings): string | undefined {
  return settings?.settings?.access_token || settings?.settings?.oauth?.credentials?.access_token;
}

/**
 * Validate a GitHub token with a lightweight authenticated request.
 * Returns true when GitHub accepts the token.
 */
async function isTokenValid(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'awesome-list-sync v1.0.0'
      }
    });
    return res.status !== 401 && res.status !== 403;
  } catch {
    // Network error — assume the token itself may still be fine.
    return true;
  }
}

// Cache validation verdicts briefly so we don't hit /user on every call.
let validatedToken: { token: string; validatedAt: number } | undefined;
const VALIDATION_TTL_MS = 5 * 60 * 1000;

/**
 * If the connector token turns out to be bad at runtime, fall back to the PAT
 * (validated) before giving up.
 */
async function resolveWorkingToken(connectorToken: string | undefined): Promise<string> {
  const fallback = getFallbackToken();

  if (connectorToken) {
    if (validatedToken?.token === connectorToken && Date.now() - validatedToken.validatedAt < VALIDATION_TTL_MS) {
      return connectorToken;
    }
    if (await isTokenValid(connectorToken)) {
      validatedToken = { token: connectorToken, validatedAt: Date.now() };
      return connectorToken;
    }
    console.warn('Replit GitHub connector token was rejected by GitHub (bad credentials).');
    // Connector token is bad — invalidate the settings cache so the next call refetches.
    connectionSettings = undefined;
  }

  if (fallback) {
    if (validatedToken?.token === fallback && Date.now() - validatedToken.validatedAt < VALIDATION_TTL_MS) {
      return fallback;
    }
    if (await isTokenValid(fallback)) {
      if (!connectorToken) {
        console.log('GitHub connector not connected; using GITHUB_PUSH_TOKEN personal access token.');
      } else {
        console.log('Falling back to GITHUB_PUSH_TOKEN personal access token.');
      }
      validatedToken = { token: fallback, validatedAt: Date.now() };
      return fallback;
    }
    console.warn('GITHUB_PUSH_TOKEN was rejected by GitHub (bad credentials).');
  }

  throw new Error(
    'No working GitHub credentials. Re-authorize the Replit GitHub connection or refresh the GITHUB_PUSH_TOKEN secret.'
  );
}

async function getAccessToken(): Promise<string> {
  // Use cached connector settings if still unexpired
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return resolveWorkingToken(extractConnectionToken(connectionSettings));
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    return resolveWorkingToken(undefined);
  }

  try {
    // Fetch connection settings from Replit
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);
  } catch (err) {
    connectionSettings = undefined;
    console.warn('Failed to fetch Replit GitHub connection settings:', err instanceof Error ? err.message : err);
  }

  return resolveWorkingToken(extractConnectionToken(connectionSettings));
}

/**
 * Get a fresh GitHub client with current access token
 * WARNING: Never cache this client. Access tokens expire.
 * Always call this function to get a fresh client.
 */
export async function getGitHubClient(): Promise<Octokit> {
  const accessToken = await getAccessToken();
  return new Octokit({ 
    auth: accessToken,
    userAgent: 'awesome-list-sync v1.0.0',
    throttle: {
      onRateLimit: (retryAfter: number, options: ThrottleOptions) => {
        console.warn(`GitHub rate limit reached for ${options.method} ${options.url}`);
        if (options.request.retryCount === 0) {
          console.log(`Retrying after ${retryAfter} seconds`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter: number, options: ThrottleOptions) => {
        console.warn(`GitHub secondary rate limit for ${options.method} ${options.url}`);
      },
    },
  });
}

/**
 * Check if GitHub connection is available
 */
export async function isGitHubConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
