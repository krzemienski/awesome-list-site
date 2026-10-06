import { Container, getContainer } from "@cloudflare/containers";

// Runs the production Docker image behind cf.awesome.video against the shared
// production database. The primary deployment owns the schedulers, so this
// instance starts with DISABLE_BACKGROUND_JOBS=1, and PUBLIC_SITE_URL keeps
// canonical URLs on the apex.

interface Env {
  APP: DurableObjectNamespace<AwesomeVideoApp>;
  // Every secret uploaded from the app's .env is forwarded to the container.
  [secret: string]: unknown;
}

export class AwesomeVideoApp extends Container<Env> {
  defaultPort = 5000;
  sleepAfter = "1h";
  enableInternet = true;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const secrets: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") secrets[key] = value;
    }
    this.envVars = {
      ...secrets,
      NODE_ENV: "production",
      PORT: "5000",
      DISABLE_BACKGROUND_JOBS: "1",
      PUBLIC_SITE_URL: "https://awesome.video",
    };
  }
}

// The container reaches the internet from inside Cloudflare's network. If the
// edge's cf-* / cdn-loop headers ride along to another Cloudflare-proxied host
// (the app's Clerk Frontend API proxy forwards request headers verbatim), that
// host rejects the request with Error 1000 "DNS points to prohibited IP". Drop
// them here and hand the app the standard forwarding headers instead.
function forContainer(request: Request): Request {
  const url = new URL(request.url);
  const headers = new Headers();
  for (const [key, value] of request.headers) {
    const name = key.toLowerCase();
    if (name.startsWith("cf-") || name === "cdn-loop") continue;
    headers.append(key, value);
  }
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  headers.set("x-forwarded-host", url.host);
  return new Request(request, { headers });
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return getContainer(env.APP).fetch(forContainer(request));
  },
};
