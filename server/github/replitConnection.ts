import { Octokit } from '@octokit/rest';

/**
 * Replit GitHub Connection Helper
 * Manages OAuth token retrieval from Replit's connection service
 */

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Replit identity token not found. GitHub connection may not be set up.');
  }

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

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected via Replit. Please set up the GitHub connection.');
  }
  
  return accessToken;
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
      onRateLimit: (retryAfter: number, options: any) => {
        console.warn(`GitHub rate limit reached for ${options.method} ${options.url}`);
        if (options.request.retryCount === 0) {
          console.log(`Retrying after ${retryAfter} seconds`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
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
